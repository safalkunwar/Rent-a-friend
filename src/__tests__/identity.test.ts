import { beforeEach, describe, expect, it, vi } from 'vitest';
const session = vi.hoisted(() => ({ currentUser: null as null | { uid: string; isAnonymous: boolean } }));
vi.mock('../firebase', () => ({ auth: session }));
import { requireUid, assertEditableProfile } from '../services/identity';

describe('canonical Firebase identity (client preflight, not rules proof)', () => {
  beforeEach(() => { session.currentUser = { uid: 'A', isAnonymous: false }; });
  it('derives the owner from Firebase Auth', () => { expect(requireUid()).toBe('A'); });
  it('rejects User A supplying User B UID', () => { expect(() => requireUid('B')).toThrow(/owner/); });
  it('permits own UID', () => { expect(requireUid('A')).toBe('A'); });
  it.each(['role', 'adminRole', 'companionStatus', 'kycVerificationStatus', 'verificationStatus', 'isVerified', 'rewards', 'paymentStatus', 'id'])('rejects protected profile field %s', field => {
    expect(() => assertEditableProfile({ [field]: 'forged' })).toThrow(/administrative/);
  });
  it('allows only ordinary editable profile fields', () => { expect(() => assertEditableProfile({ name: 'A', bio: 'Hello' })).not.toThrow(); });
  it('rejects signed out and anonymous protected operations', () => {
    session.currentUser = null;
    expect(() => requireUid()).toThrow(/Sign in/);
    session.currentUser = { uid: 'anonymous', isAnonymous: true };
    expect(() => requireUid()).toThrow(/Sign in/);
  });
});
