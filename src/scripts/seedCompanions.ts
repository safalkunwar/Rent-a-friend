import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, writeBatch, GeoPoint } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  categories,
  categoryDetails,
  cities,
  firstNamesMale,
  firstNamesFemale,
  lastNames,
  companionAvatars,
  categoryImageMap,
} from '../data/seedData';

dotenv.config();

let appletConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('[SATHI Seed Companions] Error reading firebase-applet-config.json:', e);
}

const firebaseConfig = {
  apiKey: appletConfig.apiKey || process.env.VITE_FIREBASE_API_KEY,
  authDomain: appletConfig.authDomain || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: appletConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: appletConfig.storageBucket || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: appletConfig.messagingSenderId || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: appletConfig.appId || process.env.VITE_FIREBASE_APP_ID,
};

const missingFields = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFields.length > 0) {
  console.error('[SATHI Seed Companions] Missing required Firebase config fields:', missingFields.join(', '));
  process.exit(1);
}

console.log('[SATHI Seed Companions] Initializing Firebase with Project ID:', firebaseConfig.projectId);
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const authInstance = getAuth(app);

async function writeAllInChunks<T extends { id: string }>(collectionName: string, items: T[]) {
  console.log(`[SATHI Seed Companions] Writing ${items.length} items to '${collectionName}'...`);
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

async function ensureAuthUserExists(email: string, pass: string, maxRetries = 5, delayMs = 0): Promise<string | null> {
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, pass);
      console.log(`[SATHI Auth] Created Firebase Auth user: ${email} -> UID: ${userCredential.user.uid}`);
      return userCredential.user.uid;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        console.log(`[SATHI Auth] Account already exists: ${email}`);
        return null;
      } else if (err.code === 'auth/too-many-requests') {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.warn(`[SATHI Auth] Rate limited creating ${email}. Retry ${attempt}/${maxRetries} in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        console.warn(`[SATHI Auth] Warning creating auth user for ${email}:`, err.message);
        return null;
      }
    }
  }
  console.error(`[SATHI Auth] Failed to create auth user for ${email} after ${maxRetries} retries`);
  return null;
}

async function checkExistingCompanion(docId: string): Promise<boolean> {
  const docRef = doc(db, 'companions', docId);
  const snap = await getDoc(docRef);
  return snap.exists();
}

async function runSeedCompanions() {
  console.log('[SATHI Seed Companions] STARTING 60 COMPANION RECORDS SEED...');
  console.log('[SATHI Seed Companions] Target: 20 Free Friends, 20 Guides, 20 Local Hosts');

  // Escalate to admin privileges first (like original seed.ts)
  const adminEmail = 'admin@sathi.com';
  const adminPass = 'Password123!';
  const adminId = 'u-demo-admin';

  await ensureAuthUserExists(adminEmail, adminPass);

  console.log('[SATHI Seed Companions] Signing in as Admin to escalate privileges...');
  const adminCredential = await signInWithEmailAndPassword(authInstance, adminEmail, adminPass);
  const authUid = adminCredential.user.uid;
  console.log('[SATHI Seed Companions] Escalated. Current authenticated UID:', authUid);

  // Ensure admin document exists
  const authAdminDocRef = doc(db, 'users', authUid);
  const authAdminSnap = await getDoc(authAdminDocRef);
  if (!authAdminSnap.exists()) {
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
    console.log(`[SATHI Seed Companions] Auth Admin document written to 'users/${authUid}'.`);
  } else {
    console.log(`[SATHI Seed Companions] Auth Admin document already exists at 'users/${authUid}'.`);
  }

  // Also ensure legacy admin doc exists
  if (authUid !== adminId) {
    const legacyAdminDocRef = doc(db, 'users', adminId);
    const legacyAdminSnap = await getDoc(legacyAdminDocRef);
    if (!legacyAdminSnap.exists()) {
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
      console.log(`[SATHI Seed Companions] Legacy admin document written to 'users/${adminId}'.`);
    }
  }

  const companionsList: any[] = [];
  const companionUsersList: any[] = [];

  const freeFriendCategories = ['Coffee Buddy', 'Hiking Partner', 'Food Explorer', 'Photography Walk', 'Language Exchange Partner', 'Museum Guide', 'Shopping Buddy', 'Study Partner', 'Nightlife', 'Travel Companion'];
  const guideCategories = ['Trekking Guide', 'Mountain Guide', 'Photography Guide', 'Cultural Guide', 'Heritage Walk Guide', 'Adventure Companion', 'Cycling Guide', 'Bird Watching Guide', 'Yoga Instructor', 'Festival Guide'];
  const localHostCategories = ['Local Host', 'Tour Operator', 'Travel Companion', 'Cultural Guide', 'Food Explorer', 'Photography Guide'];

  const pokhara = cities.find(c => c.name === 'Pokhara')!;
  const kathmandu = cities.find(c => c.name === 'Kathmandu')!;
  const lalitpur = cities.find(c => c.name === 'Lalitpur')!;
  const bhaktapur = cities.find(c => c.name === 'Bhaktapur')!;
  const otherCities = cities.filter(c => !['Pokhara', 'Kathmandu', 'Lalitpur', 'Bhaktapur'].includes(c.name));

  function getCityForFreeFriend(index: number) {
    if (index < 10) return pokhara;
    if (index < 16) return kathmandu;
    return otherCities[index % otherCities.length];
  }

  function getCityForGuide(index: number) {
    if (index < 8) return pokhara;
    if (index < 14) return kathmandu;
    return otherCities[index % otherCities.length];
  }

  function getCityForLocalHost(index: number) {
    if (index < 6) return pokhara;
    if (index < 10) return kathmandu;
    if (index < 15) return lalitpur;
    if (index < 18) return bhaktapur;
    return otherCities[index % otherCities.length];
  }

  const freeFriendBios = [
    "Always up for a coffee, lakeside walk or short hike.",
    "Love exploring new cafes and chatting about life over chiya.",
    "Weekend hiking buddy. Sarangkot sunrise is my favorite.",
    "Foodie at heart. Best momos in town? Let's find them together.",
    "Photography enthusiast. Golden hour shots around Pokhara are my specialty.",
    "Language exchange partner. Practice English or Nepali over a walk.",
    "Museum and history buff. Patan Durbar Square stories are endless.",
    "Shopping companion for local crafts and souvenirs in Lakeside.",
    "Study buddy for quiet cafe sessions. Productive mornings guaranteed.",
    "Nightlife explorer. Know all the best live music spots in Thamel.",
    "Always up for spontaneous day trips around the valley.",
    "Cultural explorer. Temples, monasteries, and local festivals.",
    "Cycling partner for lakeside rides and valley trails.",
    "Bird watching enthusiast. Shivapuri forest mornings are magical.",
    "Festival guide. Holi, Tihar, Dashain - celebrate like a local.",
    "Heritage walk companion. Bhaktapur alleys hold centuries of stories.",
    "Adventure seeker. Paragliding, zipline, rafting - count me in.",
    "Yoga and meditation friend. Sunrise sessions with mountain views.",
    "Local food hunter. Hidden street food gems are my treasure map.",
    "Travel companion for weekend getaways. Bandipur, Nagarkot, you name it."
  ];

  const guideBios = [
    "Local trekking guide focused on short hikes and mountain experiences. Annapurna base camp specialist.",
    "Certified mountain guide for peak climbing. Island Peak and Mera Peak expeditions.",
    "Heritage photography expert. Capture temples, stupas, and daily life in golden light.",
    "Cultural historian. Deep knowledge of Durbar Squares, Newar art, and ancient traditions.",
    "Patan native. Walking tours through medieval courtyards, bahals, and hidden temples.",
    "Adventure specialist. Paragliding over Pokhara, rafting Trishuli, zipline in Sarangkot.",
    "Mountain biking guide. Valley rim trails and off-road adventures around Pokhara.",
    "Bird watching ornithologist. Shivapuri and Chitwan rare Himalayan species spotting.",
    "Yoga instructor with mountain views. Hatha yoga and mindfulness at sunrise.",
    "Festival culture guide. Experience Holi, Indra Jatra, Tihar authentically.",
    "Annapurna circuit specialist. Tea house treks, acclimatization, local culture immersion.",
    "Everest region guide. Lukla to base camp with safety and cultural insights.",
    "Photography tour leader. Landscape, portrait, and street photography workshops.",
    "Cultural immersion guide. Homestays, cooking classes, traditional craft workshops.",
    "Heritage walk expert. Bhaktapur, Patan, Kathmandu ancient alley narratives.",
    "Adventure coordinator. Multi-sport trips: trek, raft, fly, bike in one journey.",
    "Cycling expedition guide. Trans-Himalayan trails and valley cross-country routes.",
    "Wildlife and nature guide. Chitwan safari, Shivapuri birding, conservation focus.",
    "Wellness retreat leader. Yoga, meditation, ayurveda in serene mountain settings.",
    "Festival and celebration curator. Private access to local family ceremonies."
  ];

  const localHostBios = [
    "Explore local food, markets and hidden corners of Kathmandu with me.",
    "Pokhara lakeside native. Boating, cafes, sunset spots - I know them all.",
    "Traditional Newari homestay host. Authentic family dinners and cultural exchange.",
    "Thamel local. Best shopping, dining, and nightlife navigation partner.",
    "Patan heritage resident. Walk medieval courtyards where I grew up.",
    "Bhaktapur pottery district guide. Hands-on clay workshop with local artisans.",
    "Lalitpur food tour specialist. Newari cuisine, momo crawl, local breweries.",
    "Valley rim village host. Bandipur, Nagarkot, Dhulikhel - off-beat experiences.",
    "Chitwan buffer zone local. Jungle walks, Tharu culture, river evenings.",
    "Lumbini pilgrimage host. Sacred garden, monasteries, meditation guidance.",
    "Mustang trek support. Lo Manthang culture, cave monasteries, high altitude life.",
    "Ilam tea garden host. Organic tea tasting, hill walks, sunrise views.",
    "Gorkha history guide. Palace, temples, and the birthplace of unified Nepal.",
    "Besisahar trailhead host. Annapurna circuit start point, gear, local knowledge.",
    "Dharan hill station local. Tea estates, temples, eastern culture blend.",
    "Janakpur spiritual host. Ram Janaki temple, Mithila art, festival calendar.",
    "Pokhara adventure base. Paragliding, boating, caves, waterfalls - your local fixer.",
    "Kathmandu valley explorer. Seven heritage sites in one curated day.",
    "Lakeside lifestyle host. Cafes, yoga studios, sunset points, expat community.",
    "Local market expert. Asan, Indra Chowk, Ason - bargaining, spices, textiles."
  ];

  // Helper to create companions
  async function createCompanionSet(
    type: 'free_friend' | 'guide' | 'local_host',
    count: number,
    categoryPool: string[],
    bioPool: string[],
    getCity: (index: number) => { name: string; lat: number; lng: number },
    baseRate: number,
    rateVariance: number,
    startIndex: number
  ) {
    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      const isMale = idx % 2 === 0;
      const fName = isMale ? firstNamesMale[idx % firstNamesMale.length] : firstNamesFemale[idx % firstNamesFemale.length];
      const lName = lastNames[idx % lastNames.length];
      const name = `${fName} ${lName}`;
      const email = `seed_${type}_${String(i + 1).padStart(3, '0')}@sathi.com`;
      const companionUserId = `u-seed-${type}-${String(i + 1).padStart(3, '0')}`;
      const companionId = `seed_${type}_${String(i + 1).padStart(3, '0')}`;

      // Check if already exists
      const exists = await checkExistingCompanion(companionId);
      if (exists) {
        console.log(`[SATHI Seed Companions] Skipping existing companion: ${companionId}`);
        continue;
      }

      // Create auth user
      await ensureAuthUserExists(email, 'SeedPass123!', 3, i * 100);

      const avatarUrl = companionAvatars[idx % companionAvatars.length];
      const cityObj = getCity(i);
      const category = categoryPool[i % categoryPool.length];
      const details = categoryDetails[category];

      const latOffset = Math.sin(idx) * 0.015;
      const lngOffset = Math.cos(idx) * 0.015;
      const finalLat = cityObj.lat + latOffset;
      const finalLng = cityObj.lng + lngOffset;

      let hourlyRate: number;
      let isVerified: boolean;
      let verificationBadge: string | undefined;

      if (type === 'free_friend') {
        hourlyRate = 0;
        isVerified = true;
        verificationBadge = 'Free Friend';
      } else if (type === 'guide') {
        hourlyRate = baseRate + ((idx * 150) % rateVariance);
        isVerified = true;
        verificationBadge = 'Verified Guide';
      } else {
        hourlyRate = baseRate + ((idx * 200) % rateVariance);
        isVerified = true;
        verificationBadge = 'Local Host';
      }

      // Companion user profile
      companionUsersList.push({
        id: companionUserId,
        name,
        email,
        role: 'companion',
        avatar: avatarUrl,
        favorites: [],
        createdAt: new Date(Date.now() - (idx + 100) * 24 * 3600000).toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Companion listing
      companionsList.push({
        id: companionId,
        userId: companionUserId,
        name,
        age: 22 + (idx % 28),
        gender: isMale ? 'Male' : 'Female',
        bio: bioPool[i % bioPool.length],
        hourlyRate,
        rating: type === 'free_friend' ? 0 : parseFloat((4.5 + (idx % 5) * 0.1).toFixed(1)),
        reviewsCount: type === 'free_friend' ? 0 : 5 + (idx * 3) % 50,
        isVerified,
        verificationBadge,
        location: cityObj.name,
        coordinates: new GeoPoint(finalLat, finalLng),
        languages: idx % 3 === 0 ? ['Nepali', 'English', 'Hindi'] : ['Nepali', 'English'],
        interests: details ? details.interests : [category],
        images: [avatarUrl, categoryImageMap[category] || avatarUrl],
        imageUrl: avatarUrl,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, 4 + (idx % 4)),
        responseTime: idx % 2 === 0 ? '~15 mins' : '~1 hour',
        createdAt: new Date(Date.now() - (idx + 50) * 24 * 3600000).toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`  [${type}] ${i + 1}/${count}: ${name} (${category}) in ${cityObj.name} - ${hourlyRate} NPR/hr`);
    }
  }

  console.log('\n[SATHI Seed Companions] Creating Free Friends...');
  await createCompanionSet('free_friend', 20, freeFriendCategories, freeFriendBios, getCityForFreeFriend, 0, 0, 0);

  console.log('\n[SATHI Seed Companions] Creating Guides...');
  await createCompanionSet('guide', 20, guideCategories, guideBios, getCityForGuide, 1200, 2000, 20);

  console.log('\n[SATHI Seed Companions] Creating Local Hosts...');
  await createCompanionSet('local_host', 20, localHostCategories, localHostBios, getCityForLocalHost, 800, 1500, 40);

  console.log('\n[SATHI Seed Companions] Writing companion users and companions to Firestore...');
  await writeAllInChunks('users', companionUsersList);
  await writeAllInChunks('companions', companionsList);

  const freeCount = companionsList.filter(c => c.hourlyRate === 0).length;
  const guideCount = companionsList.filter(c => c.hourlyRate > 0 && c.verificationBadge === 'Verified Guide').length;
  const hostCount = companionsList.filter(c => c.hourlyRate > 0 && c.verificationBadge === 'Local Host').length;

  console.log('\n[SATHI Seed Companions] SUCCESS: Seeded companion records!');
  console.log(`  Free Friends: ${freeCount}/20`);
  console.log(`  Guides: ${guideCount}/20`);
  console.log(`  Local Hosts: ${hostCount}/20`);
  console.log(`  Total new companions: ${companionsList.length}`);
  console.log(`  Total new companion users: ${companionUsersList.length}`);
}

runSeedCompanions().then(() => {
  console.log('[SATHI Seed Companions] Seeding finished successfully, exiting...');
  process.exit(0);
}).catch((error) => {
  console.error('[SATHI Seed Companions] Process Failed:', error);
  process.exit(1);
});