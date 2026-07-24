import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, writeBatch, GeoPoint } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

let appletConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('[SATHI Seed] Error reading firebase-applet-config.json:', e);
}

const firebaseConfig = {
  apiKey: appletConfig.apiKey || process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBE-RD9iszOTqSLuugWxuYCpIWIrPVIjsI',
  authDomain: appletConfig.authDomain || process.env.VITE_FIREBASE_AUTH_DOMAIN || 'hamrosathi1.firebaseapp.com',
  projectId: appletConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID || 'hamrosathi1',
  storageBucket: appletConfig.storageBucket || process.env.VITE_FIREBASE_STORAGE_BUCKET || 'hamrosathi1.firebasestorage.app',
  messagingSenderId: appletConfig.messagingSenderId || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '932995524964',
  appId: appletConfig.appId || process.env.VITE_FIREBASE_APP_ID || '1:932995524964:web:bae2033ae87165adbb3271',
};

const firestoreDatabaseId = process.env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || undefined;

console.log('[SATHI Seed] Initializing Firebase with Project ID:', firebaseConfig.projectId, 'Database ID:', firestoreDatabaseId);
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
const authInstance = getAuth(app);

// Static configurations for categories & locations
const categories = [
  'Trekking Guide', 'Mountain Guide', 'Coffee Buddy', 'Food Explorer',
  'Photography Guide', 'Cultural Guide', 'Local Host', 'Tour Operator',
  'Cycling Guide', 'Yoga Instructor', 'Bird Watching Guide', 'Heritage Walk Guide',
  'Adventure Companion', 'Festival Guide', 'Language Exchange Partner'
];

const categoryDetails: Record<string, { interests: string[]; bio: string; spec: string }> = {
  'Trekking Guide': {
    interests: ['Trekking', 'Mountains', 'Outdoors', 'Hiking', 'Nature'],
    bio: 'Professional certified trekking guide with deep knowledge of Annapurna and Everest regions. Focused on safe, scenic walks and local stories.',
    spec: 'Annapurna & Everest Base Camp trails'
  },
  'Mountain Guide': {
    interests: ['Mountaineering', 'Climbing', 'Snowy Peaks', 'Adventure', 'Hiking'],
    bio: 'Experienced mountaineer and peak climbing guide. Let us scale beautiful local peaks and learn mountaineering basics safety.',
    spec: 'Island Peak & Mera Peak climbing'
  },
  'Coffee Buddy': {
    interests: ['Coffee', 'Conversations', 'Reading', 'Art', 'Culture'],
    bio: 'Love discussing art, books, culture and travel over a warm cup of Nepalese organic coffee.',
    spec: 'Artisanal Nepalese coffee tastings'
  },
  'Food Explorer': {
    interests: ['Food', 'Cooking', 'Street Food', 'Tasting', 'Momo'],
    bio: 'Absolute foodie! Let us embark on a street food tasting tour through ancient hidden alleyways.',
    spec: 'Newari cuisine and local spices'
  },
  'Photography Guide': {
    interests: ['Photography', 'Camera', 'City Walk', 'Nature', 'Portraits'],
    bio: 'Creative photographer. Let us capture stunning temple architecture and colorful local daily lives together.',
    spec: 'Heritage photography & golden hour shots'
  },
  'Cultural Guide': {
    interests: ['Art', 'History', 'Museum', 'Architecture', 'Culture'],
    bio: 'History, fine arts, and ancient temple carving are my passion. Let us explore the heritage of Durbar Squares.',
    spec: 'Ancient Newar art & Durbar history'
  },
  'Local Host': {
    interests: ['Homestays', 'Local Life', 'Culture', 'Gardening', 'Cooking'],
    bio: 'Warm and friendly local host. Welcome to our traditional neighborhood where you can experience genuine Nepalese hospitality.',
    spec: 'Nepalese homestay & community dinners'
  },
  'Tour Operator': {
    interests: ['Sightseeing', 'Travel', 'Buses', 'Adventures', 'Group Tours'],
    bio: 'Experienced travel coordinator. Let us customize your local sightseeing, organize transportation, and show you Nepal\'s highlights.',
    spec: 'Custom private vehicle sightseeing tours'
  },
  'Cycling Guide': {
    interests: ['Cycling', 'Mountain Biking', 'Outdoors', 'Trails', 'Nature'],
    bio: 'Avid mountain biker. Let us pedal through scenic off-road trails around the rim of Kathmandu Valley or Pokhara Lakeside.',
    spec: 'Valley rim cross-country trails'
  },
  'Yoga Instructor': {
    interests: ['Yoga', 'Meditation', 'Mindfulness', 'Wellness', 'Spiritual'],
    bio: 'Certified yoga and meditation instructor. Let us practice yoga overlooking the peaceful mountains and learn calming breathing techniques.',
    spec: 'Hatha Yoga & Buddhist mindfulness'
  },
  'Bird Watching Guide': {
    interests: ['Birds', 'Wildlife', 'Binoculars', 'Nature', 'National Parks'],
    bio: 'Amateur ornithologist and nature guide. Let us spot colorful rare Himalayan birds in Shivapuri National Park or Chitwan.',
    spec: 'Shivapuri forest bird identification'
  },
  'Heritage Walk Guide': {
    interests: ['Temples', 'History', 'City Walk', 'Religion', 'Culture'],
    bio: 'Born and raised in the ancient city of Patan. Let us take a quiet walking tour through medieval residential courtyards and monasteries.',
    spec: 'Bhaktapur and Patan historic alley walks'
  },
  'Adventure Companion': {
    interests: ['Rafting', 'Paragliding', 'Zipline', 'Adventures', 'Outdoors'],
    bio: 'Extreme sports enthusiast. Ready to join you for white-water rafting, bungee jumping, or scenic paragliding in Pokhara!',
    spec: 'Pokhara paragliding & Trishuli rafting'
  },
  'Festival Guide': {
    interests: ['Festivals', 'Celebrations', 'Holi', 'Tihar', 'Local Culture'],
    bio: 'Love celebrating Nepalese colorful festivals. Let us celebrate Holi, Indra Jatra, or light lamps during Tihar like a true local.',
    spec: 'Holi celebrations and Dashain culture'
  },
  'Language Exchange Partner': {
    interests: ['Language', 'Culture', 'Teaching', 'Reading', 'History'],
    bio: 'Passionate about linguistics and native culture exchange. Let us practice English, Nepali, or Newari together!',
    spec: 'Interactive conversational phrase practice'
  }
};

