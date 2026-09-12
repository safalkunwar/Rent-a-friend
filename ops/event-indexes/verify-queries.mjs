/**
 * Read-only, zero-row probes for the service's two index shapes. Generated
 * values cannot match application records, so HTTP 200 proves index planning
 * without retrieving attendee documents or testing permissions.
 */
import { randomUUID } from 'node:crypto';
import { project, request } from './event-indexes-api.mjs';

if (process.argv.slice(2).join(' ') !== '--approved-read-only') {
  throw new Error('Refusing production access. Pass exactly --approved-read-only after explicit authorization.');
}
const probe = `event-index-probe-${randomUUID()}`;
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`;
const value = fieldPath => ({ fieldFilter: { field: { fieldPath }, op: 'EQUAL', value: { stringValue: probe } } });
const query = filters => ({
  structuredQuery: {
    from: [{ collectionId: 'event_participants' }],
    where: filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } },
    orderBy: [{ field: { fieldPath: 'joinedAt' }, direction: 'DESCENDING' }],
    limit: 1,
  },
});

await request(base, 'POST', query([value('eventId')]));
await request(base, 'POST', query([value('userId'), { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'joined' } } }]));
console.log(JSON.stringify({ result: 'PASS', project, probes: ['eventId/joinedAt', 'userId/status/joinedAt'], generatedProbeValuesNotPrinted: true }));
