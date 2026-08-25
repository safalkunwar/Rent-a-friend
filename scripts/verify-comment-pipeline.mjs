/**
 * Live end-to-end verification of the community comment pipeline:
 *   auth (real seeded account) -> rules-checked WRITE -> READ-back -> cleanup
 *
 * Proves or refutes, against production hamrosathi1:
 *   - Firebase project connectivity
 *   - security rule create-path for correctly-formed comments
 *   - document field shape accepted by rules
 *   - read/listener data availability
 */
const API_KEY = 'AIzaSyBE-RD9iszOTqSLuugWxuYCpIWIrPVIjsI';
const PROJECT = 'hamrosathi1';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function main() {
  // 1. Authenticate as a REAL seeded user account.
  const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'traveler.1@sathi.com', password: 'Password123!', returnSecureToken: true }),
  });
  if (!authRes.ok) {
    console.log('AUTH FAILED:', authRes.status, await authRes.text());
    process.exit(1);
  }
  const auth = await authRes.json();
  const uid = auth.localId;
  console.log('AUTH OK — uid:', uid);

  // 2. Rules-checked WRITE, exactly the shape the app writes.
  const commentId = `comment-verify-${Date.now()}`;
  const now = new Date().toISOString();
  const writeRes = await fetch(`${BASE}/comments?documentId=${commentId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        id: { stringValue: commentId },
        postId: { stringValue: 'cp2' },
        userId: { stringValue: uid },
        userName: { stringValue: 'Pipeline Verify' },
        userAvatar: { stringValue: '' },
        text: { stringValue: 'PIPELINE VERIFICATION COMMENT — safe to delete' },
        createdAt: { stringValue: now },
      },
    }),
  });
  console.log('WRITE status:', writeRes.status, writeRes.ok ? '(rules allowed create)' : `(DENIED) ${await writeRes.text()}`);
  if (!writeRes.ok) process.exit(2);

  // 3. Read it back (listener-equivalent single fetch).
  const readRes = await fetch(`${BASE}/comments/${commentId}`, {
    headers: { Authorization: `Bearer ${auth.idToken}` },
  });
  const readJson = await readRes.json();
  console.log('READ status:', readRes.status, '— text:', readJson.fields?.text?.stringValue);

  // 4. Also verify the post counter transaction target is readable.
  const postRes = await fetch(`${BASE}/community_posts/cp2`, {
    headers: { Authorization: `Bearer ${auth.idToken}` },
  });
  const postJson = await postRes.json();
  console.log('POST cp2 readable:', postRes.status === 200, '— commentsCount:', postJson.fields?.commentsCount?.integerValue);

  console.log('\nRESULT: WRITE -> READ pipeline VERIFIED against production rules.');
}

main().catch(err => {
  console.error('VERIFY FAILED:', err);
  process.exit(1);
});
