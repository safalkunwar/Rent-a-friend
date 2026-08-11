import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bookingService } from '../services/bookings';
import { messagingService } from '../services/messaging';
import { mapsService } from '../services/maps';

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
