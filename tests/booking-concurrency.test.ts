import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { reserveBooking, transitionBooking } from '../src/services/bookingTransactions';
import type { Booking } from '../src/types';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085') throw new Error('Loopback emulator required.');
let env: RulesTestEnvironment;
const db = (uid: string, claims = {}) => env.authenticatedContext(uid,claims).firestore() as unknown as Firestore;
before(async () => { env=await initializeTestEnvironment({ projectId:'hamrosathi1',firestore:{host:'127.0.0.1',port:8085,rules:await readFile('firestore.rules','utf8')} }); });
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context=>{
    const store=context.firestore();
    await Promise.all([
      setDoc(doc(store,'users/A'),{role:'customer'}),setDoc(doc(store,'users/B'),{role:'customer'}),
      setDoc(doc(store,'users/C'),{role:'companion',companionStatus:'APPROVED'}),
      setDoc(doc(store,'companions/C'),{userId:'C',isVerified:true,hourlyRate:1000}),
    ]);
  });
});
const input=(uid: string,id: string): Booking=>({id,userId:uid,companionId:'C',date:'2099-01-01',time:'10:00',duration:2,participants:1,status:'pending',totalPrice:1,meetingPoint:'Kathmandu',userNameAtBooking:uid,userPhoneAtBooking:'9800000000',createdAt:'now'});
test('two users race actual repository transaction: exactly one reservation wins',async()=>{
  const outcomes=await Promise.allSettled([reserveBooking(db('A'),'A',input('A','a')),reserveBooking(db('B'),'B',input('B','b'))]);
  assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);
  await env.withSecurityRulesDisabled(async context=>{const snapshot=await context.firestore().collection('bookings').get();assert.equal(snapshot.size,1);});
});
test('lost acknowledgement retry is idempotent and preserves quote',async()=>{
  const store=db('A');
  await reserveBooking(store,'A',input('A','a'));
  await reserveBooking(store,'A',input('A','a'));
  assert.equal((await getDoc(doc(store,'bookings/a'))).data()?.totalPrice,2200);
  await assert.rejects(reserveBooking(store,'A',{...input('A','a'),duration:3}),/different booking intent/);
});
test('customer cannot self-confirm; companion confirms atomically; customer cancels and B can reserve',async()=>{
  await reserveBooking(db('A'),'A',input('A','a'));
  await assert.rejects(transitionBooking(db('A'),'A','a','confirmed'),/Invalid booking transition/);
  await transitionBooking(db('C'),'C','a','confirmed');
  assert.equal((await getDoc(doc(db('A'),'booking_locks/lock_C_2099_01_01'))).data()?.status,'confirmed');
  await transitionBooking(db('A'),'A','a','cancelled');
  await reserveBooking(db('B'),'B',input('B','b'));
});
test('forged booking ownership/payment/unpaired lock mutations denied',async()=>{
  await reserveBooking(db('A'),'A',input('A','a'));
  await assertFails(updateDoc(doc(db('A'),'bookings/a'),{userId:'B'}));
  await assertFails(updateDoc(doc(db('A'),'bookings/a'),{paymentStatus:'verified'}));
  await assertFails(updateDoc(doc(db('C'),'bookings/a'),{status:'confirmed'}));
  await assertFails(setDoc(doc(db('B'),'booking_locks/forged'),{bookingId:'fake',companionId:'C',date:'2099-01-01',status:'pending'}));
});
test('modified client cannot bypass actor policy using atomic writes',async()=>{
  await reserveBooking(db('A'),'A',input('A','a'));
  const store=db('A');
  const batch=writeBatch(store);
  batch.update(doc(store,'bookings/a'),{status:'confirmed'});
  batch.update(doc(store,'booking_locks/lock_C_2099_01_01'),{status:'confirmed'});
  await assertFails(batch.commit());
});
test('operator uses same transition contract, nonparticipant denied',async()=>{
  await reserveBooking(db('A'),'A',input('A','a'));
  await assertFails(transitionBooking(db('B'),'B','a','confirmed'));
  await assertSucceeds(transitionBooking(db('operator',{adminRole:'booking_admin'}),'operator','a','confirmed'));
  await assert.rejects(transitionBooking(db('C'),'C','a','active'),/start\/end/);
});
