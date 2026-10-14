import { createHash } from 'node:crypto';

export const BASELINE_PATH = 'ops/payment-containment/combined-candidate.firestore.rules';
export const BASELINE_HASH = '764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402';
export const BOOKING_HASH = '8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f';
export const hash = value => createHash('sha256').update(value).digest('hex');

function replaceOnce(source, oldText, newText) {
  const start = source.indexOf(oldText);
  if (start < 0 || source.indexOf(oldText, start + oldText.length) !== -1) {
    throw new Error(`Expected one exact authority anchor: ${oldText.slice(0, 60)}`);
  }
  return source.slice(0, start) + newText + source.slice(start + oldText.length);
}

function replaceBetween(source, first, last, replacement) {
  const start = source.indexOf(first);
  const end = source.indexOf(last, start + first.length);
  if (start < 0 || end < 0 || source.indexOf(first, start + first.length) >= 0 || source.indexOf(last, end + last.length) >= 0) {
    throw new Error(`Authority branch anchor drift: ${first}`);
  }
  return source.slice(0, start) + replacement + source.slice(end);
}

const helpers = `    // BEGIN SATHI COMPANION AUTHORITY CONTAINMENT
    function sathiAuthorityMember() {
      return request.auth != null && request.auth.token.get('firebase', {}).get('sign_in_provider', '') != 'anonymous';
    }
    function sathiAuthorityRoot() {
      return sathiAuthorityMember() && request.auth.token.get('adminRole', '') == 'super_admin';
    }
    function sathiAuthorityReviewer() {
      return sathiAuthorityRoot() || (sathiAuthorityMember() &&
        request.auth.token.get('adminRole', '') == 'kyc_reviewer' &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'kyc_reviewer');
    }
    function sathiAuthorityUserFieldsChanged() {
      return request.resource.data.diff(resource.data).affectedKeys().hasAny([
        'role','status','companionStatus','companionApprovalApplicationId','verificationStatus','kycVerificationStatus','adminRole']);
    }
    function sathiApprovalAppAfter(uid, appId, nextStatus) {
      return appId is string && appId.size() > 0 &&
        get(/databases/$(database)/documents/companion_applications/$(appId)).data.status in ['SUBMITTED','UNDER_REVIEW'] &&
        getAfter(/databases/$(database)/documents/companion_applications/$(appId)).data.status == nextStatus &&
        getAfter(/databases/$(database)/documents/companion_applications/$(appId)).data.userId == uid &&
        getAfter(/databases/$(database)/documents/companion_applications/$(appId)).data.reviewedBy == request.auth.uid;
    }
    // END SATHI COMPANION AUTHORITY CONTAINMENT

`;

const companions = `    // Companions Collection: /companions/{companionId}
    match /companions/{companionId} {
      // Preserve public discovery of existing profiles; eligibility is checked at commitment time.
      allow read: if true;
      // A public profile is a reviewer projection, not an owner-created verification claim.
      allow create: if sathiAuthorityReviewer() && request.auth.uid != companionId &&
        request.resource.data.userId == companionId && request.resource.data.id == companionId &&
        request.resource.data.isVerified == true && request.resource.data.verificationBadge == 'KYC_VERIFIED' &&
        request.resource.data.keys().hasOnly([
          'id','userId','name','bio','categories','languages','location','hourlyRate','imageUrl',
          'isVerified','verificationBadge','approvalApplicationId','availability','createdAt','updatedAt'
        ]) &&
        sathiApprovalAppAfter(companionId, request.resource.data.approvalApplicationId, 'APPROVED') &&
        getAfter(/databases/$(database)/documents/users/$(companionId)).data.companionStatus == 'APPROVED' &&
        getAfter(/databases/$(database)/documents/users/$(companionId)).data.companionApprovalApplicationId == request.resource.data.approvalApplicationId;
      // Preserve bounded owner edits, without touching verification, identity or rating authority.
      allow update: if sathiAuthorityMember() && request.auth.uid == resource.data.userId &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          'name','bio','location','hourlyRate','gender','languages','interests','images','availableDays','updatedAt'
        ]);
      // Non-review staff may edit presentation fields but not create/verify a provider.
      allow update: if isAdmin() && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
        'name','bio','categories','languages','location','imageUrl','availability','updatedAt','availableDays'
      ]);
      allow update: if sathiAuthorityReviewer() && request.auth.uid != companionId &&
        resource.data.get('userId', companionId) == companionId &&
        request.resource.data.userId == companionId &&
        request.resource.data.isVerified == true && request.resource.data.verificationBadge == 'KYC_VERIFIED' &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          'id','userId','name','bio','categories','languages','location','hourlyRate','imageUrl',
          'isVerified','verificationBadge','approvalApplicationId','availability','createdAt','updatedAt'
        ]) &&
        sathiApprovalAppAfter(companionId, request.resource.data.approvalApplicationId, 'APPROVED') &&
        getAfter(/databases/$(database)/documents/users/$(companionId)).data.companionStatus == 'APPROVED' &&
        getAfter(/databases/$(database)/documents/users/$(companionId)).data.companionApprovalApplicationId == request.resource.data.approvalApplicationId;
      allow delete: if false; // No direct destruction of a reviewed public identity.
    }

`;

