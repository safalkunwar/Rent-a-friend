import {createHash} from "node:crypto";
import {
  FieldValue,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
} from "firebase-admin/firestore";

const CAMPAIGN_POINTER = "coin_reward_campaigns/current_welcome";
const CAMPAIGN_USAGE_PREFIX = "coin_reward_campaign_usage/welcome_v";
const FUNDING_PREFIX = "coin_reward_funding/";
const ENABLED_ENVIRONMENT_FLAG = "SATHI_WELCOME_COINS_ENABLED";
const REWARD_KIND = "NEW_USER_WELCOME";
const SOURCE_KIND = "NEW_USER_SIGNUP";

export interface WelcomeAccountEvidence {
  uid: string;
  createdAtMillis: number;
  disabled: boolean;
}

export type WelcomeGrantResult =
  | { status: "GRANTED"; rewardId: string; amountCoins: number }
  | { status: "ALREADY_GRANTED"; rewardId: string; amountCoins: number }
  | {
      status:
        | "NOT_CONFIGURED"
        | "INELIGIBLE"
        | "NOT_FUNDED"
        | "CAP_REACHED"
        | "WALLET_BLOCKED";
    };

/** Returns required document data or fails on a missing record.
 * @param {DocumentSnapshot} snapshot Firestore document snapshot.
 * @param {string} label Name used in the integrity error.
 * @return {DocumentData} Existing document data.
 */
function requireRecord(
  snapshot: DocumentSnapshot,
  label: string,
): DocumentData {
  if (!snapshot.exists) {
    throw new Error(`Welcome grant integrity error: missing ${label}`);
  }
  const data = snapshot.data();
  if (!data) {
    throw new Error(`Welcome grant integrity error: empty ${label}`);
  }
  return data;
}

/** Checks whether a value is a positive safe integer.
 * @param {*} value Candidate value.
 * @return {boolean} Whether it is a safe positive integer.
 */
function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

/** Checks whether a value is a non-negative safe integer.
 * @param {*} value Candidate value.
 * @return {boolean} Whether it is a safe non-negative integer.
 */
function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

/** Hashes a stable reward input into a document-safe identifier.
 * @param {string} value Input to hash.
 * @return {string} Lowercase SHA-256 digest.
 */
function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Derives the unique reward ID for an account's welcome grant.
 * @param {string} uid Authenticated account UID.
 * @return {string} Stable reward identifier.
 */
function makeRewardId(uid: string): string {
  const fields = [SOURCE_KIND, uid, uid, REWARD_KIND];
  return hash(fields.map((field) => `${field.length}:${field}`).join("|"));
}

/** Validates the immutable approved campaign policy and budget bound.
 * @param {DocumentData} policy Campaign policy document.
 * @param {number} version Expected version from the active pointer.
 * @return {void} Throws when the policy is invalid.
 */
function validatePolicy(policy: DocumentData, version: number): void {
  if (
    policy.schemaVersion !== 1 ||
    policy.campaignId !== `welcome_v${version}` ||
    policy.policyVersion !== version ||
    policy.status !== "APPROVED"
  ) {
    throw new Error(
      "Welcome grant integrity error: campaign policy is " +
        "invalid or not approved",
    );
  }
  if (
    policy.rewardKind !== REWARD_KIND ||
    policy.sourceKind !== SOURCE_KIND ||
    policy.recipient !== "ACTIVITY_OWNER" ||
    policy.spendPurpose !== "PROFILE_UNLOCK" ||
    policy.postingMode !== "IMMEDIATE" ||
    policy.cashEligible !== false ||
    policy.maxGrantsPerBeneficiary !== 1
  ) {
    throw new Error(
      "Welcome grant integrity error: campaign exceeds the approved " +
        "welcome-grant scope",
    );
  }
  if (
    !isPositiveSafeInteger(policy.amountCoins) ||
    !isPositiveSafeInteger(policy.maxGrantCount) ||
    !isPositiveSafeInteger(policy.budgetNprPaisa) ||
    !isPositiveSafeInteger(version) ||
    !isNonNegativeSafeInteger(policy.effectiveStartMillis) ||
    !isNonNegativeSafeInteger(policy.effectiveEndMillis) ||
    policy.effectiveEndMillis < policy.effectiveStartMillis ||
    typeof policy.fundingRef !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(policy.fundingRef) ||
    typeof policy.approvalRef !== "string" ||
    policy.approvalRef.trim().length === 0 ||
    typeof policy.debitAccountKey !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(policy.debitAccountKey) ||
    policy.amountCoins !== 100
  ) {
    throw new Error(
      "Welcome grant integrity error: campaign policy fields are invalid",
    );
  }
  const liabilityPaisa =
    BigInt(policy.amountCoins) * BigInt(policy.maxGrantCount) * BigInt(10);
  if (liabilityPaisa > BigInt(policy.budgetNprPaisa)) {
    throw new Error(
      "Welcome grant integrity error: campaign cap exceeds the " +
        "approved NPR budget",
    );
  }
}

