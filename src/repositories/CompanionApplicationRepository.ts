import { firestore } from '../services/firestore';
import { CompanionApplication, AdminAuditLog, CompanionApplicationStatus, UserCompanionStatus } from '../types';
import { requireUid } from '../services/identity';
import { isPrivateKycPath } from '../services/uploadContract';
import { companionReviewEnabled } from '../services/releaseGates';
import { doc } from 'firebase/firestore';

export type ApplicationReviewAction = 'approve' | 'reject' | 'request_changes';

const APPLICATIONS = 'companion_applications';
const AUDIT_LOGS = 'admin_audit_logs';
const USERS = 'users';
const COMPANIONS = 'companions';
const REVIEW_CASES = 'companion_review_cases';
const APPLICATION_FIELDS = new Set(['displayName','bio','categories','languages','location','hourlyRate','imageUrl','yearsExperience']);
const KYC_FIELDS = new Set(['legalFullName','documentType','documentNumberMasked','documentFileUrl','selfieWithDocumentUrl','verificationStatus']);

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

  /** Root may use the status queue; reviewers only resolve their assigned case IDs. */
  async adminList(
    status: CompanionApplicationStatus | 'ALL',
    actor: { id: string; role: string },
    limitCount = 50
  ): Promise<CompanionApplication[]> {
    requireUid(actor.id);
    if (!Number.isInteger(limitCount) || limitCount < 1 || limitCount > 50) {
      throw new Error('Review page size must be between 1 and 50.');
    }
    if (actor.role === 'kyc_reviewer') {
      const cases = await firestore.getDocuments<{
        id: string; applicationId: string; subjectUid: string; reviewerUid: string; status: string;
      }>(REVIEW_CASES, {
        where: [{ field: 'reviewerUid', operator: '==', value: actor.id }],
        limitCount,
        throwOnError: true,
      });
      const assigned = cases.filter(reviewCase => reviewCase.status === 'ASSIGNED' &&
        reviewCase.reviewerUid === actor.id && reviewCase.applicationId === reviewCase.id);
      const applications = await Promise.all(assigned.map(reviewCase =>
        firestore.getDocument<CompanionApplication>(`${APPLICATIONS}/${reviewCase.applicationId}`, { throwOnError: true })
      ));
      return applications.filter((application, index): application is CompanionApplication =>
        !!application && application.userId === assigned[index].subjectUid &&
        (status === 'ALL' || application.status === status));
    }
    if (actor.role !== 'super_admin') throw new Error('A current companion-review role is required.');
    const options: Parameters<typeof firestore.getDocuments>[1] = {
      orderByField: 'submittedAt',
      orderDirection: 'desc',
      limitCount,
      throwOnError: true,
    };
    if (status !== 'ALL') {
      options.where = [{ field: 'status', operator: '==', value: status }];
    }
    return firestore.getDocuments<CompanionApplication>(APPLICATIONS, options);
  },

  /** Save draft/profile data while the application is still editable by its owner. */
  async saveDraft(applicationId: string, data: Partial<CompanionApplication['applicationData']>, kyc?: Partial<CompanionApplication['kyc']>): Promise<void> {
    requireUid();
    if (Object.keys(data).some(key => !APPLICATION_FIELDS.has(key)) ||
      (kyc && Object.keys(kyc).some(key => !KYC_FIELDS.has(key)))) {
      throw new Error('Application includes an unsupported field.');
    }
    if (kyc?.documentFileUrl && !isPrivateKycPath(kyc.documentFileUrl, requireUid())) {
      throw new Error('KYC must reference an owned private Storage path.');
    }
    if (kyc?.verificationStatus && kyc.verificationStatus !== 'UNVERIFIED') {
      throw new Error('KYC verification is reviewer-controlled.');
    }
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [key, value] of Object.entries(data)) updates[`applicationData.${key}`] = value;
    for (const [key, value] of Object.entries(kyc || {})) updates[`kyc.${key}`] = value;
    await firestore.updateDocument(`${APPLICATIONS}/${applicationId}`, updates);
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
    if (!companionReviewEnabled) {
      throw new Error('Companion reviews are unavailable pending evidence and reviewer-policy qualification.');
    }
    requireUid(actor.id);
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

    const auditId = newId('audit');
    const applicationRef = doc(firestore.collection<CompanionApplication>(APPLICATIONS), applicationId);
    const auditRef = doc(firestore.collection(AUDIT_LOGS), auditId);
    await firestore.runTransaction(async tx => {
      // All authority and its audit record must commit together. A concurrent
      // reviewer changes this document and causes the transaction to retry.
      const snap = await tx.get(applicationRef);
      if (!snap.exists()) throw new Error('Application not found');
      const application = snap.data() as CompanionApplication;
      if (application.userId === actor.id) throw new Error('Reviewers cannot review their own application.');
      if (!['SUBMITTED', 'UNDER_REVIEW'].includes(application.status)) {
        throw new Error('Application is no longer awaiting review.');
      }
      if (action === 'approve' && !isPrivateKycPath(application.kyc?.documentFileUrl || '', application.userId)) {
        throw new Error('Approval requires a canonical private identity document; legacy URLs require migration.');
      }
      if (action === 'approve' &&
        (!application.applicationData?.displayName?.trim() ||
          !application.applicationData?.location?.trim() ||
          !Number.isInteger(application.applicationData?.hourlyRate) ||
          application.applicationData.hourlyRate < 500)) {
        throw new Error('Approval requires a complete public profile and valid NPR rate.');
      }

      const userRef = doc(firestore.collection(USERS), application.userId);
      const companionRef = doc(firestore.collection(COMPANIONS), application.userId);
      const existingProfile = action === 'approve' ? await tx.get(companionRef) : null;
      if (existingProfile?.exists() && existingProfile.data().userId &&
        existingProfile.data().userId !== application.userId) {
        throw new Error('Existing companion profile belongs to a different account.');
      }
      tx.update(applicationRef, {
        status: newStatus,
        reviewedBy: actor.id,
        reviewedAt: now,
        reviewAuditId: auditId,
        updatedAt: now,
        ...(action === 'reject' ? { rejectionReason: payload.reason || 'Does not meet SATHI requirements.' } : {}),
        ...(action === 'request_changes' ? { requestedChanges: payload.requestedChanges || payload.reason || '' } : {}),
        ...(action === 'approve' ? { 'kyc.verificationStatus': 'VERIFIED' } : {}),
      });
      tx.update(userRef, { companionStatus: userCompanionStatus, companionApprovalApplicationId: applicationId, updatedAt: now });
      if (action === 'approve') {
        const ad = application.applicationData;
        tx.set(companionRef, {
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
          approvalApplicationId: applicationId,
          availability: true,
          ...(!existingProfile?.exists() ? { createdAt: now } : {}),
          updatedAt: now,
        }, { merge: true });
      }
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
      tx.set(auditRef, audit);
    });
  },

  async listAuditLogs(limitCount = 50): Promise<AdminAuditLog[]> {
    return firestore.getDocuments<AdminAuditLog>(AUDIT_LOGS, {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  },
};
