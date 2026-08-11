import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bookingService } from '../services/bookings';
import { messagingService } from '../services/messaging';
import { mapsService } from '../services/maps';
import { companionDashboardService } from '../services/companionDashboard';
import { offlineMessageService } from '../services/offlineMessages';
import { locationTrackingService } from '../services/locationTracking';
import { reviewService } from '../services/reviews';
import { searchService } from '../services/search';

describe('booking service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('checkCompanionAvailability returns false when companion not found', async () => {
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocument: vi.fn().mockResolvedValue(null),
      },
    }));
    const { bookingService } = await import('../services/bookings');
    const result = await bookingService.checkCompanionAvailability('c1', '2025-01-01');
    expect(result.isAvailable).toBe(false);
    expect(result.reason).toBe('Companion not found');
  });

  it('checkCompanionAvailability returns false when no availableDays set', async () => {
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocument: vi.fn().mockResolvedValue({ id: 'c1', availableDays: [] }),
      },
    }));
    const { bookingService } = await import('../services/bookings');
    const result = await bookingService.checkCompanionAvailability('c1', '2025-01-01');
    expect(result.isAvailable).toBe(false);
    expect(result.reason).toBe('Companion has not set available days');
  });

  it('checkCompanionAvailability returns false on wrong day', async () => {
    const companion = { id: 'c1', availableDays: ['Monday', 'Tuesday'] };
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocument: vi.fn().mockResolvedValue(companion),
      },
    }));
    const { bookingService } = await import('../services/bookings');
    const result = await bookingService.checkCompanionAvailability('c1', '2025-01-01');
    expect(result.isAvailable).toBe(false);
    expect(result.reason).toContain('Not available on');
  });

  it('acceptBooking returns failure when booking not found', async () => {
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocument: vi.fn().mockResolvedValue(null),
      },
    }));
    const { bookingService } = await import('../services/bookings');
    const result = await bookingService.acceptBooking('b1');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Booking not found');
  });

  it('declineBooking returns failure when booking not pending', async () => {
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocument: vi.fn().mockResolvedValue({ id: 'b1', status: 'confirmed' }),
      },
    }));
    const { bookingService } = await import('../services/bookings');
    const result = await bookingService.declineBooking('b1');
    expect(result.success).toBe(false);
    expect(result.message).toContain('already confirmed');
  });
});

describe('messaging service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('sendMessage stores message and updates conversation', async () => {
    const setDocument = vi.fn();
    const updateDocument = vi.fn();
    vi.doMock('../services/firestore', () => ({
      firestore: {
        setDocument,
        updateDocument,
      },
    }));
    const { messagingService } = await import('../services/messaging');
    const msgId = await messagingService.sendMessage('convo1', 'user1', 'Hello');
    expect(msgId).toMatch(/^msg-\d+$/);
    expect(setDocument).toHaveBeenCalledTimes(1);
    expect(updateDocument).toHaveBeenCalledTimes(1);
  });

  it('createConversation creates idempotent conversation', async () => {
    const setDocument = vi.fn();
    vi.doMock('../services/firestore', () => ({
      firestore: {
        setDocument,
      },
    }));
    const { messagingService } = await import('../services/messaging');
    const convoId = await messagingService.createConversation(['u2', 'u1']);
    expect(convoId).toBe('u1_u2');
    expect(setDocument).toHaveBeenCalledWith(
      'conversations/u1_u2',
      expect.objectContaining({
        id: 'u1_u2',
        participantIds: ['u1', 'u2'],
        unreadCount: 0,
      }),
      true
    );
  });
});

