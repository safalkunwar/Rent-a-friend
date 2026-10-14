import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BASELINE_PATH, BASELINE_HASH, BOOKING_HASH, hash, patchCompanionAuthority } from '../ops/companion-authority-containment/patch.mjs';

test('standalone authority candidate is deterministically based on the last read active source', async () => {
  const baseline = await readFile(BASELINE_PATH, 'utf8');
  const candidate = await readFile('ops/companion-authority-containment/candidate.firestore.rules', 'utf8');
  assert.equal(hash(baseline), BASELINE_HASH);
  assert.equal(candidate, patchCompanionAuthority(baseline, BASELINE_HASH));
  assert.match(candidate, /allow read: if true;\s*\/\/ A public profile is a reviewer projection/);
});

test('booking-combined candidate composes the same authority patch over the tested booking source', async () => {
  const booking = await readFile('ops/booking-containment/candidate.firestore.rules', 'utf8');
  const combined = await readFile('ops/companion-authority-containment/booking-combined.firestore.rules', 'utf8');
  assert.equal(hash(booking), BOOKING_HASH);
  assert.equal(combined, patchCompanionAuthority(booking, BOOKING_HASH));
  assert.equal((combined.match(/BEGIN SATHI BOOKING COMPATIBILITY/g) || []).length, 1);
});

test('manifest hashes agree with the frozen local artifacts and state no deployment', async () => {
  const manifest = JSON.parse(await readFile('ops/companion-authority-containment/manifest.json', 'utf8'));
  const candidate = await readFile('ops/companion-authority-containment/candidate.firestore.rules', 'utf8');
  const combined = await readFile('ops/companion-authority-containment/booking-combined.firestore.rules', 'utf8');
  assert.equal(manifest.candidateHash, hash(candidate));
  assert.equal(manifest.combinedHash, hash(combined));
  assert.equal(manifest.deployment, 'NOT_PERFORMED');
});

test('generator rejects a changed source instead of silently rebasing', async () => {
  const baseline = await readFile(BASELINE_PATH, 'utf8');
  assert.throws(() => patchCompanionAuthority(baseline + '\n', BASELINE_HASH), /baseline drift/i);
});
