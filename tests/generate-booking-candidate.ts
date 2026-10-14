import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const BASELINE_PATH = 'docs/sathi/rollbacks/phase-00-2026-09-10/firestore.rules';
const CANDIDATE_PATH = 'ops/containment/candidate-booking.firestore.rules';

function patchBookingLockContainment(rules) {
  // 1. Restrict companion approval fields on create.
  const companionCreate =
    "allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId && isValidData(request.resource.data) && " +
    "!request.resource.data.keys().hasAny(['isVerified','verificationBadge','rating','reviewsCount']) && " +
    "request.resource.data.get('isVerified',false) == false && " +
    "request.resource.data.get('rating',0) == 0 && " +
    "request.resource.data.get('reviewsCount',0) == 0;";

  const companionCreateOriginal =
    "allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId && isValidData(request.resource.data);";

  if (!rules.includes(companionCreateOriginal)) {
    throw new Error('Companion create rule mismatch');
  }
  rules = rules.replace(companionCreateOriginal, companionCreate);

  // 2. Restrict companion approval fields on update.
  const companionUpdateOriginal =
    "allow update: if isAuthenticated() && request.auth.uid == resource.data.userId && \n" +
    "                    request.resource.data.diff(resource.data).affectedKeys().hasOnly([\n" +
    "                      'name', 'bio', 'location', 'hourlyRate', 'gender', 'languages', 'interests', 'images', 'availableDays', 'updatedAt'\n" +
    "                    ]);";

  const companionUpdatePatched =
    "allow update: if isAuthenticated() && request.auth.uid == resource.data.userId && \n" +
    "                    request.resource.data.diff(resource.data).affectedKeys().hasOnly([\n" +
    "                      'name', 'bio', 'location', 'hourlyRate', 'gender', 'languages', 'interests', 'images', 'availableDays', 'updatedAt'\n" +
    "                    ]) && !request.resource.data.keys().hasAny(['isVerified','verificationBadge','rating','reviewsCount']);";

  if (!rules.includes(companionUpdateOriginal)) {
    throw new Error('Companion update rule mismatch');
  }
  rules = rules.replace(companionUpdateOriginal, companionUpdatePatched);

  // 3. Validate booking create initial state.
  const bookingCreateOriginal =
    "allow create: if isCustomer() && request.auth.uid == request.resource.data.userId && isValidData(request.resource.data);";

  const bookingCreatePatched =
    "allow create: if isCustomer() && request.auth.uid == request.resource.data.userId && isValidData(request.resource.data) && " +
    "request.resource.data.status == 'pending' && request.resource.data.paymentStatus == 'not_started' && " +
    "request.resource.data.policyVersion == 2;";

  if (!rules.includes(bookingCreateOriginal)) {
    throw new Error('Booking create rule mismatch');
  }
  rules = rules.replace(bookingCreateOriginal, bookingCreatePatched);

  // 4. Add booking state transition validation on update.
  const bookingUpdateOriginal =
    "allow update: if isAuthenticated() && (\n" +
    "        (request.auth.uid == resource.data.userId && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt'])) ||\n" +
    "        (isCompanion() && exists(/databases/$(database)/documents/companions/$(resource.data.companionId)) && request.auth.uid == get(/databases/$(database)/documents/companions/$(resource.data.companionId)).data.userId && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt'])) ||\n" +
    "        isAdmin()\n" +
    "      );";

  const bookingTransition =
    "function bookingTransition(data, next) {\n" +
    "      return (data.status == 'pending' && next == 'confirmed' && (request.auth.uid == data.companionUid || isAdmin())) ||\n" +
    "        (data.status == 'pending' && next == 'cancelled' && (request.auth.uid == data.userId || request.auth.uid == data.companionUid || isAdmin())) ||\n" +
    "        (data.status == 'confirmed' && next == 'active' && (request.auth.uid == data.companionUid || isAdmin())) ||\n" +
    "        (data.status == 'confirmed' && next == 'cancelled' && (request.auth.uid == data.userId || request.auth.uid == data.companionUid || isAdmin())) ||\n" +
    "        (data.status == 'active' && next == 'completed' && (request.auth.uid == data.companionUid || isAdmin())) ||\n" +
    "        (data.status == 'active' && next == 'cancelled' && (isAdmin()));\n" +
    "    }";

  const bookingUpdatePatched =
    "allow update: if resource.data.policyVersion == 2 && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status','updatedAt']) &&\n" +
    "        bookingTransition(resource.data, request.resource.data.status) &&\n" +
    "        (request.resource.data.status != 'active' || request.time >= resource.data.startAt) &&\n" +
    "        (request.resource.data.status != 'completed' || request.time >= resource.data.startAt + duration.value(resource.data.duration,'h'));";

  if (!rules.includes(bookingUpdateOriginal)) {
    throw new Error('Booking update rule mismatch');
  }
  rules = rules.replace(bookingUpdateOriginal, bookingUpdatePatched);
  rules = rules.replace(
    "    // Booking Locks Collection: /booking_locks/{lockId}",
    "    " + bookingTransition + "\n\n    // Booking Locks Collection: /booking_locks/{lockId}"
  );

  // 5. Allow lock updates tied to booking transitions.
  const lockUpdateOriginal =
    "allow update, delete: if isAdmin();";

  const lockUpdatePatched =
    "function lockBookingId(lockId, data) {\n" +
    "      return lockId == 'lock_' + data.companionId + '_' + data.date.replace('[^a-zA-Z0-9]', '_');\n" +
    "    }\n" +
    "    allow update: if request.resource.data.keys().hasOnly(['bookingId','companionId','date','status','updatedAt']);\n" +
    "    allow delete: if isAdmin();";

  if (!rules.includes(lockUpdateOriginal)) {
    throw new Error('Lock update rule mismatch');
  }
  rules = rules.replace(lockUpdateOriginal, lockUpdatePatched);

  return rules;
}

async function main() {
  const baseline = (await readFile(BASELINE_PATH, 'utf8')).replace(/\r\n/g, '\n');
  const candidate = patchBookingLockContainment(baseline);
  await writeFile(CANDIDATE_PATH, candidate, 'utf8');
  console.log('Candidate written to', CANDIDATE_PATH);
  console.log('SHA-256:', createHash('sha256').update(candidate).digest('hex'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
