import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";

process.env.SATHI_PROFILE_UNLOCK_COINS_ENABLED = "true";
const { requestCompanionProfileUnlock } = await import("../lib/index.js");
const { grantProfileUnlockWithCoins } = await import("../lib/domains/discovery/profileUnlockGrant.js");
const { getFirestore } = await import("firebase-admin/firestore");
const db = getFirestore();
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const suffix = randomUUID().replaceAll("-", "");
const policyVersion = Number(BigInt(Date.now()) % 1_000_000_000n) || 1;

function dateKey(nowMillis) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(nowMillis));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function seedPolicy() {
  await Promise.all([
    db.doc("coin_profile_unlock_policies/current").set({ activeVersion: policyVersion }),
    db.doc(`coin_profile_unlock_policies/profile_v${policyVersion}`).set({
      schemaVersion: 1,
      policyVersion,
      status: "APPROVED",
      purpose: "PROFILE_UNLOCK",
      coinPrice: 50,
      freeDailyLimit: 5,
      cashEligible: false,
      effectiveStartMillis: Date.now() - 60_000,
      effectiveEndMillis: Date.now() + 60_000,
      approvalRef: `test-approval-${suffix}`,
      creditAccountKey: `platform:profile_unlocks:consumed:${suffix}`,
    }),
  ]);
}

async function seedViewer(uid, { balance = 0, freeUsed = 0, lotAmounts = [balance] } = {}) {
  await db.doc(`users/${uid}/access/current`).set({
    status: "ACTIVE", policyVersion, coinProfileUnlockEligible: true,
  });
  if (freeUsed > 0) {
    const today = dateKey(Date.now());
    await db.doc(`discovery_usage/${uid}_${today}`).set({ uid, dateKey: today, freeUsed, policyVersion });
  }
  if (balance > 0) {
    await db.doc(`wallet_accounts/${uid}`).set({
      status: "ACTIVE", availableCoins: balance, reservedCoins: 0,
      cumulativeCreditedCoins: balance, cumulativeDebitedCoins: 0, version: 1,
    });
    assert.equal(lotAmounts.reduce((sum, amount) => sum + amount, 0), balance);
    await Promise.all(lotAmounts.map(async (amount, index) => {
      const grantId = `welcome-${uid}-${index}`;
      const sourceId = `${uid}-source-${index}`;
      const createdAt = Timestamp.fromMillis(Date.now() - 10_000 + index);
      await Promise.all([
        db.doc(`wallet_accounts/${uid}/lots/${grantId}`).set({
          grantId,
          journalRef: `ledger_transactions/${grantId}_COIN`,
          sourceType: "NEW_USER_SIGNUP",
          sourceId,
          fundingRef: `emulator-funding-${suffix}`,
          amountCoins: amount,
          remainingAvailable: amount,
          remainingReserved: 0,
          cashEligible: false,
          state: "OPEN",
          createdAt,
        }),
        db.doc(`ledger_transactions/${grantId}_COIN`).set({
          id: `${grantId}_COIN`, asset: "COIN", sourceType: "NEW_USER_SIGNUP", sourceId,
          entries: [
            { accountKey: `platform:welcome:${suffix}`, signedAmount: -amount },
            { accountKey: `user:${uid}:available`, signedAmount: amount },
          ],
        }),
      ]);
    }));
  }
}

async function seedProvider(uid) {
  const applicationId = `approved-${uid}`;
  await Promise.all([
    db.doc(`users/${uid}/access/current`).set({
      status: "ACTIVE", policyVersion, coinProfileProviderEligible: true,
    }),
    db.doc(`users/${uid}`).set({
      companionStatus: "APPROVED", companionApprovalApplicationId: applicationId,
    }),
    db.doc(`companions/${uid}`).set({
      id: uid, userId: uid, isVerified: true, approvalApplicationId: applicationId,
    }),
    db.doc(`companion_applications/${applicationId}`).set({
      userId: uid, status: "APPROVED", kyc: { verificationStatus: "VERIFIED" },
    }),
  ]);
}

