import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
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
const db = getFirestore(app, appletConfig.firestoreDatabaseId || undefined);

async function testWrite() {
  console.log('Testing unauthenticated write to test_collection...');
  try {
    const docRef = await addDoc(collection(db, 'test_collection'), {
      test: 'hello',
      createdAt: new Date().toISOString()
    });
    console.log('Success! Doc ID:', docRef.id);
  } catch (err: any) {
    console.error('Failed:', err.message);
  }
  process.exit(0);
}

testWrite();
