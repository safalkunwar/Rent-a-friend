import { createHash } from 'node:crypto';

export const AUTHORITY_HASH = '966cb23050ee082543c449b359a74e2e6c15a091e001f62d9e07eb8dc5cc28b4';
export const BOOKING_AUTHORITY_HASH = 'b6eb8e7503db696e8afee82d7c910d6c22d9cba7e31b230bbc4196c6cf8c444c';
export const hash = source => createHash('sha256').update(source).digest('hex');

function replaceOnce(source, before, after) {
  const at = source.indexOf(before);
  if (at < 0 || source.indexOf(before, at + before.length) >= 0) {
    throw new Error(`Case authority anchor drift: ${before.slice(0, 60)}`);
  }
  return source.slice(0, at) + after + source.slice(at + before.length);
}

const caseHelpers = `    function sathiAuthorityAssignedCase(appId, subjectUid) {
      return appId is string && appId.size() > 0 &&
        sathiAuthorityReviewer() &&
        exists(/databases/$(database)/documents/companion_review_cases/$(appId)) &&
        get(/databases/$(database)/documents/companion_review_cases/$(appId)).data.applicationId == appId &&
        get(/databases/$(database)/documents/companion_review_cases/$(appId)).data.subjectUid == subjectUid &&
        get(/databases/$(database)/documents/companion_review_cases/$(appId)).data.reviewerUid == request.auth.uid &&
        get(/databases/$(database)/documents/companion_review_cases/$(appId)).data.status == 'ASSIGNED';
    }
    function sathiAuthorityReviewAuthorized(appId, subjectUid) {
      return sathiAuthorityRoot() || sathiAuthorityAssignedCase(appId, subjectUid);
    }
    function sathiCaseAuditAfter(auditId, action, appId, subjectUid, reviewerUid, version) {
      return auditId is string && auditId.size() > 0 &&
        !exists(/databases/$(database)/documents/admin_audit_logs/$(auditId)) &&
        existsAfter(/databases/$(database)/documents/admin_audit_logs/$(auditId)) &&
        getAfter(/databases/$(database)/documents/admin_audit_logs/$(auditId)).data.action == action &&
        getAfter(/databases/$(database)/documents/admin_audit_logs/$(auditId)).data.actorId == request.auth.uid &&
        getAfter(/databases/$(database)/documents/admin_audit_logs/$(auditId)).data.targetId == appId &&
        getAfter(/databases/$(database)/documents/admin_audit_logs/$(auditId)).data.subjectUid == subjectUid &&
        getAfter(/databases/$(database)/documents/admin_audit_logs/$(auditId)).data.reviewerUid == reviewerUid &&
        getAfter(/databases/$(database)/documents/admin_audit_logs/$(auditId)).data.caseVersion == version;
    }
`;

