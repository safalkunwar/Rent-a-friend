import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let messaging: Messaging | null = null;

const hasValidConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.authDomain &&
  firebaseConfig.appId
);

console.log('[SATHI Admin] Firebase config loaded:', {
  hasValidConfig,
  projectId: firebaseConfig.projectId || 'none',
  firestoreDatabaseId,
});

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

if (hasValidConfig && !getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence)
      .then(() => console.log('[SATHI Admin] Firebase Auth persistence configured: LOCAL'))
      .catch((err) => console.error('[SATHI Admin] Failed to set Firebase Auth persistence:', err));
    db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
    enablePersistenceGracefully(db);
    storage = getStorage(app);
    console.log('[SATHI Admin] Firebase initialized:', { app: !!app, auth: !!auth, db: !!db, storage: !!storage });
    try {
      messaging = getMessaging(app);
      console.log('[SATHI Admin] Messaging initialized:', !!messaging);
    } catch (e) {
      console.warn('[SATHI Admin] FCM not available:', e);
    }
  } catch (error) {
    console.error('[SATHI Admin] Firebase initialization failed:', error);
  }
} else if (getApps().length) {
  app = getApps()[0];
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence)
    .then(() => console.log('[SATHI Admin] Firebase Auth persistence configured for reused app: LOCAL'))
    .catch((err) => console.error('[SATHI Admin] Failed to set Firebase Auth persistence on reuse:', err));
  db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
  enablePersistenceGracefully(db);
  storage = getStorage(app);
}

export { app, auth, db, storage, messaging };
export type { FirebaseApp, Auth, Firestore, FirebaseStorage, Messaging };
