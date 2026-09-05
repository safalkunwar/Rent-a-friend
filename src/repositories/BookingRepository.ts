import { firestore } from '../services/firestore';
import { BaseRepository } from './base';
import { Booking } from '../types';
import { db } from '../firebase';
import { requireUid } from '../services/identity';
import { reserveBooking, transitionBooking } from '../services/bookingTransactions';

export class BookingRepository extends BaseRepository {
  async getBookings(userId: string): Promise<Booking[]> {
    requireUid(userId);
    return firestore.getDocuments<Booking>('bookings', { where: [{ field: 'userId', operator: '==', value: userId }], orderByField: 'createdAt', orderDirection: 'desc', limitCount: 30 });
  }
  async getBookingById(id: string): Promise<Booking | null> {
    requireUid();
    return firestore.getDocument<Booking>(`bookings/${id}`);
  }
  async createBooking(booking: Booking): Promise<string> {
    const uid = requireUid(booking.userId);
    if (!db) throw new Error('Booking service is unavailable.');
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('Bookings require an online connection. No reservation has been created.');
    return reserveBooking(db,uid,booking);
  }
  async updateBookingStatus(id: string, status: Booking['status']): Promise<void> {
    const uid = requireUid();
    if (!db) throw new Error('Booking service is unavailable.');
    return transitionBooking(db,uid,id,status);
  }
}
export const bookingRepository = new BookingRepository();
