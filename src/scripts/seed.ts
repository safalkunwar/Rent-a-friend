import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, writeBatch, GeoPoint } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBE-RD9iszOTqSLuugWxuYCpIWIrPVIjsI',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'hamrosathi1.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'hamrosathi1',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'hamrosathi1.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '932995524964',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:932995524964:web:bae2033ae87165adbb3271',
};

console.log('[SATHI Seed] Initializing Firebase with Project ID:', firebaseConfig.projectId);
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data Sets
const firstNamesMale = [
  'Safal', 'Aarav', 'Rajan', 'Nima', 'Sanjay', 'Arjun', 'Rajesh', 'Nabin', 'Milan', 'Bishal',
  'Sunil', 'Kiran', 'Sandeep', 'Anup', 'Deepak', 'Dipesh', 'Prabhat', 'Rohan', 'Roshan', 'Subash',
  'Bibek', 'Umesh', 'Sujan', 'Rabin', 'Ashish', 'Suraj', 'Jeevan', 'Manoj', 'Prakash', 'Suresh',
  'Amir', 'Nikesh', 'Santosh', 'Dev', 'Karan', 'Gaurav', 'Manish', 'Saurav', 'Anil', 'Sumit'
];

const firstNamesFemale = [
  'Priya', 'Sita', 'Anjali', 'Yuki', 'Emma', 'Chloe', 'Sophia', 'Ritu', 'Prerana', 'Sneha',
  'Aayusha', 'Kriti', 'Manisha', 'Pooja', 'Samikshya', 'Saraswoti', 'Alisha', 'Nisha', 'Jyoti', 'Shreya',
  'Kabita', 'Gita', 'Karuna', 'Aarati', 'Shristi', 'Bina', 'Maya', 'Nirmala', 'Sajana', 'Sabina',
  'Pramila', 'Rupa', 'Kalpana', 'Sunita', 'Anjana', 'Babita', 'Hema', 'Reema', 'Ganga', 'Yamuna'
];

const lastNames = [
  'Kunwar', 'Thapa', 'Gurung', 'Shrestha', 'Maharjan', 'Sherpa', 'Chhetri', 'Tanaka', 'Lama', 'Karki',
  'Adhikari', 'Dahal', 'Bhandari', 'Gautam', 'Joshi', 'Sharma', 'Pathak', 'Basnet', 'Giri', 'Poudel',
  'Subedi', 'Rana', 'Shah', 'KC', 'Tamang', 'Rai', 'Limbu', 'Budhathoki', 'Khadka', 'Regmi',
  'Ghale', 'Malla', 'Koirala', 'Oli', 'Bhattarai', 'Khanal', 'Niroula', 'Kafle', 'Ghimire', 'Acharya'
];

const maleAvatars = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400",
  "https://images.unsplash.com/photo-1600486913747-55e5470d6f40?q=80&w=400",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=400",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=400"
];

const femaleAvatars = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400",
  "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?q=80&w=400",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=400"
];

const activityImages = [
  "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600",
  "https://images.unsplash.com/photo-1510425463958-dcced28da480?q=80&w=600",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600",
  "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600",
  "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=600",
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600",
  "https://images.unsplash.com/photo-1473163928189-364b2c4e1135?q=80&w=600"
];

const eventImages = [
  "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=600",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600",
  "https://images.unsplash.com/photo-1531058020387-3be344559be6?q=80&w=600"
];

const partnerImages = [
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600",
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=600"
];

const cities = [
  { name: 'Kathmandu', lat: 27.7172, lng: 85.324 },
  { name: 'Pokhara', lat: 28.2096, lng: 83.9856 },
  { name: 'Patan', lat: 27.6588, lng: 85.3247 },
  { name: 'Bhaktapur', lat: 27.671, lng: 85.4298 },
  { name: 'Nagarkot', lat: 27.686, lng: 85.521 },
  { name: 'Chitwan', lat: 27.5291, lng: 84.3542 },
  { name: 'Lalitpur', lat: 27.6700, lng: 85.3150 },
  { name: 'Dharan', lat: 26.8124, lng: 87.2835 }
];

const categories = [
  'Coffee Buddy', 'Travel Companion', 'Language Exchange', 'Food Explorer',
  'Museum Guide', 'Hiking Partner', 'Shopping Buddy', 'Study Partner',
  'Nightlife', 'Photography Walk'
];

