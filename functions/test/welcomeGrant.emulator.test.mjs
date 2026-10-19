import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

process.env.SATHI_WELCOME_COINS_ENABLED = "true";
process.env.SATHI_WELCOME_IDENTITY_ENABLED = "true";
const { getCoinWallet } = await import("../lib/index.js");
const { getFirestore } = await import("firebase-admin/firestore");
const db = getFirestore();
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const testSuffix = randomUUID().replaceAll("-", "");
const ownerUid = `coins-owner-${testSuffix}`;
const cappedUid = `coins-capped-${testSuffix}`;
const lateCappedUid = `coins-late-capped-${testSuffix}`;
const pausedUid = `coins-paused-${testSuffix}`;
const duplicateUid = `coins-duplicate-${testSuffix}`;
const version = Number(BigInt(Date.now()) % 1_000_000_000n) || 1;
const fundingRef = `emulator_${testSuffix.slice(0, 20)}`;
const policyRef = db.collection("coin_reward_campaigns").doc(`welcome_v${version}`);
const usageRef = db.doc(`coin_reward_campaign_usage/welcome_v${version}`);
const fundingDocRef = db.doc(`coin_reward_funding/${fundingRef}`);
const pointerRef = db.doc("coin_reward_campaigns/current_welcome");
let rulesTestEnv;

