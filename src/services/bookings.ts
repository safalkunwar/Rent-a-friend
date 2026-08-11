import { firestore } from './firestore';
import { Companion } from '../types';

export interface AvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
}

export interface BookingActionResult {
  success: boolean;
  message: string;
  bookingId?: string;
}

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const bookingService = {
  async checkCompanionAvailability(companionId: string, date: string): Promise<AvailabilityCheck> {
    try {
      const companion = await firestore.getDocument<Companion>(`companions/${companionId}`);
      if (!companion) {
        return { isAvailable: false, reason: 'Companion not found' };
      }

      if (!companion.availableDays || companion.availableDays.length === 0) {
        return { isAvailable: false, reason: 'Companion has not set available days' };
      }

      const dateObj = new Date(date);
      const dayName = DAY_ORDER[dateObj.getDay()];

      if (!companion.availableDays.includes(dayName)) {
        return { isAvailable: false, reason: `Not available on ${dayName}s` };
      }

      const lockId = `lock_${companionId}_${date.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const lockDoc = await firestore.getDocument<any>(`booking_locks/${lockId}`);

      if (lockDoc && (lockDoc.status === 'confirmed' || lockDoc.status === 'pending')) {
        return { isAvailable: false, reason: 'This date is already reserved' };
      }

      return { isAvailable: true };
    } catch (error) {
      console.error('[SATHI] Availability check failed:', error);
      return { isAvailable: false, reason: 'Could not verify availability' };
    }
  },

  async getCompanionBookings(companionId: string, limitCount = 50) {
    return firestore.getDocuments<any>('bookings', {
      where: [{ field: 'companionId', operator: '==', value: companionId }],
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });
  },

  async acceptBooking(bookingId: string): Promise<BookingActionResult> {
    try {
      const booking = await firestore.getDocument<any>(`bookings/${bookingId}`);
      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      if (booking.status !== 'pending') {
        return { success: false, message: `Booking is already ${booking.status}` };
      }

      const timestamp = new Date().toISOString();
      const sanitizeDate = (booking.date || 'today').replace(/[^a-zA-Z0-9]/g, '_');
      const lockId = `lock_${booking.companionId}_${sanitizeDate}`;

      await firestore.updateDocument(`bookings/${bookingId}`, {
        status: 'confirmed',
        updatedAt: timestamp,
      });

      await firestore.setDocument(`booking_locks/${lockId}`, {
        companionId: booking.companionId,
        date: booking.date,
        bookingId,
        status: 'confirmed',
        updatedAt: timestamp,
      }, true);

      return { success: true, message: 'Booking accepted', bookingId };
    } catch (error) {
      console.error('[SATHI] Accept booking failed:', error);
      return { success: false, message: 'Failed to accept booking' };
    }
  },

  async declineBooking(bookingId: string): Promise<BookingActionResult> {
    try {
      const booking = await firestore.getDocument<any>(`bookings/${bookingId}`);
      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      if (booking.status !== 'pending') {
        return { success: false, message: `Booking is already ${booking.status}` };
      }

      const timestamp = new Date().toISOString();
      const sanitizeDate = (booking.date || 'today').replace(/[^a-zA-Z0-9]/g, '_');
      const lockId = `lock_${booking.companionId}_${sanitizeDate}`;

      await firestore.updateDocument(`bookings/${bookingId}`, {
        status: 'cancelled',
        updatedAt: timestamp,
      });

      await firestore.deleteDocument(`booking_locks/${lockId}`);

      return { success: true, message: 'Booking declined', bookingId };
    } catch (error) {
      console.error('[SATHI] Decline booking failed:', error);
      return { success: false, message: 'Failed to decline booking' };
    }
  },
};
