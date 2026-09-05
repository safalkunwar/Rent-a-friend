import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from '../types';
import type { AuthUser } from './auth';
import { requireUid } from './identity';
import { visibleAvatar } from './mediaContract';

/** One idempotent create path shared by the auth observer and sign-up UI. */
export async function loadAuthenticatedProfile(identity: AuthUser): Promise<User> {
  requireUid(identity.uid);
  if (!db) throw new Error('Profile service is unavailable.');
  const profile = await runTransaction(db, async transaction => {
    const ref = doc(db, 'users', identity.uid);
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) return snapshot.data();
    const now = new Date().toISOString();
    const initial = {
      name: identity.displayName || 'User', email: identity.email || '',
      avatar: identity.photoURL || '', role: 'customer', favorites: [], createdAt: now, updatedAt: now,
    };
    transaction.set(ref, initial);
    return initial;
  });
  requireUid(identity.uid); // An account change during the transaction invalidates this result.
  return {
    ...profile, id: identity.uid,
    name: typeof profile.name === 'string' ? profile.name : 'User',
    email: identity.email || '', avatar: visibleAvatar(profile),
    role: identity.claims.adminRole || identity.claims.admin === true ? 'admin'
      : 'companionStatus' in profile && profile.companionStatus === 'APPROVED' ? 'companion' : 'customer',
    favorites: Array.isArray(profile.favorites) ? profile.favorites.filter((id): id is string => typeof id === 'string') : [],
    claims: identity.claims,
  };
}
