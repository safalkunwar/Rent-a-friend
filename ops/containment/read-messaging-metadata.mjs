import { pathToFileURL } from 'node:url';
import { analyzeMessagingMetadata } from './messaging-reconciliation-dry-run.mjs';

export const PROJECT = 'hamrosathi1';
export const ROOT = `projects/${PROJECT}/databases/(default)/documents`;
export const QUERY_URL = `https://firestore.googleapis.com/v1/${ROOT}:runQuery`;
const PAGE = 100;
const CAP = 1000;
const projections = { conversations: ['id', 'participantIds'], messages: ['conversationId'] };

// Intentionally decode only the projected types needed by the classifier.
// Other types remain malformed, without copying private nested values.
function decode(value) {
  if (value && typeof value.stringValue === 'string') return value.stringValue;
  if (value && Object.hasOwn(value, 'nullValue')) return null;
  if (value && value.arrayValue) return (value.arrayValue.values || []).map(decode);
  return { invalidProjectedType: true };
}

export function buildMetadataQuery(collection, readTime, lastName) {
  if (!Object.hasOwn(projections, collection) || !Number.isFinite(Date.parse(readTime))) {
    throw new Error('INVALID_READ_CONFIGURATION');
  }
  if (lastName && (!lastName.startsWith(`${ROOT}/${collection}/`) ||
      lastName.slice(`${ROOT}/${collection}/`.length).includes('/'))) throw new Error('INVALID_CURSOR');
  return {
    readTime,
    structuredQuery: {
      from: [{ collectionId: collection }],
      select: { fields: projections[collection].map(fieldPath => ({ fieldPath })) },
      orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
      limit: PAGE,
      ...(lastName ? { startAt: { values: [{ referenceValue: lastName }], before: false } } : {}),
    },
  };
}

async function scan(collection, readTime, request) {
  const rows = [];
  const names = new Set();
  let lastName;
  let pages = 0;
  while (rows.length < CAP) {
    let response;
    try { response = await request(QUERY_URL, 'POST', buildMetadataQuery(collection, readTime, lastName)); }
    catch { throw new Error('METADATA_REQUEST_FAILED'); } // Never echo API body, token or identifiers.
    pages++;
    if (!Array.isArray(response) || response.some(item => item.error)) throw new Error('INVALID_QUERY_RESPONSE');
    if (!response.length || response.some(item => !item.readTime || Date.parse(item.readTime) !== Date.parse(readTime))) {
      throw new Error('SNAPSHOT_TIME_NOT_CONFIRMED');
    }
    const docs = response.filter(item => item.document).map(item => item.document);
    if (docs.length > PAGE || rows.length + docs.length > CAP) throw new Error('READ_CAP_EXCEEDED');
    for (const document of docs) {
      const prefix = `${ROOT}/${collection}/`;
      if (typeof document.name !== 'string' || !document.name.startsWith(prefix)) throw new Error('UNEXPECTED_DOCUMENT_SCOPE');
      const documentId = document.name.slice(prefix.length);
      if (!documentId || documentId.includes('/') || names.has(document.name)) throw new Error('INVALID_OR_DUPLICATE_DOCUMENT');
      const fields = document.fields || {};
      if (Object.keys(fields).some(key => !projections[collection].includes(key))) throw new Error('PROJECTION_NOT_ENFORCED');
      const row = { documentId };
      for (const field of projections[collection]) {
        if (Object.hasOwn(fields, field)) row[field === 'id' ? 'storedId' : field] = decode(fields[field]);
      }
      rows.push(row);
      names.add(document.name);
      lastName = document.name;
    }
    if (docs.length < PAGE) return { rows, pages, complete: true };
  }
  // Do not exceed the cap to prove exhaustion at an exact multiple.
  return { rows, pages, complete: false };
}

export async function collectMessagingMetadata(request, readTime) {
  const conversations = await scan('conversations', readTime, request);
  const messages = await scan('messages', readTime, request);
  const analysis = analyzeMessagingMetadata({
    conversations: conversations.rows, messages: messages.rows,
    conversationsComplete: conversations.complete, messagesComplete: messages.complete,
  });
  return {
    project: PROJECT,
    capturedAt: new Date().toISOString(), snapshotReadTime: readTime,
    captureMode: 'PROJECTED_READ_ONLY_NO_RAW_OUTPUT',
    limits: { pageSize: PAGE, conversations: CAP, messages: CAP },
    requests: { conversations: conversations.pages, messages: messages.pages },
    projections,
    analysis,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || process.argv[2] !== '--approved-read-only') {
    console.error('EXPLICIT_APPROVED_READ_ONLY_FLAG_REQUIRED');
    process.exitCode = 1;
  } else {
    try {
      const { request } = await import('../media-rollout/production-api.mjs');
      const snapshot = new Date(Date.now() - 10000).toISOString();
      const aggregate = await collectMessagingMetadata(request, snapshot);
      console.log(JSON.stringify(aggregate, null, 2));
    } catch {
      // Catch all dependency/auth/API errors without printing their potentially sensitive payloads.
      console.error('READ_ONLY_CAPTURE_FAILED_NO_RAW_DETAILS_SAVED');
      process.exitCode = 1;
    }
  }
}