const applications = `    // Companion Applications: /companion_applications/{applicationId}
    // Lifecycle: DRAFT -> SUBMITTED -> (UNDER_REVIEW) -> APPROVED / REJECTED / CHANGES_REQUIRED
    match /companion_applications/{applicationId} {
      allow read: if sathiAuthorityMember() &&
        (request.auth.uid == resource.data.userId || sathiAuthorityReviewer());
      allow create: if sathiAuthorityMember() && request.auth.uid == request.resource.data.userId &&
        request.resource.data.id == applicationId &&
        request.resource.data.keys().hasOnly(['id','userId','status','applicationData','kyc','submittedAt','createdAt','updatedAt']) &&
        request.resource.data.status in ['DRAFT','SUBMITTED'] &&
        request.resource.data.kyc.verificationStatus == 'UNVERIFIED' && isValidData(request.resource.data);
      allow update: if sathiAuthorityMember() && request.auth.uid == resource.data.userId &&
        resource.data.status in ['DRAFT','CHANGES_REQUIRED'] &&
        request.resource.data.status in ['DRAFT','SUBMITTED','CHANGES_REQUIRED'] &&
        request.resource.data.kyc.verificationStatus == 'UNVERIFIED' &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          'applicationData','kyc','status','submittedAt','updatedAt']) && isValidData(request.resource.data);
      allow update: if sathiAuthorityReviewer() && request.auth.uid != resource.data.userId &&
        resource.data.status in ['SUBMITTED','UNDER_REVIEW'] &&
        request.resource.data.userId == resource.data.userId &&
        request.resource.data.status in ['APPROVED','REJECTED','CHANGES_REQUIRED'] &&
        request.resource.data.reviewedBy == request.auth.uid &&
        request.resource.data.reviewAuditId is string && request.resource.data.reviewAuditId.size() > 0 &&
        !exists(/databases/$(database)/documents/admin_audit_logs/$(request.resource.data.reviewAuditId)) &&
        getAfter(/databases/$(database)/documents/admin_audit_logs/$(request.resource.data.reviewAuditId)).data.actorId == request.auth.uid &&
        getAfter(/databases/$(database)/documents/admin_audit_logs/$(request.resource.data.reviewAuditId)).data.targetId == applicationId &&
        getAfter(/databases/$(database)/documents/admin_audit_logs/$(request.resource.data.reviewAuditId)).data.action ==
          (request.resource.data.status == 'APPROVED' ? 'application.approve' :
           request.resource.data.status == 'REJECTED' ? 'application.reject' : 'application.request_changes') &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          'status','reviewedBy','reviewedAt','reviewAuditId','updatedAt','rejectionReason','requestedChanges','kyc']) &&
        request.resource.data.kyc.diff(resource.data.kyc).affectedKeys().hasOnly(['verificationStatus']) &&
        getAfter(/databases/$(database)/documents/users/$(resource.data.userId)).data.companionApprovalApplicationId == applicationId &&
        getAfter(/databases/$(database)/documents/users/$(resource.data.userId)).data.companionStatus == request.resource.data.status &&
        ((request.resource.data.status == 'APPROVED' &&
          request.resource.data.kyc.verificationStatus == 'VERIFIED' &&
          getAfter(/databases/$(database)/documents/companions/$(resource.data.userId)).data.isVerified == true &&
          getAfter(/databases/$(database)/documents/companions/$(resource.data.userId)).data.approvalApplicationId == applicationId) ||
         (request.resource.data.status != 'APPROVED' &&
          request.resource.data.kyc == resource.data.kyc));
      allow delete: if false; // Keep review and evidence history.
    }

`;

export function patchCompanionAuthority(source, expectedHash) {
  if (hash(source) !== expectedHash || ![BASELINE_HASH, BOOKING_HASH].includes(expectedHash)) {
    throw new Error('Authority baseline drift; fresh production and candidate review required.');
  }
  let result = replaceOnce(source, '    // Users Collection: /users/{userId}', helpers + '    // Users Collection: /users/{userId}');
  result = replaceOnce(result,
    '      allow create: if isAdmin() && sathiPhotoCreateSafe();',
    `      allow create: if isAdmin() && sathiPhotoCreateSafe() &&
        !request.resource.data.keys().hasAny(['companionStatus','companionApprovalApplicationId','verificationStatus','kycVerificationStatus','adminRole']) &&
        (request.resource.data.get('role','customer') != 'admin' || sathiAuthorityRoot());`);
  result = replaceOnce(result,
    '      allow update: if isAdmin() && !sathiPhotoChanged();',
    `      allow update: if isAdmin() && !sathiPhotoChanged() && !sathiAuthorityUserFieldsChanged();
      allow update: if sathiAuthorityRoot() && !sathiPhotoChanged() &&
        !request.resource.data.diff(resource.data).affectedKeys().hasAny([
          'companionStatus','verificationStatus','kycVerificationStatus','companionApprovalApplicationId']);
      allow update: if sathiAuthorityReviewer() && request.auth.uid != userId &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          'companionStatus','companionApprovalApplicationId','updatedAt']) &&
        request.resource.data.companionStatus in ['APPROVED','REJECTED','CHANGES_REQUIRED'] &&
        sathiApprovalAppAfter(userId, request.resource.data.companionApprovalApplicationId,
          request.resource.data.companionStatus) &&
        (request.resource.data.companionStatus != 'APPROVED' ||
          (getAfter(/databases/$(database)/documents/companions/$(userId)).data.isVerified == true &&
           getAfter(/databases/$(database)/documents/companions/$(userId)).data.approvalApplicationId == request.resource.data.companionApprovalApplicationId));`);
  result = replaceBetween(result,
    '    // Companions Collection: /companions/{companionId}',
    '    // Activities Collection: /activities/{activityId}', companions);
  result = replaceBetween(result,
    '    // Companion Applications: /companion_applications/{applicationId}',
    '    // Admin Audit Logs: /admin_audit_logs/{logId}', applications);
  return result;
}
