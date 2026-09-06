import { firestore } from './firestore';
import { Booking, Companion } from '../types';
import { requireUid } from './identity';

export interface CompanionDashboardStats {
  totalCompletedBookingValue: number;
  pendingRequests: number;
  confirmedBookings: number;
  completedBookings: number;
  profileViews: number | null;
  averageRating: number;
  totalReviews: number;
}

export interface CompanionBookingRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
  userAvatar: string;
  date: string;
  time: string;
  duration: number;
  participants: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  specialRequests?: string;
  meetingPoint?: string;
  createdAt: string;
}

export const companionDashboardService = {
  async getStats(companionId: string): Promise<CompanionDashboardStats> {
    requireUid(companionId);
    const [bookings, companionDoc] = await Promise.all([
      firestore.getDocuments<Booking>('bookings', {
        where: [{ field: 'companionId', operator: '==', value: companionId }],
        limitCount: 100,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        throwOnError: true,
      }),
      firestore.getDocument<Companion>(`companions/${companionId}`, { throwOnError: true }),
    ]);

    const completedBookings = bookings.filter(b => b.status === 'completed');
    const totalCompletedBookingValue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    return {
      totalCompletedBookingValue,
      pendingRequests: bookings.filter(b => b.status === 'pending').length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
      completedBookings: completedBookings.length,
      profileViews: null, // No supported view-event/time-window measurement exists.
      averageRating: companionDoc?.rating || 0,
      totalReviews: companionDoc?.reviewsCount || 0,
    };
  },

  async getBookingRequests(companionId: string): Promise<CompanionBookingRequest[]> {
    requireUid(companionId);
    const bookings = await firestore.getDocuments<Booking>('bookings', {
      where: [{ field: 'companionId', operator: '==', value: companionId }],
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount: 50,
      throwOnError: true,
    });

    return bookings.map(b => ({
      id: b.id,
      userId: b.userId,
      userName: (b as Booking & { userNameAtBooking?: string }).userNameAtBooking || 'Traveler',
      userPhone: (b as Booking & { userPhoneAtBooking?: string }).userPhoneAtBooking,
      userEmail: (b as Booking & { userEmailAtBooking?: string }).userEmailAtBooking,
      userAvatar: '',
      date: b.date,
      time: b.time,
      duration: b.duration,
      participants: b.participants,
      totalPrice: b.totalPrice,
      status: b.status,
      specialRequests: b.specialRequests,
      meetingPoint: b.meetingPoint,
      createdAt: b.createdAt,
    }));
  },

  async updateAvailability(companionId: string, availableDays: string[]): Promise<void> {
    requireUid(companionId);
    await firestore.updateDocument(`companions/${companionId}`, {
      availableDays,
      updatedAt: new Date().toISOString(),
    });
  },
};