/**
 * Internal Auth-trigger helper for a trusted backend Auth record. It is not a
 * callable and never creates policy or funding records. An absent active
 * campaign pointer leaves signup unchanged and awards nothing.
 *
 * @param {Firestore} db Firestore instance used for the transaction.
 * @param {WelcomeAccountEvidence} account Trusted Admin Auth account evidence.
 * @return {Promise<WelcomeGrantResult>} Grant result or inactive status.
 */
export async function issueNewUserWelcomeCoins(
  db: Firestore,
  account: WelcomeAccountEvidence,
): Promise<WelcomeGrantResult> {
  if (process.env[ENABLED_ENVIRONMENT_FLAG] !== "true") {
    return {status: "NOT_CONFIGURED"};
  }
  if (
    !account ||
    typeof account.uid !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(account.uid) ||
    !isNonNegativeSafeInteger(account.createdAtMillis) ||
    typeof account.disabled !== "boolean"
  ) {
    return {status: "INELIGIBLE"};
  }
  if (account.disabled) return {status: "INELIGIBLE"};

  const rewardId = makeRewardId(account.uid);
  const pointerRef = db.doc(CAMPAIGN_POINTER);
  const rewardRef = db.collection("rewards").doc(rewardId);
  const walletRef = db.collection("wallet_accounts").doc(account.uid);
  const lotRef = walletRef.collection("lots").doc(rewardId);
  const journalRef = db
    .collection("ledger_transactions")
    .doc(`${rewardId}_COIN`);
  const statementRef = walletRef
    .collection("statement")
    .doc(`${rewardId}_COIN`);

  return db.runTransaction(async (transaction) => {
    const [
      pointerSnapshot,
      rewardSnapshot,
      walletSnapshot,
      lotSnapshot,
      journalSnapshot,
      statementSnapshot,
    ] = await transaction.getAll(
      pointerRef,
      rewardRef,
      walletRef,
      lotRef,
      journalRef,
      statementRef,
    );

    if (rewardSnapshot.exists) {
      const reward = requireRecord(rewardSnapshot, "reward journal pair");
      const version = reward.policyVersion;
      if (!isPositiveSafeInteger(version)) {
        throw new Error("Welcome grant integrity error: prior policy version");
      }
      const priorPolicySnapshot = await transaction.get(
        db.collection("coin_reward_campaigns").doc(`welcome_v${version}`),
      );
      const priorPolicy = requireRecord(
        priorPolicySnapshot,
        "prior campaign policy",
      );
      validatePolicy(priorPolicy, version);
      const lot = lotSnapshot.data();
      const journal = journalSnapshot.data();
      const statement = statementSnapshot.data();
      const wallet = walletSnapshot.data();
      const expectedIntentHash = hash(
        [
          rewardId,
          priorPolicy.amountCoins,
          priorPolicy.fundingRef,
          version,
        ].join("|"),
      );
      const expectedUserAccount = `user:${account.uid}:available`;
      if (
        !walletSnapshot.exists ||
        !lotSnapshot.exists ||
        !journalSnapshot.exists ||
        !statementSnapshot.exists ||
        reward.beneficiaryUid !== account.uid ||
        reward.sourceKind !== SOURCE_KIND ||
        reward.sourceId !== account.uid ||
        reward.sourceVersion !== 1 ||
        reward.sourceCreatedAtMillis !== account.createdAtMillis ||
        reward.rewardKind !== REWARD_KIND ||
        reward.level !== 1 ||
        reward.status !== "POSTED" ||
        reward.cashEligible !== false ||
        reward.amountCoins !== priorPolicy.amountCoins ||
        reward.policyVersion !== version ||
        reward.fundingRef !== priorPolicy.fundingRef ||
        reward.approvalRef !== priorPolicy.approvalRef ||
        reward.spendPurpose !== "PROFILE_UNLOCK" ||
        reward.ledgerRef !== journalRef.path ||
        lot?.grantId !== rewardId ||
        lot?.journalRef !== journalRef.path ||
        lot?.sourceType !== SOURCE_KIND ||
        lot?.sourceId !== account.uid ||
        lot?.fundingRef !== priorPolicy.fundingRef ||
        lot?.amountCoins !== reward.amountCoins ||
        lot?.cashEligible !== false ||
        !isNonNegativeSafeInteger(lot?.remainingAvailable) ||
        !isNonNegativeSafeInteger(lot?.remainingReserved) ||
        BigInt(lot.remainingAvailable) + BigInt(lot.remainingReserved) >
          BigInt(reward.amountCoins) ||
        !["OPEN", "CONSUMED", "FROZEN"].includes(String(lot?.state)) ||
        statement?.journalRef !== journalRef.path ||
        statement?.deltaCoins !== reward.amountCoins ||
        statement?.direction !== "CREDIT" ||
        statement?.purpose !== REWARD_KIND ||
        statement?.displayLabel !== "Welcome Coins" ||
        journal?.operationId !== rewardId ||
        journal?.asset !== "COIN" ||
        journal?.sourceType !== SOURCE_KIND ||
        journal?.sourceId !== account.uid ||
        journal?.sourceVersion !== reward.sourceVersion ||
        journal?.policyVersion !== version ||
        journal?.idempotencyKeyHash !== hash(rewardId) ||
        journal?.intentHash !== expectedIntentHash ||
        !Array.isArray(journal?.entries) ||
        journal.entries.length !== 2 ||
        !journal.entries.some(
          (entry: DocumentData) =>
            entry.accountKey === expectedUserAccount &&
            entry.signedAmount === reward.amountCoins,
        ) ||
        !journal.entries.some(
          (entry: DocumentData) =>
            entry.accountKey === priorPolicy.debitAccountKey &&
            entry.signedAmount === -reward.amountCoins,
        ) ||
        !["ACTIVE", "FROZEN", "CLOSED"].includes(String(wallet?.status)) ||
        ![
          "availableCoins",
          "reservedCoins",
          "cumulativeCreditedCoins",
          "cumulativeDebitedCoins",
          "version",
        ].every((field) => isNonNegativeSafeInteger(wallet?.[field]))
      ) {
        throw new Error(
          "Welcome grant integrity error: partial or conflicting prior grant",
        );
      }
      return {
        status: "ALREADY_GRANTED",
        rewardId,
        amountCoins: Number(reward.amountCoins),
      };
    }
    if (
      lotSnapshot.exists ||
      journalSnapshot.exists ||
      statementSnapshot.exists
    ) {
      throw new Error(
        "Welcome grant integrity error: orphan lot, journal, or " +
          "statement exists",
      );
    }
    const pointer = pointerSnapshot.data();
    if (!pointerSnapshot.exists || !pointer?.activeVersion) {
      return {status: "NOT_CONFIGURED"};
    }

    const version = pointer.activeVersion;
    if (!isPositiveSafeInteger(version)) {
      throw new Error("Welcome grant integrity error: active policy version");
    }
    const usageRef = db.doc(`${CAMPAIGN_USAGE_PREFIX}${version}`);
    const policySnapshotRef = db
      .collection("coin_reward_campaigns")
      .doc(`welcome_v${version}`);
    const fundingRef = db.doc(
      `${FUNDING_PREFIX}${String(pointer.fundingRef ?? "")}`,
    );
    const [policySnapshot, usageSnapshot, fundingSnapshot] =
      await transaction.getAll(policySnapshotRef, usageRef, fundingRef);
    const policy = requireRecord(policySnapshot, "active campaign policy");
    validatePolicy(policy, version);
    if (
      account.createdAtMillis < policy.effectiveStartMillis ||
      account.createdAtMillis > policy.effectiveEndMillis
    ) {
      return {status: "INELIGIBLE"};
    }
    if (
      fundingRef.id !== policy.fundingRef ||
      pointer.fundingRef !== policy.fundingRef
    ) {
      throw new Error(
        "Welcome grant integrity error: active pointer funding " +
          "reference mismatch",
      );
    }

    const usageData = usageSnapshot.data();
    if (usageSnapshot.exists && !usageData) {
      throw new Error("Welcome grant integrity error: campaign usage is empty");
    }
    const usage = usageData ?? {issuedCoins: 0, issuedGrantCount: 0};
    if (
      !isNonNegativeSafeInteger(usage.issuedCoins) ||
      !isNonNegativeSafeInteger(usage.issuedGrantCount)
    ) {
      throw new Error("Welcome grant integrity error: campaign usage counters");
    }
    if (
      BigInt(usage.issuedCoins) !==
      BigInt(usage.issuedGrantCount) * BigInt(policy.amountCoins)
    ) {
      throw new Error(
        "Welcome grant integrity error: campaign counters do not reconcile",
      );
    }
    if (
      usage.issuedGrantCount >= policy.maxGrantCount ||
      BigInt(usage.issuedCoins) + BigInt(policy.amountCoins) >
        BigInt(policy.amountCoins) * BigInt(policy.maxGrantCount)
    ) {
      return {status: "CAP_REACHED"};
    }

    const funding = fundingSnapshot.data();
    const campaignLiabilityCoins =
      BigInt(policy.amountCoins) * BigInt(policy.maxGrantCount);
    if (
      !funding ||
      funding.status !== "FUNDED" ||
      funding.campaignId !== policy.campaignId ||
      funding.approvalRef !== policy.approvalRef ||
      funding.debitAccountKey !== policy.debitAccountKey ||
      !isNonNegativeSafeInteger(funding.allocatedCoins) ||
      !isNonNegativeSafeInteger(funding.remainingCoins) ||
      BigInt(funding.allocatedCoins) < campaignLiabilityCoins ||
      funding.remainingCoins > funding.allocatedCoins ||
      funding.remainingCoins < policy.amountCoins ||
      BigInt(funding.allocatedCoins) - BigInt(usage.issuedCoins) !==
        BigInt(funding.remainingCoins)
    ) {
      return {status: "NOT_FUNDED"};
    }

    const existingWallet = walletSnapshot.data();
    if (walletSnapshot.exists && !existingWallet) {
      throw new Error("Welcome grant integrity error: wallet is empty");
    }
    const wallet = existingWallet ?? {
      status: "ACTIVE",
      availableCoins: 0,
      reservedCoins: 0,
      cumulativeCreditedCoins: 0,
      cumulativeDebitedCoins: 0,
      version: 0,
    };
    if (wallet.status !== "ACTIVE") return {status: "WALLET_BLOCKED"};
    for (const field of [
      "availableCoins",
      "reservedCoins",
      "cumulativeCreditedCoins",
      "cumulativeDebitedCoins",
      "version",
    ] as const) {
      if (!isNonNegativeSafeInteger(wallet[field])) {
        throw new Error(`Welcome grant integrity error: wallet ${field}`);
      }
    }
    for (const field of [
      "availableCoins",
      "cumulativeCreditedCoins",
      "version",
    ] as const) {
      if (
        BigInt(wallet[field]) +
          BigInt(field === "version" ? 1 : policy.amountCoins) >
        BigInt(Number.MAX_SAFE_INTEGER)
      ) {
        throw new Error(
          "Welcome grant integrity error: wallet projection overflow",
        );
      }
    }

    const now = FieldValue.serverTimestamp();
    const accountKey = `user:${account.uid}:available`;
    if (policy.debitAccountKey === accountKey) {
      throw new Error(
        "Welcome grant integrity error: funding account cannot be " +
          "the beneficiary wallet",
      );
    }
    const journal = {
      operationId: rewardId,
      asset: "COIN",
      entries: [
        {
          accountKey: policy.debitAccountKey,
          signedAmount: -policy.amountCoins,
        },
        {accountKey, signedAmount: policy.amountCoins},
      ],
      sourceType: SOURCE_KIND,
      sourceId: account.uid,
      sourceVersion: 1,
      sourceCreatedAtMillis: account.createdAtMillis,
      policyVersion: version,
      systemActor: "auth-user-create",
      idempotencyKeyHash: hash(rewardId),
      intentHash: hash(
        [rewardId, policy.amountCoins, policy.fundingRef, version].join("|"),
      ),
      createdAt: now,
    };

    transaction.create(journalRef, journal);
    transaction.create(lotRef, {
      grantId: rewardId,
      journalRef: journalRef.path,
      sourceType: SOURCE_KIND,
      sourceId: account.uid,
      fundingRef: policy.fundingRef,
      amountCoins: policy.amountCoins,
      remainingAvailable: policy.amountCoins,
      remainingReserved: 0,
      cashEligible: false,
      state: "OPEN",
      createdAt: now,
    });
    transaction.create(rewardRef, {
      beneficiaryUid: account.uid,
      sourceKind: SOURCE_KIND,
      sourceId: account.uid,
      sourceVersion: 1,
      sourceCreatedAtMillis: account.createdAtMillis,
      rewardKind: REWARD_KIND,
      level: 1,
      amountCoins: policy.amountCoins,
      cashEligible: false,
      fundingRef: policy.fundingRef,
      policyVersion: version,
      approvalRef: policy.approvalRef,
      spendPurpose: policy.spendPurpose,
      status: "POSTED",
      ledgerRef: journalRef.path,
      createdAt: now,
    });
    transaction.create(statementRef, {
      journalRef: journalRef.path,
      deltaCoins: policy.amountCoins,
      direction: "CREDIT",
      purpose: "NEW_USER_WELCOME",
      displayLabel: "Welcome Coins",
      createdAt: now,
    });
    if (walletSnapshot.exists) {
      transaction.update(walletRef, {
        availableCoins: wallet.availableCoins + policy.amountCoins,
        cumulativeCreditedCoins:
          wallet.cumulativeCreditedCoins + policy.amountCoins,
        version: wallet.version + 1,
        sourceJournalCheckpoint: journalRef.path,
        updatedAt: now,
      });
    } else {
      transaction.create(walletRef, {
        ...wallet,
        availableCoins: policy.amountCoins,
        cumulativeCreditedCoins: policy.amountCoins,
        version: 1,
        sourceJournalCheckpoint: journalRef.path,
        updatedAt: now,
        createdAt: now,
      });
    }
    transaction.set(
      usageRef,
      {
        issuedCoins: usage.issuedCoins + policy.amountCoins,
        issuedGrantCount: usage.issuedGrantCount + 1,
        updatedAt: now,
      },
      {merge: true},
    );
    transaction.update(fundingRef, {
      remainingCoins: funding.remainingCoins - policy.amountCoins,
      updatedAt: now,
    });

    return {status: "GRANTED", rewardId, amountCoins: policy.amountCoins};
  });
}
