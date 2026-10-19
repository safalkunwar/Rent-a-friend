import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callable: vi.fn(),
  deleteObject: vi.fn(),
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => mocks.callable),
  ref: vi.fn((_storage: unknown, path: string) => ({ path })),
  uploadBytes: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: mocks.getFunctions,
  httpsCallable: mocks.httpsCallable,
}));

vi.mock('firebase/storage', () => ({
  deleteObject: mocks.deleteObject,
  ref: mocks.ref,
  uploadBytes: mocks.uploadBytes,
}));

vi.mock('../firebase', () => ({
  app: {},
  auth: { currentUser: { uid: 'claimant-uid' } },
  storage: {},
}));

import { submitWelcomeCoinIdentityEvidence } from '../services/coinWallet';

describe('submitWelcomeCoinIdentityEvidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callable.mockReset();
    mocks.uploadBytes.mockReset();
    mocks.deleteObject.mockReset();
  });

  const evidenceFiles = () => ({
    id: { type: 'image/jpeg', size: 1 } as File,
    selfie: { type: 'image/png', size: 1 } as File,
  });

  it('cleans up uploaded objects when an upload fails before case submission', async () => {
    const { id, selfie } = evidenceFiles();
    mocks.uploadBytes.mockRejectedValueOnce(new Error('upload failed')).mockResolvedValueOnce({});

    await expect(submitWelcomeCoinIdentityEvidence('PASSPORT', id, selfie)).rejects.toThrow('upload failed');

    expect(mocks.httpsCallable).not.toHaveBeenCalled();
    expect(mocks.deleteObject).toHaveBeenCalledTimes(2);
  });

  it('preserves evidence when the case submission response is lost', async () => {
    const { id, selfie } = evidenceFiles();
    mocks.uploadBytes.mockResolvedValue({});
    mocks.callable.mockRejectedValue(new Error('functions/unavailable'));

    await expect(submitWelcomeCoinIdentityEvidence('PASSPORT', id, selfie)).rejects.toThrow('functions/unavailable');

    expect(mocks.uploadBytes).toHaveBeenCalledTimes(2);
    expect(mocks.callable).toHaveBeenCalledTimes(1);
    expect(mocks.deleteObject).not.toHaveBeenCalled();
  });
});
