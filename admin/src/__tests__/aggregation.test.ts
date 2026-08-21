import { describe, it, expect, vi } from 'vitest';
import { aggregationService } from '../services/aggregation';

describe('aggregationService', () => {
  it('should have platform metrics method', () => {
    expect(typeof aggregationService.getPlatformMetrics).toBe('function');
  });

  it('should have booking stats method', () => {
    expect(typeof aggregationService.getBookingStats).toBe('function');
  });

  it('should have user stats method', () => {
    expect(typeof aggregationService.getUserStats).toBe('function');
  });

  it('should have content stats method', () => {
    expect(typeof aggregationService.getContentStats).toBe('function');
  });

  it('should return valid platform metrics structure', async () => {
    const metrics = await aggregationService.getPlatformMetrics();
    expect(metrics).toHaveProperty('totalUsers');
    expect(metrics).toHaveProperty('activeUsers24h');
    expect(metrics).toHaveProperty('newUsers24h');
    expect(metrics).toHaveProperty('activeCompanions');
    expect(metrics).toHaveProperty('pendingCompanionApplications');
    expect(metrics).toHaveProperty('pendingKYC');
    expect(metrics).toHaveProperty('activeBookings');
    expect(metrics).toHaveProperty('pendingBookings');
    expect(metrics).toHaveProperty('completedBookings24h');
    expect(metrics).toHaveProperty('cancelledBookings24h');
    expect(metrics).toHaveProperty('totalReports');
    expect(metrics).toHaveProperty('openReports');
    expect(metrics).toHaveProperty('activeSOSIncidents');
    expect(metrics).toHaveProperty('messagesSent24h');
    expect(metrics).toHaveProperty('messageDeliveryFailures24h');
    expect(metrics).toHaveProperty('communityPosts24h');
    expect(metrics).toHaveProperty('comments24h');
    expect(metrics).toHaveProperty('likes24h');
    expect(metrics).toHaveProperty('storageUsageMB');
    expect(metrics).toHaveProperty('firebaseErrors24h');
  });

  it('should return valid booking stats structure', async () => {
    const stats = await aggregationService.getBookingStats();
    expect(stats).toHaveProperty('totalRevenue');
    expect(stats).toHaveProperty('averageBookingValue');
    expect(stats).toHaveProperty('cancellationRate');
    expect(stats).toHaveProperty('completionRate');
    expect(stats).toHaveProperty('byStatus');
    expect(stats).toHaveProperty('byHour');
  });

  it('should return valid user stats structure', async () => {
    const stats = await aggregationService.getUserStats();
    expect(stats).toHaveProperty('totalRegistrations');
    expect(stats).toHaveProperty('registrationsByDay');
    expect(stats).toHaveProperty('retention7d');
    expect(stats).toHaveProperty('retention30d');
    expect(stats).toHaveProperty('activeByRole');
  });

  it('should return valid content stats structure', async () => {
    const stats = await aggregationService.getContentStats();
    expect(stats).toHaveProperty('postsCount');
    expect(stats).toHaveProperty('commentsCount');
    expect(stats).toHaveProperty('likesCount');
    expect(stats).toHaveProperty('storiesCount');
    expect(stats).toHaveProperty('reportsCount');
    expect(stats).toHaveProperty('engagementRate');
  });
});
