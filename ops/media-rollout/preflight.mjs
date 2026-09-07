import { request } from './production-api.mjs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const baseline=JSON.parse(await readFile('docs/sathi/rollbacks/2026-09-07T10-47-06-971Z-media-social/manifest.json','utf8'));
for(const [key,record] of Object.entries(baseline)) {
  const release=await request(`https://firebaserules.googleapis.com/v1/${record.name}`);
  const rules=await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  const hash=createHash('sha256').update(rules.source.files[0].content).digest('hex');
  if(hash!==record.sha256) throw new Error(`STOP: ${key} production rules changed since rollback snapshot`);
  console.log(`${key}: unchanged production baseline`);
}
for(const group of ['stories','events','story_comments','event_comments','notifications']) {
  const result=await request(`https://firestore.googleapis.com/v1/projects/hamrosathi1/databases/(default)/collectionGroups/${group}/indexes`);
  console.log(JSON.stringify({group,indexes:result.indexes?.filter(index=>index.name.includes(`/collectionGroups/${group}/`)).map(index=>({name:index.name,state:index.state,fields:index.fields}))}));
}
