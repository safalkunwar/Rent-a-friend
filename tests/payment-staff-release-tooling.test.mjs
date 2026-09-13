import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { APPROVED_HASH } from '../ops/payment-containment/release-api.mjs';
import { hash } from '../ops/payment-containment/patch.mjs';

test('deployer pins the exact source approved by the owner', async () => {
  assert.equal(hash(await readFile('ops/payment-containment/combined-candidate.firestore.rules', 'utf8')), APPROVED_HASH);
});
for (const script of ['deploy-combined.mjs', 'production-acceptance.mjs']) {
  test(`${script} refuses invocation without explicit rollout flag`, () => {
    const result = spawnSync(process.execPath, [`ops/payment-containment/${script}`], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Require exactly --approved-/);
  });
}
