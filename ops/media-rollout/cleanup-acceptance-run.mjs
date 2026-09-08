import { request } from './production-api.mjs';

// Exact disposable run ledger. Never use this to purge arbitrary users or sample data.
const run = 'media-social-c8f0100c-5ced-4228-ad29-050a7d1aa3b5';
const owner = 'N9nV5resCkbgBDK1TNeUFqeowRt2', actor = 'RWgeKsRNjuV2PChui53zysbM3si1';
const targets = [['stories','3086e9ed-370d-40b3-9c40-3965c41fa0a3'],['stories','3c238075-a3af-448a-a639-a0974fd4f209'],['events','b7a4be56-f6c0-4f44-9e5f-942a5ece6db6']];
const root = 'https://firestore.googleapis.com/v1/projects/hamrosathi1/databases/(default)/documents';
const read = async path => { try { return await request(`${root}/${path}`); } catch(e) { if(String(e).includes('"status":404')) return null; throw e; } };
const value = (d, field) => d.fields?.[field]?.stringValue;
const query = async (collection, field, equal) => {
  const result = await request(`${root}:runQuery`,'POST',{structuredQuery:{from:[{collectionId:collection}],where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:{stringValue:equal}}},limit:100}});
  const docs = result.flatMap(row=>row.document ? [row.document] : []);
  if(docs.length===100) throw new Error('Cleanup bound reached; inspect before continuing');
  return docs;
};
const profiles = await Promise.all([owner,actor].map(uid=>read(`users/${uid}`)));
profiles.forEach((profile,i)=>{if(profile && value(profile,'email')!==`${run}-${i===0?'a':'b'}@example.test`) throw new Error('Profile identity mismatch');});
const accounts = await request('https://identitytoolkit.googleapis.com/v1/projects/hamrosathi1/accounts:lookup','POST',{localId:[owner,actor]});
for(const user of accounts.users || []) if(user.email!==`${run}-${user.localId===owner?'a':'b'}@example.test`) throw new Error('Auth identity mismatch');
const documents = [];
for(const [collection,id] of targets) {
  const parent = await read(`${collection}/${id}`);
  if(parent && (value(parent,collection==='stories'?'userId':'ownerId')!==owner || !value(parent,collection==='stories'?'caption':'title')?.startsWith(run))) throw new Error('Target ownership mismatch');
  if(parent) documents.push(parent);
  for(const action of ['likes','comments']) documents.push(...await query(`${collection==='stories'?'story':'event'}_${action}`,collection==='stories'?'storyId':'eventId',id));
  documents.push(...await query('media_interaction_receipts','targetId',id));
}
documents.push(...(await query('notifications','userId',owner)).filter(d=>value(d,'actorId')===actor && targets.some(([,id])=>id===value(d,'targetId'))));
const allowedPaths = new Set([
  `avatars/${owner}/3abca61f-549c-42e4-9358-10c4587a4cc9.webp`,
  ...targets.map(([collection,id])=>`${collection}/${owner}/${id}.webp`),
].flatMap(path=>[path,path.replace('.webp','_preview.webp')]));
const tickets = await query('media_upload_cleanup','ownerId',owner);
if(tickets.some(d=>!allowedPaths.has(value(d,'path')))) throw new Error('Unexpected cleanup ticket');
documents.push(...tickets);
const objects = [];
for(const category of ['avatars','stories','events']) {
  const result=await request(`https://storage.googleapis.com/storage/v1/b/hamrosathi1.firebasestorage.app/o?prefix=${encodeURIComponent(`${category}/${owner}/`)}&maxResults=20`);
  if(result.nextPageToken) throw new Error('Unexpected object count');
  for(const object of result.items || []) {
    if(!allowedPaths.has(object.name) || object.metadata?.ownerUid!==owner) throw new Error('Unexpected object or owner');
    objects.push(object);
  }
}
console.log(JSON.stringify({run,mode:process.env.SATHI_CLEANUP_APPROVED==='hamrosathi1'?'apply':'inspect',documents:documents.map(d=>d.name),objects:objects.map(o=>o.name),profiles:profiles.filter(Boolean).map(d=>d.name),accounts:(accounts.users||[]).map(u=>({uid:u.localId,email:u.email}))}));
if(process.env.SATHI_CLEANUP_APPROVED==='hamrosathi1') {
  for(const document of documents) await request(`https://firestore.googleapis.com/v1/${document.name}`,'DELETE');
  for(const object of objects) {
    try { await request(`https://storage.googleapis.com/storage/v1/b/hamrosathi1.firebasestorage.app/o/${encodeURIComponent(object.name)}?ifGenerationMatch=${object.generation}`,'DELETE'); }
    catch(e) { if(!String(e).includes('"status":404')) throw e; }
  }
  for(const profile of profiles.filter(Boolean)) await request(`https://firestore.googleapis.com/v1/${profile.name}`,'DELETE');
  for(const user of accounts.users || []) await request('https://identitytoolkit.googleapis.com/v1/projects/hamrosathi1/accounts:delete','POST',{localId:user.localId});
  console.log('Exact acceptance-run cleanup completed.');
}
