import { auth } from '../firebase';

/** Convenience check only; Firestore/Storage rules independently enforce ownership. */
export function requireUid(expectedUid?: string): string {
  const user = auth?.currentUser;
  if (!user || user.isAnonymous) throw new Error('Sign in to a registered account to continue.');
  if (expectedUid !== undefined && expectedUid !== user.uid) throw new Error('Resource owner does not match authenticated UID.');
  return user.uid;
}

export const editableProfileFields = [
  'name', 'avatar', 'preferences', 'favorites', 'fcmToken', 'phone', 'bio',
  'languages', 'skills', 'availability', 'interests', 'location',
] as const;

export function assertEditableProfile(updates: object): void {
  const allowed: readonly string[] = editableProfileFields;
  if (Object.keys(updates).some(key => !allowed.includes(key))) {
    throw new Error('This profile field requires a trusted administrative operation.');
  }
}
