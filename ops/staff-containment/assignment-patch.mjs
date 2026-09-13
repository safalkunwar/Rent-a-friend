import { BASELINE_HASH, hash } from '../payment-containment/patch.mjs';

export const originalAssignments = `    match /admins/{adminId} {
      allow read: if isAuthenticated() && request.auth.uid == adminId;
      allow write: if isAdmin();
    }`;

export const containedAssignments = `    // Staff assignment management requires explicit trusted root claims.
    // A legacy profile role or an editable assignment is never root authority.
    function sathiAssignmentRoot() {
      return request.auth != null &&
        request.auth.token.get('firebase', {}).get('sign_in_provider', '') != 'anonymous' &&
        request.auth.token.get('adminRole', '') == 'super_admin';
    }
    match /admins/{adminId} {
      allow read: if (isAuthenticated() && request.auth.uid == adminId) || sathiAssignmentRoot();
      allow create, update: if sathiAssignmentRoot() &&
        request.resource.data.keys().hasAll(['uid', 'role', 'updatedAt']) &&
        request.resource.data.keys().hasOnly(['uid', 'role', 'updatedAt']) &&
        request.resource.data.uid == adminId &&
        request.resource.data.role in ['super_admin','platform_admin','safety_admin','moderation_admin','support_agent','booking_admin','finance_admin','kyc_reviewer','content_admin','analytics_admin','read_only_admin'] &&
        request.resource.data.updatedAt is string;
      allow delete: if sathiAssignmentRoot();
    }`;

export function patchAssignments(source) {
  if (hash(source) !== BASELINE_HASH) throw new Error('Staff assignment baseline drift; rebase and re-review.');
  if (source.split(originalAssignments).length !== 2) throw new Error('Expected exactly one admins branch.');
  return source.replace(originalAssignments, containedAssignments);
}
