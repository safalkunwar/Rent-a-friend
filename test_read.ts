import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const appletConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

const firebaseConfig = {
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  projectId: appletConfig.projectId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: appletConfig.appId,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, appletConfig.firestoreDatabaseId || undefined);

async function testRead() {
  console.log('Testing queries on community_posts...');
  
  try {
    const q1 = query(collection(db, 'community_posts'), where('status', '==', 'published'));
    const s1 = await getDocs(q1);
    console.log('1. Filtered (status == published): Success! Size:', s1.size);
  } catch (err: any) {
    console.error('1. Filtered (status == published): Failed:', err.message);
  }

  try {
    const q2 = query(collection(db, 'community_posts'), where('status', '==', 'draft'));
    const s2 = await getDocs(q2);
    console.log('2. Filtered (status == draft): Success! Size:', s2.size);
  } catch (err: any) {
    console.error('2. Filtered (status == draft): Failed:', err.message);
  }

  try {
    const s3 = await getDocs(collection(db, 'community_posts'));
    console.log('3. Unfiltered: Success! Size:', s3.size);
  } catch (err: any) {
    console.error('3. Unfiltered: Failed:', err.message);
  }

  process.exit(0);
}

testRead();
