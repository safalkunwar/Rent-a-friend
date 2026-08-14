import { initializeApp, cert, type FirebaseApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const FIREBASE_PROJECT_ID = 'hamrosathi1';
export const SOURCE_DATABASE_ID = 'ai-studio-ccc6f8a5-34d2-4bfc-a68f-689d7d401cb4';
export const TARGET_DATABASE_ID = '(default)';
export const SERVICE_ACCOUNT_KEY = 'C:\\Users\\Acer\\AppData\\Local\\Temp\\kilo\\sathi-migration-key.json';

export let app: FirebaseApp;
export let sourceDb: Firestore;
export let targetDb: Firestore;
export let auth: any;

try {
  app = initializeApp({
    credential: cert(SERVICE_ACCOUNT_KEY),
    projectId: FIREBASE_PROJECT_ID,
  });
  sourceDb = getFirestore(app, SOURCE_DATABASE_ID);
  targetDb = getFirestore(app);
  auth = getAuth(app);
} catch (err) {
  console.error('Failed to initialize Firebase Admin:', err);
  process.exit(1);
}

export const MIGRATION_ORDER = [
  'users',
  'companions',
  'activities',
  'events',
  'partners',
  'stories',
  'community_posts',
  'comments',
  'likes',
  'story_likes',
  'bookings',
  'conversations',
  'messages',
  'notifications',
  'reviews',
];

export const SKIP_COLLECTIONS = new Set(['test_collection', 'auditLogs']);

export interface MigrationStats {
  exported: number;
  skipped: number;
  imported: number;
  failed: number;
  duplicates: number;
  orphans: number;
}

export interface MigrationReport {
  collection: string;
  stats: MigrationStats;
  errors: string[];
  duplicates: Array<{ id: string; reason: string }>;
  orphans: Array<{ id: string; reason: string }>;
}
