import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDocFromServer, setDoc, updateDoc, deleteDoc, getDocsFromServer, Timestamp, type Firestore } from 'firebase/firestore';
import { ref, getBytes, getMetadata, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import type { Auth } from 'firebase/auth';
import { createMediaDraft, saveMedia } from '../src/services/mediaUploadCore';
import { visibleStoriesQuery } from '../src/services/mediaQueries';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' || process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9195') throw new Error('Both loopback emulators required.');
let env: RulesTestEnvironment;
const claims=(role?:string)=>role?{adminRole:role}:{};
function deps(uid:string,role?:string) {
  const context=env.authenticatedContext(uid,claims(role));
  return {auth:{currentUser:{uid,isAnonymous:false}} as Auth,db:context.firestore() as unknown as Firestore,storage:context.storage('gs://hamrosathi1.firebasestorage.app') as unknown as FirebaseStorage};
}
const image=()=>new File([new Uint8Array([255,216,255,224,0,16,74,70,73,70])],'photo.jpg',{type:'image/jpeg'});
before(async()=>{env=await initializeTestEnvironment({projectId:'hamrosathi1',firestore:{host:'127.0.0.1',port:8085,rules:await readFile('ops/media-rollout/firestore.rules','utf8')},storage:{host:'127.0.0.1',port:9195,rules:await readFile('ops/media-rollout/storage.rules','utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{
  await env.clearFirestore(); await env.clearStorage();
  await env.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'users/A'),{name:'A',role:'customer',avatar:''});});
});
test('profile binary + metadata survive a new context; B cannot overwrite; owner cannot restore restricted photo',async()=>{
  const a=deps('A'),draft=createMediaDraft('profile','A',image());
  await saveMedia(a,draft);
  assert.ok((await getBytes(ref(deps('B').storage,draft.path))).byteLength>0);
  const saved=(await getDocFromServer(doc(deps('A').db,'users/A'))).data()!;
  assert.equal(saved.photoPath,draft.path); assert.equal(saved.photoModerationStatus,'ACTIVE');
  await assertFails(updateDoc(doc(deps('B').db,'users/A'),{avatar:'forged'}));
  await updateDoc(doc(deps('mod','moderation_admin').db,'users/A'),{photoModerationStatus:'RESTRICTED',photoModeratedBy:'mod'});
  await assertFails(updateDoc(doc(a.db,'users/A'),{photoModerationStatus:'ACTIVE'}));
  await assertFails(getBytes(ref(deps('B').storage,draft.path)));
  await assert.rejects(saveMedia(a,createMediaDraft('profile','A',image())),/moderation/);
});
test('story upload creates owned metadata and bytes; retry has one document and preserves counters',async()=>{
  const a=deps('A'),draft=createMediaDraft('story','A',image());
  await saveMedia(a,draft,{caption:'Real caption',userName:'A'});
  const again=await saveMedia(a,draft,{caption:'changed retry'});
  assert.equal(again.caption,'Real caption');
  const createdAt=again.createdAt as Timestamp,expiresAt=again.expiresAt as Timestamp;
  assert.ok(createdAt instanceof Timestamp);
  assert.equal(expiresAt.toMillis() - createdAt.toMillis(),86400000);
  assert.ok((await getBytes(ref(deps('B').storage,draft.path))).byteLength>0);
  assert.equal((await getDocFromServer(doc(deps('B').db,'stories',draft.contentId))).data()?.userId,'A');
  await assertFails(updateDoc(doc(deps('B').db,'stories',draft.contentId),{caption:'forged'}));
  await assertFails(updateDoc(doc(a.db,'stories',draft.contentId),{reportedCount:999,moderatedBy:'A'}));
});
test('profile replacement leaves the new canonical object and removes the prior owned avatar',async()=>{
  const a=deps('A'),first=createMediaDraft('profile','A',image());
  await saveMedia(a,first);
  const second=createMediaDraft('profile','A',image());
  await saveMedia(a,second);
  assert.equal((await getDocFromServer(doc(a.db,'users/A'))).data()?.photoPath,second.path);
  await assert.rejects(getMetadata(ref(a.storage,first.path)),{code:'storage/object-not-found'});
  assert.ok((await getMetadata(ref(a.storage,second.path))).size>0);
});
test('moderator restricts and restores Story; public query excludes restricted and expired items',async()=>{
  const a=deps('A'),draft=createMediaDraft('story','A',image());
  await saveMedia(a,draft,{caption:'x'});
  const publicDb=deps('B').db;
  const visible=()=>getDocsFromServer(visibleStoriesQuery(publicDb,Date.now()));
  assert.equal((await visible()).size,1);
  await updateDoc(doc(deps('mod','moderation_admin').db,'stories',draft.contentId),{moderationStatus:'RESTRICTED',moderatedBy:'mod'});
  assert.equal((await visible()).size,0);
  await assertFails(getDocFromServer(doc(publicDb,'stories',draft.contentId)));
  await assertFails(getBytes(ref(deps('B').storage,draft.path)));
  await assertFails(updateDoc(doc(a.db,'stories',draft.contentId),{moderationStatus:'ACTIVE'}));
  await updateDoc(doc(deps('mod','moderation_admin').db,'stories',draft.contentId),{moderationStatus:'ACTIVE',moderatedBy:'mod'});
  assert.equal((await visible()).size,1);
  await env.withSecurityRulesDisabled(async context=>{await updateDoc(doc(context.firestore(),'stories',draft.contentId),{expiresAt:Timestamp.fromMillis(0)});});
  assert.equal((await visible()).size,0);
});
test('normal users cannot create event media; anonymous and malformed media uploads denied by rules',async()=>{
  await assert.rejects(saveMedia(deps('A'),createMediaDraft('event','A',image()),{title:'forged'}));
  const metadata={contentType:'image/jpeg',customMetadata:{ownerUid:'A',category:'stories',contentId:'s'}};
  await assertFails(uploadBytes(ref(deps('B').storage,'stories/A/s.jpg'),image(),metadata));
  await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(),'stories/A/s.jpg'),image(),metadata));
  await assertFails(uploadBytes(ref(deps('A').storage,'stories/A/s.exe'),image(),metadata));
  await assertFails(uploadBytes(ref(deps('A').storage,'stories/A/empty.jpg'),new Uint8Array(0),metadata));
  await assertFails(uploadBytes(ref(deps('A').storage,'stories/A/script.jpg'),new Uint8Array([1]),{...metadata,contentType:'text/html'}));
});
test('duplicate in-flight submit is rejected; owner identity checked before upload',async()=>{
  const draft=createMediaDraft('story','A',image());
  draft.busy=true; await assert.rejects(saveMedia(deps('A'),draft),/already/);
  draft.busy=false; await assert.rejects(saveMedia(deps('B'),draft),/account/);
});
test('failed metadata write cleans up a proven orphan; valid retry uses the same ID',async()=>{
  const a=deps('A'),draft=createMediaDraft('story','A',image());
  await assert.rejects(saveMedia(a,draft,{caption:'x'.repeat(151)}));
  await assert.rejects(getMetadata(ref(a.storage,draft.path)),{code:'storage/object-not-found'});
  assert.equal((await getDocFromServer(doc(a.db,'stories',draft.contentId))).exists(),false);
  const saved=await saveMedia(a,draft,{caption:'Valid retry'});
  assert.equal(saved.id,draft.contentId); assert.equal(saved.caption,'Valid retry');
});
test('lost binary acknowledgement recovers the same immutable object without overwrite',async()=>{
  const a=deps('A'),draft=createMediaDraft('story','A',image());
  await uploadBytes(ref(a.storage,draft.path),image(),{contentType:'image/jpeg',customMetadata:{ownerUid:'A',category:'stories',contentId:draft.contentId}});
  draft.uploadAttempted=true;
  const saved=await saveMedia(a,draft,{caption:'Recovered upload'});
  assert.equal(saved.mediaPath,draft.path); assert.equal(draft.uploaded,true);
});
test('public Story cursor pages are bounded, distinct and exclude unrelated history',async()=>{
  await env.withSecurityRulesDisabled(async context=>{
    await Promise.all(Array.from({length:23},(_,index)=>setDoc(doc(context.firestore(),'stories',`fixture-${index}`),{
      id:`fixture-${index}`,userId:'A',status:'active',moderationStatus:index===0?'RESTRICTED':'ACTIVE',visibilityStatus:'PUBLIC',
      expiresAt:Timestamp.fromMillis(index===1?0:Date.now()+60000+index),mediaPath:`stories/A/fixture-${index}.jpg`,
    })));
  });
  const store=deps('B').db;
  const first=await getDocsFromServer(visibleStoriesQuery(store,Date.now()));
  const next=await getDocsFromServer(visibleStoriesQuery(store,Date.now(),10,first.docs.at(-1)));
  assert.equal(first.size,10); assert.equal(next.size,10);
  assert.equal(new Set([...first.docs,...next.docs].map(document=>document.id)).size,20);
  assert.ok([...first.docs,...next.docs].every(document=>!['fixture-0','fixture-1'].includes(document.id)));
});
test('direct client creation cannot supply moderation authority or reuse another owner path',async()=>{
  const a=deps('A'),draft=createMediaDraft('story','A',image());
  const saved=await saveMedia(a,draft,{caption:'Original'});
  await assertFails(setDoc(doc(a.db,'stories','forged-mod'),{...saved,id:'forged-mod',moderatedBy:'A'}));
  await assertFails(setDoc(doc(a.db,'stories','foreign-host'),{...saved,id:'foreign-host',imageUrl:String(saved.imageUrl).replace('http://127.0.0.1:9195','https://untrusted.example')}));
  await assertFails(setDoc(doc(deps('B').db,'stories','forged-owner'),{...saved,id:'forged-owner',userId:'B'}));
  await assertFails(updateDoc(doc(a.db,'stories',draft.contentId),{expiresAt:Timestamp.fromMillis(Date.now()+864000000)}));
});


