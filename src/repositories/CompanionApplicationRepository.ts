import { firestore } from '../services/firestore';
import { CompanionApplication, AdminAuditLog, CompanionApplicationStatus, UserCompanionStatus } from '../types';
import { requireUid } from '../services/identity';
import { isPrivateKycPath } from '../services/uploadContract';

export type ApplicationReviewAction = 'approve' | 'reject' | 'request_changes';

const APPLICATIONS = 'companion_applications';
const AUDIT_LOGS = 'admin_audit_logs';
const USERS = 'users';
const COMPANIONS = 'companions';

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const companionApplicationRepository = {
  /** Create a DRAFT application owned by the authenticated user. */
  async createDraft(userId: string): Promise<string> {
    requireUid(userId);
    const id = newId('app');
    const now = new Date().toISOString();
    await firestore.setDocument(`${APPLICATIONS}/${id}`, {
      id,
      userId,
      status: 'DRAFT' as CompanionApplicationStatus,
      applicationData: {},
      kyc: { verificationStatus: 'UNVERIFIED' },
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },

  async get(applicationId: string): Promise<CompanionApplication | null> {
    return firestore.getDocument<CompanionApplication>(`${APPLICATIONS}/${applicationId}`);
  },

  /** All applications belonging to the current user (bounded). */
  async listMine(userId: string): Promise<CompanionApplication[]> {
    requireUid(userId);
    return firestore.getDocuments<CompanionApplication>(APPLICATIONS, {
      where: [{ field: 'userId', operator: '==', value: userId }],
      orderByField: 'updatedAt',
      orderDirection: 'desc',
      limitCount: 20,
    });
  },

  /** Admin listing with server-side status filter and bounded page size. */
  async adminList(status: CompanionApplicationStatus | 'ALL', limitCount = 50): Promise<CompanionApplication[]> {
    const options: Parameters<typeof firestore.getDocuments>[1] = {
      orderByField: 'submittedAt',
      orderDirection: 'desc',
      limitCount,
    };
    if (status !== 'ALL') {
      options.where = [{ field: 'status', operator: '==', value: status }];
    }
    return firestore.getDocuments<CompanionApplication>(APPLICATIONS, options);
  },

  /** Save draft/profile data while the application is still editable by its owner. */
  async saveDraft(applicationId: string, data: Partial<CompanionApplication['applicationData']>, kyc?: Partial<CompanionApplication['kyc']>): Promise<void> {
    requireUid();
    if (kyc?.documentFileUrl && !isPrivateKycPath(kyc.documentFileUrl, requireUid())) {
      throw new Error('KYC must reference an owned private Storage path.');
    }
    if (kyc?.verificationStatus && kyc.verificationStatus !== 'UNVERIFIED') {
      throw new Error('KYC verification is reviewer-controlled.');
    }
    await firestore.updateDocument(`${APPLICATIONS}/${applicationId}`, {
      ...(Object.keys(data).length > 0 ? { applicationData: data } : {}),
      ...(kyc && Object.keys(kyc).length > 0 ? { kyc } : {}),
      updatedAt: new Date().toISOString(),
    });
  },

  /** Owner submits a DRAFT/CHANGES_REQUIRED application for review. */
  async submit(applicationId: string): Promise<void> {
    await firestore.updateDocument(`${APPLICATIONS}/${applicationId}`, {
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * ADMIN ONLY (enforced again by security rules).
   * Applies the review decision, writes an immutable audit log entry, and on
   * approval activates the user's companion status and public companion profile.
   */
  async review(
    action: ApplicationReviewAction,
    applicationId: string,
    actor: { id: string; role: string },
    payload: { reason?: string; requestedChanges?: string }
  ): Promise<void> {
    requireUid(actor.id);
    const application = await this.get(applicationId);
    if (!application) throw new Error('Application not found');
    if (application.userId === requireUid()) throw new Error('Reviewers cannot review their own application.');
    if (action === 'approve' && !isPrivateKycPath(application.kyc.documentFileUrl || '', application.userId)) {
      throw new Error('Approval requires a canonical private identity document; legacy URLs require migration.');
    }

    const now = new Date().toISOString();
    let newStatus: CompanionApplicationStatus;
    let userCompanionStatus: UserCompanionStatus;

    if (action === 'approve') {
      newStatus = 'APPROVED';
      userCompanionStatus = 'APPROVED';
    } else if (action === 'reject') {
      newStatus = 'REJECTED';
      userCompanionStatus = 'REJECTED';
    } else {
      newStatus = 'CHANGES_REQUIRED';
      userCompanionStatus = 'CHANGES_REQUIRED';
    }

    // 1. Update the application document.
    await firestore.updateDocument(`${APPLICATIONS}/${applicationId}`, {
      status: newStatus,
      reviewedBy: actor.id,
      reviewedAt: now,
      updatedAt: now,
      ...(action === 'reject' ? { rejectionReason: payload.reason || 'Does not meet SATHI requirements.' } : {}),
      ...(action === 'request_changes' ? { requestedChanges: payload.requestedChanges || payload.reason || '' } : {}),
      ...(action === 'approve' ? { 'kyc.verificationStatus': 'VERIFIED' } : {}),
    });

    // 2. Mirror lifecycle state onto the user profile.
    await firestore.updateDocument(`${USERS}/${application.userId}`, {
      companionStatus: userCompanionStatus,
      updatedAt: now,
    });

    // 3. On approval, activate the public companion profile.
    if (action === 'approve') {
      const ad = application.applicationData || ({} as CompanionApplication['applicationData']);
      await firestore.setDocument(
        `${COMPANIONS}/${application.userId}`,
        {
          id: application.userId,
          userId: application.userId,
          name: ad.displayName,
          bio: ad.bio || '',
          categories: ad.categories || [],
          languages: ad.languages || ['Nepali'],
          location: ad.location || '',
          hourlyRate: ad.hourlyRate || 1000,
          imageUrl: ad.imageUrl || '',
          isVerified: true,
          verificationBadge: 'KYC_VERIFIED',
          availability: true,
          createdAt: now,
          updatedAt: now,
        },
        true
      );
    }

    // 4. Immutable audit trail entry.
    const audit: Omit<AdminAuditLog, 'id'> = {
      action: `application.${action}`,
      actorId: actor.id,
      actorRole: actor.role,
      targetType: 'companion_application',
      targetId: applicationId,
      details: {
        applicationUserId: application.userId,
        ...(payload.reason ? { reason: payload.reason } : {}),
        ...(payload.requestedChanges ? { requestedChanges: payload.requestedChanges } : {}),
      },
      createdAt: now,
    };
    const auditId = newId('audit');
    await firestore.setDocument(`${AUDIT_LOGS}/${auditId}`, audit as Record<string, unknown>);
  },

  async listAuditLogs(limitCount = 50): Promise<AdminAuditLog[]> {
    return firestore.getDocuments<AdminAuditLog>(AUDIT_LOGS, {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  },
};
