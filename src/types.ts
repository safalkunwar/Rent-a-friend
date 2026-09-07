export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  photoPath?: string;
  photoUpdatedAt?: string;
  photoModerationStatus?: 'ACTIVE' | 'UNDER_REVIEW' | 'RESTRICTED' | 'REMOVED';
  photoVisibilityStatus?: 'PUBLIC' | 'PRIVATE';
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
  userId?: string;
  // Older callers render the client-visible creation string; persistence is read as a Timestamp in the media service.
  createdAt?: string;
  expiresAt?: string | import('firebase/firestore').Timestamp;
  moderationStatus?: 'ACTIVE' | 'UNDER_REVIEW' | 'RESTRICTED' | 'REMOVED';
  visibilityStatus?: 'PUBLIC' | 'PRIVATE';
  contentType?: 'story';
  status?: 'publishing' | 'active' | 'expired';
  companionName: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  mediaPath?: string;
  timeAgo: string;
  caption: string;
  likes?: number;
  comments?: number;
  likesCount?: number;
  commentsCount?: number;
  category?: string;
  tags?: string[];
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
  policyVersion?: number;
  companionUid?: string;
  quotedTotalPaisa?: number;
  paymentStatus?: 'not_started' | 'pending' | 'verification_required' | 'verified' | 'failed';
  startAt?: import('firebase/firestore').Timestamp;
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
  userNameAtBooking?: string;
  userPhoneAtBooking?: string;
  userEmailAtBooking?: string;
}

// ==================== COMPANION APPLICATION / KYC ====================

export type CompanionApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUIRED'
  | 'APPROVED'
  | 'REJECTED';

export type UserCompanionStatus =
  | 'NOT_APPLIED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUIRED'
  | 'APPROVED'
  | 'REJECTED';

export interface CompanionApplication {
  id: string;
  userId: string;
  status: CompanionApplicationStatus;
  // Public companion profile data (becomes companions/{id} on approval)
  applicationData: {
    displayName: string;
    bio: string;
    categories: string[];
    languages: string[];
    location: string;
    hourlyRate: number;
    imageUrl?: string;
    yearsExperience?: number;
  };
  // KYC metadata only — actual documents live in Firebase Storage.
  kyc: {
    legalFullName: string;
    documentType: 'citizenship' | 'passport' | 'driving_license';
    documentNumberMasked: string;
    documentFileUrl?: string; // Canonical private kyc/UID/object path, never a download URL.
    selfieWithDocumentUrl?: string;
    verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED';
  };
  rejectionReason?: string;
  requestedChanges?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  action: string; // e.g. 'application.approved'
  actorId: string;
  actorRole: string;
  targetType: string; // 'companion_application' | 'user' | ...
  targetId: string;
  details?: Record<string, unknown>;
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
  imagePath?: string;
  imageOwnerId?: string;
  mediaModerationStatus?: 'ACTIVE' | 'UNDER_REVIEW' | 'RESTRICTED' | 'REMOVED';
  mediaVisibilityStatus?: 'PUBLIC' | 'PRIVATE';
  date: string;
  time: string;
  title: string;
  location: string;
  spots: number;
  participants?: number | { length: number };
  description?: string;
  imageUrl?: string;
  image?: string;
  category?: string;
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
