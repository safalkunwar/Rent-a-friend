import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMetadataQuery, collectMessagingMetadata, ROOT, QUERY_URL } from '../ops/containment/read-messaging-metadata.mjs';
const time = '2026-09-10T12:00:00.000Z';
const value = stringValue => ({ stringValue });
const row = (collection, id, fields = {}) => ({ readTime: time, document: { name: `${ROOT}/${collection}/${id}`, fields } });
const empty = [{ readTime: time }];

test('fixed target, projection, limit and exclusive cursor are enforced', () => {
  const q = buildMetadataQuery('conversations', time, `${ROOT}/conversations/last`);
  assert.deepEqual(q.structuredQuery.select.fields, [{ fieldPath: 'id' }, { fieldPath: 'participantIds' }]);
  assert.equal(q.structuredQuery.limit, 100);
  assert.equal(q.structuredQuery.startAt.before, false);
  assert.equal(q.readTime, time);
  assert.throws(() => buildMetadataQuery('users', time), /INVALID/);
  assert.throws(() => buildMetadataQuery('messages', time, 'projects/other/documents/messages/x'), /INVALID/);
});
test('empty capture is complete and every request is the fixed read endpoint', async () => {
  let count = 0;
  const result = await collectMessagingMetadata(async (url, method, body) => {
    count++;
    assert.equal(url, QUERY_URL); assert.equal(method, 'POST'); assert.equal(body.readTime, time);
    return empty;
  }, time);
  assert.equal(count, 2);
  assert.equal(result.analysis.scan.partial, false);
});
test('stored-id alias mismatch is classified without leaking identifiers', async () => {
  const result = await collectMessagingMetadata(async (_url, _method, body) => {
    return body.structuredQuery.from[0].collectionId === 'conversations'
      ? [row('conversations', 'private-parent', { id: value('private-alias'), participantIds: { arrayValue: { values: [value('private-A'), value('private-B')] } } })]
      : [row('messages', 'private-message', { conversationId: value('private-alias') })];
  }, time);
  assert.equal(result.analysis.messages.uniqueCandidateOnly, 1);
  assert.equal(result.analysis.conversations.storedIdMismatch, 1);
  assert.equal(JSON.stringify(result).includes('private-'), false);
});
test('pagination holds one snapshot and never persists cursor in output', async () => {
  let page = 0;
  const result = await collectMessagingMetadata(async (_url, _method, body) => {
    if (body.structuredQuery.from[0].collectionId === 'messages') return empty;
    page++;
    if (page === 1) return Array.from({ length: 100 }, (_, i) => row('conversations', `p${i.toString().padStart(3, '0')}`));
    assert.equal(body.structuredQuery.startAt.values[0].referenceValue, `${ROOT}/conversations/p099`);
    assert.equal(body.readTime, time);
    return [row('conversations', 'p100')];
  }, time);
  assert.equal(result.requests.conversations, 2);
  assert.equal(result.analysis.conversations.total, 101);
  assert.equal(result.analysis.scan.partial, false);
});
test('exact cap stops without another document read and marks partial', async () => {
  let page = 0;
  const result = await collectMessagingMetadata(async (_url, _method, body) => {
    if (body.structuredQuery.from[0].collectionId === 'messages') return empty;
    const offset = page++ * 100;
    return Array.from({ length: 100 }, (_, i) => row('conversations', `p${offset + i}`));
  }, time);
  assert.equal(page, 10);
  assert.equal(result.analysis.conversations.total, 1000);
  assert.equal(result.analysis.scan.partial, true);
});
test('server returning private fields is rejected rather than persisted', async () => {
  await assert.rejects(collectMessagingMetadata(async () => [row('conversations', 'private', { lastMessage: value('secret') })], time), /PROJECTION_NOT_ENFORCED/);
});
test('wrong project, duplicate page and unconfirmed snapshot fail closed', async () => {
  await assert.rejects(collectMessagingMetadata(async () => [{ readTime: time, document: { name: 'projects/wrong/documents/conversations/x' } }], time), /SCOPE/);
  await assert.rejects(collectMessagingMetadata(async () => [row('conversations', 'same'), row('conversations', 'same')], time), /DUPLICATE/);
  await assert.rejects(collectMessagingMetadata(async () => [{ readTime: '2020-01-01T00:00:00Z' }], time), /SNAPSHOT/);
});
test('transport errors are sanitized', async () => {
  await assert.rejects(collectMessagingMetadata(async () => { throw new Error('token-and-private-identifier'); }, time), /^Error: METADATA_REQUEST_FAILED$/);
});
