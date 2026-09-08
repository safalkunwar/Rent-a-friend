import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, getDocsFromServer, setDoc, updateDoc, collection, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, getMetadata, deleteObject } from 'firebase/storage';
import sharp from 'sharp';
import { createMediaDraft, saveMedia, type MediaDraft } from '../../src/services/mediaUploadCore';
import { ownerStoriesQuery, eventSummaryQuery } from '../../src/services/mediaQueries';
import { groupStories } from '../../src/services/storyGroups';
import { request } from './production-api.mjs';

if(process.env.SATHI_APPROVED_MEDIA_ROLLOUT !== 'hamrosathi1' || !process.env.SATHI_MEDIA_TEST_PASSWORD) throw new Error('Explicit production opt-in and temporary test password required');
const config=JSON.parse(await readFile('firebase-applet-config.json','utf8'));
const run=`media-social-${randomUUID()}`;
const password=process.env.SATHI_MEDIA_TEST_PASSWORD;
const accounts: { app:ReturnType<typeof initializeApp>; auth:ReturnType<typeof getAuth>; db:ReturnType<typeof getFirestore>; storage:ReturnType<typeof getStorage>; uid:string; email:string }[]=[];
const targets:{collection:string;id:string}[]=[], interactions:{collection:string;id:string}[]=[], drafts:MediaDraft[]=[];
const remove=async(path:string)=>{
  try { await request(`https://firestore.googleapis.com/v1/projects/hamrosathi1/databases/(default)/documents/${path}`,'DELETE'); }
  catch(error) { if(!String(error).includes('404')) throw error; }
};
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function draft(kind:'profile'|'story'|'event',uid:string) {
  const input=await readFile('public/sathi-logo-circle.png');
  const edge=kind==='profile'?512:kind==='story'?1920:1600;
  const full=await sharp(input).resize({width:edge,height:edge,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toBuffer();
  const preview=await sharp(input).resize({width:kind==='profile'?128:kind==='story'?320:640,height:kind==='profile'?128:kind==='story'?320:640,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toBuffer();
  const result=createMediaDraft(kind,uid,new File([new Uint8Array(full)],'image.webp',{type:'image/webp'}));
  result.preview={file:new File([new Uint8Array(preview)],'preview.webp',{type:'image/webp'}),path:result.path.replace('.webp','_preview.webp')};
  drafts.push(result); return result;
}
try {
  for(const letter of ['a','b']) {
    const app=initializeApp(config,`${run}-${letter}`),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
    const email=`${run}-${letter}@example.test`;
    const user=(await createUserWithEmailAndPassword(auth,email,password)).user;
    accounts.push({app,auth,db,storage,uid:user.uid,email});
    await setDoc(doc(db,'users',user.uid),{name:`SATHI rollout ${letter.toUpperCase()}`,email,role:'customer',avatar:'',createdAt:new Date().toISOString()});
  }
  const [a,b]=accounts;
  const avatar=await draft('profile',a.uid); await saveMedia(a,avatar);
  const first=await draft('story',a.uid),second=await draft('story',a.uid),event=await draft('event',a.uid);
  for(const item of [first,second,event]) targets.push({collection:item.kind==='story'?'stories':'events',id:item.contentId});
  await saveMedia(a,first,{caption:`${run} Story 1`,userName:'SATHI rollout A'});
  await saveMedia(a,second,{caption:`${run} Story 2`,userName:'SATHI rollout A'});
  await saveMedia(a,event,{userCreated:true,title:`${run} Event`,description:'Disposable production acceptance event',location:'Pokhara',date:'2099-12-20',time:'10:30',category:'Social',spots:0});
  const stories=(await getDocsFromServer(ownerStoriesQuery(b.db,a.uid,Date.now()))).docs.map(item=>({...item.data(),id:item.id})) as any[];
  const grouped=groupStories(stories); assert.equal(grouped.length,1); assert.deepEqual(grouped[0].stories.map(item=>item.id),[first.contentId,second.contentId]);
  assert.equal(stories[0].caption,`${run} Story 1`);
  assert.equal(stories[0].expiresAt.toMillis()-stories[0].createdAt.toMillis(),86400000);
  await getDocsFromServer(eventSummaryQuery(b.db,10));
  assert.equal((await getDocFromServer(doc(b.db,'events',event.contentId))).data()?.ownerId,a.uid);
  for(const [kind,id] of [['story',first.contentId],['event',event.contentId]] as const) {
    for(const action of ['likes','comments'] as const) {
      if(kind==='story' && action==='comments') {
        await assert.rejects(setDoc(doc(b.db,'story_comments',randomUUID()),{userId:b.uid,storyId:id,text:'Not supported',createdAt:serverTimestamp()}));
        continue;
      }
      const identity=action==='likes'?`${b.uid}_${id}`:randomUUID();
      interactions.push({collection:`${kind}_${action}`,id:identity});
      await setDoc(doc(b.db,`${kind}_${action}`,identity),{userId:b.uid,[`${kind}Id`]:id,createdAt:serverTimestamp(),...(action==='comments'?{text:'Production acceptance comment'}:{})});
    }
    if(kind==='event') await getDocsFromServer(query(collection(b.db,'event_comments'),where('eventId','==',id),orderBy('createdAt','desc'),limit(20)));
  }
  let notifications:any[]=[];
  for(let attempt=0;attempt<24;attempt++) {
    notifications=(await getDocsFromServer(query(collection(a.db,'notifications'),where('userId','==',a.uid),orderBy('timestamp','desc'),limit(20)))).docs;
    if(notifications.length===3) break;
    await pause(5000);
  }
  assert.equal(notifications.length,3,'Three backend notifications must arrive');
  assert.deepEqual(notifications.map(item=>item.data().type).sort(),['EVENT_COMMENT','EVENT_LIKE','STORY_LIKE']);
  for(const note of notifications) {
    assert.ok([first.contentId,event.contentId].includes(note.data().targetId));
    await updateDoc(doc(a.db,'notifications',note.id),{isRead:true});
  }
  await assert.rejects(updateDoc(doc(b.db,'users',a.uid),{avatar:'forged'}),{code:'permission-denied'});
  await assert.rejects(updateDoc(doc(b.db,'stories',first.contentId),{caption:'forged'}),{code:'permission-denied'});
  await assert.rejects(updateDoc(doc(a.db,'stories',first.contentId),{moderationStatus:'REMOVED'}),{code:'permission-denied'});
  await signInWithEmailAndPassword(a.auth,a.email,password);
  assert.equal((await getDocFromServer(doc(a.db,'users',a.uid))).data()?.photoPath,avatar.path);
  console.log(JSON.stringify({run,result:'LIVE SDK ACCEPTANCE PASSED',accounts:accounts.map(({email,uid})=>({email,uid})),storyIds:[first.contentId,second.contentId],eventId:event.contentId,notifications:3,profileBytes:(await getMetadata(ref(a.storage,avatar.path))).size,profilePreviewBytes:(await getMetadata(ref(a.storage,avatar.preview!.path))).size}));
  if(process.env.SATHI_MEDIA_UI_HOLD==='1') {
    console.log('UI fixtures held for at most 10 minutes; send any input to clean up.');
    await Promise.race([pause(600000),new Promise(resolve=>process.stdin.once('data',resolve))]);
  }
} finally {
  // Parents first: delayed handlers see no target and cannot recreate content or notifications.
  for(const target of targets) await remove(`${target.collection}/${target.id}`);
  for(const item of interactions) await remove(`${item.collection}/${item.id}`);
  for(const item of interactions) {
    const hash=createHash('sha256').update(`${item.collection}/${item.id}`).digest('hex');
    await remove(`notifications/media_${hash}`); await remove(`media_interaction_receipts/${hash}`);
  }
  for(const item of drafts) {
    const owner=accounts.find(account=>account.uid===item.uid);
    if(!owner) continue;
    for(const path of [item.path,item.preview?.path].filter(Boolean) as string[]) {
      try { await deleteObject(ref(owner.storage,path)); } catch(error) { if((error as {code?:string}).code!=='storage/object-not-found') throw error; }
    }
  }
  for(const account of accounts) {
    await remove(`users/${account.uid}`);
    await signInWithEmailAndPassword(account.auth,account.email,password);
    if(account.auth.currentUser) await deleteUser(account.auth.currentUser);
    await deleteApp(account.app);
  }
  console.log(JSON.stringify({run,cleanup:'Generated accounts, profiles, content, interactions and media removed'}));
}
