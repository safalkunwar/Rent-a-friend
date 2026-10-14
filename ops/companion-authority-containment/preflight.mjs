/** Read-only metadata inventory. Never writes identities, KYC, names or contact fields to disk. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { activeSource, request, PROJECT } from '../payment-containment/release-api.mjs';
import { BASELINE_HASH, BOOKING_HASH, hash, patchCompanionAuthority } from './patch.mjs';
import { summarizeAuthority } from './inventory.mjs';

if (process.argv.slice(2).join(' ') !== '--approved-read-only') throw new Error('Require --approved-read-only; no write/deploy mode exists.');
const before = await activeSource();
assert.equal(hash(before.source), BASELINE_HASH, 'STOP: production rules drifted.');
const standalone = await readFile('ops/companion-authority-containment/candidate.firestore.rules', 'utf8');
const booking = await readFile('ops/booking-containment/candidate.firestore.rules', 'utf8');
const combined = await readFile('ops/companion-authority-containment/booking-combined.firestore.rules', 'utf8');
assert.equal(standalone, patchCompanionAuthority(before.source, BASELINE_HASH), 'STOP: standalone candidate drifted.');
assert.equal(hash(booking), BOOKING_HASH, 'STOP: booking candidate drifted.');
assert.equal(combined, patchCompanionAuthority(booking, BOOKING_HASH), 'STOP: composed candidate drifted.');

async function inventory(collection, fields) {
  const records = new Map();
  let token = '';
  do {
    const params = new URLSearchParams({ pageSize: '200' });
    for (const field of fields) params.append('mask.fieldPaths', field);
    if (token) params.set('pageToken', token);
    const page = await request(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}?${params}`);
    for (const document of page.documents ?? []) {
      const id = document.name.split('/').at(-1);
      if (records.has(id)) throw new Error('Paged inventory repeated a document; no completeness claim.');
      records.set(id, document.fields ?? {});
    }
    token = page.nextPageToken ?? '';
    if (records.size >= 1000) throw new Error('Inventory reached 1,000-document safety cap; no completeness claim.');
  } while (token);
  return records;
}
const [users, companions, applications, admins] = await Promise.all([
  inventory('users', ['companionStatus','companionApprovalApplicationId']),
  inventory('companions', ['id','userId','isVerified','verificationBadge','approvalApplicationId']),
  inventory('companion_applications', ['id','userId','status','reviewAuditId']),
  inventory('admins', ['uid','role']),
]);
const counts = summarizeAuthority({ users, companions, applications, admins });
const after = await activeSource();
assert.equal(after.source, before.source, 'STOP: production rules changed during inventory.');
assert.equal(after.release.rulesetName, before.release.rulesetName);
const directory = `docs/sathi/rollbacks/companion-authority-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/firestore.rules`, before.source, { flag: 'wx' });
const result = {
  mode: 'READ_ONLY_COMPANION_AUTHORITY', project: PROJECT, capturedAt: new Date().toISOString(),
  activeHash: hash(before.source), candidateHash: hash(standalone), combinedHash: hash(combined),
  release: before.release, completeUnderCap: true,
  inventoryConsistency: 'BOUNDED_PAGED_READS_NOT_AN_ATOMIC_DATABASE_SNAPSHOT', counts,
  projectedFields: { users: ['companionStatus','companionApprovalApplicationId'], companions: ['id','userId','isVerified','verificationBadge','approvalApplicationId'],
    companion_applications: ['id','userId','status','reviewAuditId'], admins: ['uid','role'] },
  deployment: 'NOT_PERFORMED', migration: 'NOT_PERFORMED',
};
await writeFile(`${directory}/manifest.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ...result, directory }));
