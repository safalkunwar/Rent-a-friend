import { readFileSync } from 'node:fs';
const policy = JSON.parse(readFileSync(new URL('../src/services/bookingPolicy.json',import.meta.url),'utf8'));
const rules = readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const actors = { booker:'own(data.userId)', companion:'own(data.companionUid)', operator:'bookingAdmin()' };
const clauses = Object.entries(policy.transitions).flatMap(([from,targets]) => Object.entries(targets).map(([to,allowed]) =>
  `(data.status == '${from}' && next == '${to}' && (${allowed.map(actor=>actors[actor]).join(' || ')}))`));
const expected = `function policyTransition(data, next) { return ${clauses.join(' || ')}; }`;
const actual = rules.split('// BEGIN GENERATED BOOKING TRANSITIONS')[1]?.split('// END GENERATED BOOKING TRANSITIONS')[0];
if (!actual || actual.replace(/\s/g,'') !== expected.replace(/\s/g,'')) throw new Error('Firestore transition policy drifted from bookingPolicy.json.');
console.log('Booking policy and Firestore transition matrix match.');
