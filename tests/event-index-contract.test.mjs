import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const definitions = JSON.parse(await readFile('ops/event-indexes/event-participants.indexes.json', 'utf8'));
const source = await readFile('src/services/eventParticipants.ts', 'utf8');

const signatures = definitions.indexes.map(index => JSON.stringify({
  collectionGroup: index.collectionGroup,
  queryScope: index.queryScope,
  fields: index.fields,
})).sort();

test('Event index candidate is limited to the two production service query shapes', () => {
  assert.deepEqual(definitions.fieldOverrides, []);
  assert.equal(definitions.indexes.length, 2);
  assert.deepEqual(signatures, [
    JSON.stringify({ collectionGroup: 'event_participants', queryScope: 'COLLECTION', fields: [
      { fieldPath: 'eventId', order: 'ASCENDING' },
      { fieldPath: 'joinedAt', order: 'DESCENDING' },
    ] }),
    JSON.stringify({ collectionGroup: 'event_participants', queryScope: 'COLLECTION', fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'joinedAt', order: 'DESCENDING' },
    ] }),
  ].sort());
});

test('Event participant service uses the matching ordered queries without an undocumented document-ID order', () => {
  assert.match(source, /getEventParticipants\(eventId: string\)[\s\S]*?field: 'eventId',[\s\S]*?orderByField: 'joinedAt',[\s\S]*?orderDirection: 'desc'/);
  assert.match(source, /getUserJoinedEvents\(userId: string\)[\s\S]*?field: 'userId',[\s\S]*?field: 'status',[\s\S]*?orderByField: 'joinedAt',[\s\S]*?orderDirection: 'desc'/);
  const eventQuery = source.slice(source.indexOf('async getEventParticipants'), source.indexOf('async getUserJoinedEvents'));
  const userQuery = source.slice(source.indexOf('async getUserJoinedEvents'), source.indexOf('async getUserJoinedEventSummaries'));
  assert.doesNotMatch(eventQuery, /orderById/);
  assert.doesNotMatch(userQuery, /orderById/);
});
