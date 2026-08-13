import { initializeApp, getApps, type FirebaseApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const FIREBASE_PROJECT_ID = 'hamrosathi1';

try {
  const appOptions = { projectId: FIREBASE_PROJECT_ID };
  app = !getApps().length ? initializeApp(appOptions) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.error('Failed to initialize Firebase Admin. Make sure GOOGLE_APPLICATION_CREDENTIALS is set.', err);
  process.exit(1);
}

const printBanner = () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           SATHI Admin Role Grant Helper                  ║
╠══════════════════════════════════════════════════════════╣
║  This script grants admin access to a Firebase user.    ║
║  The user must already exist in Firebase Authentication ║
╚══════════════════════════════════════════════════════════╝
`);

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_TOKEN) {
    console.log('⚠️  No Google credentials detected.');
    console.log('   Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON,');
    console.log('   or run: firebase login && firebase use --add\n');
  }
};

const prompt = (question: string): string => {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise<string>((resolve) => {
    readline.question(question, (answer: string) => {
      readline.close();
      resolve(answer.trim());
    });
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const lookupUser = async (identifier: string) => {
  if (identifier.includes('@')) {
    return auth!.getUserByEmail(identifier);
  }
  return auth!.getUser(identifier);
};

const grantAdminRole = async () => {
  printBanner();

const args = process.argv.slice(2);
const identifier = args[0] || (await prompt('Enter user email or UID: '));
const role = args[1] || (await prompt('Enter admin role (SUPER_ADMIN, PLATFORM_ADMIN, SAFETY_ADMIN, MODERATION_ADMIN, SUPPORT_AGENT, BOOKING_ADMIN, FINANCE_ADMIN, KYC_REVIEWER, CONTENT_ADMIN, ANALYTICS_ADMIN, READ_ONLY_ADMIN) [SUPER_ADMIN]: ')) || 'SUPER_ADMIN';

  try {
    const userRecord = await lookupUser(identifier);
    console.log(`\n🔍 Found user: ${userRecord.email} (${userRecord.uid})`);

    await auth!.setCustomUserClaims(userRecord.uid, {
      admin: true,
      adminRole: role,
    });

    await db!.doc(`admins/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email: userRecord.email,
      role,
      createdAt: new Date().toISOString(),
    });

    console.log(`\n✅ Admin role granted successfully!`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Role: ${role}`);
    console.log(`\n👉 Next steps:`);
    console.log(`   1. Go to http://localhost:3001/login`);
    console.log(`   2. Sign in with: ${userRecord.email}`);
    console.log(`   3. You will be redirected to the admin dashboard.\n`);
  } catch (err: any) {
    console.error('\n❌ Failed to grant admin role:', err.message || err);
    process.exit(1);
  }
};

grantAdminRole();