const cities = [
  { name: 'Pokhara', lat: 28.2096, lng: 83.9856 },
  { name: 'Kathmandu', lat: 27.7172, lng: 85.324 },
  { name: 'Lalitpur', lat: 27.6700, lng: 85.3150 },
  { name: 'Bhaktapur', lat: 27.6710, lng: 85.4298 },
  { name: 'Chitwan', lat: 27.5291, lng: 84.3542 },
  { name: 'Lumbini', lat: 27.4811, lng: 83.2764 },
  { name: 'Bandipur', lat: 27.9351, lng: 84.4140 },
  { name: 'Mustang', lat: 28.7847, lng: 83.7224 },
  { name: 'Ilam', lat: 26.9118, lng: 87.9258 },
  { name: 'Nagarkot', lat: 27.6860, lng: 85.521 },
  { name: 'Dharan', lat: 26.8124, lng: 87.2835 },
  { name: 'Janakpur', lat: 26.7271, lng: 85.9221 },
  { name: 'Gorkha', lat: 28.0033, lng: 84.6295 },
  { name: 'Besisahar', lat: 28.2259, lng: 84.3752 }
];

const firstNamesMale = [
  'Sunil', 'Safal', 'Aarav', 'Rajan', 'Nima', 'Sanjay', 'Arjun', 'Rajesh', 'Nabin', 'Milan', 'Bishal',
  'Kiran', 'Sandeep', 'Anup', 'Deepak', 'Dipesh', 'Prabhat', 'Rohan', 'Roshan', 'Subash', 'Bibek',
  'Umesh', 'Sujan', 'Rabin', 'Ashish', 'Suraj', 'Jeevan', 'Manoj', 'Prakash', 'Suresh', 'Santosh'
];

const firstNamesFemale = [
  'Priya', 'Yuki', 'Sita', 'Anjali', 'Emma', 'Chloe', 'Sophia', 'Ritu', 'Prerana', 'Sneha',
  'Aayusha', 'Kriti', 'Manisha', 'Pooja', 'Samikshya', 'Alisha', 'Nisha', 'Jyoti', 'Shreya',
  'Kabita', 'Gita', 'Karuna', 'Aarati', 'Shristi', 'Bina', 'Maya', 'Nirmala', 'Sajana', 'Sabina'
];

const lastNames = [
  'Kunwar', 'Thapa', 'Gurung', 'Shrestha', 'Maharjan', 'Sherpa', 'Chhetri', 'Lama', 'Karki',
  'Adhikari', 'Dahal', 'Bhandari', 'Gautam', 'Joshi', 'Sharma', 'Pathak', 'Basnet', 'Giri', 'Poudel',
  'Subedi', 'Rana', 'Shah', 'KC', 'Tamang', 'Rai', 'Limbu', 'Budhathoki', 'Khadka', 'Regmi',
  'Ghale', 'Malla', 'Koirala', 'Oli', 'Bhattarai', 'Khanal', 'Ghimire', 'Acharya'
];

const companionAvatars = [
  // Mountain & Outdoors
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=400",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=400"
];

const categoryImageMap: Record<string, string> = {
  'Trekking Guide': "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600",
  'Mountain Guide': "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600",
  'Coffee Buddy': "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600",
  'Food Explorer': "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=600",
  'Photography Guide': "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600",
  'Cultural Guide': "https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=600",
  'Local Host': "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600",
  'Tour Operator': "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=600",
  'Cycling Guide': "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=600",
  'Yoga Instructor': "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600",
  'Bird Watching Guide': "https://images.unsplash.com/photo-1444464666168-49d633b86797?q=80&w=600",
  'Heritage Walk Guide': "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600",
  'Adventure Companion': "https://images.unsplash.com/photo-1473163928189-364b2c4e1135?q=80&w=600",
  'Festival Guide': "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=600",
  'Language Exchange Partner': "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600"
};