const cases = `    // A case assignment is not KYC evidence or approval. Only root may assign/revoke.
    match /companion_review_cases/{applicationId} {
      allow get: if sathiAuthorityRoot() ||
        (sathiAuthorityReviewer() && resource.data.reviewerUid == request.auth.uid);
      allow list: if request.query.limit <= 50 &&
        (sathiAuthorityRoot() ||
          (sathiAuthorityReviewer() && resource.data.reviewerUid == request.auth.uid));
      allow create: if sathiAuthorityRoot() &&
        request.resource.data.keys().hasOnly([
          'applicationId','subjectUid','reviewerUid','status','assignedBy','assignmentAuditId','version','createdAt','updatedAt']) &&
        request.resource.data.keys().hasAll([
          'applicationId','subjectUid','reviewerUid','status','assignedBy','assignmentAuditId','version','createdAt','updatedAt']) &&
        request.resource.data.applicationId == applicationId &&
        request.resource.data.subjectUid ==
          get(/databases/$(database)/documents/companion_applications/$(applicationId)).data.userId &&
        get(/databases/$(database)/documents/companion_applications/$(applicationId)).data.status in ['SUBMITTED','UNDER_REVIEW'] &&
        request.resource.data.reviewerUid is string &&
        request.resource.data.reviewerUid != request.resource.data.subjectUid &&
        request.resource.data.reviewerUid != request.auth.uid &&
        exists(/databases/$(database)/documents/admins/$(request.resource.data.reviewerUid)) &&
        get(/databases/$(database)/documents/admins/$(request.resource.data.reviewerUid)).data.role == 'kyc_reviewer' &&
        request.resource.data.status == 'ASSIGNED' &&
        request.resource.data.assignedBy == request.auth.uid &&
        request.resource.data.version == 1 &&
        request.resource.data.createdAt is string && request.resource.data.updatedAt is string &&
        sathiCaseAuditAfter(request.resource.data.assignmentAuditId,
          'companion_review_case.assign', applicationId, request.resource.data.subjectUid,
          request.resource.data.reviewerUid, 1);
      allow update: if sathiAuthorityRoot() &&
        resource.data.status == 'ASSIGNED' && request.resource.data.status == 'REVOKED' &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status','updatedAt','version','revocationAuditId']) &&
        request.resource.data.keys().hasAll(['revocationAuditId']) &&
        request.resource.data.version == resource.data.version + 1 &&
        sathiCaseAuditAfter(request.resource.data.revocationAuditId,
          'companion_review_case.revoke', applicationId, resource.data.subjectUid,
          resource.data.reviewerUid, request.resource.data.version);
      allow delete: if false;
    }

`;

export function patchCaseAuthority(source, expectedHash) {
  if (hash(source) !== expectedHash || ![AUTHORITY_HASH, BOOKING_AUTHORITY_HASH].includes(expectedHash)) {
    throw new Error('Case authority input drift; regenerate only after a reviewed source change.');
  }
  let result = replaceOnce(source, '    function sathiAuthorityUserFieldsChanged() {',
    caseHelpers + '    function sathiAuthorityUserFieldsChanged() {');
  result = replaceOnce(result, '      return appId is string && appId.size() > 0 &&\n        get(/databases/$(database)/documents/companion_applications/$(appId)).data.status',
    '      return sathiAuthorityReviewAuthorized(appId, uid) && appId is string && appId.size() > 0 &&\n        get(/databases/$(database)/documents/companion_applications/$(appId)).data.status');
  result = replaceOnce(result, 'allow update: if sathiAuthorityReviewer() && request.auth.uid != userId',
    'allow update: if sathiAuthorityReviewAuthorized(request.resource.data.companionApprovalApplicationId, userId) && request.auth.uid != userId');
  result = replaceOnce(result, 'allow create: if sathiAuthorityReviewer() && request.auth.uid != companionId',
    'allow create: if sathiAuthorityReviewAuthorized(request.resource.data.approvalApplicationId, companionId) && request.auth.uid != companionId');
  result = replaceOnce(result, 'allow update: if sathiAuthorityReviewer() && request.auth.uid != companionId',
    'allow update: if sathiAuthorityReviewAuthorized(request.resource.data.approvalApplicationId, companionId) && request.auth.uid != companionId');
  result = replaceOnce(result,
    `      allow read: if sathiAuthorityMember() &&
        (request.auth.uid == resource.data.userId || sathiAuthorityReviewer());`,
    `      allow get: if sathiAuthorityMember() &&
        (request.auth.uid == resource.data.userId ||
          sathiAuthorityReviewAuthorized(applicationId, resource.data.userId));
      allow list: if sathiAuthorityMember() &&
        (request.auth.uid == resource.data.userId || sathiAuthorityRoot());`);
  result = replaceOnce(result, 'allow update: if sathiAuthorityReviewer() && request.auth.uid != resource.data.userId',
    'allow update: if sathiAuthorityReviewAuthorized(applicationId, resource.data.userId) && request.auth.uid != resource.data.userId');
  result = replaceOnce(result, '    // Admin Audit Logs: /admin_audit_logs/{logId}',
    cases + '    // Admin Audit Logs: /admin_audit_logs/{logId}');
  return result;
}
