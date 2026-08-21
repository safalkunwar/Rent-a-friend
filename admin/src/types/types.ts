export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface AdminBookingRow {
  id: string;
  userId: string;
  companionId: string;
  status: string;
  totalPrice: number;
  date: string;
  time: string;
  meetingPoint?: string;
  duration?: number;
  participants?: number;
}

export interface AdminReportRow {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface AdminCompanionRow {
  id: string;
  name: string;
  location: string;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  hourlyRate: number;
  imageUrl?: string;
  languages?: string[];
  email?: string;
  status?: string;
}

export interface AdminNotificationRow {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  timestamp: string;
}

export interface AdminContentRow {
  id: string;
  title: string;
  location: string;
  description?: string;
  category?: string;
  date?: string;
  avgPrice?: number;
  duration?: number;
  createdAt?: string;
}

export interface AdminPostRow {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  status: string;
}

export interface AdminCommentRow {
  id: string;
  content: string;
  author: string;
  postId: string;
  createdAt: string;
}

export interface AdminGuideApplication {
  id: string;
  name: string;
  email: string;
  location: string;
  appliedDate: string;
  status: 'pending' | 'approved' | 'rejected';
  idUrl?: string;
  companionId?: string;
  adminNotes?: string;
}

export interface AdminFeedbackItem {
  id: string;
  user: string;
  type: 'feedback' | 'bug' | 'guide_feedback';
  message: string;
  date: string;
  rating?: number;
  status: 'new' | 'read' | 'resolved';
  userId: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  timestamp: string;
}
