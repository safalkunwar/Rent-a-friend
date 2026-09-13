import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth.js');
export const PROJECT = 'hamrosathi1';
export const APPROVED_HASH = '764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402';
export const RELEASE_NAME = `projects/${PROJECT}/releases/cloud.firestore`;
export function operatorAccount() {
  const account = auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token || !account?.user?.email) throw new Error('Authenticated Firebase operator required.');
  return account;
}
export async function accessToken() {
  const account = operatorAccount();
  return auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
}
export async function request(url, method = 'GET', body) {
  const token = await accessToken();
  const response = await fetch(url, {
    method, headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Production API ${method} ${new URL(url).pathname} failed (${response.status}).`);
  return response.json();
}
export async function activeSource() {
  const release = await request(`https://firebaserules.googleapis.com/v1/${RELEASE_NAME}`);
  if (release.name !== RELEASE_NAME || !release.rulesetName?.startsWith(`projects/${PROJECT}/rulesets/`)) throw new Error('Unexpected release identity.');
  const ruleset = await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  if (ruleset.source?.files?.length !== 1 || typeof ruleset.source.files[0].content !== 'string') throw new Error('Expected one Firestore rules source.');
  return { release, source: ruleset.source.files[0].content };
}
