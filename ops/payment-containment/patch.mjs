import { createHash } from 'node:crypto';

export const BASELINE_PATH = 'docs/sathi/rollbacks/staff-authority-read-2026-09-13T01-13-27-091Z/firestore.rules';
export const BASELINE_HASH = '28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497';
export const hash = source => createHash('sha256').update(source).digest('hex');
export const originalPayments = `    match /payments/{paymentId} {
      allow read: if isAuthenticated() && (request.auth.uid == resource.data.userId || isAdmin());
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId && isValidData(request.resource.data);
      allow create, update, delete: if isAdmin();
      allow update: if isAdmin();
      allow delete: if false;
    }`;
export const containedPayments = `    match /payments/{paymentId} {
      allow read: if isAuthenticated() && (request.auth.uid == resource.data.userId || isAdmin());
      // Payment truth must originate from a verified backend receipt.
      // This also denies browser administrators; staff approval is not provider proof.
      allow create, update, delete: if false;
    }`;

export function patchPayments(source) {
  if (hash(source) !== BASELINE_HASH) throw new Error('Payment containment baseline drift: rebase and review before generation.');
  if (source.split(originalPayments).length !== 2) throw new Error('Expected exactly one original payments branch.');
  return source.replace(originalPayments, containedPayments);
}
