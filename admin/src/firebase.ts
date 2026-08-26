import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, type Messaging } from 'firebase/messaging';

const EXPECTED_PROJECT_ID = 'hamrosathi1';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const missingFields = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFields.length > 0) {
  console.error('[SATHI Admin] FATAL: Missing required Firebase config fields:', missingFields.join(', '));
  console.error('[SATHI Admin] Provide them via environment variables: VITE_FIREBASE_*');
  throw new Error(`Missing Firebase config: ${missingFields.join(', ')}`);
}

if (firebaseConfig.projectId !== EXPECTED_PROJECT_ID) {
  console.error(`[SATHI Admin] FATAL: Wrong Firebase project detected: ${firebaseConfig.projectId}`);
  console.error(`[SATHI Admin] Expected project: ${EXPECTED_PROJECT_ID}`);
  console.error('[SATHI Admin] Do NOT silently switch databases. Fix your configuration.');
  throw new Error(`Wrong Firebase project: ${firebaseConfig.projectId}. Expected: ${EXPECTED_PROJECT_ID}`);
}

console.log('[SATHI Admin] Firebase config validated:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let messaging: Messaging | null = null;

const enablePersistenceGracefully = (firestoreDb: Firestore) => {
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(firestoreDb)
      .then(() => console.log('[SATHI Admin] Firestore offline persistence enabled successfully.'))
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('[SATHI Admin] Firestore offline persistence failed-precondition (multiple tabs open).');
        } else if (err.code === 'unimplemented') {
          console.warn('[SATHI Admin] Firestore offline persistence unimplemented in this browser.');
        } else {
          console.error('[SATHI Admin] Firestore offline persistence failed:', err);
        }
      });
  }
};

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('[SATHI Admin] Firebase app initialized');
  } else {
    app = getApps()[0];
    console.log('[SATHI Admin] Firebase app reused');
  }

  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence)
    .then(() => console.log('[SATHI Admin] Firebase Auth persistence configured: LOCAL'))
    .catch((err) => console.error('[SATHI Admin] Failed to set Firebase Auth persistence:', err));

  db = getFirestore(app);
  enablePersistenceGracefully(db);

  storage = getStorage(app);

  try {
    const isFcmSupported = typeof window !== 'undefined' && 'ServiceWorkerContainer' in window;
    if (isFcmSupported) {
      messaging = getMessaging(app);
      console.log('[SATHI Admin] Messaging initialized:', !!messaging);
    } else {
      messaging = null;
      console.warn('[SATHI Admin] Messaging skipped: browser does not support FCM prerequisites');
    }
  } catch (e) {
    console.warn('[SATHI Admin] FCM not available:', e);
  }

  console.log('[SATHI Admin] Firebase initialized successfully:', {
    app: !!app,
    auth: !!auth,
    db: !!db,
    storage: !!storage,
    messaging: !!messaging,
  });
} catch (error) {
  console.error('[SATHI Admin] FATAL: Firebase initialization failed:', error);
  throw error;
}

export { app, auth, db, storage, messaging };
export type { FirebaseApp, Auth, Firestore, FirebaseStorage, Messaging };
