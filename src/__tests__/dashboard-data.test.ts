import { describe, it, expect } from 'vitest';
import { selectCustomerDashboard } from '../services/dashboardData';
import type { Booking } from '../types';

const booking = (id: string, userId: string, status: Booking['status'], totalPrice: number): Booking => ({
  id, userId, companionId: 'companion', date: '2026-09-10', time: '10:00',
  duration: 1, participants: 1, status, totalPrice, meetingPoint: 'Kathmandu', createdAt: '2026-09-05T00:00:00.000Z',
});

describe('customer dashboard source selectors', () => {
  it('scopes records to authenticated UID, not all context bookings', () => {
    const result = selectCustomerDashboard('A', [booking('a', 'A', 'pending', 1000), booking('b', 'B', 'confirmed', 9000)], [], []);
    expect(result.myBookings.map(b => b.id)).toEqual(['a']);
    expect(result.totalBookedValue).toBe(1000);
  });
  it('excludes cancelled value without claiming payment settlement', () => {
    expect(selectCustomerDashboard('A', [booking('a', 'A', 'completed', 1000), booking('b', 'A', 'cancelled', 2000)], [], []).totalBookedValue).toBe(1000);
  });
  it('clears records for a signed-out user', () => {
    expect(selectCustomerDashboard(undefined, [booking('a', 'A', 'pending', 1000)], [], ['c'])).toEqual({ myBookings: [], favoriteCompanions: [], totalBookedValue: 0 });
  });
});
