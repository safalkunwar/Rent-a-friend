import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingService } from '../services/bookings';

// Unit boundaries: don't reload the real repository/Firestore SDK inside a
// timed assertion. Actual transactions have separate emulator coverage.
const dependencies = vi.hoisted(() => ({ getDocument: vi.fn(), updateBookingStatus: vi.fn() }));
vi.mock('../services/firestore', () => ({ firestore: { getDocument: dependencies.getDocument } }));
vi.mock('../repositories/BookingRepository', () => ({ bookingRepository: { updateBookingStatus: dependencies.updateBookingStatus } }));

beforeEach(() => {
  dependencies.getDocument.mockReset();
  dependencies.updateBookingStatus.mockReset().mockResolvedValue(undefined);
});

describe('booking service availability', () => {
  it('returns unavailable for a missing companion without reading a lock', async () => {
    dependencies.getDocument.mockResolvedValue(null);
    expect(await bookingService.checkCompanionAvailability('c1', '2025-01-01')).toEqual({ isAvailable: false, reason: 'Companion not found' });
    expect(dependencies.getDocument.mock.calls).toEqual([['companions/c1']]);
  });

  it('rejects a companion without available days', async () => {
    dependencies.getDocument.mockResolvedValue({ id: 'c1', availableDays: [] });
    expect(await bookingService.checkCompanionAvailability('c1', '2025-01-01')).toEqual({ isAvailable: false, reason: 'Companion has not set available days' });
  });

  it('rejects a day outside the listed availability', async () => {
    dependencies.getDocument.mockResolvedValue({ id: 'c1', availableDays: ['Monday', 'Tuesday'] });
    expect(await bookingService.checkCompanionAvailability('c1', '2025-01-01')).toEqual({ isAvailable: false, reason: 'Not available on Wednesdays' });
    expect(dependencies.getDocument).toHaveBeenCalledTimes(1);
  });

  it('rejects an existing reservation using the exact companion/day lock', async () => {
    dependencies.getDocument.mockResolvedValueOnce({ availableDays: ['Wednesday'] }).mockResolvedValueOnce({ status: 'confirmed' });
    expect(await bookingService.checkCompanionAvailability('c1', '2025-01-01')).toEqual({ isAvailable: false, reason: 'This date is already reserved' });
    expect(dependencies.getDocument.mock.calls).toEqual([['companions/c1'], ['booking_locks/lock_c1_2025_01_01']]);
  });

  it.each([null, { status: 'cancelled' }])('allows a listed day with an absent or cancelled lock: %j', async lock => {
    dependencies.getDocument.mockResolvedValueOnce({ availableDays: ['Wednesday'] }).mockResolvedValueOnce(lock);
    expect(await bookingService.checkCompanionAvailability('c1', '2025-01-01')).toEqual({ isAvailable: true });
    expect(dependencies.updateBookingStatus).not.toHaveBeenCalled();
  });

  it('fails closed when the availability read rejects', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      dependencies.getDocument.mockRejectedValue(new Error('unavailable'));
      expect(await bookingService.checkCompanionAvailability('c1', '2025-01-01')).toEqual({ isAvailable: false, reason: 'Could not verify availability' });
    } finally { log.mockRestore(); }
  });
});

describe('booking service commands', () => {
  it('rejects acceptance of a missing booking without a transition', async () => {
    dependencies.getDocument.mockResolvedValue(null);
    expect(await bookingService.acceptBooking('b1')).toEqual({ success: false, message: 'Booking not found' });
    expect(dependencies.updateBookingStatus).not.toHaveBeenCalled();
  });

  it('rejects declining a non-pending booking without a transition', async () => {
    dependencies.getDocument.mockResolvedValue({ id: 'b1', status: 'confirmed', policyVersion: 2 });
    expect(await bookingService.declineBooking('b1')).toEqual({ success: false, message: 'Booking is already confirmed' });
    expect(dependencies.updateBookingStatus).not.toHaveBeenCalled();
  });

  it.each([['acceptBooking', 'confirmed'], ['declineBooking', 'cancelled']] as const)('%s delegates pending transitions to the canonical repository', async (method, status) => {
    dependencies.getDocument.mockResolvedValue({ id: 'b1', status: 'pending', policyVersion: 2 });
    const result = await bookingService[method]('b1');
    expect(dependencies.getDocument).toHaveBeenCalledWith('bookings/b1');
    expect(dependencies.updateBookingStatus).toHaveBeenCalledTimes(1);
    expect(dependencies.updateBookingStatus).toHaveBeenCalledWith('b1', status);
    expect(result).toMatchObject({ success: true, bookingId: 'b1' });
  });

  it('does not report success when the canonical transition rejects', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      dependencies.getDocument.mockResolvedValue({ id: 'b1', status: 'pending', policyVersion: 2 });
      dependencies.updateBookingStatus.mockRejectedValue(new Error('permission-denied'));
      expect(await bookingService.acceptBooking('b1')).toEqual({ success: false, message: 'Failed to accept booking' });
    } finally { log.mockRestore(); }
  });

  it.each(['acceptBooking', 'declineBooking'] as const)('%s explains that a legacy booking is read-only', async method => {
    dependencies.getDocument.mockResolvedValue({ id: 'legacy', status: 'pending' });
    expect(await bookingService[method]('legacy')).toEqual({ success: false, message: 'Earlier booking is view-only while records are reviewed.' });
    expect(dependencies.updateBookingStatus).not.toHaveBeenCalled();
  });
});
