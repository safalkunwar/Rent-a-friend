/**
 * P0-02 read-only authority inventory.
 *
 * It never emits, persists, or logs UIDs, emails, profile data, custom-claim
 * payloads, or Firestore documents.  It writes only aggregate role/source
 * counts plus an exact active-rules rollback source needed for a later,
 * separately approved staff-containment candidate.
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const PROJECT = 'hamrosathi1';
const LIMIT = 1000;
const KNOWN_ADMIN_ROLES = new Set([
  'super_admin', 'platform_admin', 'safety_admin', 'moderation_admin', 'support_agent',
  'booking_admin', 'finance_admin', 'kyc_reviewer', 'content_admin', 'analytics_admin', 'read_only_admin',
]);

if (process.argv.slice(2).join(' ') !== '--approved-read-only') {
  throw new Error('Refusing production access. Pass exactly --approved-read-only after explicit authorization.');
}

const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth.js');
const account = auth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required; credentials were not read or printed.');
const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);

async function request(url) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* no sensitive response is printed */ }
  if (!response.ok) throw new Error(`Read failed (${response.status}) for ${new URL(url).hostname}${new URL(url).pathname}`);
  return data;
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function stringValue(fields, name) {
  const value = fields?.[name];
  return typeof value?.stringValue === 'string' ? value.stringValue : null;
}

function claimRecord(user) {
  const uid = typeof user.localId === 'string' ? user.localId : null;
  if (!uid) return null;
  let claims = {};
  let malformed = false;
  if (typeof user.customAttributes === 'string' && user.customAttributes) {
    try {
      const candidate = JSON.parse(user.customAttributes);
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) claims = candidate;
      else malformed = true;
    } catch { malformed = true; }
  }
  const admin = claims.admin === true;
  const roleAdmin = claims.role === 'admin';
  const adminRole = typeof claims.adminRole === 'string' ? claims.adminRole : null;
  const recognizedRole = adminRole && KNOWN_ADMIN_ROLES.has(adminRole) ? adminRole : null;
  const staff = admin || roleAdmin || adminRole !== null;
  return { uid, staff, admin, roleAdmin, adminRole: recognizedRole ?? (adminRole ? 'UNRECOGNIZED' : null), malformed };
}

async function listAuthClaims() {
  const users = new Map();
  let pageToken = '';
  let complete = true;
  do {
    const suffix = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const data = await request(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=1000${suffix}`);
    for (const user of data.users ?? []) {
      const record = claimRecord(user);
      if (record) users.set(record.uid, record);
      if (users.size >= LIMIT) { complete = false; break; }
    }
    pageToken = data.nextPageToken ?? '';
  } while (pageToken && users.size < LIMIT);
  return { users, complete: complete && !pageToken };
}

async function listCollection(collectionId, fieldPaths) {
  const records = new Map();
  let pageToken = '';
  let complete = true;
  do {
    const params = new URLSearchParams({ pageSize: '1000' });
    for (const fieldPath of fieldPaths) params.append('mask.fieldPaths', fieldPath);
    if (pageToken) params.set('pageToken', pageToken);
    const data = await request(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collectionId}?${params}`);
    for (const document of data.documents ?? []) {
      const id = typeof document.name === 'string' ? document.name.split('/').at(-1) : null;
      if (id) records.set(id, document.fields ?? {});
      if (records.size >= LIMIT) { complete = false; break; }
    }
    pageToken = data.nextPageToken ?? '';
  } while (pageToken && records.size < LIMIT);
  return { records, complete: complete && !pageToken };
}

const [claims, adminDocuments, userDocuments] = await Promise.all([
  listAuthClaims(),
  listCollection('admins', ['role', 'status', 'uid']),
  listCollection('users', ['role', 'adminRole']),
]);

const claimRoles = {};
const adminDocumentRoles = {};
const userDocumentRoles = {};
const sourceOverlap = { claimsOnly: 0, adminsOnly: 0, usersOnly: 0, claimsAndAdmins: 0, claimsAndUsers: 0, adminsAndUsers: 0, allThree: 0 };
const anomalies = { malformedClaimPayload: 0, unrecognizedClaimAdminRole: 0, unrecognizedAdminDocumentRole: 0, unrecognizedUserDocumentAdminRole: 0, adminDocumentUidMismatch: 0 };
const allUids = new Set([...claims.users.keys(), ...adminDocuments.records.keys(), ...userDocuments.records.keys()]);

