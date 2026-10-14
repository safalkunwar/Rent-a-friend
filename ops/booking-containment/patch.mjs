import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const ACTIVE_SOURCE = 'ops/payment-containment/combined-candidate.firestore.rules';
export const ACTIVE_HASH = '764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402';
export const hash = content => createHash('sha256').update(content).digest('hex');
export const startMarker = '    // Bookings Collection: /bookings/{bookingId}';
export const endMarker = '    // Reviews Collection: /reviews/{reviewId}';
export const fragment = readFileSync(new URL('./booking-v2.rules', import.meta.url), 'utf8');

export function bookingSection(source) {
  if (hash(source) !== ACTIVE_HASH) throw new Error('Booking baseline drift; fresh production review required.');
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end <= start || source.split(startMarker).length !== 2 || source.split(endMarker).length !== 2) throw new Error('Expected exactly one booking/lock section.');
  return { start, end, original: source.slice(start, end) };
}
export function patchBookingLocks(source) {
  const { start, end } = bookingSection(source);
  return source.slice(0, start) + fragment + '\n' + source.slice(end);
}
