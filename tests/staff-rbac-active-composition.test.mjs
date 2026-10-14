import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { helperOld, helperNew, analyticsOld, analyticsNew } from '../ops/staff-rbac-containment/patch.mjs';

const dir = 'ops/staff-rbac-containment/active-2026-10-14';
const hash = (content) => createHash('sha256').update(content).digest('hex');

test('current-source analytics candidate exactly composes from the active booking rules', async () => {
  const [baseline, candidate, manifestText] = await Promise.all([
    readFile(`${dir}/baseline.firestore.rules`, 'utf8'),
    readFile(`${dir}/candidate.firestore.rules`, 'utf8'),
    readFile(`${dir}/manifest.json`, 'utf8'),
  ]);
  const manifest = JSON.parse(manifestText);
  assert.equal(hash(baseline), '8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f');
  assert.equal(manifest.baselineHash, hash(baseline));
  assert.equal(manifest.candidateHash, hash(candidate));
  assert.equal(candidate, baseline.replace(helperOld, helperNew).replace(analyticsOld, analyticsNew));
  assert.equal(manifest.deployment, 'DEPLOYED_AND_READBACK_PASS');
  assert.equal(manifest.activeRelease.rulesetName, 'projects/hamrosathi1/rulesets/03145504-14d0-4f91-a9f6-8190c7803a98');
  assert.equal(manifest.liveAcceptance, 'PASS_7_CHECKS_CLEANUP_PASS');
});

test('current-source analytics candidate retains byte-identical unrelated rules', async () => {
  const [baseline, candidate] = await Promise.all([
    readFile(`${dir}/baseline.firestore.rules`, 'utf8'),
    readFile(`${dir}/candidate.firestore.rules`, 'utf8'),
  ]);
  const helperStart = baseline.indexOf(helperOld);
  const analyticsStart = baseline.indexOf(analyticsOld);
  const candidateHelperStart = candidate.indexOf(helperNew);
  const candidateAnalyticsStart = candidate.indexOf(analyticsNew);
  assert.notEqual(helperStart, -1);
  assert.notEqual(analyticsStart, -1);
  assert.notEqual(candidateHelperStart, -1);
  assert.notEqual(candidateAnalyticsStart, -1);
  assert.equal(candidate.slice(0, helperStart), baseline.slice(0, helperStart));
  assert.equal(candidate.slice(candidateHelperStart + helperNew.length, candidateAnalyticsStart),
    baseline.slice(helperStart + helperOld.length, analyticsStart));
  assert.equal(candidate.slice(candidateAnalyticsStart + analyticsNew.length),
    baseline.slice(analyticsStart + analyticsOld.length));
});
