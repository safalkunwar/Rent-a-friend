import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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
const auth = getAuth(app);

async function check() {
  try {
    console.log('Signing in as admin@sathi.com...');
    const cred = await signInWithEmailAndPassword(auth, 'admin@sathi.com', 'Password123!');
    console.log('Signed in successfully!');

    console.log('Querying users collection for role == admin...');
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const snap = await getDocs(q);
    console.log('Found', snap.size, 'admin(s):');
    snap.forEach(doc => {
      console.log('Admin ID:', doc.id, 'Data:', doc.data());
    });

    console.log('Querying first 5 users overall...');
    const qAll = query(collection(db, 'users'));
    const snapAll = await getDocs(qAll);
    console.log('Total users found:', snapAll.size);
    let count = 0;
    snapAll.forEach(doc => {
      if (count < 5) {
        console.log('User ID:', doc.id, 'Role:', doc.data().role, 'Email:', doc.data().email);
      }
      count++;
    });

  } catch (err: any) {
    console.error('Error in query check:', err);
  }
  process.exit(0);
}

check();
