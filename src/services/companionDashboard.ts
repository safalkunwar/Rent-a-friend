import { firestore } from './firestore';
import { Booking, Companion } from '../types';

export interface CompanionDashboardStats {
  totalEarnings: number;
  pendingRequests: number;
  confirmedBookings: number;
  completedBookings: number;
  profileViews: number;
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
    const [bookings, companionDoc] = await Promise.all([
      firestore.getDocuments<Booking>('bookings', {
        where: [{ field: 'companionId', operator: '==', value: companionId }],
        limitCount: 100,
      }),
      firestore.getDocument<Companion>(`companions/${companionId}`).catch(() => null),
    ]);

    const completedBookings = bookings.filter(b => b.status === 'completed');
    const totalEarnings = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    return {
      totalEarnings,
      pendingRequests: bookings.filter(b => b.status === 'pending').length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
      completedBookings: completedBookings.length,
      profileViews: companionDoc?.profileViews || 0,
      averageRating: companionDoc?.rating || 0,
      totalReviews: companionDoc?.reviewsCount || 0,
    };
  },

  async getBookingRequests(companionId: string): Promise<CompanionBookingRequest[]> {
    const bookings = await firestore.getDocuments<Booking>('bookings', {
      where: [{ field: 'companionId', operator: '==', value: companionId }],
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount: 50,
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
    await firestore.updateDocument(`companions/${companionId}`, {
      availableDays,
      updatedAt: new Date().toISOString(),
    });
  },
};
