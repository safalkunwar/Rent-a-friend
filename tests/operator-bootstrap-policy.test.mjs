import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectOperatorAccount, bootstrapClaims } from '../ops/staff-containment/operator-bootstrap-policy.mjs';
const owner = { uid: 'operator', email: 'owner@example.test', emailVerified: true, disabled: false };

test('selects only the verified authenticated-operator match, never a random customer', () => {
  assert.equal(selectOperatorAccount(' OWNER@example.test ', [{ ...owner, uid: 'customer', email: 'customer@example.test' }, owner], true), owner);
});
test('refuses missing and ambiguous operator matches', () => {
  assert.throws(() => selectOperatorAccount(owner.email, [], true));
  assert.throws(() => selectOperatorAccount(owner.email, [owner, { ...owner, uid: 'duplicate' }], true));
});
test('refuses partial inventory, missing identity and unsafe accounts', () => {
  assert.throws(() => selectOperatorAccount(owner.email, [owner], false));
  assert.throws(() => selectOperatorAccount('', [owner], true));
  for (const invalid of [{ emailVerified: false }, { disabled: true }, { uid: '' }]) {
    assert.throws(() => selectOperatorAccount(owner.email, [{ ...owner, ...invalid }], true));
  }
});
test('adds only adminRole and preserves unrelated claims without mutating input', () => {
  const before = { role: 'customer', capabilityVersion: 2, scope: { tenant: 'fixture' } };
  assert.deepEqual(bootstrapClaims(before), { ...before, adminRole: 'super_admin' });
  assert.equal(before.adminRole, undefined);
  assert.deepEqual(bootstrapClaims(), { adminRole: 'super_admin' });
});
test('refuses malformed and oversized claims', () => {
  for (const invalid of [null, [], 'invalid', { value: 'x'.repeat(1000) }]) assert.throws(() => bootstrapClaims(invalid));
});
