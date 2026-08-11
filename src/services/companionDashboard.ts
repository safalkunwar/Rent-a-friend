import { firestore } from './firestore';
import { Booking } from '../types';

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
  userAvatar: string;
  date: string;
  time: string;
  duration: number;
  participants: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  specialRequests?: string;
  createdAt: string;
}

export const companionDashboardService = {
  async getStats(companionId: string): Promise<CompanionDashboardStats> {
    const bookings = await firestore.getDocuments<Booking>('bookings', {
      where: [{ field: 'companionId', operator: '==', value: companionId }],
      limitCount: 100,
    });

    const completedBookings = bookings.filter(b => b.status === 'completed');
    const totalEarnings = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    return {
      totalEarnings,
      pendingRequests: bookings.filter(b => b.status === 'pending').length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
      completedBookings: completedBookings.length,
      profileViews: 0,
      averageRating: 0,
      totalReviews: 0,
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
      userName: '',
      userAvatar: '',
      date: b.date,
      time: b.time,
      duration: b.duration,
      participants: b.participants,
      totalPrice: b.totalPrice,
      status: b.status,
      specialRequests: b.specialRequests,
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
