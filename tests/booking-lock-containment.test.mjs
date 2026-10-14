import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hash, patchBookingLocks, bookingSection, fragment, ACTIVE_SOURCE, ACTIVE_HASH } from '../ops/booking-containment/patch.mjs';

test('paired candidate matches its manifest and uses the approved deployed baseline', async () => {
  const source = await readFile(ACTIVE_SOURCE, 'utf8');
  const candidate = await readFile('ops/booking-containment/candidate.firestore.rules', 'utf8');
  const manifest = JSON.parse(await readFile('ops/booking-containment/manifest.json', 'utf8'));
  assert.equal(hash(source), ACTIVE_HASH);
  assert.equal(candidate, patchBookingLocks(source));
  assert.equal(hash(candidate), manifest.candidateHash);
  assert.deepEqual(manifest.changedBranches, ['bookings', 'booking_locks']);
});
test('all unrelated rules are byte-identical and booking patch is reversible', async () => {
  const source = await readFile(ACTIVE_SOURCE, 'utf8');
  const { original } = bookingSection(source);
  assert.equal(patchBookingLocks(source).replace(fragment + '\n', original), source);
});
test('changed baseline anywhere is rejected, not just missing anchor text', async () => {
  const source = await readFile(ACTIVE_SOURCE, 'utf8');
  assert.throws(() => patchBookingLocks(source + '\n'), /baseline drift/);
});
test('candidate pairs both writes, locks quote/payment fields and requires explicit operator claims', () => {
  assert.match(fragment, /sathiBookingPairedLock\(request.resource.data,id\)/);
  assert.match(fragment, /paymentStatus == 'not_started'/);
  assert.match(fragment, /get\('adminRole', ''\) in \['super_admin', 'booking_admin'\]/);
  assert.doesNotMatch(fragment, /allow (create|update|delete)[^;]*isAdmin\(/);
  assert.match(fragment, /get\('sign_in_provider', ''\) != 'anonymous'/);
});
test('v2 generated transition matrix matches the actual shared booking policy', async () => {
  const policy = JSON.parse(await readFile('src/services/bookingPolicy.json', 'utf8'));
  const actor = { booker: 'sathiBookingOwn(data.userId)', companion: 'sathiBookingOwn(data.companionUid)', operator: 'sathiBookingOperator()' };
  for (const [from, nexts] of Object.entries(policy.transitions)) {
    for (const [to, roles] of Object.entries(nexts)) {
      assert.ok(fragment.includes("data.status == '" + from + "' && next == '" + to + "' && (" + roles.map(role => actor[role]).join(' || ') + ")"));
    }
  }
});
test('pre-release rollback source still matches its BEFORE manifest hash', async () => {
  const directory = 'docs/sathi/rollbacks/payment-staff-release-2026-09-13T01-51-14-023Z';
  const manifest = JSON.parse(await readFile(directory + '/predeploy.json', 'utf8'));
  assert.equal(hash(await readFile(directory + '/firestore.rules', 'utf8')), manifest.before.hash);
  assert.notEqual(manifest.before.hash, ACTIVE_HASH);
});