test('unauthenticated Story write denied; owner can upload; cross-user upload denied',async()=>{
  const a=deps('A'),draft=createMediaDraft('story','A',image());
  const saved=await saveMedia(a,draft,{caption:'Authorization proof'});
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),'stories','unauth'),{...saved,id:'unauth'}));
  await assertFails(uploadBytes(ref(deps('B').storage,'stories/A/cross.jpg'),image(),{
    contentType:'image/jpeg',customMetadata:{ownerUid:'A',category:'stories',contentId:'cross'}
  }));
  await assertFails(uploadBytes(ref(a.storage,'stories/B/cross.jpg'),image(),{
    contentType:'image/jpeg',customMetadata:{ownerUid:'B',category:'stories',contentId:'cross'}
  }));
});
test('restricted and removed photo/Story cannot be restored by owner or legacy profile-admin',async()=>{
  const a=deps('A'),story=createMediaDraft('story','A',image()),photo=createMediaDraft('profile','A',image());
  await saveMedia(a,story,{caption:'Moderation proof'}); await saveMedia(a,photo);
  await env.withSecurityRulesDisabled(async context=>{
    await updateDoc(doc(context.firestore(),'users/A'),{role:'admin',photoModerationStatus:'REMOVED'});
    await updateDoc(doc(context.firestore(),'stories',story.contentId),{moderationStatus:'REMOVED'});
  });
  await assertFails(updateDoc(doc(a.db,'users/A'),{photoModerationStatus:'ACTIVE'}));
  await assertFails(updateDoc(doc(a.db,'users/A'),{avatar:'forged'}));
  await assertFails(updateDoc(doc(a.db,'stories',story.contentId),{moderationStatus:'ACTIVE'}));
  await assertFails(updateDoc(doc(a.db,'stories',story.contentId),{caption:'restore'}));
  await assertFails(deleteDoc(doc(a.db,'stories',story.contentId)));
  // Ordinary profile fields still use the unchanged production owner/admin policy.
  await updateDoc(doc(a.db,'users/A'),{name:'Ordinary edit remains allowed'});
});
test('unrelated Storage paths remain denied even for admin',async()=>{
  for(const category of ['posts','events','kyc','private','public','activities','verification','admin','unknown']){
    for(const actor of [deps('A'),deps('root','super_admin')]){
      await assertFails(uploadBytes(ref(actor.storage,category+'/A/probe.jpg'),image(),{
        contentType:'image/jpeg',customMetadata:{ownerUid:'A',category,contentId:'probe'}
      }));
    }
  }
});
