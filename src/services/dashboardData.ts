import type { Booking, Companion } from '../types';

/** Loaded records only; booking value must never be labelled settled spend. */
export function selectCustomerDashboard(uid: string | undefined, bookings: Booking[], companions: Companion[], favorites: string[]) {
  const myBookings = uid ? bookings.filter(booking => booking.userId === uid) : [];
  return {
    myBookings,
    favoriteCompanions: uid ? companions.filter(companion => favorites.includes(companion.id)) : [],
    totalBookedValue: myBookings.filter(booking => booking.status !== 'cancelled')
      .reduce((total, booking) => total + booking.totalPrice, 0),
  };
}
