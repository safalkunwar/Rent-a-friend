/**
 * P0-02 staff payments containment test suite.
 * Tests the P0-02 candidate (both P0-01 + P0-02 patches applied) against:
 *   - All 11 admin roles: only finance_admin / super_admin may write payments.
 *   - User self-create path is preserved.
 *   - delete: if false is preserved for all actors.
 *   - read is preserved for all admin roles and payment owner.
 *
 * These are SECURITY REQUIREMENT tests — DENIED results are the required outcome.
 * Uses emulator project 'demo-sathi-containment2' (Firestore-only).
 */
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, deleteDoc, setLogLevel } from 'firebase/firestore';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085') {
  throw new Error('Loopback Firestore emulator required; no live fallback');
}

// Frozen unsafe draft; separate from the corrected messaging-only artifact.
const CANDIDATE_PATH = 'ops/containment/staff-payments.DRAFT.firestore.rules';
// SHA-256 of the P0-02 candidate (both patches applied)
const EXPECTED_CANDIDATE_HASH = 'ad799e86e03de52a0570edf98f01cf72d0bce08fb09c307b70cc21a7c81f1bbd';

let env;

// Helper: authenticated context with an adminRole claim
const adminCtx = (role) =>
  env.authenticatedContext('admin_user', {
    adminRole: role,
    admin: false,
    role: 'customer',
  }).firestore();

// Helper: plain authenticated customer
const customerCtx = (uid = 'cust_A') =>
  env.authenticatedContext(uid, {
    adminRole: 'none',
    admin: false,
    role: 'customer',
  }).firestore();

before(async () => {
  const rules = await readFile(CANDIDATE_PATH, 'utf8');
  const hash = createHash('sha256').update(rules).digest('hex');
  assert.equal(
    hash,
    EXPECTED_CANDIDATE_HASH,
    `Preserved draft hash mismatch — do not regenerate or deploy this archived draft.\nGot: ${hash}`
  );
  setLogLevel('silent');
  env = await initializeTestEnvironment({
    projectId: 'demo-sathi-containment2',
    firestore: { host: '127.0.0.1', port: 8085, rules },
  });
});

after(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // Existing payment owned by cust_A
    await setDoc(doc(db, 'payments/pay_existing'), {
      userId: 'cust_A',
      status: 'pending',
      amount: 1500,
      createdAt: new Date().toISOString(),
    });
    // Admins document for admin_user so document-lookup branch also works
    await setDoc(doc(db, 'admins/admin_user'), {
      uid: 'admin_user',
      role: 'finance_admin',
      updatedAt: new Date().toISOString(),
    });
  });
});

// ── READ ACCESS (must remain open to all admin roles and owner) ─────────────

test('READ: payment owner can read their own payment', async () => {
  await assertSucceeds(getDoc(doc(customerCtx('cust_A'), 'payments/pay_existing')));
});

test('READ: finance_admin can read payments', async () => {
  await assertSucceeds(getDoc(doc(adminCtx('finance_admin'), 'payments/pay_existing')));
});

test('READ: read_only_admin can still read payments', async () => {
  await assertSucceeds(getDoc(doc(adminCtx('read_only_admin'), 'payments/pay_existing')));
});

test('READ: analytics_admin can still read payments', async () => {
  await assertSucceeds(getDoc(doc(adminCtx('analytics_admin'), 'payments/pay_existing')));
});

// ── SELF-CREATE (owner creates their own payment record) ────────────────────

test('SELF-CREATE: customer can create their own payment record', async () => {
  await assertSucceeds(
    setDoc(doc(customerCtx('cust_A'), 'payments/pay_new'), {
      userId: 'cust_A',
      status: 'pending',
      amount: 2000,
      createdAt: new Date().toISOString(),
    })
  );
});

test('SELF-CREATE: customer cannot create a payment for another user', async () => {
  await assertFails(
    setDoc(doc(customerCtx('cust_A'), 'payments/pay_other'), {
      userId: 'cust_B',
      status: 'pending',
      amount: 2000,
      createdAt: new Date().toISOString(),
    })
  );
});

// ── FINANCE_ADMIN WRITE (must succeed) ──────────────────────────────────────

test('WRITE: finance_admin can update payment status', async () => {
  await assertSucceeds(
    updateDoc(doc(adminCtx('finance_admin'), 'payments/pay_existing'), {
      status: 'completed',
      updatedAt: new Date().toISOString(),
    })
  );
});

test('WRITE: finance_admin can create a payment record', async () => {
  await assertSucceeds(
    setDoc(doc(adminCtx('finance_admin'), 'payments/pay_admin_created'), {
      userId: 'cust_B',
      status: 'pending',
      amount: 500,
      createdAt: new Date().toISOString(),
    })
  );
});

test('WRITE: super_admin can update payment status', async () => {
  // super_admin has global authority; must not be locked out
  await assertSucceeds(
    updateDoc(doc(adminCtx('super_admin'), 'payments/pay_existing'), {
      status: 'refunded',
      updatedAt: new Date().toISOString(),
    })
  );
});

// ── NON-FINANCE ADMIN ROLES (all must be DENIED for writes) ─────────────────

test('DENIED: read_only_admin cannot update payment status', async () => {
  await assertFails(
    updateDoc(doc(adminCtx('read_only_admin'), 'payments/pay_existing'), {
      status: 'completed',
      amount: 1,
    })
  );
});

test('DENIED: analytics_admin cannot update payment', async () => {
  await assertFails(
    updateDoc(doc(adminCtx('analytics_admin'), 'payments/pay_existing'), {
      status: 'completed',
    })
  );
});

test('DENIED: safety_admin cannot update payment', async () => {
  await assertFails(
    updateDoc(doc(adminCtx('safety_admin'), 'payments/pay_existing'), {
      status: 'completed',
    })
  );
});

test('DENIED: booking_admin cannot update payment', async () => {
  await assertFails(
    updateDoc(doc(adminCtx('booking_admin'), 'payments/pay_existing'), {
      status: 'completed',
    })
  );
});

test('DENIED: content_admin cannot update payment', async () => {
  await assertFails(
    updateDoc(doc(adminCtx('content_admin'), 'payments/pay_existing'), {
      status: 'completed',
    })
  );
});

test('DENIED: kyc_reviewer cannot update payment', async () => {
  await assertFails(
    updateDoc(doc(adminCtx('kyc_reviewer'), 'payments/pay_existing'), {
      status: 'completed',
    })
  );
});

test('DENIED: moderation_admin cannot update payment', async () => {
  await assertFails(
    updateDoc(doc(adminCtx('moderation_admin'), 'payments/pay_existing'), {
      status: 'completed',
    })
  );
});

test('DENIED: support_agent cannot update payment', async () => {
  await assertFails(
    updateDoc(doc(adminCtx('support_agent'), 'payments/pay_existing'), {
      status: 'completed',
    })
  );
});

test('DENIED: platform_admin cannot update payment', async () => {
  await assertFails(
    updateDoc(doc(adminCtx('platform_admin'), 'payments/pay_existing'), {
      status: 'completed',
    })
  );
});

// ── DELETE PERMANENTLY DENIED ────────────────────────────────────────────────

test('DENIED: finance_admin cannot delete a payment (allow delete: if false preserved)', async () => {
  await assertFails(deleteDoc(doc(adminCtx('finance_admin'), 'payments/pay_existing')));
});

test('DENIED: super_admin cannot delete a payment (allow delete: if false preserved)', async () => {
  await assertFails(deleteDoc(doc(adminCtx('super_admin'), 'payments/pay_existing')));
});
