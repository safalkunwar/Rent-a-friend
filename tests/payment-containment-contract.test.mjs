import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BASELINE_PATH, BASELINE_HASH, hash, patchPayments, originalPayments, containedPayments } from '../ops/payment-containment/patch.mjs';
import { composeContainment } from '../ops/payment-containment/combined.mjs';
import { originalAssignments, containedAssignments } from '../ops/staff-containment/assignment-patch.mjs';

test('combined candidate preserves both fixes and changes no unrelated source', async () => {
  const baseline = await readFile(BASELINE_PATH, 'utf8');
  const combined = await readFile('ops/payment-containment/combined-candidate.firestore.rules', 'utf8');
  assert.equal(combined, composeContainment(baseline));
  assert.equal(combined.replace(containedAssignments, originalAssignments).replace(containedPayments, originalPayments), baseline);
  assert.throws(() => composeContainment(baseline + '\n'), /baseline drift/);
  const manifest = JSON.parse(await readFile('ops/payment-containment/combined-manifest.json', 'utf8'));
  assert.equal(manifest.candidateHash, hash(combined));
  assert.deepEqual(manifest.changedBranches, ['payments', 'admins']);
});

test('candidate changes exactly one payments branch, with no helper or unrelated permission edits', async () => {
  const baseline = await readFile(BASELINE_PATH, 'utf8');
  const candidate = await readFile('ops/payment-containment/candidate.firestore.rules', 'utf8');
  const manifest = JSON.parse(await readFile('ops/payment-containment/manifest.json', 'utf8'));
  assert.equal(hash(baseline), BASELINE_HASH);
  assert.equal(patchPayments(baseline), candidate);
  assert.equal(candidate.replace(containedPayments, originalPayments), baseline);
  assert.equal(manifest.candidateHash, hash(candidate));
  assert.deepEqual(manifest.changedBranches, ['payments']);
  assert.deepEqual(manifest.changedHelpers, []);
});

test('generation refuses a changed production baseline rather than patching stale permissions', async () => {
  const baseline = await readFile(BASELINE_PATH, 'utf8');
  assert.throws(() => patchPayments(baseline + '\n'), /baseline drift/);
  assert.throws(() => patchPayments(baseline.replace('allow delete: if false;', 'allow delete: if true;')), /baseline drift/);
});
