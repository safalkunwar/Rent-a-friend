/** Candidate-only Event composite-index deploy with mandatory post-create readback. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { project, request, listIndexes, matchingIndexes } from './event-indexes-api.mjs';

if (!process.argv.includes('--project=hamrosathi1') || !process.argv.includes('--approved-index-deploy') || process.argv.length !== 4) {
  throw new Error('Refusing deployment. Require exactly --project=hamrosathi1 --approved-index-deploy.');
}

const sourcePath = 'ops/event-indexes/event-participants.indexes.json';
const source = await readFile(sourcePath, 'utf8');
const candidate = JSON.parse(source);
if (!Array.isArray(candidate.indexes) || candidate.indexes.length !== 2 || JSON.stringify(candidate.fieldOverrides ?? []) !== '[]' ||
  !candidate.indexes.every(index => index.collectionGroup === 'event_participants' && index.queryScope === 'COLLECTION')) {
  throw new Error('Candidate scope is invalid: exactly two event_participants collection indexes are required.');
}

let active = await listIndexes();
const before = candidate.indexes.map(definition => ({ definition, matches: matchingIndexes(active, definition).map(index => ({ name: index.name, state: index.state })) }));
const created = [];
for (const definition of candidate.indexes) {
  if (matchingIndexes(active, definition).length) continue;
  const { collectionGroup, ...body } = definition;
  try {
    const result = await request(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups/${collectionGroup}/indexes`, 'POST', body);
    created.push({ definition, operation: result.name ?? null });
  } catch (error) {
    if (!String(error.message).includes('ALREADY_EXISTS')) throw error;
  }
  active = await listIndexes();
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let after = active;
for (let attempt = 0; attempt < 12; attempt += 1) {
  after = await listIndexes();
  const states = candidate.indexes.map(definition => matchingIndexes(after, definition));
  if (states.every(matches => matches.length === 1 && matches[0].state === 'READY')) break;
  if (attempt < 11) await delay(5000);
}
const finalState = candidate.indexes.map(definition => ({ definition, matches: matchingIndexes(after, definition).map(index => ({ name: index.name, state: index.state })) }));
if (!finalState.every(item => item.matches.length === 1 && item.matches[0].state === 'READY')) {
  throw new Error(`Index creation did not reach READY within 60 seconds: ${JSON.stringify(finalState)}`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const directory = `docs/sathi/rollbacks/event-indexes-${stamp}`;
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/deployment-result.json`, JSON.stringify({
  mode: 'CANDIDATE_ONLY_EVENT_INDEX_DEPLOY', project, deployedAt: new Date().toISOString(),
  candidate: { path: sourcePath, sha256: createHash('sha256').update(source).digest('hex') },
  before, created, after: finalState,
  untouched: ['Firestore rules', 'Storage', 'Functions', 'Hosting', 'Auth', 'Firestore documents'],
}, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ result: 'PASS', project, created, after: finalState, directory }));
