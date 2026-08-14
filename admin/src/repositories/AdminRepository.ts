import { firestore } from '../services/firestore';
import { auditService } from '../services/audit';
import { adminService, type AdminRole } from '../services/admin';
import { AdminUserRow, AdminBookingRow, AdminReportRow, AdminCompanionRow, AdminNotificationRow, AdminContentRow, AdminPostRow, AdminCommentRow, AdminGuideApplication } from '../types';

export class AdminRepository {
  async listUsers(limitCount = 20, startAfter?: unknown[]) {
    const result = await firestore.getDocumentsPaginated<AdminUserRow>('users', { limitCount, startAfter, orderByField: 'name', orderDirection: 'asc' });
    return result;
  }

  async updateUserRole(userId: string, role: string) {
    await firestore.updateDocument(`users/${userId}`, { role });
    await auditService.log({
      action: 'update_user_role',
      actorId: 'admin',
      actorName: 'Admin',
      targetType: 'user',
      targetId: userId,
      details: { role },
    });
  }

  async bulkUpdateUserRole(userIds: string[], role: string) {
    await Promise.all(userIds.map(id => firestore.updateDocument(`users/${id}`, { role })));
    await auditService.log({
      action: 'bulk_update_user_role',
      actorId: 'admin',
      actorName: 'Admin',
      targetType: 'user',
      details: { role, count: userIds.length },
    });
  }

