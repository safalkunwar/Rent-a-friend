/** Read-only readiness poll for the two exact Event participant indexes. */
import { readFile } from 'node:fs/promises';
import { project, listIndexes, matchingIndexes } from './event-indexes-api.mjs';

if (process.argv.slice(2).join(' ') !== '--approved-read-only') {
  throw new Error('Refusing production access. Pass exactly --approved-read-only after explicit authorization.');
}
const candidate = JSON.parse(await readFile('ops/event-indexes/event-participants.indexes.json', 'utf8'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let state = [];
for (let attempt = 0; attempt < 12; attempt += 1) {
  const indexes = await listIndexes();
  state = candidate.indexes.map(definition => matchingIndexes(indexes, definition).map(index => ({ name: index.name, state: index.state })));
  if (state.every(matches => matches.length === 1 && matches[0].state === 'READY')) {
    console.log(JSON.stringify({ result: 'PASS', project, state }));
    process.exit(0);
  }
  if (attempt < 11) await delay(5000);
}
throw new Error(`Indexes are not READY after 60 seconds: ${JSON.stringify(state)}`);
