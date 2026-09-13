import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const ACTIVE_SOURCE = 'docs/sathi/rollbacks/payment-staff-release-2026-09-13T01-51-14-023Z/firestore.rules';
const ACTIVE_HASH = '764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402';
const OUTPUT = 'ops/staff-rbac-containment/candidate.firestore.rules';

export function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

const helperOld = `    function isContentAdmin() {
      return isAuthenticated() && (
        request.auth.token.adminRole in ['super_admin', 'content_admin'] ||
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role in ['super_admin', 'content_admin']
      );
    }

    // Helper function to check if the requested data is valid`;

const helperNew = `    function isContentAdmin() {
      return isAuthenticated() && (
        request.auth.token.adminRole in ['super_admin', 'content_admin'] ||
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role in ['super_admin', 'content_admin']
      );
    }

    function isResourceAdmin(requiredRoles) {
      return isAuthenticated() &&
        !isAnonymous() &&
        request.auth.token.get('adminRole', '') in requiredRoles;
    }

    // Helper function to check if the requested data is valid`;

const analyticsOld = `    // Analytics Collection: /analytics/{analyticId}
    match /analytics/{analyticId} {
      allow read: if isAdmin();
      allow create: if false;
      allow update, delete: if false;
    }`;

const analyticsNew = `    // Analytics Collection: /analytics/{analyticId}
    // Analytics are platform-owned business intelligence; only explicitly
    // granted platform roles may read. This does NOT remove isAdmin() for
    // other collections — this is a scoped containment, not a full RBAC pass.
    match /analytics/{analyticId} {
      allow read: if isResourceAdmin(['super_admin', 'platform_admin']);
      allow create: if false;
      allow update, delete: if false;
    }`;

export function patchStaffRbac(source) {
  if (!source.includes(helperOld)) throw new Error('Helper anchor not found; baseline may have drifted.');
  let result = source.replace(helperOld, () => helperNew);
  if (!result.includes(analyticsOld)) throw new Error('Analytics branch not found; baseline may have drifted.');
  result = result.replace(analyticsOld, () => analyticsNew);
  return result;
}

export { ACTIVE_SOURCE, ACTIVE_HASH, helperOld, helperNew, analyticsOld, analyticsNew };

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = await readFile(ACTIVE_SOURCE, 'utf8');
  if (hash(source) !== ACTIVE_HASH) throw new Error(`Baseline hash mismatch: expected ${ACTIVE_HASH}, got ${hash(source)}`);
  const candidate = patchStaffRbac(source);
  await writeFile(OUTPUT, candidate);
  console.log(JSON.stringify({ candidateHash: hash(candidate), changedBranches: ['analytics'], changedHelpers: ['isResourceAdmin'] }));
}
