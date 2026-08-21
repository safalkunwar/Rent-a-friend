import { firestore } from './firestore';

export interface PlatformMetrics {
  totalUsers: number;
  activeUsers24h: number;
  newUsers24h: number;
  activeCompanions: number;
  pendingCompanionApplications: number;
  pendingKYC: number;
  activeBookings: number;
  pendingBookings: number;
  completedBookings24h: number;
  cancelledBookings24h: number;
  totalReports: number;
  openReports: number;
  activeSOSIncidents: number;
  messagesSent24h: number;
  messageDeliveryFailures24h: number;
  communityPosts24h: number;
  comments24h: number;
  likes24h: number;
  storageUsageMB: number;
  firebaseErrors24h: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface AggregatedBookingStats {
  totalRevenue: number;
  averageBookingValue: number;
  cancellationRate: number;
  completionRate: number;
  byStatus: Record<string, number>;
  byHour: TimeSeriesPoint[];
}

export interface AggregatedUserStats {
  totalRegistrations: number;
  registrationsByDay: TimeSeriesPoint[];
  retention7d: number;
  retention30d: number;
  activeByRole: Record<string, number>;
}

export interface AggregatedContentStats {
  postsCount: number;
  commentsCount: number;
  likesCount: number;
  storiesCount: number;
  reportsCount: number;
  engagementRate: number;
}

export const aggregationService = {
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const [
      usersSnapshot,
      activeUsersSnapshot,
      newUsersSnapshot,
      companionsSnapshot,
      pendingAppsSnapshot,
      pendingKYCSnapshot,
      bookingsSnapshot,
      activeBookingsSnapshot,
      pendingBookingsSnapshot,
      completedBookingsSnapshot,
      cancelledBookingsSnapshot,
      reportsSnapshot,
      openReportsSnapshot,
      sosSnapshot,
      messagesSnapshot,
      failedMessagesSnapshot,
      postsSnapshot,
      commentsSnapshot,
      likesSnapshot,
    ] = await Promise.all([
      firestore.getDocuments('users', { limitCount: 1 }),
      firestore.getDocuments('users', { 
        where: [{ field: 'lastActive', operator: '>=', value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }], 
        limitCount: 1 
      }),
      firestore.getDocuments('users', { 
        where: [{ field: 'createdAt', operator: '>=', value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }], 
        limitCount: 1 
      }),
      firestore.getDocuments('companions', { limitCount: 1 }),
      firestore.getDocuments('guideApplications', { where: [{ field: 'status', operator: '==', value: 'pending' }], limitCount: 1 }),
      firestore.getDocuments('guideApplications', { where: [{ field: 'kycStatus', operator: '==', value: 'pending' }], limitCount: 1 }),
      firestore.getDocuments('bookings', { limitCount: 1 }),
      firestore.getDocuments('bookings', { where: [{ field: 'status', operator: '==', value: 'confirmed' }], limitCount: 1 }),
      firestore.getDocuments('bookings', { where: [{ field: 'status', operator: '==', value: 'pending' }], limitCount: 1 }),
      firestore.getDocuments('bookings', { where: [{ field: 'status', operator: '==', value: 'completed' }], limitCount: 1 }),
      firestore.getDocuments('bookings', { where: [{ field: 'status', operator: '==', value: 'cancelled' }], limitCount: 1 }),
      firestore.getDocuments('reports', { limitCount: 1 }),
      firestore.getDocuments('reports', { where: [{ field: 'status', operator: '==', value: 'open' }], limitCount: 1 }),
      firestore.getDocuments('sosAlerts', { where: [{ field: 'status', operator: '!=', value: 'resolved' }], limitCount: 1 }),
      firestore.getDocuments('messages', { where: [{ field: 'timestamp', operator: '>=', value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }], limitCount: 1 }),
      firestore.getDocuments('messages', { where: [{ field: 'status', operator: '==', value: 'failed' }], limitCount: 1 }),
      firestore.getDocuments('community_posts', { where: [{ field: 'createdAt', operator: '>=', value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }], limitCount: 1 }),
      firestore.getDocuments('comments', { where: [{ field: 'createdAt', operator: '>=', value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }], limitCount: 1 }),
      firestore.getDocuments('likes', { where: [{ field: 'createdAt', operator: '>=', value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }], limitCount: 1 }),
    ]);

    return {
      totalUsers: usersSnapshot.length,
      activeUsers24h: activeUsersSnapshot.length,
      newUsers24h: newUsersSnapshot.length,
      activeCompanions: companionsSnapshot.filter((c: any) => c.isVerified).length,
      pendingCompanionApplications: pendingAppsSnapshot.length,
      pendingKYC: pendingKYCSnapshot.length,
      activeBookings: activeBookingsSnapshot.length,
      pendingBookings: pendingBookingsSnapshot.length,
      completedBookings24h: completedBookingsSnapshot.length,
      cancelledBookings24h: cancelledBookingsSnapshot.length,
      totalReports: reportsSnapshot.length,
      openReports: openReportsSnapshot.length,
      activeSOSIncidents: sosSnapshot.length,
      messagesSent24h: messagesSnapshot.length,
      messageDeliveryFailures24h: failedMessagesSnapshot.length,
      communityPosts24h: postsSnapshot.length,
      comments24h: commentsSnapshot.length,
      likes24h: likesSnapshot.length,
      storageUsageMB: 0,
      firebaseErrors24h: 0,
    };
  },

