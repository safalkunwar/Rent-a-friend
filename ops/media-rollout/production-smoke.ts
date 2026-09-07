// Explicitly opt-in live probe. Normal Firebase users exercise rules; IAM is cleanup-only.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { getFirestore, doc, collection, query, where, limit, setDoc, updateDoc, deleteDoc, getDocFromServer, getDocsFromServer } from 'firebase/firestore';
import { getStorage, ref, getBytes, uploadBytes, deleteObject } from 'firebase/storage';
import sharp from 'sharp';
import { createMediaDraft, saveMedia, type MediaDraft } from '../../src/services/mediaUploadCore';
import { visibleStoriesQuery } from '../../src/services/mediaQueries';

if(!process.argv.includes('--project=hamrosathi1') || !process.argv.includes('--live') ||
   process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
   !process.env.SATHI_ROLLOUT_ADMIN_TOKEN) throw new Error('Explicit live project and cleanup credential required; emulators forbidden.');
const config=JSON.parse(await readFile('firebase-applet-config.json','utf8'));
assert.equal(config.projectId,'hamrosathi1');
assert.equal(config.storageBucket,'hamrosathi1.firebasestorage.app');
const run='media-rollout-'+randomUUID();
const accounts: Array<{app:ReturnType<typeof initializeApp>,auth:ReturnType<typeof getAuth>,db:ReturnType<typeof getFirestore>,storage:ReturnType<typeof getStorage>,email:string,password:string,uid?:string}>=[];
const drafts:MediaDraft[]=[];
const results:Record<string,unknown>={run};
async function denied(action:Promise<unknown>,code:string){
  await assert.rejects(action,(error:any)=>error.code===code);
}
async function account(label:string){
  const app=initializeApp(config,run+'-'+label),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
  const item={app,auth,db,storage,email:run+'-'+label+'@example.invalid',password:process.env.SATHI_MEDIA_UI_PASSWORD||randomUUID()+'Aa9!',uid:undefined as string|undefined};
  accounts.push(item);
  const credential=await createUserWithEmailAndPassword(auth,item.email,item.password);
  item.uid=credential.user.uid;
  await setDoc(doc(db,'users',item.uid),{name:'Media rollout test '+label,role:'customer',avatar:'',rolloutTestRun:run});
  return item;
}
try{
  const guestApp=initializeApp(config,run+'-guest');
  try{
    const initial=await getDocsFromServer(visibleStoriesQuery(getFirestore(guestApp),Date.now()));
    results.publicQueryBefore={ok:true,count:initial.size};
  }finally{await deleteApp(guestApp);}
  const a=await account('A'),b=await account('B');
  // Valid, decodable synthetic image; no personal media or existing account is touched.
  const png=await sharp({create:{width:120,height:120,channels:4,background:{r:30,g:64,b:95,alpha:1}}}).png().toBuffer();
  const file=new File([new Uint8Array(png)],'media-rollout-test.png',{type:'image/png'});
  const photo=createMediaDraft('profile',a.uid!,file),story=createMediaDraft('story',a.uid!,file);
  drafts.push(photo,story);
  await saveMedia(a,photo);
  const savedPhoto=(await getDocFromServer(doc(a.db,'users',a.uid!))).data()!;
  assert.equal(savedPhoto.photoPath,photo.path);
  assert.equal(savedPhoto.photoModerationStatus,'ACTIVE');
  assert.ok((await getBytes(ref(b.storage,photo.path))).byteLength>0);
  results.profileUpload={storage:true,firestore:true,secondUserBinary:true};
  const savedStory=await saveMedia(a,story,{caption:'Temporary media rollout verification',userName:'Media rollout test A',userAvatar:savedPhoto.avatar});
  assert.equal(savedStory.status,'active');
  const otherStory=(await getDocFromServer(doc(b.db,'stories',story.contentId))).data()!;
  assert.equal(otherStory.userId,a.uid);
  assert.equal(otherStory.caption,'Temporary media rollout verification');
  assert.ok((await getBytes(ref(b.storage,story.path))).byteLength>0);
  const indexed=await getDocsFromServer(visibleStoriesQuery(b.db,Date.now()));
  assert.ok(indexed.docs.some(d=>d.id===story.contentId));
  results.storyUpload={storage:true,firestore:true,indexedRead:true,secondUserRead:true,secondUserBinary:true};
  await denied(updateDoc(doc(b.db,'stories',story.contentId),{caption:'cross-user probe'}),'permission-denied');
  await denied(updateDoc(doc(b.db,'users',a.uid!),{avatar:'cross-user probe'}),'permission-denied');
  await denied(uploadBytes(ref(b.storage,'stories/'+a.uid+'/cross-'+run+'.png'),file,{
    contentType:'image/png',customMetadata:{ownerUid:a.uid!,category:'stories',contentId:'cross-'+run}
  }),'storage/unauthorized');
  await denied(updateDoc(doc(a.db,'stories',story.contentId),{moderationStatus:'REMOVED'}),'permission-denied');
  results.negativeAuthorization={crossUserStoryEdit:'DENIED',crossUserPhotoEdit:'DENIED',crossUserStoryUpload:'DENIED',ownerModerationEdit:'DENIED'};
  const freshApp=initializeApp(config,run+'-fresh');
  try{
    const freshAuth=getAuth(freshApp);
    await signInWithEmailAndPassword(freshAuth,a.email,a.password);
    const freshDb=getFirestore(freshApp);
    assert.equal((await getDocFromServer(doc(freshDb,'users',a.uid!))).data()?.photoPath,photo.path);
    assert.ok((await getDocsFromServer(visibleStoriesQuery(freshDb,Date.now()))).docs.some(d=>d.id===story.contentId));
    results.freshClient={profile:true,story:true};
  }finally{await deleteApp(freshApp);}
  // Verify the exact render URL yields a decodable image, without logging its bearer token.
  for(const [label,url] of [['avatar',savedPhoto.avatar],['story',savedStory.imageUrl]]){
    const response=await fetch(String(url),{signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200);
    const metadata=await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    assert.equal(metadata.width,120); assert.equal(metadata.height,120);
    results[label+'RenderResource']={http:200,width:metadata.width,height:metadata.height};
  }
  console.log(JSON.stringify({stage:'LIVE_CHECKS_PASSED',...results},null,2));
  if(process.argv.includes('--hold-for-ui')){
    const input=createInterface({input:process.stdin,output:process.stdout});
    try{
      await input.question('Temporary test Story is available for UI inspection. Press Enter to remove only these test fixtures.\n',
        {signal:AbortSignal.timeout(process.env.SATHI_MEDIA_UI_PASSWORD?600000:180000)});
    }catch{}finally{input.close();}
  }
}catch(error:any){
  let backendError;
  try{backendError=JSON.parse(error.customData?.serverResponse||'null')?.error;}catch{}
  console.error(JSON.stringify({stage:'LIVE_CHECK_FAILED',code:error.code||'assertion',message:error.message,backendError,results}));
  process.exitCode=1;
}finally{
  const cleanupErrors:string[]=[];
  if(process.env.SATHI_MEDIA_UI_PASSWORD){
    // The optional browser phase uses only account A, created by this process.
    const owner=accounts[0];
    if(owner?.uid){
      try{
        const ownedStories=await getDocsFromServer(query(collection(owner.db,'stories'),where('userId','==',owner.uid),limit(10)));
        for(const snapshot of ownedStories.docs){
          const data=snapshot.data();
          if(drafts.some(d=>d.kind==='story' && d.contentId===snapshot.id))continue;
          assert.equal(data.userId,owner.uid);
          assert.ok(String(data.mediaPath).startsWith('stories/'+owner.uid+'/'));
          await deleteDoc(snapshot.ref);
          await deleteObject(ref(owner.storage,data.mediaPath));
        }
        const profile=(await getDocFromServer(doc(owner.db,'users',owner.uid))).data();
        if(profile?.photoPath && !drafts.some(d=>d.path===profile.photoPath)){
          assert.ok(profile.photoPath.startsWith('avatars/'+owner.uid+'/'));
          await deleteObject(ref(owner.storage,profile.photoPath));
        }
      }catch(error:any){cleanupErrors.push('browser test media '+error.code);}
    }
  }
  // No lists, broad deletes or existing records: only references generated in this process.
  for(const draft of drafts){
    const owner=accounts.find(account=>account.uid===draft.uid)!;
    if(draft.kind==='story'){
      try{
        const target=doc(owner.db,'stories',draft.contentId),snapshot=await getDocFromServer(target);
        if(snapshot.exists()){
          assert.equal(snapshot.data().mediaPath,draft.path);
          await deleteDoc(target);
        }
      }catch(error:any){cleanupErrors.push('test story '+error.code);}
    }
    try{await deleteObject(ref(owner.storage,draft.path));}
    catch(error:any){if(error.code!=='storage/object-not-found')cleanupErrors.push('test object '+error.code);}
  }
  for(const item of accounts){
    if(item.uid){
      // Production intentionally denies owner profile deletion. IAM is used only to clean our marked new fixture.
      const url='https://firestore.googleapis.com/v1/projects/hamrosathi1/databases/(default)/documents/users/'+encodeURIComponent(item.uid);
      const headers={Authorization:'Bearer '+process.env.SATHI_ROLLOUT_ADMIN_TOKEN,'X-Goog-User-Project':'hamrosathi1'};
      try{
        const existing=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});
        if(existing.status!==404){
          assert.equal(existing.status,200);
          const body=await existing.json();
          assert.equal(body.fields?.rolloutTestRun?.stringValue,run,'Refuse to delete an unmarked profile');
          const removed=await fetch(url+'?currentDocument.updateTime='+encodeURIComponent(body.updateTime),{method:'DELETE',headers,signal:AbortSignal.timeout(15000)});
          assert.equal(removed.status,200);
        }
      }catch(error:any){cleanupErrors.push('test profile '+item.uid+' '+error.message);}
      try{
        // A held browser check may outlast Firebase's recent-login window.
        await signInWithEmailAndPassword(item.auth,item.email,item.password);
        if(item.auth.currentUser)await deleteUser(item.auth.currentUser);
      }
      catch(error:any){cleanupErrors.push('test auth '+item.uid+' '+error.code);}
    }
    await deleteApp(item.app);
  }
  console.log(JSON.stringify({stage:'CLEANUP',onlyGeneratedFixtures:true,errors:cleanupErrors}));
  if(cleanupErrors.length)process.exitCode=1;
}
