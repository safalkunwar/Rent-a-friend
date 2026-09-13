import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile as readAsync } from 'node:fs/promises';
import { hash, patchStaffRbac, ACTIVE_SOURCE, ACTIVE_HASH, helperOld, helperNew, analyticsOld, analyticsNew } from '../ops/staff-rbac-containment/patch.mjs';

const CANDIDATE_HASH = '9f8d3b0eb782143d8481c82da0ef8bb55cb1dbee61fb2bb2465f16bfb4a72b64';

describe('Staff RBAC containment — static contract', () => {
  test('candidate hash matches manifest', async () => {
    const manifest = JSON.parse(await readAsync('ops/staff-rbac-containment/manifest.json', 'utf8'));
    const candidate = readFileSync('ops/staff-rbac-containment/candidate.firestore.rules', 'utf8');
    assert.equal(manifest.candidateHash, hash(candidate));
    assert.equal(manifest.baselineHash, ACTIVE_HASH);
    assert.deepEqual(manifest.changedBranches, ['analytics']);
    assert.deepEqual(manifest.changedHelpers, ['isResourceAdmin']);
  });

  test('candidate composed from active source', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    assert.equal(hash(source), ACTIVE_HASH);
    const candidate = patchStaffRbac(source);
    assert.equal(hash(candidate), CANDIDATE_HASH);
  });

  test('patch is reversible', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    const candidate = patchStaffRbac(source);
    assert.notEqual(candidate, source);

    const restored = candidate.replace(helperNew, () => helperOld).replace(analyticsNew, () => analyticsOld);
    assert.equal(restored, source);
  });

  test('patch requires baseline and rejects drift', async () => {
    const source = (await readAsync(ACTIVE_SOURCE, 'utf8')).replace('isContentAdmin', 'isContentadmins');
    assert.throws(() => patchStaffRbac(source), /Helper anchor not found/);
  });

  test('unchanged bytes outside analytics branch and isResourceAdmin helper', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    const candidate = patchStaffRbac(source);

    const beforeHelper = source.slice(0, source.indexOf('    function isContentAdmin'));
    const candBeforeHelper = candidate.slice(0, candidate.indexOf('    function isContentAdmin'));
    assert.equal(candBeforeHelper, beforeHelper,
      'Source must be byte-identical before the isResourceAdmin helper');

    const analyticsStart = source.indexOf('    // Analytics Collection:');
    assert.notEqual(analyticsStart, -1);
    const analyticsEnd = source.indexOf('    // Booking Locations Collection:');
    assert.notEqual(analyticsEnd, -1);
    const after = source.slice(analyticsEnd);

    const candAnalyticsEnd = candidate.indexOf('    // Booking Locations Collection:');
    assert.notEqual(candAnalyticsEnd, -1);
    const afterPart = candidate.slice(candAnalyticsEnd);
    assert.equal(afterPart, after,
      'Source must be byte-identical after the analytics branch');
  });

  test('analytics uses isResourceAdmin not isAdmin', () => {
    const candidate = readFileSync('ops/staff-rbac-containment/candidate.firestore.rules', 'utf8');
    const analyticsStart = candidate.indexOf('// Analytics Collection:');
    const analyticsEnd = candidate.indexOf('// Admins Collection:', analyticsStart);
    const analyticsSection = candidate.slice(analyticsStart, analyticsEnd);

    assert.match(analyticsSection, /isResourceAdmin\(\['super_admin', 'platform_admin'\]\)/);
    assert.doesNotMatch(analyticsSection, /allow read: if isAdmin\(\);/);
  });

  test('isResourceAdmin helper is non-anonymous with claim gate', () => {
    const candidate = readFileSync('ops/staff-rbac-containment/candidate.firestore.rules', 'utf8');
    const helperStart = candidate.indexOf('function isResourceAdmin');
    const helperEnd = candidate.indexOf('// Helper function to check if the requested data is valid', helperStart);
    const helperSection = candidate.slice(helperStart, helperEnd);

    assert.match(helperSection, /!isAnonymous\(\)/);
    assert.match(helperSection, /request\.auth\.token\.get\('adminRole', ''\) in requiredRoles/);
  });

  test('all other isAdmin() calls unchanged', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    const candidate = patchStaffRbac(source);
    const sourceCount = (source.match(/isAdmin\(\)/g) || []).length;
    const candidateCount = (candidate.match(/isAdmin\(\)/g) || []).length;
    assert.equal(candidateCount, sourceCount, 'isAdmin() call count must be unchanged outside analytics');
  });
});