test("profile unlock transaction enforces free daily grants, oldest-first spend, replay and eligibility", {
  timeout: 60_000,
}, async () => {
  assert.ok(projectId?.startsWith("demo-"), "emulator test must use an isolated demo project ID");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST?.startsWith("127.0.0.1:") ||
    process.env.FIRESTORE_EMULATOR_HOST?.startsWith("localhost:"), true,
  "Firestore Admin SDK must target the local emulator");
  await seedPolicy();

  const viewer = `unlock-viewer-${suffix}`;
  const providers = Array.from({ length: 8 }, (_, index) => `unlock-provider-${index}-${suffix}`);
  await seedViewer(viewer, { balance: 100, lotAmounts: [25, 75] });
  await Promise.all(providers.map(seedProvider));

  for (const [index, providerUid] of providers.slice(0, 5).entries()) {
    assert.equal((await grantProfileUnlockWithCoins(db, viewer, providerUid, `free-request-${index}-${suffix}`)).status,
      "FREE_GRANTED");
  }
  const paidProvider = providers[5];
  const paidRequestId = `paid-request-${suffix}`;
  const paidResult = await grantProfileUnlockWithCoins(db, viewer, paidProvider, paidRequestId);
  assert.deepEqual(paidResult, {
    status: "COINS_GRANTED", unlockId: `${viewer}_${paidProvider}`, chargedCoins: 50, policyVersion,
  });
  assert.deepEqual(await grantProfileUnlockWithCoins(db, viewer, paidProvider, paidRequestId), paidResult,
    "same request replay returns the stored response");
  await assert.rejects(
    grantProfileUnlockWithCoins(db, viewer, providers[6], paidRequestId),
    /conflicting operation replay/,
    "a request ID cannot be replayed for a different provider",
  );
  assert.equal((await grantProfileUnlockWithCoins(db, viewer, paidProvider, `duplicate-${suffix}`)).status,
    "ALREADY_GRANTED", "a second request cannot charge for the same profile");

  const journal = await db.collection("ledger_transactions")
    .where("sourceId", "==", `${viewer}_${paidProvider}`).limit(1).get();
  const journalId = `${journal.docs[0].data().operationId}_COIN`;
  const [wallet, unlock, lot, statement, operation] = await Promise.all([
    db.doc(`wallet_accounts/${viewer}`).get(),
    db.doc(`profile_unlocks/${viewer}_${paidProvider}`).get(),
    db.doc(`wallet_accounts/${viewer}/lots/welcome-${viewer}-0`).get(),
    db.doc(`wallet_accounts/${viewer}/statement/${journalId}`).get(),
    db.collection("operations").where("actorUid", "==", viewer).where("providerUid", "==", paidProvider).limit(1).get(),
  ]);
  assert.equal(wallet.data().availableCoins, 50);
  assert.equal(wallet.data().cumulativeDebitedCoins, 50);
  assert.equal(unlock.data().journalRef, journal.docs[0].ref.path);
  assert.equal(lot.data().remainingAvailable, 0);
  assert.equal((await db.doc(`wallet_accounts/${viewer}/lots/welcome-${viewer}-1`).get()).data().remainingAvailable, 50);
  assert.equal(journal.size, 1);
  assert.equal(journal.docs[0].data().entries.reduce((sum, posting) => sum + posting.signedAmount, 0), 0);
  assert.equal(statement.exists, true);
  assert.equal(operation.size, 1);

  await db.doc("coin_profile_unlock_policies/current").set({ activeVersion: null });
  assert.deepEqual(await grantProfileUnlockWithCoins(db, viewer, paidProvider, paidRequestId), paidResult,
    "a paused policy pointer does not change a committed request replay");
  assert.equal((await db.doc(`wallet_accounts/${viewer}`).get()).data().availableCoins, 50);
  const freeWhileCoinFlagOffViewer = `unlock-free-flag-off-${suffix}`;
  const freeWhileCoinFlagOffProvider = `unlock-free-provider-flag-off-${suffix}`;
  await seedViewer(freeWhileCoinFlagOffViewer);
  await seedProvider(freeWhileCoinFlagOffProvider);
  process.env.SATHI_PROFILE_UNLOCK_COINS_ENABLED = "false";
  assert.equal((await grantProfileUnlockWithCoins(db, freeWhileCoinFlagOffViewer,
    freeWhileCoinFlagOffProvider, `free-flag-off-${suffix}`)).status, "FREE_GRANTED",
  "Phase 2 free grants remain independent of the Phase 8 Coin spend flag and campaign pointer");
  await db.doc("coin_profile_unlock_policies/current").set({ activeVersion: policyVersion });
  process.env.SATHI_PROFILE_UNLOCK_COINS_ENABLED = "true";

  const consolidationViewer = `unlock-consolidation-viewer-${suffix}`;
  const consolidationProvider = `unlock-consolidation-provider-${suffix}`;
  await seedViewer(consolidationViewer, {
    balance: 63, freeUsed: 5, lotAmounts: Array.from({ length: 21 }, () => 3),
  });
  await seedProvider(consolidationProvider);
  assert.equal((await grantProfileUnlockWithCoins(db, consolidationViewer, consolidationProvider,
    `consolidation-request-${suffix}`)).status, "CONSOLIDATION_REQUIRED");
  assert.equal((await db.doc(`wallet_accounts/${consolidationViewer}`).get()).data().availableCoins, 63,
    "more than 20 open source lots fail closed without changing the wallet");
  assert.equal((await db.doc(`profile_unlocks/${consolidationViewer}_${consolidationProvider}`).get()).exists, false);

  const concurrentProvider = providers[7];
  const concurrentResults = await Promise.all([
    grantProfileUnlockWithCoins(db, viewer, concurrentProvider, `concurrent-a-${suffix}`),
    grantProfileUnlockWithCoins(db, viewer, concurrentProvider, `concurrent-b-${suffix}`),
  ]);
  assert.deepEqual(concurrentResults.map((result) => result.status).sort(),
    ["ALREADY_GRANTED", "COINS_GRANTED"].sort());
  assert.equal((await db.doc(`wallet_accounts/${viewer}`).get()).data().availableCoins, 0,
    "concurrent duplicate requests consume only one 50-Coin unlock");
  assert.equal((await db.doc(`wallet_accounts/${viewer}/lots/welcome-${viewer}-0`).get()).data().remainingAvailable, 0,
    "oldest source lot is consumed first");
  assert.equal((await db.doc(`wallet_accounts/${viewer}/lots/welcome-${viewer}-1`).get()).data().remainingAvailable, 0);

  const raceViewer = `unlock-race-viewer-${suffix}`;
  const raceProviders = [`unlock-race-provider-a-${suffix}`, `unlock-race-provider-b-${suffix}`];
  await seedViewer(raceViewer, { balance: 50, freeUsed: 4 });
  await Promise.all(raceProviders.map(seedProvider));
  const race = await Promise.all(raceProviders.map((providerUid, index) =>
    grantProfileUnlockWithCoins(db, raceViewer, providerUid, `race-request-${index}-${suffix}`)));
  assert.deepEqual(race.map((result) => result.status).sort(), ["COINS_GRANTED", "FREE_GRANTED"].sort());
  const raceUsage = await db.doc(`discovery_usage/${raceViewer}_${dateKey(Date.now())}`).get();
  const raceWallet = await db.doc(`wallet_accounts/${raceViewer}`).get();
  assert.equal(raceUsage.data().freeUsed, 5);
  assert.equal(raceWallet.data().availableCoins, 0);

  const blockedViewer = `unlock-blocked-viewer-${suffix}`;
  const blockedProvider = `unlock-blocked-provider-${suffix}`;
  await seedViewer(blockedViewer);
  await seedProvider(blockedProvider);
  await db.doc(`users/${blockedViewer}/blocks/${blockedProvider}`).set({ status: "ACTIVE" });
  assert.equal((await grantProfileUnlockWithCoins(db, blockedViewer, blockedProvider,
    `blocked-request-${suffix}`)).status, "BLOCKED");
  assert.equal((await db.doc(`profile_unlocks/${blockedViewer}_${blockedProvider}`).get()).exists, false);

  const emptyViewer = `unlock-empty-viewer-${suffix}`;
  const emptyProvider = `unlock-empty-provider-${suffix}`;
  await seedViewer(emptyViewer, { freeUsed: 5 });
  await seedProvider(emptyProvider);
  assert.equal((await grantProfileUnlockWithCoins(db, emptyViewer, emptyProvider,
    `empty-request-${suffix}`)).status, "INSUFFICIENT_COINS");
  assert.equal((await db.doc(`profile_unlocks/${emptyViewer}_${emptyProvider}`).get()).exists, false);

  const unqualifiedProvider = `unlock-unqualified-${suffix}`;
  assert.equal((await grantProfileUnlockWithCoins(db, viewer, unqualifiedProvider,
    `unqualified-request-${suffix}`)).status, "INELIGIBLE");
  assert.equal((await db.doc(`profile_unlocks/${viewer}_${unqualifiedProvider}`).get()).exists, false);

  await assert.rejects(requestCompanionProfileUnlock.run({ auth: null, data: {
    uid: viewer, providerUid: paidProvider, requestId: `unauth-request-${suffix}`,
  } }), (error) => error.code === "unauthenticated");

  const callableViewer = `unlock-callable-viewer-${suffix}`;
  await seedViewer(callableViewer, { balance: 50, freeUsed: 5 });
  const callableProvider = providers[6];
  const callableResult = await requestCompanionProfileUnlock.run({
    auth: { uid: callableViewer, token: { uid: callableViewer } },
    data: { uid: viewer, providerUid: callableProvider, requestId: `callable-request-${suffix}` },
  });
  assert.equal(callableResult.status, "COINS_GRANTED");
  assert.equal((await db.doc(`wallet_accounts/${callableViewer}`).get()).data().availableCoins, 0);
  assert.equal((await db.doc(`wallet_accounts/${viewer}`).get()).data().availableCoins, 0);

  process.env.SATHI_PROFILE_UNLOCK_COINS_ENABLED = "false";
  const disabledViewer = `unlock-disabled-viewer-${suffix}`;
  const disabledProvider = `unlock-disabled-provider-${suffix}`;
  await seedViewer(disabledViewer, { freeUsed: 5 });
  await seedProvider(disabledProvider);
  assert.deepEqual(await grantProfileUnlockWithCoins(db, disabledViewer, disabledProvider,
    `disabled-${suffix}`), { status: "FEATURE_DISABLED" });
});