const categoryDetails: Record<string, { interests: string[]; bio: string }> = {
  'Coffee Buddy': {
    interests: ['Coffee', 'Conversations', 'Reading', 'Writing', 'Art'],
    bio: 'Love discussing art, books, culture and travel over a warm cup of Nepalese organic coffee.'
  },
  'Travel Companion': {
    interests: ['Trekking', 'Travel', 'Sightseeing', 'Adventure', 'Hiking'],
    bio: 'Excited to guide you through new mountain trails, local hostels and share off-the-beaten-path travel spots.'
  },
  'Language Exchange': {
    interests: ['Language', 'Culture', 'Teaching', 'Reading', 'History'],
    bio: 'Passionate about linguistics and native culture exchange. Let us practice English, Nepali, or Newari together!'
  },
  'Food Explorer': {
    interests: ['Food', 'Cooking', 'Street Food', 'Tasting', 'Momo'],
    bio: 'Absolute foodie! Let us embark on a street food tasting tour through ancient hidden alleyways.'
  },
  'Museum Guide': {
    interests: ['Art', 'History', 'Museum', 'Architecture', 'Culture'],
    bio: 'History, fine arts, and ancient temple carving are my passion. Let us explore the heritage of Durbar Squares.'
  },
  'Hiking Partner': {
    interests: ['Hiking', 'Outdoors', 'Nature', 'Mountains', 'Trekking'],
    bio: 'Avid outdoor enthusiast. Let us trek up the green hills and watch the golden sunrise over the snowy peaks.'
  },
  'Shopping Buddy': {
    interests: ['Shopping', 'Fashion', 'Crafts', 'Bargaining', 'Souvenirs'],
    bio: 'Bargaining and handicraft sourcing are special arts. Let us explore the best local woodcraft and shawl makers.'
  },
  'Study Partner': {
    interests: ['Study', 'Library', 'Coding', 'Mathematics', 'Tech'],
    bio: 'Productive learner and programming enthusiast. Let us co-work or study together at a quiet spot.'
  },
  'Nightlife': {
    interests: ['Nightlife', 'Music', 'Bars', 'Dancing', 'Live Band'],
    bio: 'Let us experience the electric nightlife, vibrant live music joints, and friendly local pubs in town.'
  },
  'Photography Walk': {
    interests: ['Photography', 'Camera', 'City Walk', 'Nature', 'Portraits'],
    bio: 'Creative photographer. Let us capture stunning temple architecture and colorful local daily lives together.'
  }
};

// Batch Writer Utility
async function writeAllInChunks<T extends { id: string }>(collectionName: string, items: T[]) {
  console.log(`Writing ${items.length} items to ${collectionName}...`);
  const chunkSize = 400;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, item);
    }
    await batch.commit();
    console.log(`  - Committed chunk of size ${chunk.length} to ${collectionName} (${i + chunk.length}/${items.length})`);
  }
}