  async listBookings(limitCount = 20, startAfter?: unknown[]) {
    const result = await firestore.getDocumentsPaginated<AdminBookingRow>('bookings', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
      startAfter,
    });
    return result;
  }

  async updateBookingStatus(bookingId: string, status: string) {
    await firestore.updateDocument(`bookings/${bookingId}`, { status, updatedAt: new Date().toISOString() });
  }

  async listReports(limitCount = 100) {
    return firestore.getDocuments<AdminReportRow>('reports', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async updateReportStatus(reportId: string, status: string) {
    await firestore.updateDocument(`reports/${reportId}`, { status, updatedAt: new Date().toISOString() });
  }

  async listSOSAlerts(limitCount = 100) {
    return firestore.getDocuments<any>('sosAlerts', {
      orderByField: 'timestamp',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async updateSOSStatus(sosId: string, status: string) {
    await firestore.updateDocument(`sosAlerts/${sosId}`, { status, updatedAt: new Date().toISOString() });
  }

  async assignSOSAlert(sosId: string, assigneeId: string) {
    await firestore.updateDocument(`sosAlerts/${sosId}`, { assigneeId, updatedAt: new Date().toISOString() });
  }

  async updateSOSPriority(sosId: string, priority: string) {
    await firestore.updateDocument(`sosAlerts/${sosId}`, { priority, updatedAt: new Date().toISOString() });
  }

  async listSuspiciousActivity(limitCount = 100) {
    return firestore.getDocuments<any>('suspiciousActivity', {
      orderByField: 'date',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async updateSuspiciousActivityStatus(id: string, status: string) {
    await firestore.updateDocument(`suspiciousActivity/${id}`, { status, updatedAt: new Date().toISOString() });
  }

  async listGuideApplications(limitCount = 100) {
    return firestore.getDocuments<any>('guideApplications', {
      orderByField: 'appliedDate',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async approveGuideApplication(applicationId: string, companionId?: string) {
    if (companionId) {
      await firestore.updateDocument(`companions/${companionId}`, { isVerified: true, updatedAt: new Date().toISOString() });
    }
    await firestore.updateDocument(`guideApplications/${applicationId}`, { status: 'approved', updatedAt: new Date().toISOString() });
    await auditService.log({
      action: 'approve_guide',
      actorId: 'admin',
      actorName: 'Admin',
      targetType: 'guideApplication',
      targetId: applicationId,
      details: { companionId },
    });
  }

  async rejectGuideApplication(applicationId: string) {
    await firestore.updateDocument(`guideApplications/${applicationId}`, { status: 'rejected', updatedAt: new Date().toISOString() });
    await auditService.log({
      action: 'reject_guide',
      actorId: 'admin',
      actorName: 'Admin',
      targetType: 'guideApplication',
      targetId: applicationId,
      details: {},
    });
  }

  async listCompanions(limitCount = 100) {
    return firestore.getDocuments<any>('companions', { limitCount });
  }

  async toggleCompanionVerification(companionId: string, isVerified: boolean) {
    await firestore.updateDocument(`companions/${companionId}`, { isVerified: !isVerified });
  }

  async listCommunityPosts(limitCount = 100) {
    return firestore.getDocuments<any>('community_posts', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async removeCommunityPost(postId: string) {
    await firestore.deleteDocument(`community_posts/${postId}`);
    await auditService.log({
      action: 'remove_post',
      actorId: 'admin',
      actorName: 'Admin',
      targetType: 'content',
      targetId: postId,
      details: {},
    });
  }

  async listComments(limitCount = 100) {
    return firestore.getDocuments<any>('comments', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async removeComment(commentId: string) {
    await firestore.deleteDocument(`comments/${commentId}`);
    await auditService.log({
      action: 'remove_comment',
      actorId: 'admin',
      actorName: 'Admin',
      targetType: 'comment',
      targetId: commentId,
      details: {},
    });
  }

  async listActivities(limitCount = 100) {
    return firestore.getDocuments<any>('activities', { limitCount });
  }

  async listEvents(limitCount = 100) {
    return firestore.getDocuments<any>('events', { limitCount });
  }

  async deleteContentItem(collection: string, id: string) {
    await firestore.deleteDocument(`${collection}/${id}`);
  }

  async listNotifications(limitCount = 100) {
    return firestore.getDocuments<any>('notifications', {
      orderByField: 'timestamp',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async markNotificationRead(notificationId: string) {
    await firestore.updateDocument(`notifications/${notificationId}`, { isRead: true });
  }

  async listFeedback(limitCount = 20, startAfter?: unknown[]) {
    const result = await firestore.getDocumentsPaginated<any>('feedback', {
      orderByField: 'date',
      orderDirection: 'desc',
      limitCount,
      startAfter,
    });
    return result;
  }

  async updateFeedbackStatus(feedbackId: string, status: string) {
    await firestore.updateDocument(`feedback/${feedbackId}`, { status, updatedAt: new Date().toISOString() });
  }

  async updateDocument(path: string, data: Record<string, unknown>) {
    await firestore.updateDocument(path, data);
  }

  async setAdminRole(uid: string, role: AdminRole) {
    await adminService.setUserRole(uid, role);
  }

  async listAdmins() {
    return adminService.listAdmins();
  }

  async removeAdmin(uid: string) {
    await adminService.removeAdmin(uid);
  }

  async listStories(limitCount = 100) {
    return firestore.getDocuments<any>('stories', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async updateStory(storyId: string, data: Record<string, unknown>) {
    await firestore.updateDocument(`stories/${storyId}`, { ...data, updatedAt: new Date().toISOString() });
  }

  async deleteStory(storyId: string) {
    await firestore.deleteDocument(`stories/${storyId}`);
  }

  async listPayments(limitCount = 100) {
    return firestore.getDocuments<any>('payments', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async updatePaymentStatus(paymentId: string, status: string) {
    await firestore.updateDocument(`payments/${paymentId}`, { status, updatedAt: new Date().toISOString() });
  }

  async listMessages(limitCount = 100) {
    return firestore.getDocuments<any>('messages', {
      orderByField: 'timestamp',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async listConversations(limitCount = 100) {
    return firestore.getDocuments<any>('conversations', {
      orderByField: 'updatedAt',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async listSupportTickets(limitCount = 100) {
    return firestore.getDocuments<any>('support_tickets', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async updateSupportTicketStatus(ticketId: string, status: string) {
    await firestore.updateDocument(`support_tickets/${ticketId}`, { status, updatedAt: new Date().toISOString() });
  }

  async listPartners(limitCount = 100) {
    return firestore.getDocuments<any>('partners', { limitCount });
  }

  async deletePartner(partnerId: string) {
    await firestore.deleteDocument(`partners/${partnerId}`);
  }

  async listCities(limitCount = 100) {
    return firestore.getDocuments<any>('cities', { limitCount });
  }

  async createCity(data: Record<string, unknown>) {
    return firestore.setDocument(`cities/${data.id}`, data);
  }

  async updateCity(cityId: string, data: Record<string, unknown>) {
    return firestore.updateDocument(`cities/${cityId}`, data);
  }

  async deleteCity(cityId: string) {
    return firestore.deleteDocument(`cities/${cityId}`);
  }

  async listHotels(limitCount = 100) {
    return firestore.getDocuments<any>('hotels', { limitCount });
  }

  async createHotel(data: Record<string, unknown>) {
    return firestore.setDocument(`hotels/${data.id}`, data);
  }

  async updateHotel(hotelId: string, data: Record<string, unknown>) {
    return firestore.updateDocument(`hotels/${hotelId}`, data);
  }

  async deleteHotel(hotelId: string) {
    return firestore.deleteDocument(`hotels/${hotelId}`);
  }

  async listRestaurants(limitCount = 100) {
    return firestore.getDocuments<any>('restaurants', { limitCount });
  }

  async createRestaurant(data: Record<string, unknown>) {
    return firestore.setDocument(`restaurants/${data.id}`, data);
  }

  async updateRestaurant(restaurantId: string, data: Record<string, unknown>) {
    return firestore.updateDocument(`restaurants/${restaurantId}`, data);
  }

  async deleteRestaurant(restaurantId: string) {
    return firestore.deleteDocument(`restaurants/${restaurantId}`);
  }

  async listCafes(limitCount = 100) {
    return firestore.getDocuments<any>('cafes', { limitCount });
  }

  async createCafe(data: Record<string, unknown>) {
    return firestore.setDocument(`cafes/${data.id}`, data);
  }

  async updateCafe(cafeId: string, data: Record<string, unknown>) {
    return firestore.updateDocument(`cafes/${cafeId}`, data);
  }

  async deleteCafe(cafeId: string) {
    return firestore.deleteDocument(`cafes/${cafeId}`);
  }

  async listLikes(limitCount = 100) {
    return firestore.getDocuments<any>('likes', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async listStoryLikes(limitCount = 100) {
    return firestore.getDocuments<any>('story_likes', {
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  }

  async getAggregatedStats() {
    const [
      usersCount,
      companionsCount,
      bookingsCount,
      postsCount,
      commentsCount,
      likesCount,
      storyLikesCount,
      storiesCount,
      sosAlertsCount,
      reportsCount,
      paymentsCompleted,
      paymentsPending,
    ] = await Promise.all([
      firestore.getDocuments<any>('users', { limitCount: 1 }),
      firestore.getDocuments<any>('companions', { limitCount: 1 }),
      firestore.getDocuments<any>('bookings', { limitCount: 1 }),
      firestore.getDocuments<any>('community_posts', { limitCount: 1 }),
      firestore.getDocuments<any>('comments', { limitCount: 1 }),
      firestore.getDocuments<any>('likes', { limitCount: 1 }),
      firestore.getDocuments<any>('story_likes', { limitCount: 1 }),
      firestore.getDocuments<any>('stories', { limitCount: 1 }),
      firestore.getDocuments<any>('sosAlerts', { limitCount: 1 }),
      firestore.getDocuments<any>('reports', { limitCount: 1 }),
      firestore.getDocuments<any>('payments', { where: [{ field: 'status', operator: '==', value: 'completed' }], limitCount: 1 }),
      firestore.getDocuments<any>('payments', { where: [{ field: 'status', operator: '==', value: 'pending' }], limitCount: 1 }),
    ]);

    return {
      users: usersCount.length,
      companions: companionsCount.length,
      bookings: bookingsCount.length,
      posts: postsCount.length,
      comments: commentsCount.length,
      likes: likesCount.length,
      storyLikes: storyLikesCount.length,
      stories: storiesCount.length,
      sosAlerts: sosAlertsCount.length,
      reports: reportsCount.length,
      paymentsCompleted: paymentsCompleted.length,
      paymentsPending: paymentsPending.length,
    };
  }
}

export const adminRepository = new AdminRepository();
