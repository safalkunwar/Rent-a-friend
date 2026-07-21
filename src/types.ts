export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'guest' | 'customer' | 'companion' | 'admin';
  favorites: string[]; // Companion IDs
  claims?: Record<string, unknown>;
  phone?: string;
  bio?: string;
  location?: string;
}

export interface Review {
  id: string;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  text: string;
  date: string;
}

export interface ExperienceStory {
  id: string;
  companionName: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  timeAgo: string;
  caption: string;
  likes?: number;
  comments?: number;
  likesCount?: number;
  commentsCount?: number;
}

export interface Companion {
  id: string;
  userId?: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  hourlyRate: number;
  rating: number;
  reviewsCount: number;
  isVerified: boolean;
  location: string;
  coordinates?: { latitude: number; longitude: number };
  languages: string[];
  interests: string[];
  imageUrl: string;
  images?: string[];
  reviews?: Review[];
  availableDays?: string[]; // e.g. ['Monday', 'Tuesday']
  responseTime?: string;
}

export interface Booking {
  id: string;
  companionId: string;
  userId: string;
  date: string;
  time: string;
  duration: number; // hours
  participants: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  totalPrice: number;
  meetingPoint: string;
  meetingCoordinates?: { latitude: number; longitude: number };
  specialRequests?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[]; // [userId, companionId]
  lastMessage?: Message;
  unreadCount: number;
}

export interface Activity {
  id: string;
  title: string;
  imageUrl?: string;
  image?: string;
  duration: string;
  avgPrice: number;
  companionCount: number;
  description?: string;
  location?: string;
  category?: string;
  price?: number;
  coordinates?: { latitude: number; longitude: number; _lat?: number; _lng?: number; lat?: number; lng?: number };
}

export interface Event {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  spots: number;
  participants?: number | { length: number };
  description?: string;
  imageUrl?: string;
  image?: string;
  coordinates?: { latitude: number; longitude: number; _lat?: number; _lng?: number; lat?: number; lng?: number };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'message' | 'system';
  isRead: boolean;
  timestamp: string;
  link?: string;
}

export interface Partner {
  id: string;
  name: string;
  disc: string;
  loc: string;
  category?: string;
  imageUrl?: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  imageUrl?: string;
  status: 'published' | 'draft';
  createdAt?: string;
  updatedAt?: string;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  reportsCount?: number;
  userName?: string;
  userAvatar?: string;
  location?: string;
}
