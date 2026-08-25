/**
 * Purges fabricated engagement data seeded by src/scripts/seed.ts.
 * Uses the Firebase CLI's stored refresh token (same machine that runs
 * `firebase deploy`) exchanged for a short-lived access token, then talks
 * to the Firestore REST API. Dry-run by default; pass --execute to apply.
 */
import { execSync } from 'child_process';

const PROJECT = 'hamrosathi1';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const DEMO_PREFIXES = ['u-demo-', 'u-traveler-', 'u-admin-'];
const EXECUTE = process.argv.includes('--execute');

const isDemo = (id) => !!id && DEMO_PREFIXES.some(p => id.startsWith(p));

function getAccessToken() {
  // Uses the authenticated `gcloud` user (same account as `firebase deploy`).
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function listAllDocs(token, collectionName) {
  const docs = [];
  let pageToken;
  do {
    const url = new URL(`${BASE}/${collectionName}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`List ${collectionName} failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    (json.documents || []).forEach(d => docs.push({ name: d.name, fields: d.fields || {} }));
    pageToken = json.nextPageToken;
  } while (pageToken);
  return docs;
}

function fieldValueString(field) {
  return field?.stringValue ?? field?.integerValue ?? field?.doubleValue ?? '';
}

function printSummary(label, count) {
  console.log(`${label}: ${count} document(s) ${EXECUTE ? 'deleted' : 'would be deleted'}`);
}

async function deleteDoomed(token, collectionName, doomedDocIds) {
  const CHUNK = 250;
  for (let i = 0; i < doomedDocIds.length; i += CHUNK) {
    const chunk = doomedDocIds.slice(i, i + CHUNK);
    const writes = chunk.map(id => ({ delete: `${BASE}/${collectionName}/${id}` }));
    const res = await fetch(`${BASE}:batchWrite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes }),
    });
    if (!res.ok) throw new Error(`batchWrite failed on ${collectionName} chunk ${i}: ${res.status} ${await res.text()}`);
    console.log(`  ${collectionName}: deleted ${Math.min(i + CHUNK, doomedDocIds.length)}/${doomedDocIds.length}`);
  }
}

async function updateCounters(token, postName, likes, comments) {
  const res = await fetch(`https://firestore.googleapis.com/v1/${postName}?updateMask.fieldPaths=likesCount&updateMask.fieldPaths=commentsCount&updateMask.fieldPaths=updatedAt`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        likesCount: { integerValue: String(likes) },
        commentsCount: { integerValue: String(comments) },
        updatedAt: { stringValue: new Date().toISOString() },
      },
    }),
  });
  if (!res.ok) throw new Error(`Counter update failed for ${postName}: ${res.status} ${await res.text()}`);
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}\n`);
  const token = getAccessToken();

  for (const collectionName of ['likes', 'comments', 'story_likes']) {
    const docs = await listAllDocs(token, collectionName);
    const doomed = docs.filter(d => {
      const userId = fieldValueString(d.fields.userId);
      const idPart = d.name.split('/').pop().split('_')[0];
      return isDemo(userId) || isDemo(idPart);
    });
    printSummary(collectionName, doomed.length);
    if (EXECUTE && doomed.length > 0) {
      await deleteDoomed(token, collectionName, doomed.map(d => d.name.split('/').pop()));
    }
  }

  // Recompute real counters per community post (single pass over like/comment docs)
  const [allLikes, allComments] = await Promise.all([
    listAllDocs(token, 'likes'),
    listAllDocs(token, 'comments'),
  ]);

  const countRealByPost = (docs) => {
    const map = {};
    for (const d of docs) {
      const userId = fieldValueString(d.fields.userId);
      if (isDemo(userId)) continue;
      const postId = fieldValueString(d.fields.postId);
      if (!postId) continue;
      map[postId] = (map[postId] || 0) + 1;
    }
    return map;
  };
  const likesByPost = countRealByPost(allLikes);
  const commentsByPost = countRealByPost(allComments);

  const posts = await listAllDocs(token, 'community_posts');
  let touched = 0;
  for (const post of posts) {
    const postId = post.name.split('/').pop();
    const realLikes = likesByPost[postId] ?? 0;
    const realComments = commentsByPost[postId] ?? 0;

    const currentLikes = parseInt(post.fields.likesCount?.integerValue ?? '0', 10) || 0;
    const currentComments = parseInt(post.fields.commentsCount?.integerValue ?? '0', 10) || 0;

    if (currentLikes !== realLikes || currentComments !== realComments) {
      console.log(`post ${postId}: likes ${currentLikes} -> ${realLikes}, comments ${currentComments} -> ${realComments}`);
      touched++;
      if (EXECUTE) await updateCounters(token, post.name, realLikes, realComments);
    }
  }
  console.log(`Post counters recomputed for ${touched} post(s).`);

  console.log(`\nDone${EXECUTE ? '' : ' (dry-run; pass --execute to apply)'}.`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Purge failed:', err);
    process.exit(1);
  });