describe('maps service', () => {
  it('calculates distance between two points', () => {
    const from = { lat: 27.7172, lng: 85.324 };
    const to = { lat: 27.7172, lng: 85.325 };
    const distance = mapsService.calculateDistance(from, to);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1);
  });

  it('returns 0 for same point', () => {
    const point = { lat: 27.7172, lng: 85.324 };
    expect(mapsService.calculateDistance(point, point)).toBe(0);
  });

  it('formats distance in meters for short distances', () => {
    expect(mapsService.formatDistance(0.5)).toBe('500 m');
  });

  it('formats distance in km for long distances', () => {
    expect(mapsService.formatDistance(5.25)).toBe('5.3 km');
  });

  it('formats duration in minutes', () => {
    expect(mapsService.formatDuration(30)).toBe('30 min');
  });

  it('formats duration in hours', () => {
    expect(mapsService.formatDuration(90)).toBe('1h 30m');
  });

  it('estimates walking duration correctly', () => {
    expect(mapsService.estimateWalkingDuration(5)).toBe(60);
  });

  it('estimates driving duration correctly', () => {
    expect(mapsService.estimateDrivingDuration(25)).toBe(60);
  });

  it('detects within radius', () => {
    const center = { lat: 27.7172, lng: 85.324 };
    const near = { lat: 27.7172, lng: 85.325 };
    expect(mapsService.isWithinRadius(center, near, 1)).toBe(true);
  });

  it('detects outside radius', () => {
    const center = { lat: 27.7172, lng: 85.324 };
    const far = { lat: 27.8, lng: 85.4 };
    expect(mapsService.isWithinRadius(center, far, 1)).toBe(false);
  });
});

describe('companion dashboard service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getStats calculates earnings from completed bookings', async () => {
    const bookings = [
      { id: 'b1', status: 'completed', totalPrice: 1000, companionId: 'c1' },
      { id: 'b2', status: 'completed', totalPrice: 2000, companionId: 'c1' },
      { id: 'b3', status: 'pending', totalPrice: 500, companionId: 'c1' },
    ];
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocuments: vi.fn().mockResolvedValue(bookings),
      },
    }));
    const { companionDashboardService } = await import('../services/companionDashboard');
    const stats = await companionDashboardService.getStats('c1');
    expect(stats.totalEarnings).toBe(3000);
    expect(stats.pendingRequests).toBe(1);
    expect(stats.completedBookings).toBe(2);
  });

  it('getBookingRequests returns mapped booking data', async () => {
    const bookings = [
      { id: 'b1', userId: 'u1', date: '2025-01-01', time: '10:00', duration: 2, participants: 1, totalPrice: 1000, status: 'pending', specialRequests: 'Near mall', createdAt: '2025-01-01T08:00:00Z' },
    ];
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocuments: vi.fn().mockResolvedValue(bookings),
      },
    }));
    const { companionDashboardService } = await import('../services/companionDashboard');
    const requests = await companionDashboardService.getBookingRequests('c1');
    expect(requests).toHaveLength(1);
    expect(requests[0].userName).toBe('');
    expect(requests[0].specialRequests).toBe('Near mall');
  });
});

describe('offline message service', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('enqueues and retrieves messages', async () => {
    vi.doMock('../services/firestore', () => ({
      firestore: {},
    }));
    const { offlineMessageService } = await import('../services/offlineMessages');
    await offlineMessageService.enqueue({
      conversationId: 'c1',
      senderId: 'u1',
      text: 'Hello',
      timestamp: new Date().toISOString(),
    });
    const queue = await offlineMessageService.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].text).toBe('Hello');
    expect(queue[0].retries).toBe(0);
  });

  it('returns 0 for empty queue', async () => {
    const { offlineMessageService } = await import('../services/offlineMessages');
    const length = await offlineMessageService.getQueueLength();
    expect(length).toBe(0);
  });

  it('clears queue', async () => {
    vi.doMock('../services/firestore', () => ({
      firestore: {},
    }));
    const { offlineMessageService } = await import('../services/offlineMessages');
    await offlineMessageService.enqueue({
      conversationId: 'c1',
      senderId: 'u1',
      text: 'Hello',
      timestamp: new Date().toISOString(),
    });
    await offlineMessageService.clearQueue();
    const queue = await offlineMessageService.getQueue();
    expect(queue).toHaveLength(0);
  });
});

describe('location tracking service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('startTracking creates a session', async () => {
    const setDocument = vi.fn();
    vi.doMock('../services/firestore', () => ({
      firestore: {
        setDocument,
      },
    }));
    const { locationTrackingService } = await import('../services/locationTracking');
    await locationTrackingService.startTracking('b1', 'c1', 'u1');
    expect(setDocument).toHaveBeenCalledWith(
      'booking_locations/b1',
      expect.objectContaining({
        bookingId: 'b1',
        companionId: 'c1',
        userId: 'u1',
        status: 'active',
      })
    );
  });

  it('stopTracking updates session to ended', async () => {
    const updateDocument = vi.fn();
    vi.doMock('../services/firestore', () => ({
      firestore: {
        updateDocument,
      },
    }));
    const { locationTrackingService } = await import('../services/locationTracking');
    await locationTrackingService.stopTracking('b1');
    expect(updateDocument).toHaveBeenCalledWith(
      'booking_locations/b1',
      expect.objectContaining({
        status: 'ended',
      })
    );
  });
});

