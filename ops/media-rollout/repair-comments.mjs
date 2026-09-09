import { request } from './production-api.mjs';
import { patchCommentRules, commentIndex } from './comment-rules-patch.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const project='hamrosathi1';
const base=`https://firebaserules.googleapis.com/v1/projects/${project}`;
const release=await request(`${base}/releases/cloud.firestore`);
const rules=await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
if(rules.source.files.length!==1) throw new Error('Review multi-file rules before repair');
const source=rules.source.files[0].content;
const testedBaseline=execFileSync('git',['show','a22d863:ops/media-rollout/firestore.rules'],{encoding:'utf8'});
if(source.replace(/\r/g,'')!==testedBaseline.replace(/\r/g,'')) throw new Error('Production differs from tested baseline. Stop for review.');
const candidate=patchCommentRules(source);
const hash=text=>createHash('sha256').update(text).digest('hex');
const folder='docs/sathi/rollbacks/comments-repair-2026-09-09';
await mkdir(folder,{recursive:true});
await writeFile(`${folder}/production.rules`,source);
await writeFile(`${folder}/candidate.rules`,candidate);
await writeFile(`${folder}/manifest.json`,JSON.stringify({release,baselineSha256:hash(source),candidateSha256:hash(candidate),commentIndex},null,2));
const documentsBase=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/comments`;
const legacy=[];
let pageToken;
do {
  const page=await request(`${documentsBase}?pageSize=100&mask.fieldPaths=createdAt${pageToken ? '&pageToken='+encodeURIComponent(pageToken) : ''}`);
  for(const document of page.documents || []) {
    const value=document.fields?.createdAt;
    if(value?.timestampValue) continue;
    const original=value?.stringValue;
    if(typeof original!=='string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(original) || !Number.isFinite(Date.parse(original))) throw new Error('Unsupported legacy date; review before any production writes.');
    legacy.push({name:document.name,updateTime:document.updateTime,original,converted:new Date(original).toISOString()});
  }
  pageToken=page.nextPageToken;
} while(pageToken);
await writeFile(`${folder}/legacy-dates.json`,JSON.stringify(legacy,null,2));
console.log(JSON.stringify({prepared:folder,baselineSha256:hash(source),candidateSha256:hash(candidate),legacyDates:legacy.length}));
if(!process.argv.includes('--deploy')) process.exit(0);

// Require the actual candidate to pass the loopback gate immediately before release.
execFileSync(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec','--config','firebase.media-rollout.json','--project',project,'--only','firestore','node --import tsx --test tests/comments-production-gate.test.ts'],{stdio:'inherit'});
const latest=await request(`${base}/releases/cloud.firestore`);
if(latest.rulesetName!==release.rulesetName) throw new Error('Production rules changed during tests; no release performed.');
const indexUrl=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups/comments/indexes`;
const all=await request(indexUrl);
const matching=all.indexes?.find(index=>index.name.includes('/collectionGroups/comments/') && JSON.stringify(index.fields)===JSON.stringify(commentIndex.fields));
const indexResult=matching || await request(indexUrl,'POST',commentIndex);
const created=await request(`${base}/rulesets`,'POST',{source:{files:[{name:rules.source.files[0].name,content:candidate}]}});
await request(`${base}/releases/cloud.firestore`,'PATCH',{release:{name:release.name,rulesetName:created.name},updateMask:'rulesetName'});
const active=await request(`${base}/releases/cloud.firestore`);
const verified=await request(`https://firebaserules.googleapis.com/v1/${active.rulesetName}`);
if(verified.source.files[0].content!==candidate) throw new Error('Rules readback mismatch; inspect preserved rollback.');
await writeFile(`${folder}/deployed.json`,JSON.stringify({active,indexResult,verifiedSha256:hash(candidate)},null,2));
for(const item of legacy) {
  // Field mask and update-time precondition preserve text/ownership and concurrent edits.
  await request(`https://firestore.googleapis.com/v1/${item.name}?updateMask.fieldPaths=createdAt&currentDocument.updateTime=${encodeURIComponent(item.updateTime)}`,'PATCH',{fields:{createdAt:{timestampValue:item.converted}}});
}
await writeFile(`${folder}/migration.json`,JSON.stringify({converted:legacy.length,completedAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({rulesDeployed:true,indexResult,rollback:release.rulesetName}));