for (const claim of claims.users.values()) {
  if (!claim.staff) continue;
  increment(claimRoles, claim.adminRole ?? (claim.admin ? 'admin=true' : 'role=admin'));
  if (claim.malformed) anomalies.malformedClaimPayload += 1;
  if (claim.adminRole === 'UNRECOGNIZED') anomalies.unrecognizedClaimAdminRole += 1;
}
for (const [uid, fields] of adminDocuments.records) {
  const role = stringValue(fields, 'role') ?? 'MISSING';
  increment(adminDocumentRoles, KNOWN_ADMIN_ROLES.has(role) ? role : 'UNRECOGNIZED_OR_MISSING');
  if (!KNOWN_ADMIN_ROLES.has(role)) anomalies.unrecognizedAdminDocumentRole += 1;
  const declaredUid = stringValue(fields, 'uid');
  if (declaredUid && declaredUid !== uid) anomalies.adminDocumentUidMismatch += 1;
}
for (const fields of userDocuments.records.values()) {
  const role = stringValue(fields, 'role');
  const adminRole = stringValue(fields, 'adminRole');
  if (role === 'admin' || adminRole) increment(userDocumentRoles, adminRole && KNOWN_ADMIN_ROLES.has(adminRole) ? adminRole : role === 'admin' ? 'role=admin' : 'UNRECOGNIZED');
  if (adminRole && !KNOWN_ADMIN_ROLES.has(adminRole)) anomalies.unrecognizedUserDocumentAdminRole += 1;
}
for (const uid of allUids) {
  const hasClaims = claims.users.get(uid)?.staff === true;
  const hasAdmins = adminDocuments.records.has(uid);
  const userFields = userDocuments.records.get(uid);
  const hasUsers = stringValue(userFields, 'role') === 'admin' || stringValue(userFields, 'adminRole') !== null;
  if (hasClaims && hasAdmins && hasUsers) sourceOverlap.allThree += 1;
  else if (hasClaims && hasAdmins) sourceOverlap.claimsAndAdmins += 1;
  else if (hasClaims && hasUsers) sourceOverlap.claimsAndUsers += 1;
  else if (hasAdmins && hasUsers) sourceOverlap.adminsAndUsers += 1;
  else if (hasClaims) sourceOverlap.claimsOnly += 1;
  else if (hasAdmins) sourceOverlap.adminsOnly += 1;
  else if (hasUsers) sourceOverlap.usersOnly += 1;
}

const release = await request(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/cloud.firestore`);
if (release.name !== `projects/${PROJECT}/releases/cloud.firestore` || !release.rulesetName) throw new Error('Unexpected Firestore release identity.');
const ruleset = await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
if (!Array.isArray(ruleset.source?.files) || ruleset.source.files.length !== 1) throw new Error('Expected one active Firestore rules source file.');
const activeRules = ruleset.source.files[0].content;
const activeHash = createHash('sha256').update(activeRules).digest('hex');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const directory = `docs/sathi/rollbacks/staff-authority-read-${stamp}`;
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/firestore.rules`, activeRules, 'utf8');
const inventory = {
  mode: 'READ_ONLY_STAFF_AUTHORITY_INVENTORY', project: PROJECT, capturedAt: new Date().toISOString(),
  activeRules: { release: release.name, rulesetName: release.rulesetName, updateTime: release.updateTime, sha256: activeHash },
  boundedScan: { perSourceLimit: LIMIT, auth: { records: claims.users.size, complete: claims.complete }, admins: { records: adminDocuments.records.size, complete: adminDocuments.complete }, users: { records: userDocuments.records.size, complete: userDocuments.complete } },
  aggregateOnly: { claimRoles, adminDocumentRoles, userDocumentRoles, sourceOverlap, anomalies },
  noDataMutation: ['Firestore documents', 'Firestore release', 'Storage', 'Functions', 'Auth accounts', 'Hosting', 'payments', 'bookings'],
};
await writeFile(`${directory}/inventory.json`, JSON.stringify(inventory, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ result: 'PASS', project: PROJECT, directory, activeRulesHash: activeHash, boundedScan: inventory.boundedScan, aggregateOnly: inventory.aggregateOnly }));
