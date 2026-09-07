import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDocFromServer, getDocsFromServer, updateDoc, deleteDoc, collection, query, where, serverTimestamp, Timestamp, type Firestore } from 'firebase/firestore';
import { ref, getBytes, getMetadata, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import type { Auth } from 'firebase/auth';
import { createMediaDraft, saveMedia } from '../src/services/mediaUploadCore';
import { ownerStoriesQuery } from '../src/services/mediaQueries';
import { reconcileInteraction, deleteStoryMedia, cleanupExpiredStories, onMediaUploadFinalized, cleanupMediaOrphans } from '../functions/src/mediaSocial';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const admin = require('firebase-admin');
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' || process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9195') throw new Error('Loopback emulators required; never run against production.');
let env: RulesTestEnvironment;
const deps = (uid: string) => { const context=env.authenticatedContext(uid); return { auth:{currentUser:{uid,isAnonymous:false}} as Auth,db:context.firestore() as unknown as Firestore,storage:context.storage('gs://hamrosathi1.firebasestorage.app') as unknown as FirebaseStorage }; };
const image = () => new File([new Uint8Array([255,216,255,224,0,16,74,70,73,70])],'photo.jpg',{type:'image/jpeg'});
before(async () => {
  if (!admin.apps.length) admin.initializeApp({ projectId:'hamrosathi1',storageBucket:'hamrosathi1.firebasestorage.app' });
  env = await initializeTestEnvironment({projectId:'hamrosathi1',firestore:{host:'127.0.0.1',port:8085,rules:await readFile('ops/media-rollout/firestore.rules','utf8')},storage:{host:'127.0.0.1',port:9195,rules:await readFile('ops/media-rollout/storage.rules','utf8')}});
});
after(async () => { await env?.cleanup(); await Promise.all(admin.apps.map((app: any) => app.delete())); });
beforeEach(async () => { await env.clearFirestore(); await env.clearStorage(); await env.withSecurityRulesDisabled(async context => {
  await setDoc(doc(context.firestore(),'users/A'),{name:'A',role:'customer',avatar:''});
  await setDoc(doc(context.firestore(),'users/B'),{name:'B',role:'customer',avatar:''});
}); });
async function content() {
  const a=deps('A'), story=createMediaDraft('story','A',image()), event=createMediaDraft('event','A',image());
  const s=await saveMedia(a,story,{caption:'Persisted caption',userName:'A'});
  const e=await saveMedia(a,event,{userCreated:true,title:'Walk',description:'An actual event',location:'Pokhara',category:'Outdoor',date:'2099-12-20',time:'10:30',spots:0});
  return { a,story,event,s,e };
}
test('A uploads two Stories and a user Event; B reads canonical data and owner query yields both in order',async()=>{
  const {a,story,event}=await content(); const second=createMediaDraft('story','A',image()); await saveMedia(a,second,{caption:'Second'});
  const page=await getDocsFromServer(ownerStoriesQuery(deps('B').db,'A',Date.now()));
  assert.deepEqual(page.docs.map(d=>d.id),[story.contentId,second.contentId]);
  assert.equal((await getDocFromServer(doc(deps('B').db,'events',event.contentId))).data()?.ownerId,'A');
  assert.ok((await getBytes(ref(deps('B').storage,event.path))).byteLength);
});
test('own media variants persist; B cannot overwrite media/profile or impersonate Event creator',async()=>{
  const {a,story,event,e}=await content();
  const photo=createMediaDraft('profile','A',image()); photo.preview={file:image(),path:`avatars/A/${photo.id}_preview.jpg`};
  await saveMedia(a,photo); assert.ok((await getBytes(ref(deps('B').storage,photo.preview.path))).byteLength);
  await assertFails(updateDoc(doc(deps('B').db,'users/A'),{avatar:'forged'}));
  await assertFails(updateDoc(doc(deps('B').db,'stories',story.contentId),{caption:'forged'}));
  await assertFails(setDoc(doc(deps('B').db,'events','forged'),{...e,id:'forged',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  await assertFails(uploadBytes(ref(deps('B').storage,event.path),image()));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),'stories','x'),{userId:'A'}));
});
test('protected moderation/counters cannot be changed; restricted content cannot receive interactions',async()=>{
  const {a,story,event}=await content();
  for(const [collection,id] of [['stories',story.contentId],['events',event.contentId]]) {
    await assertFails(updateDoc(doc(a.db,collection,id),{moderationStatus:'REMOVED'}));
    await assertFails(updateDoc(doc(a.db,collection,id),{likesCount:9999}));
  }
  await admin.firestore().doc(`stories/${story.contentId}`).update({moderationStatus:'RESTRICTED'});
  await assertFails(updateDoc(doc(a.db,'stories',story.contentId),{moderationStatus:'ACTIVE'}));
  await assertFails(setDoc(doc(deps('B').db,'story_likes',`B_${story.contentId}`),{userId:'B',storyId:story.contentId,createdAt:serverTimestamp()}));
});
test('four real interactions generate four owner-only notifications; replay and unlike/re-like do not duplicate',async()=>{
  const {story,event}=await content(), b=deps('B');
  for(const [kind,id] of [['story',story.contentId],['event',event.contentId]] as const) {
    for(const action of ['likes','comments'] as const) {
      const identity=action==='likes'?`B_${id}`:`comment_${kind}`;
      const data={userId:'B',[`${kind}Id`]:id,createdAt:serverTimestamp(),...(action==='comments'?{text:'Genuine comment'}:{})};
      await setDoc(doc(b.db,`${kind}_${action}`,identity),data);
      await reconcileInteraction(kind,action,identity,id,'B'); await reconcileInteraction(kind,action,identity,id,'B');
      if(action==='likes') {
        await deleteDoc(doc(b.db,`${kind}_${action}`,identity)); await reconcileInteraction(kind,action,identity,id,'B');
        await setDoc(doc(b.db,`${kind}_${action}`,identity),data); await reconcileInteraction(kind,action,identity,id,'B');
      }
    }
  }
  const notes=await getDocsFromServer(query(collection(deps('A').db,'notifications'),where('userId','==','A')));
  assert.equal(notes.size,4);
  assert.deepEqual(notes.docs.map(d=>d.data().type).sort(),['EVENT_COMMENT','EVENT_LIKE','STORY_COMMENT','STORY_LIKE']);
  for(const note of notes.docs) {
    await assertFails(getDocFromServer(doc(b.db,'notifications',note.id)));
    await assertFails(updateDoc(doc(deps('A').db,'notifications',note.id),{targetId:'forged'}));
    await updateDoc(doc(deps('A').db,'notifications',note.id),{isRead:true});
  }
  for(const [collection,id] of [['stories',story.contentId],['events',event.contentId]]) {
    const parent=(await admin.firestore().doc(`${collection}/${id}`).get()).data(); assert.equal(parent.likesCount,1); assert.equal(parent.commentsCount,1);
  }
});
test('self interaction produces no notification; clients cannot forge media notifications',async()=>{
  const {a,story}=await content();
  await setDoc(doc(a.db,'story_likes',`A_${story.contentId}`),{userId:'A',storyId:story.contentId,createdAt:serverTimestamp()});
  await reconcileInteraction('story','likes',`A_${story.contentId}`,story.contentId,'A');
  assert.equal((await admin.firestore().collection('notifications').get()).size,0);
  await assertFails(setDoc(doc(a.db,'notifications','media_forged'),{userId:'A',type:'STORY_LIKE'}));
  await assertFails(setDoc(doc(a.db,'story_likes','duplicate'),{userId:'A',storyId:story.contentId,createdAt:serverTimestamp()}));
});
test('cleanup deletes only canonical owned media, tolerates repeats and leaves unrelated Storage alone',async()=>{
  const {story,s}=await content();
  await deleteStoryMedia(story.contentId,s); await deleteStoryMedia(story.contentId,s);
  await assert.rejects(getBytes(ref(deps('A').storage,story.path)));
  await deleteStoryMedia(story.contentId,{...s,mediaPath:'kyc/A/private.pdf'});
});
test('expiry query hides an expired Story before scheduled physical deletion',async()=>{
  const {story}=await content();
  await admin.firestore().doc(`stories/${story.contentId}`).update({expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()-1000)});
  assert.equal((await getDocsFromServer(ownerStoriesQuery(deps('B').db,'A',Date.now()))).size,0);
  await cleanupExpiredStories.run({scheduleTime:new Date().toISOString()});
  assert.equal((await admin.firestore().doc(`stories/${story.contentId}`).get()).exists,false);
  await assert.rejects(getBytes(ref(deps('A').storage,story.path)));
});
test('orphan tickets are bounded and generation-safe; linked media is retained',async()=>{
  const {a,story}=await content();
  const orphan=createMediaDraft('story','A',image());
  await uploadBytes(ref(a.storage,orphan.path),image(),{contentType:'image/jpeg',customMetadata:{ownerUid:'A',category:'stories',contentId:orphan.contentId}});
  for(const draft of [story,orphan]) {
    const metadata=await getMetadata(ref(a.storage,draft.path));
    await onMediaUploadFinalized.run({data:{name:draft.path,generation:metadata.generation,timeCreated:metadata.timeCreated,metadata:{ownerUid:'A',contentId:draft.contentId}}} as any);
  }
  const tickets=await admin.firestore().collection('media_upload_cleanup').get();
  assert.equal(tickets.size,2);
  await Promise.all(tickets.docs.map((ticket:any)=>ticket.ref.update({checkAfter:admin.firestore.Timestamp.fromMillis(0)})));
  await cleanupMediaOrphans.run({scheduleTime:new Date().toISOString()});
  await assert.rejects(getBytes(ref(a.storage,orphan.path)));
  assert.ok((await getBytes(ref(a.storage,story.path))).byteLength);
  assert.equal((await admin.firestore().collection('media_upload_cleanup').get()).size,0);
});