const activityImages = Object.values(categoryImageMap);

// Batch writer utility with chunks
async function writeAllInChunks<T extends { id: string }>(collectionName: string, items: T[]) {
  console.log(`[SATHI Seed] Writing ${items.length} items to '${collectionName}'...`);
  const chunkSize = 250;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, item);
    }
    await batch.commit();
    console.log(`  - Committed chunk of size ${chunk.length} to '${collectionName}' (${i + chunk.length}/${items.length})`);
  }
}

// Register authentication users safely
async function ensureAuthUserExists(email: string, pass: string): Promise<string | null> {
  try {
    const userCredential = await createUserWithEmailAndPassword(authInstance, email, pass);
    console.log(`[SATHI Auth] Created Firebase Auth user: ${email} -> UID: ${userCredential.user.uid}`);
    return userCredential.user.uid;
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      console.log(`[SATHI Auth] Account already exists: ${email}`);
      return null;
    } else {
      console.warn(`[SATHI Auth] Warning creating auth user for ${email}:`, err.message);
      return null;
    }
  }
}

async function runSeed() {
  console.log('[SATHI Seed] STARTING REALISTIC NEPAL DATA SEEDING (Project ID: hamrosathi1)...');

  // STEP 1: Escalated Administrative Session Registration & Creation
  const adminEmail = 'admin@sathi.com';
  const adminPass = 'Password123!';
  const adminId = 'u-demo-admin';

  await ensureAuthUserExists(adminEmail, adminPass);

  console.log('[SATHI Seed] Signing in as Admin to escalate privileges...');
  const adminCredential = await signInWithEmailAndPassword(authInstance, adminEmail, adminPass);
  const authUid = adminCredential.user.uid;
  console.log('[SATHI Seed] Escalated. Current authenticated UID:', authUid);

  // Directly set the authenticated admin document first if it doesn't exist (allowed because request.auth.uid == userId on create)
  const authAdminDocRef = doc(db, 'users', authUid);
  console.log('[SATHI Seed] Attempting to read authAdminSnap...');
  let authAdminSnap;
  try {
    authAdminSnap = await getDoc(authAdminDocRef);
    console.log('[SATHI Seed] Successfully read authAdminSnap. Exists:', authAdminSnap.exists());
  } catch (err: any) {
    console.error('[SATHI Seed] Failed to read authAdminSnap:', err.message);
    throw err;
  }

  if (!authAdminSnap.exists()) {
    console.log('[SATHI Seed] authAdminDoc does not exist. Attempting setDoc...');
    try {
      await setDoc(authAdminDocRef, {
        id: authUid,
        name: 'SATHI Admin',
        email: adminEmail,
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=SATHI+Admin&background=C8A25E&color=0F1113',
        favorites: [],
        createdAt: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`[SATHI Seed] Auth Admin document successfully written to 'users/${authUid}'. Privilege escalation active!`);
    } catch (err: any) {
      console.error('[SATHI Seed] Failed to write authAdminDoc:', err.message);
      throw err;
    }
  } else {
    console.log(`[SATHI Seed] Auth Admin document already exists at 'users/${authUid}'. Proceeding with active admin privileges.`);
  }

  // Now write the legacy 'u-demo-admin' document as well if it doesn't exist (allowed because we have admin rights)
  if (authUid !== adminId) {
    const legacyAdminDocRef = doc(db, 'users', adminId);
    console.log('[SATHI Seed] Attempting to read legacyAdminSnap...');
    let legacyAdminSnap;
    try {
      legacyAdminSnap = await getDoc(legacyAdminDocRef);
      console.log('[SATHI Seed] Successfully read legacyAdminSnap. Exists:', legacyAdminSnap.exists());
    } catch (err: any) {
      console.error('[SATHI Seed] Failed to read legacyAdminSnap:', err.message);
      throw err;
    }

    if (!legacyAdminSnap.exists()) {
      console.log('[SATHI Seed] legacyAdminDoc does not exist. Attempting setDoc...');
      try {
        await setDoc(legacyAdminDocRef, {
          id: adminId,
          name: 'SATHI Admin',
          email: adminEmail,
          role: 'admin',
          avatar: 'https://ui-avatars.com/api/?name=SATHI+Admin&background=C8A25E&color=0F1113',
          favorites: [],
          createdAt: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log(`[SATHI Seed] Legacy admin document successfully written to 'users/${adminId}'.`);
      } catch (err: any) {
        console.error('[SATHI Seed] Failed to write legacyAdminDoc:', err.message);
        throw err;
      }
    } else {
      console.log(`[SATHI Seed] Legacy admin document already exists at 'users/${adminId}'.`);
    }
  }
  console.log('[SATHI Seed] Admin document verified in Firestore. Database session is now escalated to Admin.');

  // Standard Test Users matching `src/data.ts`
  const testUsers = [
    { id: 'u-demo-1', name: 'Emma', email: 'emma@example.com', role: 'customer' },
    { id: 'u-demo-2', name: 'Raj', email: 'raj@example.com', role: 'customer' },
    { id: 'u-demo-3', name: 'Chloe', email: 'chloe@example.com', role: 'customer' },
    { id: 'u-demo-4', name: 'Liam', email: 'liam@example.com', role: 'customer' },
    { id: 'u-demo-5', name: 'Sophia', email: 'sophia@example.com', role: 'customer' }
  ];

  // Try creating Auth accounts for other test accounts
  for (const tu of testUsers) {
    await ensureAuthUserExists(tu.email, 'Password123!');
  }

  // Generate 45 additional Travelers to get 50 Travelers in total (since we have 5 test travelers)
  const travelersList: any[] = [];
  
  // Add core test travelers to the write list first
  for (let i = 0; i < 5; i++) {
    const tu = testUsers[i];
    travelersList.push({
      id: tu.id,
      name: tu.name,
      email: tu.email,
      role: 'customer',
      avatar: `https://ui-avatars.com/api/?name=${tu.name}&background=C8A25E&color=0F1113`,
      favorites: [],
      createdAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Generate 45 additional Travelers
  for (let i = 1; i <= 45; i++) {
    const isMale = i % 2 === 0;
    const fName = isMale ? firstNamesMale[i % firstNamesMale.length] : firstNamesFemale[i % firstNamesFemale.length];
    const lName = lastNames[i % lastNames.length];
    const name = `${fName} ${lName}`;
    const email = `traveler.${i}@sathi.com`;
    const travelerId = `u-traveler-${i}`;

    await ensureAuthUserExists(email, 'Password123!');

    travelersList.push({
      id: travelerId,
      name,
      email,
      role: 'customer',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      favorites: [],
      createdAt: new Date(Date.now() - (i + 1) * 12 * 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Create Secondary Admin accounts (total 4)
  const adminsList: any[] = [];
  const adminNames = ['Milan Admin', 'Pasang Admin', 'Sunita Admin', 'Aarav Admin'];
  for (let i = 1; i <= 4; i++) {
    const name = adminNames[i - 1];
    const email = `admin.${i}@sathi.com`;
    const adminId = `u-admin-${i}`;
    
    await ensureAuthUserExists(email, 'Password123!');
    
    adminsList.push({
      id: adminId,
      name,
      email,
      role: 'admin',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F1113&color=C8A25E`,
      favorites: [],
      createdAt: new Date(Date.now() - 50 * 24 * 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Generate 40 Companions
  const companionsList: any[] = [];
  const companionUsersList: any[] = [];

  for (let i = 1; i <= 40; i++) {
    const isMale = i % 2 === 0;
    const fName = isMale ? firstNamesMale[(i + 5) % firstNamesMale.length] : firstNamesFemale[(i + 5) % firstNamesFemale.length];
    const lName = lastNames[(i + 12) % lastNames.length];
    const name = `${fName} ${lName}`;
    const email = `companion.${i}@sathi.com`;
    const companionUserId = `u-companion-${i}`;
    const companionId = `c${i}`;

    await ensureAuthUserExists(email, 'Password123!');

    // 1. Create Companion User profile
    const avatarUrl = companionAvatars[i % companionAvatars.length];
    companionUsersList.push({
      id: companionUserId,
      name,
      email,
      role: 'companion',
      avatar: avatarUrl,
      favorites: [],
      createdAt: new Date(Date.now() - (i + 2) * 8 * 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 2. Create Companion Listing
    const cityObj = cities[i % cities.length];
    const category = categories[i % categories.length];
    const details = categoryDetails[category];

    const latOffset = Math.sin(i) * 0.015;
    const lngOffset = Math.cos(i) * 0.015;
    const finalLat = cityObj.lat + latOffset;
    const finalLng = cityObj.lng + lngOffset;

    const hourlyRate = 600 + ((i * 100) % 2000); // 600 to 2600 NPR per hour

    companionsList.push({
      id: companionId,
      userId: companionUserId,
      name,
      age: 20 + (i % 25),
      gender: isMale ? 'Male' : 'Female',
      bio: `${details.bio} Experienced guide from ${cityObj.name}. I look forward to guiding you safe and sharing our rich culture!`,
      hourlyRate,
      rating: 5.0, 
      reviewsCount: 0, 
      isVerified: true,
      verificationStatus: 'approved',
      location: cityObj.name,
      coordinates: new GeoPoint(finalLat, finalLng),
      languages: i % 3 === 0 ? ['Nepali', 'English', 'Hindi', 'Newari'] : ['Nepali', 'English'],
      interests: details.interests,
      images: [avatarUrl, categoryImageMap[category]],
      imageUrl: avatarUrl,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, 4 + (i % 3)),
      responseRate: 90 + (i % 11),
      responseTime: i % 2 === 0 ? '~15 mins' : '~1 hour',
      completedBookings: 5 + (i * 2) % 150,
      trustScore: parseFloat((4.7 + (i % 4) * 0.1).toFixed(1)),
      joinedDate: new Date(Date.now() - (i + 15) * 24 * 3600000).toISOString(),
      specializations: [details.spec],
      profileCompletion: 95 + (i % 6),
      emergencyContact: {
        name: `${firstNamesMale[(i + 10) % firstNamesMale.length]} ${lName} (Relative)`,
        phone: `+977-984${Math.floor(1000000 + Math.random() * 8999999)}`
      },
      createdAt: new Date(Date.now() - (i + 15) * 24 * 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Compile all user documents
  const allUsersList = [...travelersList, ...adminsList, ...companionUsersList];

  // Generate 100 Bookings
  const bookingsList: any[] = [];
  const bookingStatuses = ['completed', 'completed', 'confirmed', 'pending', 'cancelled'];
  const paymentMethods = ['khalti', 'esewa'];
  const paymentStatuses = {
    completed: 'paid',
    confirmed: 'paid',
    pending: 'pending',
    cancelled: 'refunded'
  };

  for (let i = 1; i <= 100; i++) {
    const traveler = travelersList[i % travelersList.length];
    const companionIdx = (i % 40) + 1;
    const companion = companionsList[companionIdx - 1];

    const duration = 2 + (i % 5);
    const totalPrice = companion.hourlyRate * duration;
    const platformFee = Math.round(totalPrice * 0.1);
    const companionPayout = totalPrice - platformFee;
    const status = bookingStatuses[i % bookingStatuses.length];

    const bookingDate = new Date(Date.now() - (i * 12 * 3600000));
    const dateStr = bookingDate.toISOString().split('T')[0];

    bookingsList.push({
      id: `b${i}`,
      userId: traveler.id,
      companionId: companion.id,
      date: dateStr,
      time: `${9 + (i % 9)}:00`,
      duration,
      participants: 1 + (i % 3),
      status,
      totalPrice,
      platformFee,
      companionPayout,
      meetingPoint: `${companion.location} Central Square`,
      specialRequests: i % 4 === 0 ? "Vegetarian meal preference, please" : "",
      paymentMethod: paymentMethods[i % paymentMethods.length],
      paymentStatus: (paymentStatuses as any)[status],
      paymentId: `pay_ref_${i}_` + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date(bookingDate.getTime() - 24 * 3600000).toISOString(),
      updatedAt: new Date(bookingDate.getTime() - 12 * 3600000).toISOString()
    });
  }

  // Generate 100 Reviews & Calculate Companion Aggregates
  const reviewsList: any[] = [];
  const reviewComments = [
    "Had an amazing walk around town! Highly knowledgeable, safety conscious, and hospital.",
    "Highly recommended companion! Had the absolute best time tasting local street foods.",
    "Very respectful, friendly, and shared incredible insights about Nepal history and Durbar squares.",
    "Safe, reliable, and a great conversationalist. Made my trip extremely comfortable.",
    "Super friendly, helpful with bargaining, and spoke perfect English.",
    "The absolute best trekking buddy. Patient, energetic, and highly motivating!",
    "Great coffee companion. Spoke about local traditions and recommended amazing local cafes.",
    "Wonderful guide and incredibly nice person. Felt like exploring with an old family friend."
  ];

  const companionRatingsMap: Record<string, { total: number; count: number }> = {};

  // Seed reviews ONLY for completed bookings to make it realistic
  let reviewIdCounter = 1;
  for (const bk of bookingsList) {
    if (bk.status === 'completed' && reviewIdCounter <= 100) {
      const traveler = travelersList.find(u => u.id === bk.userId) || travelersList[0];
      const rating = reviewIdCounter % 12 === 0 ? 4 : 5; 
      const comment = reviewComments[reviewIdCounter % reviewComments.length];

      reviewsList.push({
        id: `r${reviewIdCounter}`,
        companionId: bk.companionId,
        userId: bk.userId,
        bookingId: bk.id,
        rating,
        text: comment,
        date: bk.createdAt,
        verifiedBooking: true
      });

      if (!companionRatingsMap[bk.companionId]) {
        companionRatingsMap[bk.companionId] = { total: 0, count: 0 };
      }
      companionRatingsMap[bk.companionId].total += rating;
      companionRatingsMap[bk.companionId].count += 1;

      reviewIdCounter++;
    }
  }

  // Update companion listing ratings using real aggregates
  for (const comp of companionsList) {
    const rstats = companionRatingsMap[comp.id];
    if (rstats) {
      comp.rating = parseFloat((rstats.total / rstats.count).toFixed(1));
      comp.reviewsCount = rstats.count;
    } else {
      comp.rating = 4.8;
      comp.reviewsCount = 0;
    }
  }

  // Generate 100 Experience Stories
  const storiesList: any[] = [];
  const storyLikesList: any[] = [];
  const storyCaptions = [
    "Amazing sunset hike up at Sarangkot! Captured this breathtaking mountain panoramic view.",
    "Had the best local traditional Newari thali meal with my amazing companion in Patan.",
    "Walking around Thamel ancient markets sourcing authentic handmade singing bowls.",
    "Learned how to make proper handmade momos from scratch in Kathmandu cooking class today!",
    "Taking in the beautiful, peaceful morning breeze during boating at Pokhara's Phewa Lake.",
    "Fascinating historical details shared today walking through Bhaktapur temple courts.",
    "A gorgeous sunrise tea experience over Nagarkot valleys looking at the snow capped mountains.",
    "Checked out the local live acoustic guitar bands in Jhamshikhel. Outstanding vibes!",
    "Amazing cycling day tour across Mustang dusty trails. Felt like on another planet!",
    "Early morning peaceful birdwatching walk in Shivapuri forest. Spotted several rare sunbirds!"
  ];

  for (let i = 1; i <= 100; i++) {
    const traveler = travelersList[i % travelersList.length];
    const companion = companionsList[i % companionsList.length];
    const storyId = `s${i}`;

    storiesList.push({
      id: storyId,
      companionId: companion.id,
      userId: traveler.id,
      imageUrl: activityImages[i % activityImages.length],
      caption: storyCaptions[i % storyCaptions.length],
      likes: 3 + (i % 12),
      comments: 1 + (i % 5),
      createdAt: new Date(Date.now() - i * 6 * 3600000).toISOString()
    });

    // Populate actual companion-traveler likes for each story
    for (let l = 1; l <= (3 + (i % 12)); l++) {
      const liker = travelersList[(i + l) % travelersList.length];
      storyLikesList.push({
        id: `${liker.id}_${storyId}`,
        userId: liker.id,
        storyId: storyId,
        createdAt: new Date().toISOString()
      });
    }
  }

  // Generate 150 Community Posts
  const postsList: any[] = [];
  const postContents = [
    { title: "Essential items to pack for the Poon Hill Trek in Nepal", tag: "Trekking", text: "Make sure you carry warm layers, high-quality hiking socks, a windproof shell, water purification tablets, and plenty of NPR cash. Credit cards do not work up in the mountains! Always trek with an ID-verified SATHI companion for extra safety." },
    { title: "Best authentic Nepalese momo joints in Kathmandu Valley", tag: "Food Explorer", text: "Forget fancy restaurants, Thamel backyard stalls and Lalitpur local cafes serve the juiciest buff and chicken momos with spicy sesame peanut dipping sauce. Ask your companion to take you!" },
    { title: "Understanding Durbar Square historical stone carvings", tag: "Cultural Guide", text: "Every ancient stone carving of Patan tells a rich story of ancient Kings and deities. Walking with a certified local buddy unlocks stories that guidebooks completely miss." },
    { title: "Tips for staying safe in local taxis and public transport in Pokhara", tag: "Local Host", text: "Always confirm the price before entering, or use local ride-sharing apps like Pathao or InDrive. Having an ID-verified SATHI companion with you ensures fair rates and a highly comfortable experience." },
    { title: "Learning Newari language phrases for daily shopping", tag: "Language Exchange Partner", text: "Saying Jwajalapa (Hello) and Subhay (Thank you) goes an incredibly long way. It builds instant respect with local craft makers and market shopkeepers!" },
    { title: "Spectacular places to photograph golden hour sunrise around Kathmandu", tag: "Photography Guide", text: "Nagarkot, Swayambhunath (Monkey Temple), and Chobhar Gorge provide the absolute best views of dawn over the valley. Don't forget your tripod and wide lens!" },
    { title: "Why you should participate in the Tihar festival celebrations", tag: "Festival Guide", text: "The festival of lights is beautiful. Streets are covered in rangolis and lit with oil lamps. Celebrate it safely with a local host family to experience authentic rituals." }
  ];

  for (let i = 1; i <= 150; i++) {
    const traveler = travelersList[i % travelersList.length];
    const postObj = postContents[i % postContents.length];
    const city = cities[i % cities.length];

    postsList.push({
      id: `cp${i}`,
      userId: traveler.id,
      userName: traveler.name,
      userAvatar: traveler.avatar,
      title: `${postObj.title} (#${i})`,
      content: postObj.text,
      category: postObj.tag,
      tags: [postObj.tag.toLowerCase().replace(' ', '_'), 'nepal', 'sathi', city.name.toLowerCase()],
      imageUrl: activityImages[(i + 3) % activityImages.length],
      status: 'published',
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      reportsCount: 0,
      location: city.name,
      createdAt: new Date(Date.now() - i * 4 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - i * 4 * 3600000).toISOString()
    });
  }

  // Generate 85 Activities
  const activitiesList: any[] = [];
  const baseActivities = [
    { title: 'Sarangkot Sunrise Watch Hike', desc: 'Hike up the green Sarangkot hills to witness the morning sun paint the Annapurna mountains gold.', cat: 'Hiking Partner' },
    { title: 'Thamel Street Momo Sampling Crawl', desc: 'Sample the juiciest momos and spiced street snacks in the bustling alleyways of old Thamel.', cat: 'Food Explorer' },
    { title: 'Historic Patan Heritage Walking Tour', desc: 'Marvel at medieval golden temples, stone carvings, and quiet residential courtyards in Patan.', cat: 'Museum Guide' },
    { title: 'Handmade Bhaktapur Pottery Workshop', desc: 'Get your hands muddy and learn the age-old art of Nepalese clay throwing on a traditional wheel.', cat: 'Museum Guide' },
    { title: 'Quiet Cafe Co-working & Code Sesh', desc: 'Bring your laptop for a highly productive co-studying or programming session at a calm garden cafe.', cat: 'Study Partner' },
    { title: 'Organic Chiya & Life Conversations', desc: 'Relax over warm organic milk tea and discuss Nepalese daily traditions, philosophy, and history.', cat: 'Coffee Buddy' },
    { title: 'Sunset Boating at Serene Phewa Lake', desc: 'Rent a colorful wooden boat and paddle out to Tal Barahi temple during the scenic sunset hour.', cat: 'Travel Companion' },
    { title: 'Flea Market bargaining & Souvenir Sourcing', desc: 'Explore wholesale craft markets and source premium cashmeres, wood carvings, and teas at local prices.', cat: 'Shopping Buddy' },
    { title: 'Live Acoustic Music & Pub Crawl', desc: 'Check out the most talented Nepalese guitar players, local live rock bars, and craft beer spots.', cat: 'Nightlife' },
    { title: 'Heritage Portrait Photography Walk', desc: 'Walk around ancient stupas to capture street scenes and learn professional landscape photography tips.', cat: 'Photography Walk' }
  ];

  for (let i = 1; i <= 85; i++) {
    const base = baseActivities[i % baseActivities.length];
    activitiesList.push({
      id: `a${i}`,
      title: `${base.title} (${i})`,
      description: base.desc,
      duration: `${1.5 + (i % 4)} hours`,
      avgPrice: 800 + (i % 6) * 300,
      imageUrl: activityImages[i % activityImages.length],
      companionCount: 10 + (i * 5) % 50,
      category: base.cat,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Generate 55 Events
  const eventsList: any[] = [];
  const eventTitles = [
    "Community Momo Festival Meetup", "Weekend Nagarkot Nature Walk",
    "Traditional Newari Feast Gathering", "Kathmandu Street Photography Walk",
    "Startup Networking & Chiya Session", "Heritage Cleanup Preservation Drive",
    "Pokhara Sunset Lakeside Picnic"
  ];

  for (let i = 1; i <= 55; i++) {
    const cityObj = cities[i % cities.length];
    eventsList.push({
      id: `e${i}`,
      title: `${eventTitles[i % eventTitles.length]} #${i}`,
      description: `Join us for an exciting group meetup. Connect with amazing certified companions and meet fellow global travelers who love exploring Nepal.`,
      date: new Date(Date.now() + (i * 24 * 3600000)).toISOString().split('T')[0],
      time: i % 2 === 0 ? "10:00 AM" : "04:30 PM",
      location: `${cityObj.name} Community Hall`,
      coordinates: new GeoPoint(cityObj.lat, cityObj.lng),
      spots: 5 + (i % 10),
      type: 'public',
      participants: [travelersList[i % travelersList.length].id, travelersList[(i + 3) % travelersList.length].id],
      imageUrl: activityImages[(i + 1) % activityImages.length],
      createdBy: 'u-demo-admin',
      createdAt: new Date().toISOString()
    });
  }

  // Generate 35 Partner Listings
  const partnersList: any[] = [];
  const partnerNames = [
    "Chiya Ghar", "Himalayan Java Coffee", "The Everest View Resort", "Sarangkot Adventure Gear",
    "Roadhouse Pizza Cafe", "Fishtail Lodge Cafe", "Boudha Garden Restaurant", "Newa Lahana Eating House",
    "Thamel Backpacker Hostel Café", "Durbar Square Pottery Spot"
  ];

  for (let i = 1; i <= 35; i++) {
    const cityObj = cities[i % cities.length];
    const category = i % 3 === 0 ? "Cafe" : (i % 3 === 1 ? "Hotel" : "Tour Operator");
    partnersList.push({
      id: `p${i}`,
      name: `${partnerNames[i % partnerNames.length]} (${cityObj.name})`,
      disc: i % 2 === 0 ? "10% off with SATHI Companion" : "NPR 800 SATHI Booking Credit",
      loc: cityObj.name,
      category,
      imageUrl: activityImages[(i + 2) % activityImages.length],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Generate 30 Conversations & 300 Messages
  const conversationsList: any[] = [];
  const messagesList: any[] = [];

  const chatTexts = [
    "Hello! Are you available to meet up this Friday for a walking tour?",
    "Namaste! Yes, I am free after 2 PM! What area are you planning to visit?",
    "I would love to check out Patan Durbar Square and grab some organic tea.",
    "That sounds fantastic. Let us meet near the Golden Temple main entrance.",
    "Great! Should I book you on the SATHI app now?",
    "Yes, please go ahead. That keeps our meeting secured and protected under SATHI Shield.",
    "All booked! Looking forward to exploring with you.",
    "Awesome. See you on Friday! Let me know if you need any directions.",
    "Perfect, thank you! I will let you know once I head out.",
    "No problem, stay safe!"
  ];

  for (let i = 1; i <= 30; i++) {
    const traveler = travelersList[i % travelersList.length];
    const companionIdx = (i % 40) + 1;
    const companion = companionsList[companionIdx - 1];
    const conversationId = `conv_${traveler.id}_${companion.userId}`;

    // Add 10 messages for each thread
    for (let m = 0; m < 10; m++) {
      const isCustomerSender = m % 2 === 0;
      const msgId = `${conversationId}_msg_${m}`;
      const msgTimestamp = new Date(Date.now() - (10 - m) * 600000).toISOString();

      messagesList.push({
        id: msgId,
        conversationId,
        senderId: isCustomerSender ? traveler.id : companion.userId,
        text: chatTexts[m],
        isRead: m !== 9,
        timestamp: msgTimestamp,
        createdAt: msgTimestamp,
        updatedAt: msgTimestamp
      });
    }

    // Save conversation doc
    conversationsList.push({
      id: conversationId,
      participantIds: [traveler.id, companion.userId],
      unreadCount: 0,
      lastMessage: {
        id: `${conversationId}_msg_9`,
        conversationId,
        senderId: companion.userId,
        text: chatTexts[9],
        timestamp: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Generate 150 Favorites
  const favoritesSubList: any[] = [];
  for (let i = 0; i < travelersList.length; i++) {
    const traveler = travelersList[i];
    const favoritesCount = 3;
    const travelerFavorites: string[] = [];

    for (let f = 1; f <= favoritesCount; f++) {
      const compIdx = ((i * 7 + f * 13) % 40) + 1;
      const compId = `c${compIdx}`;
      travelerFavorites.push(compId);

      favoritesSubList.push({
        id: `${traveler.id}_fav_${compId}`,
        userId: traveler.id,
        companionId: compId,
        createdAt: new Date().toISOString()
      });
    }

    traveler.favorites = travelerFavorites;
  }

  // Generate 50 Notifications
  const notificationsList: any[] = [];
  const notificationTitles = [
    "Booking Confirmed!", "New Chat Message", "System Announcement", "Review Received", "Story Liked!"
  ];
  const notificationMessages = [
    "Your SATHI booking for Patan Walk has been successfully confirmed.",
    "Your companion sent you a message: 'See you near the Golden Temple!'",
    "SATHI Alert: Support for Khalti payments has been fully upgraded across Nepal.",
    "A traveler left you a beautiful 5-star review! Check out your profile stats.",
    "Emma liked your morning sunset story in Pokhara Lakeside."
  ];
  const notificationTypes = ['booking', 'message', 'system', 'system', 'system'];

  for (let i = 1; i <= 50; i++) {
    const traveler = travelersList[i % travelersList.length];
    notificationsList.push({
      id: `n${i}`,
      userId: traveler.id,
      title: notificationTitles[i % notificationTitles.length],
      message: notificationMessages[i % notificationMessages.length],
      type: notificationTypes[i % notificationTypes.length],
      isRead: i % 3 === 0,
      createdAt: new Date(Date.now() - i * 5 * 3600000).toISOString()
    });
  }

  // WRITE EVERYTHING IN BATCHES
  try {
    // Write users & companions with elevated privilege
    await writeAllInChunks('users', allUsersList);
    await writeAllInChunks('companions', companionsList);
    await writeAllInChunks('bookings', bookingsList);
    await writeAllInChunks('reviews', reviewsList);
    await writeAllInChunks('stories', storiesList);
    await writeAllInChunks('community_posts', postsList);
    await writeAllInChunks('activities', activitiesList);
    await writeAllInChunks('events', eventsList);
    await writeAllInChunks('partners', partnersList);
    await writeAllInChunks('conversations', conversationsList);
    await writeAllInChunks('notifications', notificationsList);

    // Write individual favorite subcollection records
    console.log(`[SATHI Seed] Writing individual favorite subcollection records...`);
    const favChunkSize = 250;
    for (let i = 0; i < favoritesSubList.length; i += favChunkSize) {
      const chunk = favoritesSubList.slice(i, i + favChunkSize);
      const batch = writeBatch(db);
      for (const fav of chunk) {
        const subdocRef = doc(db, 'users', fav.userId, 'favorites', fav.companionId);
        batch.set(subdocRef, { companionId: fav.companionId, createdAt: fav.createdAt });
      }
      await batch.commit();
      console.log(`  - Favorites subcollection chunk written (${i + chunk.length}/${favoritesSubList.length})`);
    }

    // Write story_likes composite keys
    console.log(`[SATHI Seed] Writing story_likes composite keys...`);
    for (let i = 0; i < storyLikesList.length; i += favChunkSize) {
      const chunk = storyLikesList.slice(i, i + favChunkSize);
      const batch = writeBatch(db);
      for (const sl of chunk) {
        const docRef = doc(db, 'story_likes', sl.id);
        batch.set(docRef, sl);
      }
      await batch.commit();
      console.log(`  - Story likes chunk written (${i + chunk.length}/${storyLikesList.length})`);
    }

    // Write Message docs
    console.log(`[SATHI Seed] Writing chat message documents...`);
    const msgChunkSize = 250;
    for (let i = 0; i < messagesList.length; i += msgChunkSize) {
      const chunk = messagesList.slice(i, i + msgChunkSize);
      const batch = writeBatch(db);
      for (const msg of chunk) {
        const docRef = doc(db, 'messages', msg.id);
        batch.set(docRef, msg);
      }
      await batch.commit();
      console.log(`  - Chat messages chunk written (${i + chunk.length}/${messagesList.length})`);
    }

    console.log('[SATHI Seed] SUCCESS: Seeded high-quality, synchronized Nepal demo dataset to production Firebase!');
  } catch (err) {
    console.error('[SATHI Seed] Error writing documents to Firestore:', err);
    throw err;
  }
}

runSeed().then(() => {
  console.log('[SATHI Seed] Seeding finished successfully, exiting...');
  process.exit(0);
}).catch((error) => {
  console.error('[SATHI Seed] Process Failed:', error);
  process.exit(1);
});
