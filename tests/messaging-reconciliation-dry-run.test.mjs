import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeMessagingMetadata } from '../ops/containment/messaging-reconciliation-dry-run.mjs';
const parent = (documentId, participantIds = ['A', 'B'], storedId = documentId) => ({ documentId, participantIds, storedId });
const msg = (conversationId, documentId = 'm') => ({ documentId, conversationId });
const run = (conversations, messages, extra = {}) => analyzeMessagingMetadata({ conversations, messages,
  conversationsComplete: true, messagesComplete: true, ...extra });

test('exact existing parent is not redirected by a competing legacy alias', () => {
  const result = run([parent('A_B'), parent('opaque', ['C', 'D'], 'A_B')], [msg('A_B')]);
  assert.equal(result.messages.exactValidParent, 1);
  assert.equal(result.messages.exactReferenceAliasConflicts, 1);
  assert.equal(result.messages.uniqueCandidateOnly, 0);
});
test('legacy prefix has a unique suggestion but never grants ownership or repair authority', () => {
  const result = run([parent('opaque')], [msg('conv_A_B')]);
  assert.equal(result.messages.uniqueCandidateOnly, 1);
  assert.equal(result.productionRepairAuthorized, false);
  assert.equal(result.candidateMatchesProveOwnership, false);
});
test('stored alias and prefix pointing to different parents are ambiguous', () => {
  const result = run([parent('one'), parent('two', ['C', 'D'], 'conv_A_B')], [msg('conv_A_B')]);
  assert.equal(result.messages.ambiguousCandidates, 1);
});
test('duplicate pairs remain ambiguous rather than choosing the canonical parent', () => {
  const result = run([parent('A_B'), parent('opaque', ['B', 'A'])], [msg('conv_A_B')]);
  assert.equal(result.conversations.duplicatePairGroups, 1);
  assert.equal(result.conversations.duplicatePairDocuments, 2);
  assert.equal(result.messages.ambiguousCandidates, 1);
});
test('delimiter collisions do not infer ownership by splitting the reference', () => {
  const result = run([parent('one', ['A_B', 'C']), parent('two', ['A', 'B_C'])], [msg('conv_A_B_C')]);
  assert.equal(result.messages.ambiguousCandidates, 1);
  assert.equal(result.conversations.duplicatePairGroups, 0);
});
test('missing, malformed and mismatched stored IDs have separate counts', () => {
  const result = run([{ documentId: 'one', participantIds: ['A', 'B'] }, parent('two', ['C', 'D'], null), parent('three', ['E', 'F'], 'alias')], []);
  assert.equal(result.conversations.storedIdMissing, 1);
  assert.equal(result.conversations.storedIdMalformed, 1);
  assert.equal(result.conversations.storedIdMismatch, 1);
});
test('invalid memberships never supply proposed replacement parents', () => {
  const result = run([parent('bad', { A: true }, 'conv_A_B')], [msg('bad'), msg('conv_A_B', 'm2')]);
  assert.equal(result.messages.exactInvalidMembership, 1);
  assert.equal(result.messages.unmatched, 1);
});
test('unmatched references and malformed references remain unresolved', () => {
  const result = run([], [msg('conv_A_B'), msg(null, 'm2')]);
  assert.equal(result.messages.unmatched, 1);
  assert.equal(result.messages.invalidReference, 1);
});
test('partial captures cannot claim confirmed absence or final uniqueness', () => {
  const result = run([parent('opaque')], [msg('conv_A_B')], { conversationsComplete: false });
  assert.equal(result.scan.partial, true);
  assert.equal(result.candidateUniquenessProvisional, true);
  assert.equal(result.missingParentConclusion, 'UNKNOWN_OUTSIDE_CAPTURE');
});
test('reversed member order does not mutate input and can match either prefix order', () => {
  const row = Object.freeze(parent('B_A', Object.freeze(['B', 'A'])));
  const result = run([row], [msg('conv_A_B'), msg('conv_B_A', 'm2')]);
  assert.equal(result.conversations.reversedId, 1);
  assert.equal(result.messages.uniqueCandidateOnly, 2);
  assert.deepEqual(row.participantIds, ['B', 'A']);
});
test('rejects private/full payloads, duplicate documents and over-cap input without echoing data', () => {
  assert.throws(() => run([{ ...parent('secret'), lastMessage: { text: 'private' } }], []), /^Error: Invalid, duplicate or non-projected metadata row$/);
  assert.throws(() => run([], [{ ...msg('A_B'), text: 'private' }]), /non-projected/);
  assert.throws(() => run([parent('same'), parent('same')], []), /duplicate/);
  assert.throws(() => run(Array.from({ length: 1001 }, (_, i) => parent(`p${i}`)), []), /over-cap/);
});
test('output contains aggregates only, no input identifiers or membership arrays', () => {
  const result = run([parent('sensitive-parent', ['private-uid-one', 'private-uid-two'], 'sensitive-alias')], [msg('sensitive-alias', 'private-message')]);
  const serialized = JSON.stringify(result);
  for (const value of ['sensitive-parent', 'private-uid-one', 'private-uid-two', 'sensitive-alias', 'private-message']) assert.equal(serialized.includes(value), false);
  assert.equal(result.messages.uniqueCandidateOnly, 1);
});

test('saved readiness inventory retains aggregate counts but no identifier samples', async () => {
  const inventory = JSON.parse(await readFile('docs/sathi/rollbacks/messaging-readiness-2026-09-10/inventory.json', 'utf8'));
  assert.equal(inventory.conversations.total, 36);
  assert.equal(inventory.messages.total, 306);
  assert.equal(inventory.conversations.shapes.missingStoredId, null);
  const inspect = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(['samples', 'docId', 'documentId', 'participantIds', 'conversationId'].includes(key), false);
      inspect(child);
    }
  };
  inspect(inventory);
});
