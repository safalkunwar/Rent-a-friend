import { createRequire } from 'node:module';

export const project = 'hamrosathi1';
const require = createRequire(import.meta.url);

async function accessToken() {
  const auth = require('firebase-tools/lib/auth.js');
  const account = auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required; credentials were not read from output.');
  return auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
}

export async function request(url, method = 'GET', body) {
  const token = await accessToken();
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) throw new Error(`Firestore Index API ${method} failed (${response.status}): ${data.error?.message ?? 'no details'}`);
  return data;
}

export async function listIndexes() {
  const indexes = [];
  let pageToken = '';
  do {
    const suffix = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : '';
    const result = await request(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups/event_participants/indexes${suffix}`);
    indexes.push(...(result.indexes ?? []));
    pageToken = result.nextPageToken ?? '';
  } while (pageToken);
  const prefix = `/collectionGroups/event_participants/indexes/`;
  return indexes.filter(index => typeof index.name === 'string' && index.name.includes(prefix));
}

export function comparable(definition) {
  // Firestore may return its implicit trailing document-name order in Index
  // metadata even when the SDK query did not explicitly order by document ID.
  // The candidate is intentionally compared to the user-visible query shape.
  const fields = (definition.fields ?? []).filter(field => field.fieldPath !== '__name__');
  return JSON.stringify({ queryScope: definition.queryScope, fields });
}

export function matchingIndexes(indexes, definition) {
  const expected = comparable(definition);
  return indexes.filter(index => comparable(index) === expected);
}
