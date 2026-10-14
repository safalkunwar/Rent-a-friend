import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUTHORITY_HASH, BOOKING_AUTHORITY_HASH, hash, patchCaseAuthority } from '../ops/companion-review-case-containment/patch.mjs';

test('standalone case candidate is an exact patch of the frozen authority candidate', async () => {
  const input = await readFile('ops/companion-authority-containment/candidate.firestore.rules', 'utf8');
  const candidate = await readFile('ops/companion-review-case-containment/candidate.firestore.rules', 'utf8');
  assert.equal(hash(input), AUTHORITY_HASH);
  assert.equal(candidate, patchCaseAuthority(input, AUTHORITY_HASH));
});

test('booking-combined case candidate and manifest agree with exact input hashes', async () => {
  const input = await readFile('ops/companion-authority-containment/booking-combined.firestore.rules', 'utf8');
  const candidate = await readFile('ops/companion-review-case-containment/booking-combined.firestore.rules', 'utf8');
  const manifest = JSON.parse(await readFile('ops/companion-review-case-containment/manifest.json', 'utf8'));
  assert.equal(hash(input), BOOKING_AUTHORITY_HASH);
  assert.equal(candidate, patchCaseAuthority(input, BOOKING_AUTHORITY_HASH));
  assert.equal(hash(candidate), manifest.bookingCombinedHash);
  assert.equal(manifest.deployment, 'NOT_PERFORMED');
});

test('case patch rejects an unreviewed source change', async () => {
  const input = await readFile('ops/companion-authority-containment/candidate.firestore.rules', 'utf8');
  assert.throws(() => patchCaseAuthority(input + '\n', AUTHORITY_HASH), /input drift/);
});
