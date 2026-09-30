import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile as readAsync } from 'node:fs/promises';
import { hash, patchCombined, ACTIVE_SOURCE, ACTIVE_HASH, patches } from '../ops/combined-containment/patch.mjs';

const CANDIDATE_HASH = 'f5df74d90ae481e8ad66277661ac658ddb91f28b147e27f564ce07033679d8ba';

describe('Combined containment — static contract', () => {
  test('candidate hash matches manifest', async () => {
    const manifest = JSON.parse(await readAsync('ops/combined-containment/manifest.json', 'utf8'));
    const candidate = readFileSync('ops/combined-containment/candidate.firestore.rules', 'utf8');
    assert.equal(manifest.candidateHash, hash(candidate));
    assert.equal(manifest.baselineHash, ACTIVE_HASH);
    assert.deepEqual(manifest.changedBranches, ['analytics', 'auditLogs', 'suspiciousActivity', 'sosAlerts', 'booking_locks']);
    assert.deepEqual(manifest.changedHelpers, ['isResourceAdmin']);
  });

  test('candidate composed from active source', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    assert.equal(hash(source), ACTIVE_HASH);
    const candidate = patchCombined(source);
    assert.equal(hash(candidate), CANDIDATE_HASH);
  });

  test('patch is fully reversible', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    const candidate = patchCombined(source);
    assert.notEqual(candidate, source);

    let restored = candidate;
    for (const p of patches) {
      restored = restored.replace(p.new, () => p.old);
    }
    assert.equal(restored, source);
  });

  test('patch requires baseline and rejects drift', async () => {
    const source = (await readAsync(ACTIVE_SOURCE, 'utf8')).replace('isContentAdmin', 'isContentadmin');
    assert.throws(() => patchCombined(source), /isResourceAdmin helper: anchor not found/);
  });

  test('isAdmin() call count reduced by scoped replacements', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    const candidate = patchCombined(source);
    const sourceCount = (source.match(/isAdmin\(\)/g) || []).length;
    const candidateCount = (candidate.match(/isAdmin\(\)/g) || []).length;
    assert.ok(candidateCount < sourceCount,
      `isAdmin() count should decrease from ${sourceCount} to ${candidateCount}`);
    assert.equal(sourceCount - candidateCount, 8,
      'Should remove exactly 8 isAdmin() calls (analytics/auditLogs/suspiciousActivity/sosAlerts/booking_locks)');
  });

  test('analytics uses isResourceAdmin', () => {
    const candidate = readFileSync('ops/combined-containment/candidate.firestore.rules', 'utf8');
    const analyticsStart = candidate.indexOf('// Analytics Collection:');
    const analyticsEnd = candidate.indexOf('// Admins Collection:', analyticsStart);
    const section = candidate.slice(analyticsStart, analyticsEnd);
    assert.match(section, /isResourceAdmin\(\['super_admin', 'platform_admin'\]\)/);
    assert.doesNotMatch(section, /allow read: if isAdmin\(\);/);
  });

  test('auditLogs uses isResourceAdmin', () => {
    const candidate = readFileSync('ops/combined-containment/candidate.firestore.rules', 'utf8');
    const start = candidate.indexOf('// Audit Logs Collection:');
    const end = candidate.indexOf('// SOS Alerts Collection:', start);
    const section = candidate.slice(start, end);
    assert.match(section, /isResourceAdmin\(\['super_admin', 'platform_admin'\]\)/);
    assert.doesNotMatch(section, /allow read: if isAdmin\(\);/);
  });

  test('suspiciousActivity uses isResourceAdmin for create/update', () => {
    const candidate = readFileSync('ops/combined-containment/candidate.firestore.rules', 'utf8');
    const start = candidate.indexOf('// Suspicious Activity Collection:');
    const end = candidate.indexOf('// Guide Applications Collection:', start);
    const section = candidate.slice(start, end);
    assert.match(section, /isResourceAdmin\(\['super_admin', 'safety_admin'\]\)/);
    assert.doesNotMatch(section, /allow create: if isAdmin\(\);/);
    assert.doesNotMatch(section, /allow update: if isAdmin\(\);/);
  });

  test('sosAlerts uses isResourceAdmin for read/update', () => {
    const candidate = readFileSync('ops/combined-containment/candidate.firestore.rules', 'utf8');
    const start = candidate.indexOf('// SOS Alerts Collection:');
    const end = candidate.indexOf('// Suspicious Activity Collection:', start);
    const section = candidate.slice(start, end);
    assert.match(section, /isResourceAdmin\(\['super_admin', 'safety_admin'\]\)/);
  });

  test('booking_locks uses isBookingAdmin with validation', () => {
    const candidate = readFileSync('ops/combined-containment/candidate.firestore.rules', 'utf8');
    const start = candidate.indexOf('// Booking Locks Collection:');
    const end = candidate.indexOf('// Reviews Collection:', start);
    const section = candidate.slice(start, end);
    assert.match(section, /isBookingAdmin\(\)/);
    assert.match(section, /request\.resource\.data\.keys\(\)\.hasAll/);
    assert.match(section, /request\.resource\.data\.status == 'pending'/);
    assert.doesNotMatch(section, /allow update, delete: if isAdmin\(\);/);
    assert.doesNotMatch(section, /allow create: if isAuthenticated\(\)/);
  });

  test('byte-identical outside all changed branches', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    const candidate = patchCombined(source);

    const firstHelper = source.indexOf('    function isContentAdmin');
    const before = source.slice(0, firstHelper);
    const candBefore = candidate.slice(0, candidate.indexOf('    function isContentAdmin'));
    assert.equal(candBefore, before, 'Byte-identical before first helper change');

    const feedbackIdx = source.indexOf('    // Feedback Collection:');
    assert.notEqual(feedbackIdx, -1);
    const after = source.slice(feedbackIdx);
    const candFeedbackIdx = candidate.indexOf('    // Feedback Collection:');
    assert.notEqual(candFeedbackIdx, -1);
    const candAfter = candidate.slice(candFeedbackIdx);
    assert.equal(candAfter, after, 'Byte-identical from Feedback Collection onward');
  });
});
