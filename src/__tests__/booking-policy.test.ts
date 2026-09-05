import { describe, it, expect } from 'vitest';
import { canTransition, bookingLockId, validateBookingInput } from '../services/bookingPolicy';
import type { Booking } from '../types';
const booking: Booking = { id:'b', userId:'A', companionId:'C',date:'2099-01-01',time:'10:00',duration:2,participants:2,totalPrice:1,status:'pending',meetingPoint:'Kathmandu',userNameAtBooking:'A',userPhoneAtBooking:'9800000000',createdAt:'now' };
describe('canonical booking policy', () => {
  it('booker cannot self-confirm or complete', () => { expect(canTransition('pending','confirmed','booker')).toBe(false); expect(canTransition('active','completed','booker')).toBe(false); });
  it('companion accepts, starts then completes; cannot skip active', () => { expect(canTransition('pending','confirmed','companion')).toBe(true); expect(canTransition('confirmed','active','companion')).toBe(true); expect(canTransition('active','completed','companion')).toBe(true); expect(canTransition('confirmed','completed','companion')).toBe(false); });
  it('terminal states cannot reopen', () => { expect(canTransition('cancelled','pending','operator')).toBe(false); expect(canTransition('completed','confirmed','operator')).toBe(false); });
  it('cancellation authority narrows once active', () => { expect(canTransition('confirmed','cancelled','booker')).toBe(true); expect(canTransition('active','cancelled','companion')).toBe(false); expect(canTransition('active','cancelled','operator')).toBe(true); });
  it('retains existing date lock identity', () => { expect(bookingLockId('C','2099-01-01')).toBe('lock_C_2099_01_01'); });
  it('recomputes integer-paisa quote from rate, never submitted total', () => { expect(validateBookingInput(booking,1000).quotedTotalPaisa).toBe(286000); });
  it('rejects invalid dates and overnight requests', () => { expect(()=>validateBookingInput({...booking,date:'2099-02-31'},1000)).toThrow(); expect(()=>validateBookingInput({...booking,time:'23:00'},1000)).toThrow(); });
});
