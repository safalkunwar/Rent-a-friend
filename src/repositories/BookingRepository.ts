import { firestore } from '../services/firestore';
import { BaseRepository } from './base';
import { OperationType } from '../services/firestore-errors';
import { Booking } from '../types';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

export class BookingRepository extends BaseRepository {
  async getBookings(userId: string): Promise<Booking[]> {
    return this.executeWithRetry(
      () => firestore.getDocuments<Booking>('bookings', {
        where: [{ field: 'userId', operator: '==', value: userId }],
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: 30
      }),
      OperationType.LIST,
      'bookings'
    );
  }

  async createBooking(booking: Booking): Promise<string> {
    const timestamp = new Date().toISOString();
    const newBooking = {
      ...booking,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    if (!db) {
      await firestore.setDocument(`bookings/${booking.id}`, newBooking as any);
      return booking.id;
    }

    // High Concurrency Slot Lock Key: prevents concurrent double-booking of companion on date
    const sanitizeDate = (booking.date || 'today').replace(/[^a-zA-Z0-9]/g, '_');
    const lockId = `lock_${booking.companionId}_${sanitizeDate}`;
    const lockRef = doc(db, 'booking_locks', lockId);
    const bookingRef = doc(db, 'bookings', booking.id);

    await this.executeWithRetry(
      async () => {
        await runTransaction(db!, async (transaction) => {
          const lockDoc = await transaction.get(lockRef);
          if (lockDoc.exists()) {
            const data = lockDoc.data();
            if (data.status === 'confirmed' || data.status === 'pending') {
              throw new Error('This slot/date is already reserved for this companion. Please select another date.');
            }
          }

          transaction.set(lockRef, {
            companionId: booking.companionId,
            date: booking.date,
            bookingId: booking.id,
            status: booking.status || 'pending',
            updatedAt: timestamp
          });

          transaction.set(bookingRef, newBooking);
        });
      },
      OperationType.CREATE,
      `bookings/${booking.id}`
    );

    return booking.id;
  }

  async updateBookingStatus(id: string, status: Booking['status']): Promise<void> {
    const timestamp = new Date().toISOString();
    
    if (db) {
      const bookingDoc = await firestore.getDocument<Booking>(`bookings/${id}`);
      if (bookingDoc) {
        const sanitizeDate = (bookingDoc.date || 'today').replace(/[^a-zA-Z0-9]/g, '_');
        const lockId = `lock_${bookingDoc.companionId}_${sanitizeDate}`;
        const lockRef = doc(db, 'booking_locks', lockId);
        
        await this.executeWithRetry(
          async () => {
            await runTransaction(db!, async (transaction) => {
              transaction.update(doc(db!, 'bookings', id), {
                status,
                updatedAt: timestamp
              });
              
              if (status === 'cancelled') {
                transaction.delete(lockRef);
              } else {
                transaction.set(lockRef, {
                  status,
                  updatedAt: timestamp
                }, { merge: true });
              }
            });
          },
          OperationType.UPDATE,
          `bookings/${id}`
        );
        return;
      }
    }

    await this.executeWithRetry(
      () => firestore.updateDocument(`bookings/${id}`, {
        status,
        updatedAt: timestamp
      }),
      OperationType.UPDATE,
      `bookings/${id}`
    );
  }
}

export const bookingRepository = new BookingRepository();