  async getBookingStats(): Promise<AggregatedBookingStats> {
    const allBookings = await firestore.getDocuments<{ status: string; totalPrice: number; createdAt: string; date: string }>('bookings', {
      limitCount: 500,
      orderByField: 'createdAt',
      orderDirection: 'desc',
    });

    const byStatus: Record<string, number> = {};
    let totalRevenue = 0;
    const byHour = new Map<string, number>();

    for (const booking of allBookings) {
      byStatus[booking.status] = (byStatus[booking.status] || 0) + 1;
      if (booking.status === 'completed') {
        totalRevenue += booking.totalPrice || 0;
      }
      const hour = new Date(booking.createdAt || booking.date).getHours();
      const key = `${hour}:00`;
      byHour.set(key, (byHour.get(key) || 0) + 1);
    }

    return {
      totalRevenue,
      averageBookingValue: allBookings.length > 0 ? totalRevenue / allBookings.filter((b) => b.status === 'completed').length : 0,
      cancellationRate: allBookings.length > 0 ? (byStatus['cancelled'] || 0) / allBookings.length : 0,
      completionRate: allBookings.length > 0 ? (byStatus['completed'] || 0) / allBookings.length : 0,
      byStatus,
      byHour: Array.from(byHour.entries()).map(([timestamp, value]) => ({ timestamp, value })),
    };
  },

  async getUserStats(): Promise<AggregatedUserStats> {
    const users = await firestore.getDocuments<{ createdAt: string; role: string; lastActive?: string }>('users', {
      limitCount: 500,
      orderByField: 'createdAt',
      orderDirection: 'desc',
    });

    const now = Date.now();
    const byDay = new Map<string, number>();
    const activeByRole: Record<string, number> = {};

    for (const user of users) {
      const day = new Date(user.createdAt).toISOString().split('T')[0];
      byDay.set(day, (byDay.get(day) || 0) + 1);
      activeByRole[user.role] = (activeByRole[user.role] || 0) + 1;
    }

    const registrationsByDay = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, value]) => ({ timestamp, value }));

    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const total = users.length;
    const retention7d = total > 0 ? users.filter((u) => new Date(u.lastActive || u.createdAt).getTime() >= sevenDaysAgo).length / total : 0;
    const retention30d = total > 0 ? users.filter((u) => new Date(u.lastActive || u.createdAt).getTime() >= thirtyDaysAgo).length / total : 0;

    return {
      totalRegistrations: total,
      registrationsByDay,
      retention7d,
      retention30d,
      activeByRole,
    };
  },

  async getContentStats(): Promise<AggregatedContentStats> {
    const [posts, comments, likes, stories, reports] = await Promise.all([
      firestore.getDocuments('community_posts', { limitCount: 1 }),
      firestore.getDocuments('comments', { limitCount: 1 }),
      firestore.getDocuments('likes', { limitCount: 1 }),
      firestore.getDocuments('stories', { limitCount: 1 }),
      firestore.getDocuments('reports', { limitCount: 1 }),
    ]);

    return {
      postsCount: posts.length,
      commentsCount: comments.length,
      likesCount: likes.length,
      storiesCount: stories.length,
      reportsCount: reports.length,
      engagementRate: posts.length > 0 ? (comments.length + likes.length) / posts.length : 0,
    };
  },
};
