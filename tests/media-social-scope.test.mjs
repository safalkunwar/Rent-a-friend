import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const baseline = 'docs/sathi/rollbacks/2026-09-07T10-47-06-971Z-media-social';
const read = path => readFile(path,'utf8').then(text=>text.replace(/\r/g,''));
function blocks(text) {
  const result = new Map();
  for (const match of text.matchAll(/^    match (.+?) \{$/gm)) {
    let depth = 1, end = match.index + match[0].length;
    for (; end < text.length && depth; end++) {
      if (text[end] === '{') depth++;
      if (text[end] === '}') depth--;
    }
    result.set(match[1],text.slice(match.index,end));
  }
  return result;
}
test('production baseline: every unrelated Firestore branch remains byte-identical after newline normalization',async()=>{
  const previous=blocks(await read(`${baseline}/firestore.rules`)), current=blocks(await read('ops/media-rollout/firestore.rules'));
  // Event capacity was subsequently approved; events-scope.test.mjs independently
  // proves that only events + canonical memberships changed since that release.
  const allowed=new Set(['/stories/{storyId}','/story_likes/{likeId}','/story_comments/{commentId}','/events/{eventId}','/event_participants/{registrationId}','/event_likes/{likeId}','/event_comments/{commentId}','/notifications/{notificationId}']);
  for(const [path,source] of previous) if(!allowed.has(path)) assert.equal(current.get(path),source,path);
  for(const path of current.keys()) assert.ok(previous.has(path)||allowed.has(path),`Unexpected new branch ${path}`);
  const original=await read(`${baseline}/firestore.rules`), candidate=await read('ops/media-rollout/firestore.rules');
  const preHelpers=text=>text.split('    // BEGIN SATHI MEDIA ROLLOUT:')[0];
  assert.equal(preHelpers(candidate),preHelpers(original),'Unrelated authorization helper changed');
});
test('Storage permits only scoped image branches; default deny and KYC/private paths are unchanged',async()=>{
  const current=await read('ops/media-rollout/storage.rules');
  assert.deepEqual([...current.matchAll(/match ([^\n]+) \{/g)].map(match=>match[1]),[
    '/b/{bucket}/o','/avatars/{uid}/{filename}','/stories/{uid}/{filename}','/events/{uid}/{filename}','/{allPaths=**}',
  ]);
  assert.match(current,/match \/\{allPaths=\*\*\} \{ allow read, write: if false; \}/);
  assert.doesNotMatch(current,/allow read, write: if true/);
});
