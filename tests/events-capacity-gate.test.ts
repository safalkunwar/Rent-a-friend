import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDocFromServer, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocsFromServer, collection, query, where, type Firestore } from 'firebase/firestore';
import { ref, getBytes, type FirebaseStorage } from 'firebase/storage';
import type { Auth } from 'firebase/auth';
import { createMediaDraft, saveMedia } from '../src/services/mediaUploadCore';
import { setEventParticipation, deleteOwnedEvent } from '../src/services/eventParticipationCore';
import { eventSummaryQuery } from '../src/services/mediaQueries';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8085' || process.env.FIREBASE_STORAGE_EMULATOR_HOST!=='127.0.0.1:9195') throw new Error('Loopback emulators required.');
let env: RulesTestEnvironment;
const deps=(uid:string)=>{const context=env.authenticatedContext(uid);return {auth:{currentUser:{uid,isAnonymous:false,displayName:uid}} as Auth,db:context.firestore() as unknown as Firestore,storage:context.storage('gs://hamrosathi1.firebasestorage.app') as unknown as FirebaseStorage};};
before(async()=>{env=await initializeTestEnvironment({projectId:'hamrosathi1',firestore:{host:'127.0.0.1',port:8085,rules:await readFile('ops/media-rollout/firestore.rules','utf8')},storage:{host:'127.0.0.1',port:9195,rules:await readFile('ops/media-rollout/storage.rules','utf8')}});});
beforeEach(async()=>{await env.clearFirestore();await env.clearStorage();});
after(async()=>{await env?.cleanup();});
async function create(spots=20) {
  const a=deps('A'), draft=createMediaDraft('event','A',new File([new Uint8Array([255,216,255,224,0,16,74,70])],'event.jpg',{type:'image/jpeg'}));
  await saveMedia(a,draft,{userCreated:true,title:'Real event',description:'A local event',location:'Pokhara',category:'Social',date:'2099-12-20',time:'10:30',spots});
  return {a,id:draft.contentId,path:draft.path};
}
const read=(db:Firestore,id:string)=>getDocFromServer(doc(db,'events',id)).then(d=>d.data()!);
test('capacity is stored as spots with a protected initial count; malformed direct creates denied',async()=>{
  const {a,id}=await create();const data=await read(a.db,id);
  assert.equal(data.spots,20);assert.equal(data.participantCount,0);assert.equal(data.participationVersion,1);
  for(const spots of [0,-1,1.5,10001,'20']) await assertFails(setDoc(doc(a.db,'events','invalid'),{...data,id:'invalid',spots,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
});
test('same user double join creates exactly one deterministic participation; repeated leave/rejoin preserves count',async()=>{
  const {id,a}=await create(1),b=deps('B');
  await Promise.all([setEventParticipation(b,id,true),setEventParticipation(b,id,true)]);
  assert.equal((await read(a.db,id)).participantCount,1);
  assert.equal((await getDocFromServer(doc(b.db,'event_participants',`${id}_B`))).data()?.status,'joined');
  await Promise.all([setEventParticipation(b,id,false),setEventParticipation(b,id,false)]);
  assert.equal((await read(a.db,id)).participantCount,0);
  await setEventParticipation(b,id,true);assert.equal((await read(a.db,id)).participantCount,1);
});
test('two different users racing for the final place have exactly one winner',async()=>{
  const {id,a}=await create(1);
  const result=await Promise.allSettled([setEventParticipation(deps('B'),id,true),setEventParticipation(deps('C'),id,true)]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  assert.match(String((result.find(r=>r.status==='rejected') as PromiseRejectedResult).reason),/Event is full/);
  assert.equal((await read(a.db,id)).participantCount,1);
  const members=await getDocsFromServer(query(collection(a.db,'event_participants'),where('eventId','==',id)));
  assert.equal(members.size,1);
});
test('twenty seats fill, the twenty-first is rejected, and cancellation opens one seat',async()=>{
  const {id,a}=await create(20);
  for(let i=0;i<20;i++) await setEventParticipation(deps(`U${i}`),id,true);
  await assert.rejects(setEventParticipation(deps('U20'),id,true),/Event is full/);
  assert.equal((await read(a.db,id)).participantCount,20);
  await setEventParticipation(deps('U0'),id,false);await setEventParticipation(deps('U20'),id,true);
  assert.equal((await read(a.db,id)).participantCount,20);
});
test('forged counters, unpaired membership writes, alternate paths and cross-user cancellation denied',async()=>{
  const {id,a}=await create(),b=deps('B');
  await assertFails(updateDoc(doc(a.db,'events',id),{participantCount:1,updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(b.db,'event_participants',`${id}_B`),{id:`${id}_B`,eventId:id,userId:'B',userName:'B',status:'joined',joinedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(b.db,'events',id,'participants','B'),{userId:'B'}));
  await setEventParticipation(b,id,true);
  await assertFails(updateDoc(doc(deps('C').db,'event_participants',`${id}_B`),{status:'cancelled',updatedAt:serverTimestamp()}));
  await assertFails(deleteDoc(doc(b.db,'event_participants',`${id}_B`)));
  await assertFails(getDocFromServer(doc(deps('C').db,'event_participants',`${id}_B`)));
});
test('owner deletion hides listing/media, preserves membership history and cannot be restored or repeated by another user',async()=>{
  const {id,a,path}=await create(),b=deps('B');await setEventParticipation(b,id,true);
  const tombstone={status:'DELETED',visibilityStatus:'PRIVATE',mediaVisibilityStatus:'PRIVATE',deletedAt:serverTimestamp(),updatedAt:serverTimestamp(),imagePath:'',imageUrl:'',mediaPreviewPath:'',mediaPreviewUrl:''};
  await assertFails(updateDoc(doc(b.db,'events',id),tombstone));
  await assert.rejects(deleteOwnedEvent(b,id),/Only the event owner/);
  const result=await deleteOwnedEvent(a,id);assert.equal(result.mediaCleanupPending,false);
  assert.equal((await read(a.db,id)).status,'DELETED');
  assert.equal((await getDocsFromServer(eventSummaryQuery(b.db,10))).size,0);
  await assert.rejects(getBytes(ref(a.storage,path)));
  assert.equal((await getDocFromServer(doc(b.db,'event_participants',`${id}_B`))).data()?.status,'joined');
  await assertFails(updateDoc(doc(a.db,'events',id),{status:'ACTIVE',visibilityStatus:'PUBLIC'}));
  await setEventParticipation(b,id,false);assert.equal((await read(a.db,id)).participantCount,0);
  await assert.rejects(setEventParticipation(b,id,true),/no longer available/);
  await deleteOwnedEvent(a,id);
});
test('legacy counts are never guessed; private/deleted events cannot accept new participants',async()=>{
  const {a,id}=await create();
  await env.withSecurityRulesDisabled(async context=>{await updateDoc(doc(context.firestore(),'events',id),{participationVersion:0});});
  await assert.rejects(setEventParticipation(deps('B'),id,true),/capacity is verified/);
  assert.equal((await read(a.db,id)).participantCount,0);
});

test('legacy members can cancel without inventing or changing an aggregate',async()=>{
  const {a,id}=await create();const b=deps('B');
  await env.withSecurityRulesDisabled(async context=>{
    await updateDoc(doc(context.firestore(),'events',id),{participationVersion:0});
    await setDoc(doc(context.firestore(),'event_participants',`${id}_B`),{id:`${id}_B`,eventId:id,userId:'B',userName:'B',status:'joined',joinedAt:serverTimestamp(),updatedAt:serverTimestamp()});
  });
  await setEventParticipation(b,id,false);
  assert.equal((await getDocFromServer(doc(b.db,'event_participants',`${id}_B`))).data()?.status,'cancelled');
  assert.equal((await read(a.db,id)).participantCount,0);
  await assert.rejects(setEventParticipation(b,id,true),/capacity is verified/);
});
