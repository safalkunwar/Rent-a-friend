/**
 * LIVE verification of the auth/KYC security model against production.
 * Uses a REAL seeded user account (traveler.1@sathi.com) so every request is
 * evaluated by Firestore rules as a normal (non-admin) user.
 *
 * Expected:
 *   200  create own companion application (status SUBMITTED)
 *   403  write to admin_audit_logs
 *   403  set own users.role = 'admin'
 *   403  set own users.companionStatus = 'APPROVED'
 */
const API_KEY = 'AIzaSyBE-RD9iszOTqSLuugWxuYCpIWIrPVIjsI';
const PROJECT = 'hamrosathi1';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function main() {
  const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'traveler.2@sathi.com', password: 'Password123!', returnSecureToken: true }),
  });
  if (!authRes.ok) throw new Error('AUTH FAILED');
  const auth = await authRes.json();
  const uid = auth.localId;
  const headers = { Authorization: `Bearer ${auth.idToken}`, 'Content-Type': 'application/json' };
  let failures = 0;

  // 1. Create own application — ALLOWED
  const appId = `app-verify-${Date.now()}`;
  const now = new Date().toISOString();
  let res = await fetch(`${BASE}/companion_applications?documentId=${appId}`, {
    method: 'POST', headers,
    body: JSON.stringify({ fields: {
      id: { stringValue: appId }, userId: { stringValue: uid },
      status: { stringValue: 'SUBMITTED' },
      applicationData: { mapValue: { fields: { displayName: { stringValue: 'Verify Bot' } } } },
      kyc: { mapValue: { fields: { verificationStatus: { stringValue: 'UNVERIFIED' }, legalFullName: { stringValue: 'Verify Bot' } } } },
      submittedAt: { stringValue: now }, createdAt: { stringValue: now }, updatedAt: { stringValue: now },
    } }),
  });
  console.log(`create own application: ${res.status} ${res.status === 200 ? 'PASS' : 'FAIL'}`);
  if (res.status !== 200) failures++;

  // 2. Write admin audit log — DENIED
  res = await fetch(`${BASE}/admin_audit_logs/verify-fake`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ fields: { action: { stringValue: 'hack' } } }),
  });
  console.log(`write audit log as user: ${res.status} ${res.status === 403 ? 'PASS (denied)' : 'FAIL'}`);
  if (res.status !== 403) failures++;

  // 3. Promote self to admin via users patch — DENIED
  res = await fetch(`${BASE}/users/${uid}?updateMask.fieldPaths=role`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ fields: { role: { stringValue: 'admin' } } }),
  });
  console.log(`self-promote to admin: ${res.status} ${res.status === 403 ? 'PASS (denied)' : 'FAIL'}`);
  if (res.status !== 403) failures++;

  // 4. Self-approve companion status — DENIED
  res = await fetch(`${BASE}/users/${uid}?updateMask.fieldPaths=companionStatus`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ fields: { companionStatus: { stringValue: 'APPROVED' } } }),
  });
  console.log(`self-approve companionStatus: ${res.status} ${res.status === 403 ? 'PASS (denied)' : 'FAIL'}`);
  if (res.status !== 403) failures++;

  // 5. Edit someone else's application — DENIED
  res = await fetch(`${BASE}/companion_applications/${appId}?updateMask.fieldPaths=status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${(await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'traveler.3@sathi.com', password: 'Password123!', returnSecureToken: true }),
    })).json()).idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { status: { stringValue: 'APPROVED' } } }),
  });
  console.log(`cross-user application edit: ${res.status} ${res.status === 403 ? 'PASS (denied)' : 'FAIL'}`);
  if (res.status !== 403) failures++;

  console.log(failures === 0 ? '\nALL SECURITY CHECKS PASSED.' : `\n${failures} SECURITY CHECK(S) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
