import 'dotenv/config';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, type Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, getDocs, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from '../firebase';
import { COMPANIONS, STORIES, ACTIVITIES, EVENTS } from '../data/seedData';

const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

async function authenticateIfConfigured() {
  const email = process.env.VITE_SEED_ADMIN_EMAIL;
  const password = process.env.VITE_SEED_ADMIN_PASSWORD;
  if (email && password) {
    await signInWithEmailAndPassword(auth, email, password);
    console.log(`Seed authenticated as admin: ${email}`);
  } else {
    console.log('No VITE_SEED_ADMIN_EMAIL/PASSWORD set - writing without auth (admin-only collections may be denied).');
  }
}

const guideApplications = [
  {
    id: 'ga1',
    name: 'Sanjay Lama',
    email: 'sanjay.l@example.com',
    location: 'Pokhara',
    appliedDate: new Date().toISOString(),
    status: 'pending',
    companionId: 'c10',
    idUrl: '#',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ga2',
    name: 'Priya Gurung',
    email: 'priya.g@example.com',
    location: 'Kathmandu',
    appliedDate: new Date(Date.now() - 86400000).toISOString(),
    status: 'pending',
    companionId: 'c11',
    idUrl: '#',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const sosAlerts = [
  {
    id: 'sos1',
    user: 'Maria (Traveler)',
    guide: 'Arjun Thapa',
    location: 'Thamel, Kathmandu',
    status: 'active',
    priority: 'high',
    timestamp: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'sos2',
    user: 'Pasang Dolma (Guide)',
    guide: '-',
    location: 'Patan Durbar Square',
    status: 'resolved',
    priority: 'medium',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
];

const suspiciousActivities = [
  {
    id: 'sus1',
    flag: 'Multiple failed payments',
    target: 'User: JohnDoe99',
    date: new Date().toISOString(),
    status: 'new',
  },
  {
    id: 'sus2',
    flag: 'Rapid location change anomaly',
    target: 'Guide: Rajesh Karki',
    date: new Date(Date.now() - 86400000).toISOString(),
    status: 'investigating',
  },
];

const feedback = [
  {
    id: 'fb1',
    user: 'Sarah L.',
    type: 'feedback',
    message: 'The app is great, but I wish I could filter guides by language spoken directly on the map.',
    date: new Date().toISOString(),
    rating: 4,
    status: 'new',
    userId: 'u-demo-1',
  },
  {
    id: 'fb2',
    user: 'John Doe',
    type: 'bug',
    message: 'Payment gateway crashed when I tried to use my international card.',
    date: new Date(Date.now() - 86400000).toISOString(),
    rating: null,
    status: 'new',
    userId: 'u-demo-2',
  },
  {
    id: 'fb3',
    user: 'Pasang D.',
    type: 'guide_feedback',
    message: 'I need a way to block users who are unresponsive after booking.',
    date: new Date(Date.now() - 172800000).toISOString(),
    rating: null,
    status: 'resolved',
    userId: 'u-demo-3',
  },
];

type SeedCollection = { name: string; items: { id: string }[] };

const collections: SeedCollection[] = [
  { name: 'companions', items: COMPANIONS },
  { name: 'stories', items: STORIES },
  { name: 'activities', items: ACTIVITIES },
  { name: 'events', items: EVENTS },
  { name: 'guideApplications', items: guideApplications },
  { name: 'sosAlerts', items: sosAlerts },
  { name: 'suspiciousActivity', items: suspiciousActivities },
  { name: 'feedback', items: feedback },
];

async function seedCollection(col: SeedCollection) {
  const ref = collection(db, col.name);
  const existing = await getDocs(ref);
  if (existing.size > 0) {
    console.log(`Seed skipped: ${existing.size} '${col.name}' documents already exist.`);
    return;
  }
  for (const item of col.items) {
    await setDoc(doc(db, col.name, item.id), item);
  }
  console.log(`Seeded ${col.items.length} '${col.name}' documents.`);
}

async function seed() {
  await authenticateIfConfigured();

  const failures: string[] = [];
  for (const col of collections) {
    try {
      await seedCollection(col);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`'${col.name}': ${message}`);
      console.warn(`Seed FAILED for '${col.name}': ${message}`);
    }
  }

  if (failures.length) {
    console.warn('\nSome collections could not be seeded. This is usually because the Firestore security rules require admin authentication for writes.');
    console.warn('Set VITE_SEED_ADMIN_EMAIL and VITE_SEED_ADMIN_PASSWORD in your .env and ensure that user has the admin custom claim, then re-run `npm run seed`.');
    console.warn('The app will still display companions via its local fallback data.\n');
  } else {
    console.log('Seed complete: companions, stories, activities, events, guideApplications, sosAlerts, suspiciousActivity, and feedback checked/written.');
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
