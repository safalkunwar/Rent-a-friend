import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

process.env.SATHI_WELCOME_IDENTITY_ENABLED = "true";
process.env.SATHI_WELCOME_IDENTITY_HMAC_KEY = "local-emulator-only-identity-key-at-least-32-bytes";
await import("../lib/index.js");
const { getFirestore } = await import("firebase-admin/firestore");
const db = getFirestore();
const { reviewWelcomeCoinIdentityCase, getWelcomeCoinIdentityStatus, appealWelcomeCoinIdentityCase } =
  await import("../lib/domains/identity/welcomeCoinIdentity.js");

const suffix = randomUUID().replaceAll("-", "");
const reviewerA = { uid: `reviewer-a-${suffix}`, token: { adminRole: "kyc_reviewer" } };
const reviewerB = { uid: `reviewer-b-${suffix}`, token: { adminRole: "kyc_reviewer" } };
const call = (fn, auth, data = {}) => fn.run({ auth, data });

test("identity review creates a private person key, blocks duplicate UIDs, and enforces independent appeal review", async () => {
  const firstUid = `identity-first-${suffix}`;
  const duplicateUid = `identity-duplicate-${suffix}`;
  const appealUid = `identity-appeal-${suffix}`;
  const firstRef = db.collection("welcome_coin_identity_cases").doc(firstUid);
  const duplicateRef = db.collection("welcome_coin_identity_cases").doc(duplicateUid);
  const appealRef = db.collection("welcome_coin_identity_cases").doc(appealUid);
  await Promise.all([
    firstRef.set({ uid: firstUid, status: "PENDING", documentType: "NATIONAL_ID" }),
    duplicateRef.set({ uid: duplicateUid, status: "PENDING", documentType: "NATIONAL_ID" }),
    appealRef.set({ uid: appealUid, status: "PENDING", documentType: "PASSPORT" }),
  ]);

  const first = await call(reviewWelcomeCoinIdentityCase, reviewerA, {
    uid: firstUid, action: "APPROVE", documentNumber: " ab-123 45 ",
  });
  assert.deepEqual(first, { status: "VERIFIED" });
  const firstPrivate = (await db.collection("welcome_coin_identity_private").doc(firstUid).get()).data();
  assert.match(firstPrivate.personKey, /^v1_[a-f0-9]{64}$/);
  assert.equal(firstPrivate.status, "VERIFIED");
  assert.equal(JSON.stringify(firstPrivate).includes("ab-123 45"), false);

  const duplicate = await call(reviewWelcomeCoinIdentityCase, reviewerB, {
    uid: duplicateUid, action: "APPROVE", documentNumber: "AB12345",
  });
  assert.deepEqual(duplicate, { status: "DUPLICATE" });
  assert.equal((await duplicateRef.get()).data().status, "DUPLICATE");
  assert.equal((await db.collection("welcome_coin_identity_private").doc(duplicateUid).get()).exists, false);

  await call(reviewWelcomeCoinIdentityCase, reviewerA, { uid: appealUid, action: "REJECT" });
  const decision = await call(getWelcomeCoinIdentityStatus, { uid: appealUid, token: { uid: appealUid } });
  assert.equal(decision.status, "REJECTED");
  assert.ok(Number.isSafeInteger(decision.appealDeadlineMillis));
  await call(appealWelcomeCoinIdentityCase, { uid: appealUid, token: { uid: appealUid } });
  await assert.rejects(
    call(reviewWelcomeCoinIdentityCase, reviewerA, {
      uid: appealUid, action: "APPROVE", documentNumber: "P1234567",
    }),
    (error) => error.code === "permission-denied",
  );
  assert.deepEqual(await call(reviewWelcomeCoinIdentityCase, reviewerB, {
    uid: appealUid, action: "APPROVE", documentNumber: "P1234567",
  }), { status: "VERIFIED" });

  const appealPrivate = (await db.collection("welcome_coin_identity_private").doc(appealUid).get()).data();
  for (const ref of [firstRef, duplicateRef, appealRef]) {
    await Promise.all((await ref.collection("audit").get()).docs.map((entry) => entry.ref.delete()));
    await ref.delete();
  }
  const firstPersonKey = firstPrivate.personKey;
  await db.collection("welcome_coin_identity_private").doc(firstUid).delete();
  await db.collection("welcome_coin_identity_private").doc(appealUid).delete();
  await db.collection("welcome_coin_person_claims").doc(firstPersonKey).delete();
  await db.collection("welcome_coin_person_claims").doc(appealPrivate.personKey).delete();
});
