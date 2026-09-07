// Recovery for an interrupted UI probe: only the two exact generated test accounts.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { getFirestore, doc, collection, query, where, limit, getDocFromServer, getDocsFromServer } from 'firebase/firestore';
const run=process.env.SATHI_MEDIA_UI_RUN||'',password=process.env.SATHI_MEDIA_UI_PASSWORD;
if(!/^media-rollout-[a-f0-9-]{36}$/.test(run)||!password||process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Explicit live test identity required');
const config=JSON.parse(await readFile('firebase-applet-config.json','utf8'));assert.equal(config.projectId,'hamrosathi1');
for(const label of ['A','B']){
  const app=initializeApp(config,run+'-cleanup-'+label);
  try{
    const auth=getAuth(app),email=run+'-'+label+'@example.invalid';
    const credential=await signInWithEmailAndPassword(auth,email,password);
    assert.equal(credential.user.email,email.toLowerCase());
    const uid=credential.user.uid,db=getFirestore(app);
    const profile=await getDocFromServer(doc(db,'users',uid));
    const stories=await getDocsFromServer(query(collection(db,'stories'),where('userId','==',uid),limit(10)));
    console.log(JSON.stringify({label,uid,profileExists:profile.exists(),storyCount:stories.size}));
    assert.equal(profile.exists(),false,'Stop: profile cleanup incomplete');
    assert.equal(stories.size,0,'Stop: Story cleanup incomplete');
    if(process.argv.includes('--delete-auth')){
      await deleteUser(credential.user);
      console.log(JSON.stringify({label,authDeleted:true}));
    }
  }finally{await deleteApp(app);}
}
