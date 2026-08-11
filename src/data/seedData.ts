export const categories = [
  'Trekking Guide', 'Mountain Guide', 'Coffee Buddy', 'Food Explorer',
  'Photography Guide', 'Cultural Guide', 'Local Host', 'Tour Operator',
  'Cycling Guide', 'Yoga Instructor', 'Bird Watching Guide', 'Heritage Walk Guide',
  'Adventure Companion', 'Festival Guide', 'Language Exchange Partner'
];

export const categoryDetails: Record<string, { interests: string[]; bio: string; spec: string }> = {
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

export const cities = [
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

export const firstNamesMale = [
  'Sunil', 'Safal', 'Aarav', 'Rajan', 'Nima', 'Sanjay', 'Arjun', 'Rajesh', 'Nabin', 'Milan', 'Bishal',
  'Kiran', 'Sandeep', 'Anup', 'Deepak', 'Dipesh', 'Prabhat', 'Rohan', 'Roshan', 'Subash', 'Bibek',
  'Umesh', 'Sujan', 'Rabin', 'Ashish', 'Suraj', 'Jeevan', 'Manoj', 'Prakash', 'Suresh', 'Santosh'
];

export const firstNamesFemale = [
  'Priya', 'Yuki', 'Sita', 'Anjali', 'Emma', 'Chloe', 'Sophia', 'Ritu', 'Prerana', 'Sneha',
  'Aayusha', 'Kriti', 'Manisha', 'Pooja', 'Samikshya', 'Alisha', 'Nisha', 'Jyoti', 'Shreya',
  'Kabita', 'Gita', 'Karuna', 'Aarati', 'Shristi', 'Bina', 'Maya', 'Nirmala', 'Sajana', 'Sabina'
];

export const lastNames = [
  'Kunwar', 'Thapa', 'Gurung', 'Shrestha', 'Maharjan', 'Sherpa', 'Chhetri', 'Lama', 'Karki',
  'Adhikari', 'Dahal', 'Bhandari', 'Gautam', 'Joshi', 'Sharma', 'Pathak', 'Basnet', 'Giri', 'Poudel',
  'Subedi', 'Rana', 'Shah', 'KC', 'Tamang', 'Rai', 'Limbu', 'Budhathoki', 'Khadka', 'Regmi',
  'Ghale', 'Malla', 'Koirala', 'Oli', 'Bhattarai', 'Khanal', 'Ghimire', 'Acharya'
];

export const companionAvatars = [
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

export const categoryImageMap: Record<string, string> = {
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

export const activityImages = Object.values(categoryImageMap);

export const reviewComments = [
  "Had an amazing walk around town! Highly knowledgeable, safety conscious, and hospital.",
  "Highly recommended companion! Had the absolute best time tasting local street foods.",
  "Very respectful, friendly, and shared incredible insights about Nepal history and Durbar squares.",
  "Safe, reliable, and a great conversationalist. Made my trip extremely comfortable.",
  "Super friendly, helpful with bargaining, and spoke perfect English.",
  "The absolute best trekking buddy. Patient, energetic, and highly motivating!",
  "Great coffee companion. Spoke about local traditions and recommended amazing local cafes.",
  "Wonderful guide and incredibly nice person. Felt like exploring with an old family friend."
];

export const storyCaptions = [
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

export const postContents = [
  { title: "Essential items to pack for the Poon Hill Trek in Nepal", tag: "Trekking", text: "Make sure you carry warm layers, high-quality hiking socks, a windproof shell, water purification tablets, and plenty of NPR cash. Credit cards do not work up in the mountains! Always trek with an ID-verified SATHI companion for extra safety." },
  { title: "Best authentic Nepalese momo joints in Kathmandu Valley", tag: "Food Explorer", text: "Forget fancy restaurants, Thamel backyard stalls and Lalitpur local cafes serve the juiciest buff and chicken momos with spicy sesame peanut dipping sauce. Ask your companion to take you!" },
  { title: "Understanding Durbar Square historical stone carvings", tag: "Cultural Guide", text: "Every ancient stone carving of Patan tells a rich story of ancient Kings and deities. Walking with a certified local buddy unlocks stories that guidebooks completely miss." },
  { title: "Tips for staying safe in local taxis and public transport in Pokhara", tag: "Local Host", text: "Always confirm the price before entering, or use local ride-sharing apps like Pathao or InDrive. Having an ID-verified SATHI companion with you ensures fair rates and a highly comfortable experience." },
  { title: "Learning Newari language phrases for daily shopping", tag: "Language Exchange Partner", text: "Saying Jwajalapa (Hello) and Subhay (Thank you) goes an incredibly long way. It builds instant respect with local craft makers and market shopkeepers!" },
  { title: "Spectacular places to photograph golden hour sunrise around Kathmandu", tag: "Photography Guide", text: "Nagarkot, Swayambhunath (Monkey Temple), and Chobhar Gorge provide the absolute best views of dawn over the valley. Don't forget your tripod and wide lens!" },
  { title: "Why you should participate in the Tihar festival celebrations", tag: "Festival Guide", text: "The festival of lights is beautiful. Streets are covered in rangolis and lit with oil lamps. Celebrate it safely with a local host family to experience authentic rituals." }
];

export const baseActivities = [
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

export const eventTitles = [
  "Community Momo Festival Meetup", "Weekend Nagarkot Nature Walk",
  "Traditional Newari Feast Gathering", "Kathmandu Street Photography Walk",
  "Startup Networking & Chiya Session", "Heritage Cleanup Preservation Drive",
  "Pokhara Sunset Lakeside Picnic"
];

export const partnerNames = [
  "Chiya Ghar", "Himalayan Java Coffee", "The Everest View Resort", "Sarangkot Adventure Gear",
  "Roadhouse Pizza Cafe", "Fishtail Lodge Cafe", "Boudha Garden Restaurant", "Newa Lahana Eating House",
  "Thamel Backpacker Hostel Café", "Durbar Square Pottery Spot"
];

export const chatTexts = [
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

export const notificationTitles = [
  "Booking Confirmed!", "New Chat Message", "System Announcement", "Review Received", "Story Liked!"
];

export const notificationMessages = [
  "Your SATHI booking for Patan Walk has been successfully confirmed.",
  "Your companion sent you a message: 'See you near the Golden Temple!'",
  "SATHI Alert: Support for Khalti payments has been fully upgraded across Nepal.",
  "A traveler left you a beautiful 5-star review! Check out your profile stats.",
  "Emma liked your morning sunset story in Pokhara Lakeside."
];

export const notificationTypes = ['booking', 'message', 'system', 'system', 'system'];
