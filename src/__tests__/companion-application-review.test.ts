import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  uid: 'reviewer',
  reviewEnabled: true,
  application: null as Record<string, any> | null,
  existingProfile: null as Record<string, any> | null,
  writes: [] as Array<{ kind: string; path: string; data: Record<string, any> }>,
  runTransaction: vi.fn(),
  updateDocument: vi.fn(),
  getDocuments: vi.fn(),
  getDocument: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({ doc: (collection: string, id: string) => `${collection}/${id}` }));
vi.mock('../services/identity', () => ({
  requireUid: (expected?: string) => {
    if (expected && expected !== mock.uid) throw new Error('Resource owner does not match authenticated UID.');
    return mock.uid;
  },
}));
vi.mock('../services/firestore', () => ({
  firestore: {
    collection: (path: string) => path,
    runTransaction: mock.runTransaction,
    updateDocument: mock.updateDocument,
    getDocuments: mock.getDocuments,
    getDocument: mock.getDocument,
  },
}));
vi.mock('../services/releaseGates', () => ({
  get companionReviewEnabled() { return mock.reviewEnabled; },
}));

import { companionApplicationRepository } from '../repositories/CompanionApplicationRepository';

beforeEach(() => {
  mock.uid = 'reviewer';
  mock.reviewEnabled = true;
  mock.writes = [];
  mock.application = {
    id: 'app-1', userId: 'provider', status: 'SUBMITTED',
    kyc: { documentFileUrl: 'kyc/provider/identity.pdf', verificationStatus: 'UNVERIFIED' },
    applicationData: { displayName: 'Provider', categories: ['Art'], languages: ['Nepali'], location: 'Pokhara', hourlyRate: 1000 },
  };
  mock.existingProfile = null;
  mock.runTransaction.mockReset().mockImplementation(async (callback: (tx: any) => Promise<void>) => {
    const tx = {
      get: vi.fn(async (path: string) => {
        const value = path.startsWith('companions/') ? mock.existingProfile : mock.application;
        return { exists: () => !!value, data: () => value };
      }),
      update: (path: string, data: Record<string, any>) => mock.writes.push({ kind: 'update', path, data }),
      set: (path: string, data: Record<string, any>) => mock.writes.push({ kind: 'set', path, data }),
    };
    await callback(tx);
  });
  mock.updateDocument.mockReset().mockResolvedValue(undefined);
  mock.getDocuments.mockReset().mockResolvedValue([]);
  mock.getDocument.mockReset().mockResolvedValue(null);
});

describe('case-scoped application queue', () => {
  it('resolves only assigned cases and filters mismatched subjects/status', async () => {
    mock.getDocuments.mockResolvedValue([
      { id: 'app-1', applicationId: 'app-1', reviewerUid: 'reviewer', subjectUid: 'provider', status: 'ASSIGNED' },
      { id: 'app-2', applicationId: 'app-2', reviewerUid: 'reviewer', subjectUid: 'other', status: 'REVOKED' },
    ]);
    mock.getDocument.mockResolvedValue({ id: 'app-1', userId: 'provider', status: 'SUBMITTED' });
    const result = await companionApplicationRepository.adminList('SUBMITTED', { id: 'reviewer', role: 'kyc_reviewer' });
    expect(result.map(application => application.id)).toEqual(['app-1']);
    expect(mock.getDocument).toHaveBeenCalledTimes(1);
    expect(mock.getDocuments).toHaveBeenCalledWith('companion_review_cases', expect.objectContaining({
      where: [{ field: 'reviewerUid', operator: '==', value: 'reviewer' }], throwOnError: true,
    }));
  });

  it('does not treat a failed case query as an empty review queue', async () => {
    mock.getDocuments.mockRejectedValue(new Error('permission denied'));
    await expect(companionApplicationRepository.adminList('SUBMITTED', { id: 'reviewer', role: 'kyc_reviewer' }))
      .rejects.toThrow('permission denied');
  });

  it('rejects a legacy admin role before listing applications', async () => {
    await expect(companionApplicationRepository.adminList('ALL', { id: 'reviewer', role: 'platform_admin' }))
      .rejects.toThrow('current companion-review role');
    expect(mock.getDocuments).not.toHaveBeenCalled();
  });
});

