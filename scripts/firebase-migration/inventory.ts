import { initializeApp, cert, type FirebaseApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const FIREBASE_PROJECT_ID = 'hamrosathi1';
const FIREBASE_DATABASE_ID = 'ai-studio-ccc6f8a5-34d2-4bfc-a68f-689d7d401cb4';
const SERVICE_ACCOUNT_KEY = 'C:\\Users\\Acer\\AppData\\Local\\Temp\\kilo\\sathi-migration-key.json';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: any = null;
let storage: any = null;

try {
  app = initializeApp({
    credential: cert(SERVICE_ACCOUNT_KEY),
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: `${FIREBASE_PROJECT_ID}.firebasestorage.app`,
  });
  db = getFirestore(app, FIREBASE_DATABASE_ID);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (err) {
  console.error('Failed to initialize Firebase Admin:', err);
  process.exit(1);
}

const listCollections = async (): Promise<string[]> => {
  try {
    const collections = await db!.listCollections();
    return collections.map(col => col.id);
  } catch (err) {
    console.error('Failed to list collections:', err);
    return [];
  }
};

const countDocuments = async (collectionName: string): Promise<number> => {
  try {
    const snapshot = await db!.collection(collectionName).count().get();
    return snapshot.data().count || 0;
  } catch (err) {
    console.error(`Failed to count ${collectionName}:`, err);
    return -1;
  }
};

const listUsers = async (): Promise<{ count: number; users: any[] }> => {
  try {
    const result = await auth.listUsers();
    return {
      count: result.users.length,
      users: result.users.map(u => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        phoneNumber: u.phoneNumber,
        disabled: u.disabled,
        emailVerified: u.emailVerified,
        providerData: u.providerData.map(p => p.providerId),
      })),
    };
  } catch (err) {
    console.error('Failed to list users:', err);
    return { count: -1, users: [] };
  }
};

const listStorageFiles = async (): Promise<string[]> => {
  try {
    const [files] = await storage!.bucket().getFiles();
    return files.map(f => f.name);
  } catch (err) {
    console.error('Failed to list storage files:', err);
    return [];
  }
};

const main = async () => {
  console.log('=== Firebase Data Inventory ===');
  console.log(`Project: ${FIREBASE_PROJECT_ID}`);
  console.log(`Database: ${FIREBASE_DATABASE_ID}`);
  console.log('');

  console.log('--- Firebase Auth Users ---');
  const userData = await listUsers();
  console.log(`Total Auth Users: ${userData.count}`);
  for (const user of userData.users) {
    console.log(`  ${user.uid}: ${user.email} (${user.displayName || 'no name'})`);
  }
  console.log('');

  console.log('--- Firestore Collections ---');
  const collections = await listCollections();
  console.log(`Found ${collections.length} collections:`);
  
  for (const collection of collections) {
    const count = await countDocuments(collection);
    console.log(`  ${collection}: ${count} documents`);
  }
  console.log('');

  console.log('--- Storage Files ---');
  const files = await listStorageFiles();
  console.log(`Total Storage Files: ${files.length}`);
  for (const file of files.slice(0, 20)) {
    console.log(`  ${file}`);
  }
  if (files.length > 20) {
    console.log(`  ... and ${files.length - 20} more files`);
  }
};

main().catch(err => {
  console.error('Inventory failed:', err);
  process.exit(1);
});
