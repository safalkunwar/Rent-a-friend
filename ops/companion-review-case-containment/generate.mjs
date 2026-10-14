import { readFile, writeFile } from 'node:fs/promises';
import { AUTHORITY_HASH, BOOKING_AUTHORITY_HASH, hash, patchCaseAuthority } from './patch.mjs';

const authority = await readFile('ops/companion-authority-containment/candidate.firestore.rules', 'utf8');
const bookingAuthority = await readFile('ops/companion-authority-containment/booking-combined.firestore.rules', 'utf8');
const candidate = patchCaseAuthority(authority, AUTHORITY_HASH);
const bookingCombined = patchCaseAuthority(bookingAuthority, BOOKING_AUTHORITY_HASH);
await writeFile('ops/companion-review-case-containment/candidate.firestore.rules', candidate);
await writeFile('ops/companion-review-case-containment/booking-combined.firestore.rules', bookingCombined);
await writeFile('ops/companion-review-case-containment/manifest.json', JSON.stringify({
  mode: 'LOCAL_COMPANION_CASE_SCOPE_CANDIDATE', project: 'hamrosathi1',
  authorityInputHash: AUTHORITY_HASH, bookingAuthorityInputHash: BOOKING_AUTHORITY_HASH,
  candidateHash: hash(candidate), bookingCombinedHash: hash(bookingCombined),
  changedBranches: ['users', 'companions', 'companion_applications', 'companion_review_cases'],
  changedHelpers: ['sathiAuthorityAssignedCase', 'sathiAuthorityReviewAuthorized', 'sathiCaseAuditAfter', 'sathiApprovalAppAfter'],
  deployment: 'NOT_PERFORMED',
  limitations: 'Case assignment/revocation require matching immutable audit docs in one write; no operational/backend command, KYC evidence, age or full reviewer queue qualification.',
}, null, 2) + '\n');
console.log(JSON.stringify({ candidateHash: hash(candidate), bookingCombinedHash: hash(bookingCombined) }));