async function runSeed() {
  console.log('[SATHI Seed] Starting data generation...');

  // 1. GENERATE USERS (30 Customers, 220 Companions, 1 Admin)
  const usersList: any[] = [];
  
  // Admin User
  usersList.push({
    id: 'u-demo-admin',
    name: 'SATHI Admin',
    email: 'admin@sathi.com',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=C8A25E&color=0F1113',
    favorites: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 30 Customers
  const customerNames = [
    'Emma', 'Raj', 'Chloe', 'Liam', 'Sophia', 'James', 'Airi', 'Alex', 'Hans', 'John',
    'Yusuf', 'Sarah', 'Diego', 'Fatima', 'Olga', 'Kenji', 'Elena', 'Lucas', 'Zoe', 'Isabella',
    'Amelie', 'Carlos', 'Mei', 'Emily', 'Viktor', 'Anna', 'David', 'Sven', 'Tariq', 'Clara'
  ];
  for (let i = 1; i <= 30; i++) {
    const name = customerNames[i - 1];
    usersList.push({
      id: `u-customer-${i}`,
      name,
      email: `${name.toLowerCase()}@example.com`,
      role: 'customer',
      avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
      favorites: [], // Will populate later
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // 2. GENERATE COMPANION USERS & COMPANION PROFILES (220 Profiles)
  const companionsList: any[] = [];
  const generatedCompanionNames: string[] = [];
  const generatedCompanionAvatars: string[] = [];

  for (let i = 1; i <= 220; i++) {
    const isMale = i % 2 === 0;
    const fName = isMale ? firstNamesMale[i % firstNamesMale.length] : firstNamesFemale[i % firstNamesFemale.length];
    const lName = lastNames[i % lastNames.length];
    const name = `${fName} ${lName}`;
    generatedCompanionNames.push(name);

    const avatar = isMale ? maleAvatars[i % maleAvatars.length] : femaleAvatars[i % femaleAvatars.length];
    generatedCompanionAvatars.push(avatar);

    const companionUserId = `u-companion-${i}`;
    
    // Add Companion User Profile
    usersList.push({
      id: companionUserId,
      name,
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}@sathi.com`,
      role: 'companion',
      avatar,
      favorites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const cityObj = cities[i % cities.length];
    const category = categories[i % categories.length];
    const details = categoryDetails[category];

    // Latitude and longitude spread centered around Nepalese hubs
    const latOffset = Math.sin(i) * 0.02;
    const lngOffset = Math.cos(i) * 0.02;
    const latitude = cityObj.lat + latOffset;
    const longitude = cityObj.lng + lngOffset;

    const hourlyRate = 800 + ((i * 150) % 1800); // 800 to 2600 NPR

    // Base Profile
    companionsList.push({
      id: `c${i}`,
      userId: companionUserId,
      name,
      age: 19 + (i % 20),
      gender: isMale ? 'Male' : 'Female',
      bio: `${details.bio} Native to ${cityObj.name}, I can help you with language practice and local safety tips.`,
      hourlyRate,
      rating: 4.8, // Updated dynamically from reviews below
      reviewsCount: 0, // Updated dynamically from reviews below
      isVerified: i % 10 !== 0, // 90% verified
      verificationStatus: i % 10 !== 0 ? 'approved' : 'pending',
      location: cityObj.name,
      coordinates: new GeoPoint(latitude, longitude),
      languages: i % 3 === 0 ? ['Nepali', 'English', 'Hindi'] : ['Nepali', 'English'],
      interests: details.interests,
      imageUrl: avatar,
      images: [avatar, activityImages[i % activityImages.length]],
      availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'].slice(0, 3 + (i % 3)),
      responseRate: 85 + (i % 16),
      responseTime: i % 2 === 0 ? '~1 hour' : '~30 mins',
      completedBookings: 10 + (i * 3) % 180,
      trustScore: parseFloat((4.5 + (i % 6) * 0.1).toFixed(1)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // 3. GENERATE REVIEWS (560 Reviews) & CALCULATE AGGREGATE RATINGS
  const reviewsList: any[] = [];
  const reviewComments = [
    "Had an amazing walk around town! Very knowledgeable and hospitable.",
    "Highly recommended companion! Had the absolute best time trying street food.",
    "Very respectful, friendly, and shared incredible insights about Nepal history.",
    "Safe, reliable, and great conversationalist. Made my trip extremely comfortable.",
    "Super friendly, helpful with bargaining, and spoke perfect English.",
    "The absolute best trekking buddy. Patient, energetic, and highly motivating!",
    "Great coffee companion. Spoke about local traditions and recommended amazing local cafes.",
    "Wonderful guide and incredibly nice person. Felt like exploring with an old friend."
  ];

  const companionReviewsMap: Record<string, { ratingsSum: number; count: number }> = {};

  for (let i = 1; i <= 560; i++) {
    // Distribute reviews amongst companions, popular companions get more reviews
    const compIndex = (i % 220) + 1;
    const companionId = `c${compIndex}`;
    const userIdx = (i % 30) + 1;
    const userId = `u-customer-${userIdx}`;

    // Highly positive ratings with rare minor complaints
    const rating = i % 15 === 0 ? 3 : (i % 5 === 0 ? 4 : 5);
    const comment = reviewComments[i % reviewComments.length];

    reviewsList.push({
      id: `r${i}`,
      companionId,
      userId,
      bookingId: `b-sim-${i}`,
      rating,
      comment,
      createdAt: new Date(Date.now() - (i * 6000000)).toISOString()
    });

    if (!companionReviewsMap[companionId]) {
      companionReviewsMap[companionId] = { ratingsSum: 0, count: 0 };
    }
    companionReviewsMap[companionId].ratingsSum += rating;
    companionReviewsMap[companionId].count += 1;
  }

  // Update Companion average ratings based on actual reviews
  for (const companion of companionsList) {
    const stats = companionReviewsMap[companion.id];
    if (stats) {
      companion.rating = parseFloat((stats.ratingsSum / stats.count).toFixed(1));
      companion.reviewsCount = stats.count;
    } else {
      companion.rating = 4.8;
      companion.reviewsCount = 0;
    }
  }

  // 4. GENERATE FAVORITES (1050 Favorites across 30 users)
  // For each customer user, add exactly 35 favorites to user document
  const customerFavoritesList: any[] = [];
  for (let u = 1; u <= 30; u++) {
    const userId = `u-customer-${u}`;
    const userFavorites: string[] = [];
    
    for (let f = 1; f <= 35; f++) {
      const compId = `c${((u * 7 + f * 11) % 220) + 1}`;
      userFavorites.push(compId);

      // Create individual document in users/{userId}/favorites/{compId} subcollection
      customerFavoritesList.push({
        id: `${userId}_fav_${compId}`,
        userId,
        companionId: compId,
        createdAt: new Date().toISOString()
      });
    }

    // Update user record in list with favorites array
    const userIndex = usersList.findIndex(usr => usr.id === userId);
    if (userIndex !== -1) {
      usersList[userIndex].favorites = userFavorites;
    }
  }

  // 5. GENERATE COMMUNITY STORIES (160 Stories)
  const storiesList: any[] = [];
  const storyCaptions = [
    "Amazing trekking sunset up at Sarangkot. Captured this stunning panoramic landscape!",
    "Had the best local traditional Newari thali meal with my amazing companion today.",
    "Walking around Thamel ancient markets and shopping for original singing bowls.",
    "Learned how to make proper handmade momos from scratch in Kathmandu cooking class!",
    "Taking in the beautiful, peaceful breeze during morning boating at Phewa Lake.",
    "Fascinating historic details shared today walking through Patan Durbar Square temples.",
    "A gorgeous sunrise tea experience over Nagarkot valleys looking at the mountains.",
    "Checked out the local live acoustic guitar bands in Jhamshikhel, awesome vibes!"
  ];

  for (let i = 1; i <= 160; i++) {
    const customerIdx = (i % 30) + 1;
    const companionIdx = (i % 220) + 1;
    const customerUser = usersList.find(u => u.id === `u-customer-${customerIdx}`);
    const companionProfile = companionsList.find(c => c.id === `c${companionIdx}`);

    storiesList.push({
      id: `s${i}`,
      companionId: `c${companionIdx}`,
      userId: `u-customer-${customerIdx}`,
      userName: customerUser ? customerUser.name : 'Emma',
      userAvatar: customerUser ? customerUser.avatar : 'https://ui-avatars.com/api/?name=Emma',
      companionName: companionProfile ? companionProfile.name : 'Safal Kunwar',
      imageUrl: activityImages[i % activityImages.length],
      caption: storyCaptions[i % storyCaptions.length],
      likes: 0,
      comments: 0,
      timeAgo: `${(i % 5) + 1}d ago`,
      createdAt: new Date(Date.now() - (i * 86400000)).toISOString()
    });
  }

  // 6. GENERATE COMMUNITY POSTS (110 Posts)
  const postsList: any[] = [];
  const postContents = [
    { title: "Essential items to pack for the Poon Hill Trek", tag: "Trekking", text: "Make sure you carry warm layers, high-quality hiking socks, a windproof shell, water purification tablets, and plenty of NPR cash. Credit cards do not work up in the mountains!" },
    { title: "Best authentic Nepalese momo joints in Kathmandu", tag: "Food", text: "Forget fancy restaurants, Thamel backyard stalls and Lalitpur local cafes serve the juiciest buff and chicken momos with spicy sesame peanut sauce. Ask your companion to take you!" },
    { title: "Understanding Durbar Square historical stone carvings", tag: "Culture", text: "Every ancient stone carving of Patan tells a rich story of Kings and deities. Walking with a certified local buddy unlocks stories that guidebooks completely miss." },
    { title: "Tips for staying safe in local taxis and public transport", tag: "Safety", text: "Always confirm the price before entering, or use local booking apps like Pathao or InDrive. Having an ID-verified SATHI companion with you ensures fair rates every time." },
    { title: "Learning Newari language phrases for daily shopping", tag: "Language", text: "Saying Jwajalapa (Hello) and Subhay (Thank you) goes an incredibly long way. It builds instant respect with local craft makers and market shopkeepers!" }
  ];

  for (let i = 1; i <= 110; i++) {
    const contentObj = postContents[i % postContents.length];
    const customerIdx = (i % 30) + 1;

    postsList.push({
      id: `cp${i}`,
      userId: `u-customer-${customerIdx}`,
      title: `${contentObj.title} #${i}`,
      content: contentObj.text,
      category: contentObj.tag,
      tags: [contentObj.tag.toLowerCase(), 'nepal', 'sathi'],
      imageUrl: activityImages[i % activityImages.length],
      status: 'published',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(Date.now() - (i * 4 * 3600000)).toISOString(),
      updatedAt: new Date(Date.now() - (i * 4 * 3600000)).toISOString()
    });
  }

  // 7. GENERATE ACTIVITIES (85 Activities)
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
      avgPrice: 900 + (i % 6) * 300,
      imageUrl: activityImages[i % activityImages.length],
      companionCount: 15 + (i * 7) % 80,
      category: base.cat,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // 8. GENERATE LOCAL EVENTS (55 Events - Public)
  const eventsList: any[] = [];
  const eventTitles = [
    "Community Momo Festival", "Weekend Nagarkot Nature Hike",
    "Traditional Newari Feast & Meetup", "Kathmandu Street Photographers Walk",
    "Startup Networking & Coffee Session", "Heritage Cleanup & Preservation Drive",
    "Pokhara Sunset Lakeside Acoustic Picnic"
  ];

  for (let i = 1; i <= 55; i++) {
    const cityObj = cities[i % cities.length];
    eventsList.push({
      id: `e${i}`,
      title: `${eventTitles[i % eventTitles.length]} #${i}`,
      description: `Join us for an exciting group session. Connect with amazing companions and meet fellow global travelers who love exploring Nepal.`,
      date: new Date(Date.now() + (i * 24 * 3600000)).toISOString().split('T')[0],
      time: i % 2 === 0 ? "10:00 AM" : "04:30 PM",
      location: `${cityObj.name} Community Hall`,
      coordinates: new GeoPoint(cityObj.lat, cityObj.lng),
      spots: 3 + (i % 12),
      type: 'public', // CRITICAL for security rule match
      participants: [`u-customer-${(i % 30) + 1}`, `u-customer-${((i + 3) % 30) + 1}`],
      imageUrl: eventImages[i % eventImages.length],
      createdBy: 'u-demo-admin',
      createdAt: new Date().toISOString()
    });
  }

  // 9. GENERATE PARTNERS (35 Partner Listings)
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
      disc: i % 2 === 0 ? "10% off with SATHI Companion" : "NPR 1,000 SATHI Booking Credit",
      loc: cityObj.name,
      category,
      imageUrl: partnerImages[i % partnerImages.length],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // 10. GENERATE BOOKINGS (100 Bookings)
  const bookingsList: any[] = [];
  const bookingStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

  for (let i = 1; i <= 100; i++) {
    const customerIdx = (i % 30) + 1;
    const companionIdx = (i % 220) + 1;
    const companion = companionsList[companionIdx - 1];

    const duration = 2 + (i % 4);
    const totalPrice = companion.hourlyRate * duration;

    bookingsList.push({
      id: `b${i}`,
      userId: `u-customer-${customerIdx}`,
      companionId: `c${companionIdx}`,
      date: new Date(Date.now() - (i * 2 * 3600000)).toISOString().split('T')[0],
      time: `${9 + (i % 10)}:00`,
      duration,
      participants: 1 + (i % 3),
      status: bookingStatuses[i % bookingStatuses.length],
      totalPrice,
      meetingPoint: `${companion.location} Center Ground`,
      createdAt: new Date(Date.now() - (i * 2 * 24 * 3600000)).toISOString(),
      updatedAt: new Date(Date.now() - (i * 2 * 24 * 3600000)).toISOString()
    });
  }

  // 11. GENERATE CONVERSATIONS AND MESSAGES (25 Threads / 250 Messages)
  const conversationsList: any[] = [];
  const messagesList: any[] = [];

  const chatTexts = [
    "Hello! Are you available to meet up this Friday for a walk?",
    "Yes, I am free after 2 PM! What area are you planning to visit?",
    "I would love to check out Patan Durbar Square and grab some tea.",
    "That sounds fantastic. Let us meet near the Golden Temple.",
    "Great! Should I book you on the SATHI app now?",
    "Yes, please go ahead. That keeps our meeting secured and protected under SATHI Shield.",
    "Booked! Looking forward to exploring with you.",
    "Awesome. See you on Friday! Let me know if you need pick-up directions.",
    "Perfect, thank you! I will let you know once I head out.",
    "No problem, stay safe!"
  ];

  for (let i = 1; i <= 25; i++) {
    const customerIdx = (i % 30) + 1;
    const companionIdx = (i % 220) + 1;
    const customerId = `u-customer-${customerIdx}`;
    const companionUserId = `u-companion-${companionIdx}`;
    const conversationId = `conv_${customerId}_${companionUserId}`;

    conversationsList.push({
      id: conversationId,
      participantIds: [customerId, companionUserId],
      lastMessage: chatTexts[9],
      lastMessageSenderId: companionUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Add 10 messages for each thread
    for (let m = 0; m < 10; m++) {
      const isCustomerSender = m % 2 === 0;
      messagesList.push({
        id: `${conversationId}_msg_${m}`,
        conversationId,
        senderId: isCustomerSender ? customerId : companionUserId,
        text: chatTexts[m],
        isRead: m !== 9,
        createdAt: new Date(Date.now() - (10 - m) * 600000).toISOString(),
        updatedAt: new Date(Date.now() - (10 - m) * 600000).toISOString()
      });
    }
  }

  // 12. RUN BULK UPLOADS TO FIRESTORE
  try {
    await writeAllInChunks('users', usersList);
    await writeAllInChunks('companions', companionsList);
    await writeAllInChunks('reviews', reviewsList);
    await writeAllInChunks('stories', storiesList);
    await writeAllInChunks('community_posts', postsList);
    await writeAllInChunks('activities', activitiesList);
    await writeAllInChunks('events', eventsList);
    await writeAllInChunks('partners', partnersList);
    await writeAllInChunks('bookings', bookingsList);
    await writeAllInChunks('conversations', conversationsList);

    // Write Favorites individual documents (subcollection users/{id}/favorites/{id})
    // For safety with rules, let us write them in individual user subcollections
    console.log(`Writing individual favorite records to subcollections...`);
    const favoriteChunks = 400;
    for (let i = 0; i < customerFavoritesList.length; i += favoriteChunks) {
      const chunk = customerFavoritesList.slice(i, i + favoriteChunks);
      const batch = writeBatch(db);
      for (const fav of chunk) {
        const subdocRef = doc(db, 'users', fav.userId, 'favorites', fav.companionId);
        batch.set(subdocRef, { companionId: fav.companionId, createdAt: fav.createdAt });
      }
      await batch.commit();
      console.log(`  - Favorite chunk written (${i + chunk.length}/${customerFavoritesList.length})`);
    }

    // Write Messages
    console.log(`Writing conversation messages...`);
    const messageChunks = 400;
    for (let i = 0; i < messagesList.length; i += messageChunks) {
      const chunk = messagesList.slice(i, i + messageChunks);
      const batch = writeBatch(db);
      for (const msg of chunk) {
        const subdocRef = doc(db, 'conversations', msg.conversationId, 'messages', msg.id);
        batch.set(subdocRef, msg);
      }
      await batch.commit();
      console.log(`  - Messages chunk written (${i + chunk.length}/${messagesList.length})`);
    }

    console.log('[SATHI Seed] SUCCESS: Seeded high-volume, synchronized production-level database!');
  } catch (err) {
    console.error('[SATHI Seed] Error writing documents to Firestore:', err);
    throw err;
  }
}

runSeed().catch((error) => {
  console.error('[SATHI Seed] Process Failed:', error);
});
