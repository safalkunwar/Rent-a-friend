// Read-only verification of the explicitly created, currently held UI-probe account.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, getDocsFromServer } from 'firebase/firestore';
import { getStorage, ref, getBytes, getMetadata } from 'firebase/storage';
import sharp from 'sharp';
import { visibleStoriesQuery } from '../../src/services/mediaQueries';
const run=process.env.SATHI_MEDIA_UI_RUN||'',password=process.env.SATHI_MEDIA_UI_PASSWORD;
if(!/^media-rollout-[a-f0-9-]{36}$/.test(run)||!password||process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Explicit live UI test run required');
const config=JSON.parse(await readFile('firebase-applet-config.json','utf8'));
assert.equal(config.projectId,'hamrosathi1');
const apps=[];
try{
  const a=initializeApp(config,run+'-ui-verify-A'),b=initializeApp(config,run+'-ui-verify-B');apps.push(a,b);
  const [owner,other]=await Promise.all([
    signInWithEmailAndPassword(getAuth(a),run+'-A@example.invalid',password),
    signInWithEmailAndPassword(getAuth(b),run+'-B@example.invalid',password)
  ]);
  assert.notEqual(owner.user.uid,other.user.uid);
  const profile=(await getDocFromServer(doc(getFirestore(a),'users',owner.user.uid))).data()!;
  assert.equal(profile.rolloutTestRun,run);
  const stories=await getDocsFromServer(visibleStoriesQuery(getFirestore(b),Date.now()));
  const uiStories=stories.docs.filter(d=>d.data().userId===owner.user.uid && d.data().caption==='Temporary UI rollout verification — Story picker');
  assert.equal(uiStories.length,1);
  const story=uiStories[0].data();
  assert.equal(story.status,'active');assert.equal(story.expiresAt.toMillis()-story.createdAt.toMillis(),86400000);
  for(const path of [profile.photoPath,story.mediaPath]){
    const bytes=await getBytes(ref(getStorage(b),path));
    const dimensions=await sharp(Buffer.from(bytes)).metadata();
    assert.equal(dimensions.width,1024);
    const metadata=await getMetadata(ref(getStorage(b),path));
    assert.equal(metadata.customMetadata?.ownerUid,owner.user.uid);
  }
  console.log(JSON.stringify({run,profileFirestoreConfirmed:true,profileBinaryWidth:1024,uiStoryFirestoreConfirmed:true,
    uiStoryIndexedSecondUserRead:true,uiStoryBinaryWidth:1024,exact24HourLifetime:true,uiStoryDocument:uiStories[0].id}));
}finally{await Promise.all(apps.map(deleteApp));}
