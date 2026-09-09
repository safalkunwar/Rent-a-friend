import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const normalize=s=>s.replace(/\r/g,'');
const stripEvents=text=>{
  for(const path of ['/events/{eventId}','/event_participants/{registrationId}']) {
    const marker=`    match ${path} {`,start=text.indexOf(marker);assert.ok(start>=0);
    let end=start+marker.length,depth=1;for(;end<text.length && depth;end++){if(text[end]==='{')depth++;if(text[end]==='}')depth--;}
    text=text.slice(0,start)+`    // scoped ${path}`+text.slice(end);
  }
  return text;
};
test('only Event and canonical participation rule branches differ from the last published candidate',async()=>{
  const previous=normalize(execFileSync('git',['show','a22d863:ops/media-rollout/firestore.rules'],{encoding:'utf8'}));
  assert.equal(stripEvents(normalize(await readFile('ops/media-rollout/firestore.rules','utf8'))),stripEvents(previous));
  assert.equal(normalize(await readFile('ops/media-rollout/storage.rules','utf8')),normalize(execFileSync('git',['show','a22d863:ops/media-rollout/storage.rules'],{encoding:'utf8'})));
});
