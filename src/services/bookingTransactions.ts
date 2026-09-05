import { doc, runTransaction, Timestamp, type Firestore } from 'firebase/firestore';
import type { Booking, Companion } from '../types';
import { bookingLockId, canTransition, validateBookingInput, type BookingActor } from './bookingPolicy';

const intentFields = ['companionId','date','time','duration','participants','meetingPoint','specialRequests','userNameAtBooking','userPhoneAtBooking','userEmailAtBooking'] as const;

/** Explicit database dependency allows the actual transaction to be tested only in emulators. */
export async function reserveBooking(store: Firestore, uid: string, input: Booking): Promise<string> {
  if (input.userId !== uid || !input.id || input.id.includes('/')) throw new Error('Invalid booking ownership/identity.');
  const bookingRef = doc(store,'bookings',input.id);
  return runTransaction(store, async tx => {
    const existing = await tx.get(bookingRef);
    if (existing.exists()) {
      const saved = existing.data();
      if (saved.userId !== uid || intentFields.some(field => (saved[field] ?? '') !== (input[field] ?? ''))) {
        throw new Error('This request ID already belongs to a different booking intent.');
      }
      return existing.id;
    }
    const companionSnapshot = await tx.get(doc(store,'companions',input.companionId));
    if (!companionSnapshot.exists()) throw new Error('Companion not found.');
    const companion = companionSnapshot.data() as Companion;
    if (companion.userId !== input.companionId || companion.userId === uid || !companion.isVerified) {
      throw new Error('Companion requires canonical identity/approval review before booking.');
    }
    const { quotedTotalPaisa, startAt } = validateBookingInput(input,companion.hourlyRate);
    const lockRef = doc(store,'booking_locks',bookingLockId(input.companionId,input.date));
    const lock = await tx.get(lockRef);
    if (lock.exists() && lock.data().status !== 'cancelled') throw new Error('This companion/date is already reserved.');
    const now = new Date().toISOString();
    const booking: Booking = {
      id: input.id, userId: uid, companionId: input.companionId, companionUid: companion.userId,
      date: input.date, time: input.time, duration: input.duration, participants: input.participants,
      meetingPoint: input.meetingPoint, specialRequests: input.specialRequests || '',
      userNameAtBooking: input.userNameAtBooking || '', userPhoneAtBooking: input.userPhoneAtBooking || '',
      userEmailAtBooking: input.userEmailAtBooking || '',
      ...(input.meetingCoordinates ? { meetingCoordinates: input.meetingCoordinates } : {}),
      status: 'pending', paymentStatus: 'not_started', policyVersion: 2,
      totalPrice: quotedTotalPaisa / 100, quotedTotalPaisa, startAt: Timestamp.fromDate(startAt), createdAt: now,
    };
    tx.set(bookingRef,{ ...booking, updatedAt: now });
    tx.set(lockRef,{ bookingId: input.id, companionId: input.companionId, date: input.date, status: 'pending', updatedAt: now });
    return input.id;
  });
}

export async function transitionBooking(store: Firestore, uid: string, id: string, status: Booking['status']): Promise<void> {
  await runTransaction(store, async tx => {
    const bookingRef = doc(store,'bookings',id);
    const snapshot = await tx.get(bookingRef);
    if (!snapshot.exists()) throw new Error('Booking not found');
    const booking = snapshot.data() as Booking;
    if (booking.policyVersion !== 2) throw new Error('Legacy booking requires an operator migration before changes.');
    if (booking.status === status) return;
    const actor: BookingActor = uid === booking.userId ? 'booker' : uid === booking.companionUid ? 'companion' : 'operator';
    // Rules independently check operator authority; this classification never grants it.
    if (!canTransition(booking.status,status,actor)) throw new Error('Invalid booking transition for this actor.');
    if ((status === 'active' || status === 'completed') && (!booking.startAt ||
      Date.now() < booking.startAt.toMillis() + (status === 'completed' ? booking.duration * 3600000 : 0))) {
      throw new Error('The booking has not reached the required start/end time.');
    }
    const lockRef = doc(store,'booking_locks',bookingLockId(booking.companionId,booking.date));
    const lock = await tx.get(lockRef);
    if (!lock.exists() || lock.data().bookingId !== id) throw new Error('Reservation lock needs operator review.');
    const updatedAt = new Date().toISOString();
    tx.update(bookingRef,{ status, updatedAt });
    tx.update(lockRef,{ status, updatedAt });
  });
}
