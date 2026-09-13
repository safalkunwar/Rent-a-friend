// Offline analysis only: no Firebase, filesystem, network, credentials or writes.
// Future projected reads must stay in memory. Return aggregates, never IDs/maps.
const cap = 1000;
const validId = value => typeof value === 'string' && value.length > 0 && !value.includes('/');
const validPair = value => Array.isArray(value) && value.length === 2 &&
  value.every(validId) && value[0] !== value[1];
const has = (data, key) => Object.hasOwn(data, key);

function validateRows(rows, allowed) {
  if (!Array.isArray(rows) || rows.length > cap) throw new Error('Invalid or over-cap metadata input');
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        Object.keys(row).some(key => !allowed.includes(key)) || !validId(row.documentId) ||
        seen.has(row.documentId)) throw new Error('Invalid, duplicate or non-projected metadata row');
    seen.add(row.documentId);
  }
}

export function analyzeMessagingMetadata({ conversations, messages, conversationsComplete, messagesComplete }) {
  validateRows(conversations, ['documentId', 'storedId', 'participantIds']);
  validateRows(messages, ['documentId', 'conversationId']);
  if (typeof conversationsComplete !== 'boolean' || typeof messagesComplete !== 'boolean') {
    throw new Error('Explicit scan-completeness flags required');
  }
  const parents = new Map(conversations.map(row => [row.documentId, row]));
  const aliases = new Map();
  const pairs = new Map();
  const conversationCounts = {
    total: conversations.length, validPairs: 0, invalidMembership: 0,
    storedIdMissing: 0, storedIdMalformed: 0, storedIdMatches: 0, storedIdMismatch: 0,
    canonicalId: 0, reversedId: 0, opaqueId: 0, underscoreMemberPairs: 0,
    duplicatePairGroups: 0, duplicatePairDocuments: 0,
  };
  const add = (key, documentId) => {
    if (!aliases.has(key)) aliases.set(key, new Set());
    aliases.get(key).add(documentId);
  };
  for (const row of conversations) {
    if (!has(row, 'storedId')) conversationCounts.storedIdMissing++;
    else if (!validId(row.storedId)) conversationCounts.storedIdMalformed++;
    else if (row.storedId === row.documentId) conversationCounts.storedIdMatches++;
    else conversationCounts.storedIdMismatch++;
    if (!validPair(row.participantIds)) { conversationCounts.invalidMembership++; continue; }
    conversationCounts.validPairs++;
    const members = [...row.participantIds].sort();
    const canonical = members.join('_');
    const reverse = [...members].reverse().join('_');
    if (row.documentId === canonical) conversationCounts.canonicalId++;
    else if (row.documentId === reverse) conversationCounts.reversedId++;
    else conversationCounts.opaqueId++;
    if (members.some(uid => uid.includes('_'))) conversationCounts.underscoreMemberPairs++;
    const pairKey = JSON.stringify(members); // No delimiter-based membership inference.
    pairs.set(pairKey, (pairs.get(pairKey) || 0) + 1);
    if (validId(row.storedId)) add(row.storedId, row.documentId);
    // Build hypothetical references from known pairs; never split a reference into UIDs.
    for (const key of [canonical, reverse, `conv_${canonical}`, `conv_${reverse}`]) add(key, row.documentId);
  }
  for (const count of pairs.values()) {
    if (count > 1) { conversationCounts.duplicatePairGroups++; conversationCounts.duplicatePairDocuments += count; }
  }
  const messageCounts = {
    total: messages.length, exactValidParent: 0, exactInvalidMembership: 0,
    missingFromScan: 0, uniqueCandidateOnly: 0, ambiguousCandidates: 0,
    unmatched: 0, invalidReference: 0, distinctReferences: 0,
    distinctMissingFromScan: 0, exactReferenceAliasConflicts: 0,
  };
  const references = new Set();
  const missing = new Set();
  const uniqueReferences = new Set();
  const ambiguousReferences = new Set();
  const unmatchedReferences = new Set();
  const uniqueTargets = new Set();
  for (const row of messages) {
    if (!validId(row.conversationId)) { messageCounts.invalidReference++; continue; }
    references.add(row.conversationId);
    const candidates = aliases.get(row.conversationId) || new Set();
    if (parents.has(row.conversationId)) {
      if (validPair(parents.get(row.conversationId).participantIds)) messageCounts.exactValidParent++;
      else messageCounts.exactInvalidMembership++;
      if ([...candidates].some(id => id !== row.conversationId)) messageCounts.exactReferenceAliasConflicts++;
      continue; // Never redirect an existing parent based on a competing alias.
    }
    messageCounts.missingFromScan++;
    missing.add(row.conversationId);
    if (candidates.size === 1) {
      messageCounts.uniqueCandidateOnly++;
      uniqueReferences.add(row.conversationId);
      uniqueTargets.add([...candidates][0]);
    } else if (candidates.size > 1) {
      messageCounts.ambiguousCandidates++;
      ambiguousReferences.add(row.conversationId);
    } else {
      messageCounts.unmatched++;
      unmatchedReferences.add(row.conversationId);
    }
  }
  messageCounts.distinctReferences = references.size;
  messageCounts.distinctMissingFromScan = missing.size;
  messageCounts.distinctUniqueCandidateReferences = uniqueReferences.size;
  messageCounts.distinctAmbiguousReferences = ambiguousReferences.size;
  messageCounts.distinctUnmatchedReferences = unmatchedReferences.size;
  messageCounts.distinctSuggestedTargets = uniqueTargets.size;
  return {
    mode: 'OFFLINE_DRY_RUN_NO_WRITES',
    productionRepairAuthorized: false,
    candidateMatchesProveOwnership: false,
    scan: { conversationsComplete, messagesComplete, partial: !conversationsComplete || !messagesComplete },
    missingParentConclusion: conversationsComplete ? 'ABSENT_FROM_COMPLETE_CAPTURE' : 'UNKNOWN_OUTSIDE_CAPTURE',
    candidateUniquenessProvisional: !conversationsComplete,
    conversations: conversationCounts,
    messages: messageCounts,
  };
}
