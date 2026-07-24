import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';

const appletConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

const firebaseConfig = {
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  projectId: 'hamrosathi1',
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: appletConfig.appId,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function test() {
  try {
    console.log('Signing in as admin@sathi.com...');
    const cred = await signInWithEmailAndPassword(auth, 'admin@sathi.com', 'Password123!');
    console.log('Signed in successfully! UID:', cred.user.uid);

    console.log('Writing to likes collection...');
    const likeId = `${cred.user.uid}_test_like`;
    await setDoc(doc(db, 'likes', likeId), {
      userId: cred.user.uid,
      postId: 'test_post_id',
      createdAt: new Date().toISOString()
    });
    console.log('Success writing to likes!');
  } catch (err: any) {
    console.error('Failed:', err);
  }
  process.exit(0);
}

test();
