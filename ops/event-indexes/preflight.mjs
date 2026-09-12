/**
 * Read-only Event index gate. It reads only index metadata and writes a local
 * rollback-style inventory; it cannot deploy indexes or touch Firebase data.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { project, listIndexes, matchingIndexes } from './event-indexes-api.mjs';

if (process.argv.slice(2).join(' ') !== '--approved-read-only') {
  throw new Error('Refusing production access. Pass exactly --approved-read-only after explicit authorization.');
}

const sourcePath = 'ops/event-indexes/event-participants.indexes.json';
const source = await readFile(sourcePath, 'utf8');
const candidate = JSON.parse(source);
if (!Array.isArray(candidate.indexes) || candidate.indexes.length !== 2 || JSON.stringify(candidate.fieldOverrides ?? []) !== '[]') {
  throw new Error('Candidate must contain exactly two composite indexes and no field overrides.');
}
if (!candidate.indexes.every(index => index.collectionGroup === 'event_participants' && index.queryScope === 'COLLECTION')) {
  throw new Error('Candidate scope is not restricted to event_participants collection indexes.');
}
const active = await listIndexes();
const state = candidate.indexes.map(definition => ({
  definition,
  matches: matchingIndexes(active, definition).map(index => ({ name: index.name, state: index.state })),
}));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const directory = `docs/sathi/rollbacks/event-indexes-${stamp}`;
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/preflight.json`, JSON.stringify({
  mode: 'READ_ONLY_EVENT_INDEX_PREFLIGHT', project,
  capturedAt: new Date().toISOString(),
  candidate: { path: sourcePath, sha256: createHash('sha256').update(source).digest('hex') },
  activeEventParticipantIndexes: active.map(index => ({ name: index.name, state: index.state, queryScope: index.queryScope, fields: index.fields })),
  candidateState: state,
  untouched: ['Firestore rules', 'Storage', 'Functions', 'Hosting', 'Auth', 'Firestore documents'],
}, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ result: 'PASS', project, candidateState: state.map(item => ({ matches: item.matches })), directory }));
