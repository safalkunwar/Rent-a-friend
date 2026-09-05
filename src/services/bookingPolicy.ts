import policy from './bookingPolicy.json';
import type { Booking } from '../types';
export type BookingActor = 'booker' | 'companion' | 'operator';
export function canTransition(from: Booking['status'], to: Booking['status'], actor: BookingActor): boolean {
  const transitions: Record<string, Record<string, string[]>> = policy.transitions;
  return transitions[from]?.[to]?.includes(actor) ?? false;
}
export function bookingLockId(companionId: string, date: string): string {
  if (!companionId || companionId.includes('/') || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid reservation identity/date.');
  return `lock_${companionId}_${date.replace(/[^a-zA-Z0-9]/g, '_')}`;
}
export function validateBookingInput(booking: Booking, hourlyRate: number): { quotedTotalPaisa: number; startAt: Date } {
  bookingLockId(booking.companionId, booking.date);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.time)) throw new Error('Invalid booking time.');
  const localDate = new Date(`${booking.date}T00:00:00Z`);
  if (!Number.isFinite(localDate.getTime()) || localDate.toISOString().slice(0,10) !== booking.date) throw new Error('Invalid calendar date.');
  if (!Number.isInteger(booking.duration) || booking.duration < 1 || booking.duration > 12 ||
      !Number.isInteger(booking.participants) || booking.participants < 1 || booking.participants > 8) throw new Error('Invalid duration or participant count.');
  const [hour, minute] = booking.time.split(':').map(Number);
  if (hour * 60 + minute + booking.duration * 60 > 1440) throw new Error('Bookings must end within the selected Nepal calendar day.');
  if (!Number.isInteger(hourlyRate) || hourlyRate < 500) throw new Error('Companion rate requires review.');
  if (!booking.meetingPoint.trim() || !booking.userNameAtBooking?.trim() || !booking.userPhoneAtBooking?.trim()) throw new Error('Meeting point, name and phone are required.');
  const startAt = new Date(`${booking.date}T${booking.time}:00+05:45`);
  if (startAt.getTime() <= Date.now()) throw new Error('Booking must start in the future.');
  return { quotedTotalPaisa: hourlyRate * booking.duration * (110 + 33 * (booking.participants - 1)), startAt };
}
