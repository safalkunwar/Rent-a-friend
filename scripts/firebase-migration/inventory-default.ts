import { initializeApp, cert, type FirebaseApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const FIREBASE_PROJECT_ID = 'hamrosathi1';
const SERVICE_ACCOUNT_KEY = 'C:\\Users\\Acer\\AppData\\Local\\Temp\\kilo\\sathi-migration-key.json';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: any = null;

try {
  app = initializeApp({
    credential: cert(SERVICE_ACCOUNT_KEY),
    projectId: FIREBASE_PROJECT_ID,
  });
  db = getFirestore(app);
  auth = getAuth(app);
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

const listUsers = async (): Promise<number> => {
  try {
    const result = await auth.listUsers();
    return result.users.length;
  } catch (err) {
    console.error('Failed to list users:', err);
    return -1;
  }
};

const main = async () => {
  console.log('=== Default Database Inventory ===');
  console.log(`Project: ${FIREBASE_PROJECT_ID}`);
  console.log(`Database: (default)`);
  console.log('');

  const userCount = await listUsers();
  console.log(`Firebase Auth Users: ${userCount}`);
  console.log('');

  const collections = await listCollections();
  console.log(`Found ${collections.length} collections:`);
  
  for (const collection of collections) {
    const count = await countDocuments(collection);
    console.log(`  ${collection}: ${count} documents`);
  }
};

main().catch(err => {
  console.error('Inventory failed:', err);
  process.exit(1);
});
