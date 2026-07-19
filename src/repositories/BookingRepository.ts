import { firestore } from '../services/firestore';
import { BaseRepository } from './base';
import { OperationType } from '../services/firestore-errors';
import { Booking } from '../types';

export class BookingRepository extends BaseRepository {
  async getBookings(userId: string): Promise<Booking[]> {
    return this.executeWithRetry(
      () => firestore.getDocuments<Booking>('bookings', {
        where: [{ field: 'userId', operator: '==', value: userId }],
        orderByField: 'createdAt',
        orderDirection: 'desc'
      }),
      OperationType.LIST,
      'bookings'
    );
  }

  async createBooking(booking: Booking): Promise<string> {
    const timestamp = new Date().toISOString();
    await this.executeWithRetry(
      () => firestore.setDocument(`bookings/${booking.id}`, {
        ...booking,
        createdAt: timestamp,
        updatedAt: timestamp
      }),
      OperationType.CREATE,
      `bookings/${booking.id}`
    );
    return booking.id;
  }

  async updateBookingStatus(id: string, status: Booking['status']): Promise<void> {
    await this.executeWithRetry(
      () => firestore.updateDocument(`bookings/${id}`, {
        status,
        updatedAt: new Date().toISOString()
      }),
      OperationType.UPDATE,
      `bookings/${id}`
    );
  }
}

export const bookingRepository = new BookingRepository();