describe('companion application review', () => {
  const actor = { id: 'reviewer', role: 'kyc_reviewer' };

  it('does not attempt a review transaction while the workflow gate is off', async () => {
    mock.reviewEnabled = false;
    await expect(companionApplicationRepository.review('approve', 'app-1', actor, {}))
      .rejects.toThrow('reviews are unavailable');
    expect(mock.runTransaction).not.toHaveBeenCalled();
  });

  it('puts approval, user eligibility, public projection and audit in one transaction', async () => {
    await companionApplicationRepository.review('approve', 'app-1', actor, {});
    expect(mock.runTransaction).toHaveBeenCalledTimes(1);
    expect(mock.writes.map(w => [w.kind, w.path.split('/')[0]])).toEqual([
      ['update', 'companion_applications'], ['update', 'users'], ['set', 'companions'], ['set', 'admin_audit_logs'],
    ]);
    expect(mock.writes[0].data).toMatchObject({ status: 'APPROVED', 'kyc.verificationStatus': 'VERIFIED', reviewedBy: 'reviewer' });
    expect(mock.writes[0].data.reviewAuditId).toMatch(/^audit-/);
    expect(mock.writes[1].data).toMatchObject({ companionStatus: 'APPROVED', companionApprovalApplicationId: 'app-1' });
    expect(mock.writes[2].data).toMatchObject({ userId: 'provider', isVerified: true, approvalApplicationId: 'app-1' });
    expect(mock.writes[3].data).toMatchObject({ action: 'application.approve', actorId: 'reviewer', targetId: 'app-1' });
  });

  it.each(['APPROVED', 'REJECTED', 'DRAFT'])('rejects a stale %s application before writing', async status => {
    mock.application!.status = status;
    await expect(companionApplicationRepository.review('approve', 'app-1', actor, {})).rejects.toThrow('no longer awaiting review');
    expect(mock.writes).toEqual([]);
  });

  it('rejects a reviewer acting on their own application', async () => {
    mock.application!.userId = 'reviewer';
    await expect(companionApplicationRepository.review('approve', 'app-1', actor, {})).rejects.toThrow('own application');
    expect(mock.writes).toEqual([]);
  });

  it('rejects an uncanonical KYC reference before any eligibility write', async () => {
    mock.application!.kyc.documentFileUrl = 'https://example.com/id.pdf';
    await expect(companionApplicationRepository.review('approve', 'app-1', actor, {})).rejects.toThrow('canonical private identity document');
    expect(mock.writes).toEqual([]);
  });

  it('preserves an existing profile creation time during approval', async () => {
    mock.existingProfile = { userId: 'provider', createdAt: '2020-01-01T00:00:00.000Z' };
    await companionApplicationRepository.review('approve', 'app-1', actor, {});
    expect(mock.writes[2].data).not.toHaveProperty('createdAt');
    expect(mock.writes[2].data).toMatchObject({ approvalApplicationId: 'app-1' });
  });

  it('rejects a mismatched legacy profile owner without any write', async () => {
    mock.existingProfile = { userId: 'someone-else' };
    await expect(companionApplicationRepository.review('approve', 'app-1', actor, {})).rejects.toThrow('different account');
    expect(mock.writes).toEqual([]);
  });

  it('rejects incomplete public data before any eligibility write', async () => {
    mock.application!.applicationData.hourlyRate = 0;
    await expect(companionApplicationRepository.review('approve', 'app-1', actor, {})).rejects.toThrow('valid NPR rate');
    expect(mock.writes).toEqual([]);
  });

  it('records a rejected decision and audit without publishing a companion', async () => {
    await companionApplicationRepository.review('reject', 'app-1', actor, { reason: 'Evidence mismatch' });
    expect(mock.writes.map(w => w.path.split('/')[0])).toEqual(['companion_applications', 'users', 'admin_audit_logs']);
    expect(mock.writes[0].data).toMatchObject({ status: 'REJECTED', rejectionReason: 'Evidence mismatch' });
    expect(mock.writes[1].data).toMatchObject({ companionStatus: 'REJECTED', companionApprovalApplicationId: 'app-1' });
  });

  it('preserves existing KYC verification state when saving partial draft fields', async () => {
    mock.uid = 'provider';
    await companionApplicationRepository.saveDraft('app-1', { bio: 'Updated' }, { documentFileUrl: 'kyc/provider/identity.pdf' });
    expect(mock.updateDocument).toHaveBeenCalledWith('companion_applications/app-1', expect.objectContaining({
      'applicationData.bio': 'Updated', 'kyc.documentFileUrl': 'kyc/provider/identity.pdf',
    }));
    expect(mock.updateDocument.mock.calls[0][1]).not.toHaveProperty('kyc');
    expect(mock.updateDocument.mock.calls[0][1]).not.toHaveProperty('applicationData');
  });
});