describe('review service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('addReviewToCompanion returns review id', async () => {
    const updateDocument = vi.fn();
    const getDocument = vi.fn().mockResolvedValue({ reviews: [] });

    vi.doMock('../services/firestore', () => ({
      firestore: {
        updateDocument,
        getDocument,
      },
    }));

    const { reviewService } = await import('../services/reviews');
    const id = await reviewService.addReviewToCompanion('c1', {
      authorName: 'User',
      rating: 5,
      text: 'Great!',
    });

    expect(id).toMatch(/^review-\d+$/);
    expect(updateDocument).toHaveBeenCalledTimes(2);
  });

  it('getReviewStats returns empty stats for companion with no reviews', async () => {
    const getDocument = vi.fn().mockResolvedValue({ reviews: [] });
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocument,
      },
    }));
    const { reviewService } = await import('../services/reviews');
    const stats = await reviewService.getReviewStats('c1');
    expect(stats.totalReviews).toBe(0);
    expect(stats.averageRating).toBe(0);
  });

  it('recalculateCompanionRating updates companion document', async () => {
    const getDocument = vi.fn().mockResolvedValue({
      reviews: [
        { rating: 5 },
        { rating: 3 },
      ],
    });
    const updateDocument = vi.fn();
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocument,
        updateDocument,
      },
    }));
    const { reviewService } = await import('../services/reviews');
    await reviewService.recalculateCompanionRating('c1');
    expect(updateDocument).toHaveBeenCalledWith(
      'companions/c1',
      expect.objectContaining({
        rating: 4,
        reviewsCount: 2,
      })
    );
  });
});

describe('search service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('searchCompanions filters by query and location', async () => {
    const companions = [
      { id: 'c1', name: 'Aarav', location: 'Kathmandu', languages: ['English'], interests: ['hiking'], hourlyRate: 500 },
      { id: 'c2', name: 'Priya', location: 'Pokhara', languages: ['Nepali'], interests: ['food'], hourlyRate: 400 },
    ];
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocuments: vi.fn().mockResolvedValue(companions),
      },
    }));
    const { searchService } = await import('../services/search');
    const result = await searchService.searchCompanions('Aarav', { location: 'Kathmandu' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Aarav');
  });

  it('searchActivities filters by category', async () => {
    const activities = [
      { id: 'a1', title: 'Hiking', location: 'Kathmandu', category: 'outdoor', avgPrice: 1000 },
      { id: 'a2', title: 'Cooking', location: 'Kathmandu', category: 'food', avgPrice: 800 },
    ];
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocuments: vi.fn().mockImplementation((_collection: string, options: any) => {
          const where = options?.where || [];
          const categoryFilter = where.find((w: any) => w.field === 'category');
          if (categoryFilter) {
            return Promise.resolve(activities.filter((a: any) => a.category === categoryFilter.value));
          }
          return Promise.resolve(activities);
        }),
      },
    }));
    const { searchService } = await import('../services/search');
    const result = await searchService.searchActivities('', { category: 'food' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Cooking');
  });

  it('searchEvents filters by date range', async () => {
    const events = [
      { id: 'e1', title: 'Festival', location: 'Kathmandu', date: '2025-01-01' },
      { id: 'e2', title: 'Concert', location: 'Kathmandu', date: '2025-02-01' },
    ];
    vi.doMock('../services/firestore', () => ({
      firestore: {
        getDocuments: vi.fn().mockImplementation((_collection: string, options: any) => {
          const where = options?.where || [];
          const dateFrom = where.find((w: any) => w.field === 'date' && w.operator === '>=')?.value;
          const dateTo = where.find((w: any) => w.field === 'date' && w.operator === '<=')?.value;
          if (dateFrom || dateTo) {
            return Promise.resolve(events.filter((e: any) => {
              if (dateFrom && e.date < dateFrom) return false;
              if (dateTo && e.date > dateTo) return false;
              return true;
            }));
          }
          return Promise.resolve(events);
        }),
      },
    }));
    const { searchService } = await import('../services/search');
    const result = await searchService.searchEvents('', { dateFrom: '2025-01-15', dateTo: '2025-01-31' });
    expect(result.items).toHaveLength(0);
  });
});