test("funded welcome grant is atomic under real transaction retries and wallet reads remain owner-only", { timeout: 60_000 }, async (t) => {
  console.log("emulator test: validate isolated Firestore endpoint");
  assert.ok(projectId?.startsWith("demo-"), "emulator test must use an isolated demo project ID");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST?.startsWith("127.0.0.1:") ||
    process.env.FIRESTORE_EMULATOR_HOST?.startsWith("localhost:"), true,
  "Firestore Admin SDK must target the local emulator");

  const now = Date.now();
  const amountCoins = 100;
  const maxGrantCount = 2;
  await Promise.all([
    pointerRef.set({ activeVersion: version, fundingRef }),
    policyRef.set({
      schemaVersion: 1,
      campaignId: `welcome_v${version}`,
      policyVersion: version,
      status: "APPROVED",
      rewardKind: "NEW_USER_WELCOME",
      sourceKind: "NEW_USER_SIGNUP",
      recipient: "ACTIVITY_OWNER",
      spendPurpose: "PROFILE_UNLOCK",
      postingMode: "IMMEDIATE",
      cashEligible: false,
      maxGrantsPerBeneficiary: 1,
      amountCoins,
      maxGrantCount,
      budgetNprPaisa: amountCoins * maxGrantCount * 10,
      effectiveStartMillis: now - 60_000,
      effectiveEndMillis: now + 60_000,
      fundingRef,
      approvalRef: `test-approval-${testSuffix}`,
      debitAccountKey: `test-funded-coins:${testSuffix}`,
    }),
    fundingDocRef.set({
      status: "FUNDED",
      campaignId: `welcome_v${version}`,
      approvalRef: `test-approval-${testSuffix}`,
      debitAccountKey: `test-funded-coins:${testSuffix}`,
      allocatedCoins: amountCoins * maxGrantCount,
      remainingCoins: amountCoins * maxGrantCount,
    }),
  ]);
  console.log("emulator test: campaign fixtures written");

  const { issueNewUserWelcomeCoins } = await import("../lib/domains/rewards/welcomeGrant.js");
  const evidence = (uid) => ({
    uid,
    createdAtMillis: now,
    disabled: false,
  });
  const approveIdentity = async (uid) => {
    const personKey = `v1_${createHash("sha256").update(uid).digest("hex")}`;
    await Promise.all([
      db.doc(`welcome_coin_identity_cases/${uid}`).set({ uid, status: "VERIFIED" }),
      db.doc(`welcome_coin_identity_private/${uid}`).set({ status: "VERIFIED", personKey }),
      db.doc(`welcome_coin_person_claims/${personKey}`).set({ ownerUid: uid, keyVersion: 1 }),
    ]);
  };
  await Promise.all([ownerUid, cappedUid, lateCappedUid, pausedUid].map(approveIdentity));
  const ownerPersonKey = `v1_${createHash("sha256").update(ownerUid).digest("hex")}`;
  await Promise.all([
    db.doc(`welcome_coin_identity_cases/${duplicateUid}`).set({ uid: duplicateUid, status: "VERIFIED" }),
    db.doc(`welcome_coin_identity_private/${duplicateUid}`).set({ status: "VERIFIED", personKey: ownerPersonKey }),
  ]);
  const duplicateResults = await Promise.all([
    issueNewUserWelcomeCoins(db, evidence(ownerUid)),
    issueNewUserWelcomeCoins(db, evidence(ownerUid)),
  ]);
  console.log("emulator test: concurrent same-user grant calls completed", duplicateResults.map((result) => result.status));
  assert.deepEqual(duplicateResults.map((result) => result.status).sort(), ["ALREADY_GRANTED", "GRANTED"].sort());
  assert.equal((await issueNewUserWelcomeCoins(db, evidence(cappedUid))).status, "GRANTED");
  assert.equal((await issueNewUserWelcomeCoins(db, evidence(lateCappedUid))).status, "CAP_REACHED");
  assert.equal((await issueNewUserWelcomeCoins(db, evidence(duplicateUid))).status, "IDENTITY_REVIEW_REQUIRED");
  assert.equal((await db.doc(`wallet_accounts/${duplicateUid}`).get()).exists, false);

  const ownerGrant = duplicateResults.find((result) => result.status === "GRANTED");
  assert.ok(ownerGrant);
  const [walletSnapshot, journalSnapshot, lotSnapshot, rewardSnapshot, statementSnapshot,
    usageSnapshot, fundingSnapshot] = await Promise.all([
    db.doc(`wallet_accounts/${ownerUid}`).get(),
    db.doc(`ledger_transactions/${ownerGrant.rewardId}_COIN`).get(),
    db.doc(`wallet_accounts/${ownerUid}/lots/${ownerGrant.rewardId}`).get(),
    db.doc(`rewards/${ownerGrant.rewardId}`).get(),
    db.doc(`wallet_accounts/${ownerUid}/statement/${ownerGrant.rewardId}_COIN`).get(),
    usageRef.get(),
    fundingDocRef.get(),
  ]);
  assert.equal(walletSnapshot.data().availableCoins, amountCoins);
  assert.equal(walletSnapshot.data().cumulativeCreditedCoins, amountCoins);
  assert.equal(journalSnapshot.exists, true);
  assert.equal(journalSnapshot.data().entries.reduce((sum, entry) => sum + entry.signedAmount, 0), 0);
  assert.equal(lotSnapshot.data().remainingAvailable, amountCoins);
  assert.equal(rewardSnapshot.data().cashEligible, false);
  assert.equal(statementSnapshot.data().deltaCoins, amountCoins);
  assert.deepEqual(usageSnapshot.data(), { issuedCoins: amountCoins * maxGrantCount, issuedGrantCount: maxGrantCount,
    updatedAt: usageSnapshot.data().updatedAt });
  assert.equal(fundingSnapshot.data().remainingCoins, 0);
  assert.equal((await db.doc(`wallet_accounts/${cappedUid}`).get()).data().availableCoins, amountCoins);
  assert.equal((await db.doc(`wallet_accounts/${lateCappedUid}`).get()).exists, false);
  console.log("emulator test: atomic records verified");

  await pointerRef.set({ activeVersion: null, fundingRef: null });
  assert.deepEqual(await issueNewUserWelcomeCoins(db, evidence(ownerUid)), {
    status: "ALREADY_GRANTED",
    rewardId: ownerGrant.rewardId,
    amountCoins,
  });
  assert.equal((await db.doc(`wallet_accounts/${ownerUid}`).get()).data().availableCoins, amountCoins);
  assert.equal((await usageRef.get()).data().issuedGrantCount, maxGrantCount);
  assert.deepEqual(await issueNewUserWelcomeCoins(db, evidence(pausedUid)), { status: "NOT_CONFIGURED" });
  assert.equal((await db.doc(`wallet_accounts/${pausedUid}`).get()).exists, false);
  assert.equal((await usageRef.get()).data().issuedGrantCount, maxGrantCount);
  console.log("emulator test: paused campaign still returns stable prior grant without credit");

  const damagedEntries = journalSnapshot.data().entries.map((entry, index) => index === 0
    ? { ...entry, accountKey: `test-unexpected-funding:${testSuffix}` }
    : entry);
  await db.doc(`ledger_transactions/${ownerGrant.rewardId}_COIN`).update({ entries: damagedEntries });
  await assert.rejects(issueNewUserWelcomeCoins(db, evidence(ownerUid)),
    /partial or conflicting prior grant/);
  assert.equal((await db.doc(`wallet_accounts/${ownerUid}`).get()).data().availableCoins, amountCoins);
  assert.equal((await usageRef.get()).data().issuedGrantCount, maxGrantCount);
  console.log("emulator test: conflicting prior journal rejected without a second credit");

  const rulesText = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");
  rulesTestEnv = await initializeTestEnvironment({ projectId, firestore: { rules: rulesText } });
  t.after(async () => { await rulesTestEnv?.cleanup(); });
  const ownerClient = rulesTestEnv.authenticatedContext(ownerUid).firestore();
  const otherClient = rulesTestEnv.authenticatedContext(lateCappedUid).firestore();
  const reviewerClient = rulesTestEnv.authenticatedContext(`coins-reviewer-${testSuffix}`, {
    adminRole: "kyc_reviewer",
  }).firestore();
  await assertFails(getDoc(doc(ownerClient, `wallet_accounts/${ownerUid}`)));
  await assertFails(getDoc(doc(ownerClient, `wallet_accounts/${ownerUid}/statement/${ownerGrant.rewardId}_COIN`)));
  await assertFails(getDoc(doc(ownerClient, `welcome_coin_identity_private/${ownerUid}`)));
  await assertFails(getDoc(doc(ownerClient, `welcome_coin_person_claims/${ownerPersonKey}`)));
  await assertFails(getDoc(doc(ownerClient, `welcome_coin_identity_cases/${ownerUid}`)));
  await assertSucceeds(getDoc(doc(reviewerClient, `welcome_coin_identity_cases/${ownerUid}`)));
  await assertFails(getDoc(doc(otherClient, `wallet_accounts/${ownerUid}`)));
  await assertFails(setDoc(doc(ownerClient, "wallet_accounts/client-created"), {
    status: "ACTIVE",
    availableCoins: 1_000_000,
    reservedCoins: 0,
  }));
  await assertFails(updateDoc(doc(ownerClient, `wallet_accounts/${ownerUid}`), {
    availableCoins: 1_000_000,
  }));
  await assertFails(setDoc(doc(ownerClient, "ledger_transactions/client-forged"), {
    operationId: "client-forged",
    asset: "COIN",
    entries: [
      { accountKey: `user:${ownerUid}:available`, signedAmount: 1_000_000 },
      { accountKey: "platform:promo_fund", signedAmount: -1_000_000 },
    ],
  }));
  await assertFails(setDoc(doc(ownerClient, `welcome_coin_person_claims/client-forged`), { ownerUid }));
  console.log("emulator test: client direct wallet/ledger reads and writes denied");

  await assert.rejects(
    getCoinWallet.run({ auth: null, data: {} }),
    (error) => error.code === "unauthenticated",
  );
  const ownerView = await getCoinWallet.run({ auth: { uid: ownerUid, token: { uid: ownerUid } }, data: {} });
  assert.equal(ownerView.status, "ACTIVE");
  assert.equal(ownerView.availableCoins, amountCoins);
  assert.equal(ownerView.entries.length, 1);
  const crossUserView = await getCoinWallet.run({
    auth: { uid: lateCappedUid, token: { uid: lateCappedUid } },
    data: { uid: ownerUid },
  });
  assert.deepEqual(crossUserView, { status: "NO_WALLET", entries: [] });
  console.log("emulator test: callable auth scoping verified");
});
