import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, type Messaging } from 'firebase/messaging';
import appletConfig from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || 'AIzaSyBE-RD9iszOTqSLuugWxuYCpIWIrPVIjsI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || 'hamrosathi1.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || 'hamrosathi1',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || 'hamrosathi1.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || '932995524964',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || '1:932995524964:web:bae2033ae87165adbb3271',
};

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || undefined;

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

console.log('[SATHI] Firebase config loaded:', {
  hasValidConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'yes' : 'no',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'none',
  firestoreDatabaseId,
});

const enablePersistenceGracefully = (firestoreDb: Firestore) => {
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(firestoreDb)
      .then(() => console.log('[SATHI] Firestore offline persistence enabled successfully.'))
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('[SATHI] Firestore offline persistence failed-precondition (multiple tabs open).');
        } else if (err.code === 'unimplemented') {
          console.warn('[SATHI] Firestore offline persistence unimplemented in this browser.');
        } else {
          console.error('[SATHI] Firestore offline persistence failed:', err);
        }
      });
  }
};

if (hasValidConfig && !getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence)
      .then(() => console.log('[SATHI] Firebase Auth persistence configured: LOCAL'))
      .catch((err) => console.error('[SATHI] Failed to set Firebase Auth persistence:', err));
    db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
    enablePersistenceGracefully(db);
    storage = getStorage(app);
    console.log('[SATHI] Firebase initialized:', { app: !!app, auth: !!auth, db: !!db, storage: !!storage });
    try {
      messaging = getMessaging(app);
      console.log('[SATHI] Messaging initialized:', !!messaging);
    } catch (e) {
      console.warn('[SATHI] FCM not available:', e);
    }
  } catch (error) {
    console.error('[SATHI] Firebase initialization failed:', error);
  }
} else if (getApps().length) {
  app = getApps()[0];
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence)
    .then(() => console.log('[SATHI] Firebase Auth persistence configured for reused app: LOCAL'))
    .catch((err) => console.error('[SATHI] Failed to set Firebase Auth persistence on reuse:', err));
  db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
  enablePersistenceGracefully(db);
  storage = getStorage(app);
  console.log('[SATHI] Firebase reused existing app:', { app: !!app, auth: !!auth, db: !!db });
}

export { app, auth, db, storage, messaging, firebaseConfig };
