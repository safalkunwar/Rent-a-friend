import {createHash} from "node:crypto";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";

const ENABLED_ENVIRONMENT_FLAG = "SATHI_PROFILE_UNLOCK_COINS_ENABLED";
const POLICY_POINTER = "coin_profile_unlock_policies/current";
const POLICY_PREFIX = "coin_profile_unlock_policies/profile_v";
const FREE_DAILY_GRANTS = 5;
const MAX_SPEND_LOTS = 20;
const OPERATION_KIND = "COIN_PROFILE_UNLOCK";
const PURPOSE = "PROFILE_UNLOCK";

export type ProfileUnlockResult =
  | {
      status:
        | "FEATURE_DISABLED"
        | "NOT_CONFIGURED"
        | "INELIGIBLE"
        | "BLOCKED"
        | "INSUFFICIENT_COINS"
        | "CONSOLIDATION_REQUIRED"
        | "WALLET_UNAVAILABLE";
    }
  | {
      status: "FREE_GRANTED" | "COINS_GRANTED" | "ALREADY_GRANTED";
      unlockId: string;
      chargedCoins: number;
      policyVersion: number;
    };

interface UnlockPolicy {
  schemaVersion: number;
  policyVersion: number;
  status: string;
  purpose: string;
  coinPrice: number;
  freeDailyLimit: number;
  cashEligible: boolean;
  effectiveStartMillis: number;
  effectiveEndMillis: number;
  approvalRef: string;
  creditAccountKey: string;
}

interface WalletLot {
  id: string;
  available: number;
  reserved: number;
  amountCoins: number;
  sourceType: string;
  sourceId: string;
  createdAtMillis: number;
  ref: FirebaseFirestore.DocumentReference;
}

/** Returns a stable SHA-256 digest for an operation value.
 * @param {string} value Value to hash.
 * @return {string} Lowercase hexadecimal digest.
 */
function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Checks whether a value is a non-negative safe integer.
 * @param {*} value Candidate value.
 * @return {boolean} Whether it is a safe non-negative integer.
 */
function isSafeCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

/** Checks whether a value is a positive safe integer.
 * @param {*} value Candidate value.
 * @return {boolean} Whether it is a safe positive integer.
 */
function isPositiveSafeCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

/** Checks whether a UID matches the accepted Firebase identifier shape.
 * @param {*} value Candidate UID.
 * @return {boolean} Whether it matches the accepted identifier shape.
 */
function validUid(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

/** Checks whether a request ID is safe for deterministic document IDs.
 * @param {*} value Candidate request ID.
 * @return {boolean} Whether it matches the accepted identifier shape.
 */
function validRequestId(value: unknown): value is string {
  return (
    typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/.test(value)
  );
}

/** Converts a timestamp into its Asia/Kathmandu calendar-day key.
 * @param {number} nowMillis Timestamp in milliseconds.
 * @return {string} Local date formatted as YYYY-MM-DD.
 */
function kathmanduDateKey(nowMillis: number): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(nowMillis));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

/** Validates the immutable, approved policy for one paid profile unlock.
 * @param {DocumentData} data Policy document data.
 * @param {number} version Expected policy version.
 * @return {UnlockPolicy} Validated policy.
 */
function validatePolicy(data: DocumentData, version: number): UnlockPolicy {
  if (
    data.schemaVersion !== 1 ||
    data.policyVersion !== version ||
    data.status !== "APPROVED" ||
    data.purpose !== PURPOSE ||
    data.cashEligible !== false ||
    !isPositiveSafeCount(data.coinPrice) ||
    data.freeDailyLimit !== FREE_DAILY_GRANTS ||
    !isSafeCount(data.effectiveStartMillis) ||
    !isSafeCount(data.effectiveEndMillis) ||
    data.effectiveEndMillis < data.effectiveStartMillis ||
    typeof data.approvalRef !== "string" ||
    !data.approvalRef.trim() ||
    typeof data.creditAccountKey !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(data.creditAccountKey) ||
    data.creditAccountKey.startsWith("user:")
  ) {
    throw new Error(
      "Profile unlock integrity error: approved policy is missing or invalid",
    );
  }
  return data as UnlockPolicy;
}

/** Checks the server-owned access projection for the requested role.
 * @param {DocumentData|undefined} data Access projection.
 * @param {string} role Requested access role.
 * @return {boolean} Whether the role is active and eligible.
 */
function accessIsEligible(
  data: DocumentData | undefined,
  role: "VIEWER" | "PROVIDER",
): boolean {
  if (
    !data ||
    data.status !== "ACTIVE" ||
    !isPositiveSafeCount(data.policyVersion)
  ) {
    return false;
  }
  return role === "VIEWER" ?
    data.coinProfileUnlockEligible === true :
    data.coinProfileProviderEligible === true;
}

/** Validates canonical provider identity and its approved KYC application.
 * @param {DocumentData|undefined} profile Public provider profile.
 * @param {DocumentData|undefined} account Provider account document.
 * @param {DocumentData|undefined} application Approved application document.
 * @param {string} providerUid Expected canonical provider UID.
 * @return {boolean} Whether all identity and approval fields agree.
 */
function profileIsEligible(
  profile: DocumentData | undefined,
  account: DocumentData | undefined,
  application: DocumentData | undefined,
  providerUid: string,
): boolean {
  const applicationId = profile?.approvalApplicationId;
  return Boolean(
    profile &&
      account &&
      application &&
      profile.id === providerUid &&
      profile.userId === providerUid &&
      profile.isVerified === true &&
      typeof applicationId === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(applicationId) &&
      account.companionStatus === "APPROVED" &&
      account.companionApprovalApplicationId === applicationId &&
      application.userId === providerUid &&
      application.status === "APPROVED" &&
      application.kyc?.verificationStatus === "VERIFIED",
  );
}

/** Parses an open, non-cash wallet lot or rejects malformed source data.
 * @param {QueryDocumentSnapshot} snapshot Firestore lot snapshot.
 * @return {WalletLot|null} Validated lot or null if malformed.
 */
function readLot(snapshot: QueryDocumentSnapshot): WalletLot | null {
  const lot = snapshot.data();
  const createdAt =
    lot.createdAt instanceof Timestamp ? lot.createdAt.toMillis() : null;
  if (
    lot.grantId !== snapshot.id ||
    lot.state !== "OPEN" ||
    lot.cashEligible !== false ||
    !isPositiveSafeCount(lot.amountCoins) ||
    !isSafeCount(lot.remainingAvailable) ||
    !isSafeCount(lot.remainingReserved) ||
    BigInt(lot.remainingAvailable) + BigInt(lot.remainingReserved) >
      BigInt(lot.amountCoins) ||
    typeof lot.sourceType !== "string" ||
    !/^[A-Z][A-Z0-9_]{0,79}$/.test(lot.sourceType) ||
    typeof lot.sourceId !== "string" ||
    !lot.sourceId ||
    typeof lot.fundingRef !== "string" ||
    lot.journalRef !== `ledger_transactions/${snapshot.id}_COIN` ||
    typeof createdAt !== "number"
  ) {
    return null;
  }
  return {
    id: snapshot.id,
    available: lot.remainingAvailable,
    reserved: lot.remainingReserved,
    amountCoins: lot.amountCoins,
    sourceType: lot.sourceType,
    sourceId: lot.sourceId,
    createdAtMillis: createdAt,
    ref: snapshot.ref,
  };
}

/** Confirms a Coin lot is backed by a balanced user-credit journal.
 * @param {DocumentData|undefined} journal Source grant journal.
 * @param {WalletLot} lot Wallet lot to validate.
 * @param {string} actorUid Owner UID of the lot.
 * @return {boolean} Whether the journal backs the lot exactly.
 */
function isBackedByGrantJournal(
  journal: DocumentData | undefined,
  lot: WalletLot,
  actorUid: string,
): boolean {
  const entries = journal?.entries;
  if (
    !journal ||
    journal.id !== `${lot.id}_COIN` ||
    journal.asset !== "COIN" ||
    journal.sourceType !== lot.sourceType ||
    journal.sourceId !== lot.sourceId ||
    !Array.isArray(entries) ||
    entries.length < 2 ||
    entries.length > 50 ||
    journal.reversalOf !== undefined
  ) {
    return false;
  }
  const accounts = new Set<string>();
  let sum = BigInt(0);
  let userCredit = 0;
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry.accountKey !== "string" ||
      !entry.accountKey ||
      !Number.isSafeInteger(entry.signedAmount) ||
      entry.signedAmount === 0 ||
      accounts.has(entry.accountKey)
    ) {
      return false;
    }
    accounts.add(entry.accountKey);
    sum += BigInt(entry.signedAmount);
    if (entry.accountKey === `user:${actorUid}:available`) {
      userCredit = entry.signedAmount;
    }
  }
  return sum === BigInt(0) && userCredit === lot.amountCoins;
}

/** Plans oldest-first Coin consumption within the transaction read bound.
 * @param {WalletLot[]} lots Available wallet lots.
 * @param {number} amount Coins to consume.
 * @return {object} Allocation plan or a closed failure status.
 */
function planLots(
  lots: readonly WalletLot[],
  amount: number,
):
  | { status: "READY"; allocations: Array<{ lot: WalletLot; amount: number }> }
  | { status: "INSUFFICIENT" | "CONSOLIDATION_REQUIRED" } {
  const eligible = lots
    .filter((lot) => lot.available > 0)
    .slice()
    .sort(
      (a, b) =>
        a.createdAtMillis - b.createdAtMillis ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  const total = eligible.reduce(
    (sum, lot) => sum + BigInt(lot.available),
    BigInt(0),
  );
  if (total < BigInt(amount)) {
    return {
      status:
        lots.length > MAX_SPEND_LOTS ?
          "CONSOLIDATION_REQUIRED" :
          "INSUFFICIENT",
    };
  }
  let remaining = amount;
  const allocations: Array<{ lot: WalletLot; amount: number }> = [];
  for (const lot of eligible) {
    if (allocations.length === MAX_SPEND_LOTS) {
      return {status: "CONSOLIDATION_REQUIRED"};
    }
    const allocated = Math.min(remaining, lot.available);
    allocations.push({lot, amount: allocated});
    remaining -= allocated;
    if (remaining === 0) return {status: "READY", allocations};
  }
  return {status: "INSUFFICIENT"};
}

/** Validates a stored command result before returning an idempotent replay.
 * @param {DocumentData|undefined} data Stored operation document.
 * @param {string} actorUid Expected viewer UID.
 * @param {string} providerUid Expected provider UID.
 * @param {string} requestId Expected request ID.
 * @return {ProfileUnlockResult|null} Valid replay or null when absent.
 */
function operationResponse(
  data: DocumentData | undefined,
  actorUid: string,
  providerUid: string,
  requestId: string,
): ProfileUnlockResult | null {
  if (!data) return null;
  const response = data.response;
  const expectedUnlockId = `${actorUid}_${providerUid}`;
  if (
    data.actorUid !== actorUid ||
    data.providerUid !== providerUid ||
    data.requestId !== requestId ||
    data.operationType !== OPERATION_KIND ||
    data.intentHash !==
      hash([OPERATION_KIND, actorUid, providerUid].join("|")) ||
    data.status !== "COMMITTED" ||
    !response ||
    !["FREE_GRANTED", "COINS_GRANTED", "ALREADY_GRANTED"].includes(
      response.status,
    ) ||
    response.unlockId !== expectedUnlockId ||
    !isSafeCount(response.chargedCoins) ||
    !isPositiveSafeCount(response.policyVersion) ||
    (response.status === "COINS_GRANTED" && response.chargedCoins === 0) ||
    (response.status !== "COINS_GRANTED" && response.chargedCoins !== 0)
  ) {
    throw new Error(
      "Profile unlock integrity error: conflicting operation replay",
    );
  }
  return response as ProfileUnlockResult;
}

/**
 * Grants a daily free or funded Coin unlock in one Firestore transaction.
 * Eligibility comes only from server-owned access, profile, application, and
 * block documents. Caller-supplied prices, roles, dates, and quotas are
 * ignored.
 *
 * @param {Firestore} db Firestore instance used for the transaction.
 * @param {string} actorUid Authenticated viewer UID.
 * @param {string} providerUid Canonical companion UID to unlock.
 * @param {string} requestId Stable caller-generated idempotency key.
 * @param {number} nowMillis Trusted transaction timestamp in milliseconds.
 * @return {Promise<ProfileUnlockResult>} Grant state and applied policy.
 */
export async function grantProfileUnlockWithCoins(
  db: Firestore,
  actorUid: string,
  providerUid: string,
  requestId: string,
  nowMillis = Date.now(),
): Promise<ProfileUnlockResult> {
  if (
    !validUid(actorUid) ||
    !validUid(providerUid) ||
    !validRequestId(requestId) ||
    actorUid === providerUid ||
    !isSafeCount(nowMillis)
  ) {
    return {status: "INELIGIBLE"};
  }

  const dateKey = kathmanduDateKey(nowMillis);
  const unlockId = `${actorUid}_${providerUid}`;
  const operationId = hash([OPERATION_KIND, actorUid, requestId].join("|"));
  const commandRef = db
    .collection("profile_unlock_operations")
    .doc(`${actorUid}_${requestId}`);
  const ledgerOperationRef = db
    .collection("operations")
    .doc(`${actorUid}_${requestId}`);
  const commandIntentHash = hash(
    [OPERATION_KIND, actorUid, providerUid].join("|"),
  );
  const unlockRef = db.collection("profile_unlocks").doc(unlockId);
  const pointerRef = db.doc(POLICY_POINTER);
  const viewerAccessRef = db.doc(`users/${actorUid}/access/current`);
  const providerAccessRef = db.doc(`users/${providerUid}/access/current`);
  const providerProfileRef = db.doc(`companions/${providerUid}`);
  const providerUserRef = db.doc(`users/${providerUid}`);
  const viewerBlockRef = db.doc(`users/${actorUid}/blocks/${providerUid}`);
  const providerBlockRef = db.doc(`users/${providerUid}/blocks/${actorUid}`);
  const usageRef = db.doc(`discovery_usage/${actorUid}_${dateKey}`);
  const walletRef = db.doc(`wallet_accounts/${actorUid}`);

  return db.runTransaction(async (transaction) => {
    const priorOperationSnapshot = await transaction.get(commandRef);
    const replay = operationResponse(
      priorOperationSnapshot.data(),
      actorUid,
      providerUid,
      requestId,
    );
    if (replay) return replay;

    const [
      unlockSnapshot,
      viewerAccessSnapshot,
      providerAccessSnapshot,
      profileSnapshot,
      providerUserSnapshot,
      viewerBlockSnapshot,
      providerBlockSnapshot,
      usageSnapshot,
      walletSnapshot,
    ] = await transaction.getAll(
      unlockRef,
      viewerAccessRef,
      providerAccessRef,
      providerProfileRef,
      providerUserRef,
      viewerBlockRef,
      providerBlockRef,
      usageRef,
      walletRef,
    );
    if (viewerBlockSnapshot.exists || providerBlockSnapshot.exists) {
      return {status: "BLOCKED"};
    }
    if (unlockSnapshot.exists) {
      const prior = unlockSnapshot.data();
      if (!prior) {
        throw new Error("Profile unlock integrity error: entitlement is empty");
      }
      if (
        prior.uid !== actorUid ||
        prior.providerUid !== providerUid ||
        prior.status !== "GRANTED" ||
        !isPositiveSafeCount(prior.policyVersion) ||
        !["FREE", "COINS"].includes(String(prior.sourceFreeOrCoins))
      ) {
        throw new Error(
          "Profile unlock integrity error: prior entitlement is conflicting",
        );
      }
      const response: ProfileUnlockResult = {
        status: "ALREADY_GRANTED",
        unlockId,
        chargedCoins: 0,
        policyVersion: prior.policyVersion,
      };
      transaction.create(commandRef, {
        actorUid,
        providerUid,
        requestId,
        operationType: OPERATION_KIND,
        intentHash: commandIntentHash,
        status: "COMMITTED",
        response,
        createdAtMillis: nowMillis,
        createdAt: FieldValue.serverTimestamp(),
      });
      return response;
    }

    if (
      !accessIsEligible(viewerAccessSnapshot.data(), "VIEWER") ||
      !accessIsEligible(providerAccessSnapshot.data(), "PROVIDER")
    ) {
      return {status: "INELIGIBLE"};
    }

    const profile = profileSnapshot.data();
    const applicationId = profile?.approvalApplicationId;
    if (typeof applicationId !== "string" || applicationId.length === 0) {
      return {status: "INELIGIBLE"};
    }
    const applicationRef = db.doc(`companion_applications/${applicationId}`);
    const applicationSnapshot = await transaction.get(applicationRef);
    if (
      !profileIsEligible(
        profile,
        providerUserSnapshot.data(),
        applicationSnapshot.data(),
        providerUid,
      )
    ) {
      return {status: "INELIGIBLE"};
    }

    const usage = usageSnapshot.data() ?? {freeUsed: 0};
    const viewerAccess = viewerAccessSnapshot.data();
    if (!viewerAccess) return {status: "INELIGIBLE"};
    const viewerPolicyVersion = Number(viewerAccess.policyVersion);
    if (
      !isSafeCount(usage.freeUsed) ||
      usage.freeUsed > FREE_DAILY_GRANTS ||
      (usage.uid !== undefined && usage.uid !== actorUid) ||
      (usage.dateKey !== undefined && usage.dateKey !== dateKey)
    ) {
      throw new Error(
        "Profile unlock integrity error: daily usage record is invalid",
      );
    }

    if (usage.freeUsed < FREE_DAILY_GRANTS) {
      const response: ProfileUnlockResult = {
        status: "FREE_GRANTED",
        unlockId,
        chargedCoins: 0,
        policyVersion: viewerPolicyVersion,
      };
      transaction.create(unlockRef, {
        uid: actorUid,
        providerUid,
        sourceFreeOrCoins: "FREE",
        status: "GRANTED",
        policyVersion: viewerPolicyVersion,
        journalRef: null,
        grantedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(
        usageRef,
        {
          uid: actorUid,
          dateKey,
          freeUsed: usage.freeUsed + 1,
          policyVersion: viewerPolicyVersion,
          updatedAt: FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
      transaction.create(commandRef, {
        actorUid,
        providerUid,
        requestId,
        operationType: OPERATION_KIND,
        intentHash: commandIntentHash,
        status: "COMMITTED",
        response,
        createdAtMillis: nowMillis,
        createdAt: FieldValue.serverTimestamp(),
      });
      return response;
    }

    if (process.env[ENABLED_ENVIRONMENT_FLAG] !== "true") {
      return {status: "FEATURE_DISABLED"};
    }
    const pointerSnapshot = await transaction.get(pointerRef);
    const pointer = pointerSnapshot.data();
    if (!pointer || !isPositiveSafeCount(pointer.activeVersion)) {
      return {status: "NOT_CONFIGURED"};
    }
    const policyVersion = Number(pointer.activeVersion);
    const policyRef = db.doc(`${POLICY_PREFIX}${policyVersion}`);
    const policySnapshot = await transaction.get(policyRef);
    if (!policySnapshot.exists) {
      throw new Error(
        "Profile unlock integrity error: active policy is missing",
      );
    }
    const policyData = policySnapshot.data();
    if (!policyData) {
      throw new Error("Profile unlock integrity error: active policy is empty");
    }
    const policy = validatePolicy(policyData, policyVersion);
    if (
      nowMillis < policy.effectiveStartMillis ||
      nowMillis > policy.effectiveEndMillis
    ) {
      return {status: "NOT_CONFIGURED"};
    }
    if (
      !isSafeCount(usage.freeUsed) ||
      usage.freeUsed > policy.freeDailyLimit
    ) {
      throw new Error(
        "Profile unlock integrity error: daily usage exceeds the active policy",
      );
    }

    if (!walletSnapshot.exists) return {status: "INSUFFICIENT_COINS"};
    const wallet = walletSnapshot.data();
    if (!wallet) return {status: "WALLET_UNAVAILABLE"};
    if (
      wallet.status !== "ACTIVE" ||
      !isSafeCount(wallet.availableCoins) ||
      !isSafeCount(wallet.reservedCoins) ||
      !isSafeCount(wallet.cumulativeCreditedCoins) ||
      !isSafeCount(wallet.cumulativeDebitedCoins) ||
      !isSafeCount(wallet.version)
    ) {
      return {status: "WALLET_UNAVAILABLE"};
    }
    if (wallet.availableCoins < policy.coinPrice) {
      return {status: "INSUFFICIENT_COINS"};
    }
    if (
      BigInt(wallet.availableCoins) + BigInt(wallet.reservedCoins) >
        BigInt(Number.MAX_SAFE_INTEGER) ||
      BigInt(wallet.cumulativeDebitedCoins) + BigInt(policy.coinPrice) >
        BigInt(Number.MAX_SAFE_INTEGER) ||
      BigInt(wallet.version) + BigInt(1) > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      throw new Error(
        "Profile unlock integrity error: wallet projection overflow",
      );
    }

    const lotsQuery = walletRef
      .collection("lots")
      .where("state", "==", "OPEN")
      .orderBy("createdAt", "asc")
      .limit(MAX_SPEND_LOTS + 1);
    const lotSnapshot = await transaction.get(lotsQuery);
    const lots = lotSnapshot.docs.map(readLot);
    if (lots.some((lot) => lot === null)) {
      throw new Error("Profile unlock integrity error: malformed open lot");
    }
    const validLots = lots as WalletLot[];
    if (validLots.length > MAX_SPEND_LOTS) {
      return {status: "CONSOLIDATION_REQUIRED"};
    }
    const projectedAvailable = validLots.reduce(
      (sum, lot) => sum + BigInt(lot.available),
      BigInt(0),
    );
    if (projectedAvailable !== BigInt(wallet.availableCoins)) {
      throw new Error(
        "Profile unlock integrity error: wallet lots do not reconcile",
      );
    }
    const sourceJournalRefs = validLots.map((lot) =>
      db.doc(`ledger_transactions/${lot.id}_COIN`),
    );
    const sourceJournals = sourceJournalRefs.length ?
      await transaction.getAll(...sourceJournalRefs) :
      [];
    for (let index = 0; index < validLots.length; index += 1) {
      const lot = validLots[index];
      const journalSnapshot = sourceJournals[index];
      if (
        !journalSnapshot?.exists ||
        !isBackedByGrantJournal(journalSnapshot.data(), lot, actorUid)
      ) {
        throw new Error(
          "Profile unlock integrity error: source lot has no valid journal",
        );
      }
    }
    const plan = planLots(validLots, policy.coinPrice);
    if (plan.status !== "READY") {
      return plan.status === "CONSOLIDATION_REQUIRED" ||
        validLots.length > MAX_SPEND_LOTS ?
        {status: "CONSOLIDATION_REQUIRED"} :
        {status: "INSUFFICIENT_COINS"};
    }

    const journalId = `${operationId}_COIN`;
    const journalRef = db.doc(`ledger_transactions/${journalId}`);
    const statementRef = walletRef.collection("statement").doc(journalId);
    const intentHash = commandIntentHash;
    const response: ProfileUnlockResult = {
      status: "COINS_GRANTED",
      unlockId,
      chargedCoins: policy.coinPrice,
      policyVersion,
    };

    transaction.create(journalRef, {
      operationId,
      asset: "COIN",
      entries: [
        {
          accountKey: `user:${actorUid}:available`,
          signedAmount: -policy.coinPrice,
        },
        {accountKey: policy.creditAccountKey, signedAmount: policy.coinPrice},
      ],
      lotAllocations: plan.allocations.map(({lot, amount}) => ({
        lotId: lot.id,
        amountCoins: amount,
      })),
      sourceType: OPERATION_KIND,
      sourceId: unlockId,
      sourceVersion: 1,
      policyVersion,
      actorUid,
      idempotencyKeyHash: hash(`${actorUid}|${requestId}`),
      intentHash,
      createdAt: FieldValue.serverTimestamp(),
    });
    for (const allocation of plan.allocations) {
      const remainingAvailable = allocation.lot.available - allocation.amount;
      const remainingReserved = allocation.lot.reserved;
      transaction.update(allocation.lot.ref, {
        remainingAvailable,
        state:
          remainingAvailable + remainingReserved === 0 ? "CONSUMED" : "OPEN",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.update(walletRef, {
      availableCoins: wallet.availableCoins - policy.coinPrice,
      cumulativeDebitedCoins: wallet.cumulativeDebitedCoins + policy.coinPrice,
      version: wallet.version + 1,
      sourceJournalCheckpoint: journalRef.path,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(statementRef, {
      journalRef: journalRef.path,
      deltaCoins: -policy.coinPrice,
      direction: "DEBIT",
      purpose: PURPOSE,
      displayLabel: "Profile unlock",
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(unlockRef, {
      uid: actorUid,
      providerUid,
      sourceFreeOrCoins: "COINS",
      status: "GRANTED",
      policyVersion,
      journalRef: journalRef.path,
      grantedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(ledgerOperationRef, {
      id: `${actorUid}_${requestId}`,
      operationId,
      actorUid,
      requestId,
      operationType: OPERATION_KIND,
      expectedAssets: ["COIN"],
      intentHash,
      status: "COMMITTED",
      resultJournalIds: [journalId],
      version: 1,
      createdAtMillis: nowMillis,
      updatedAtMillis: nowMillis,
      providerUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(commandRef, {
      actorUid,
      providerUid,
      requestId,
      operationType: OPERATION_KIND,
      intentHash: commandIntentHash,
      status: "COMMITTED",
      response,
      resultJournalIds: [journalId],
      createdAtMillis: nowMillis,
      createdAt: FieldValue.serverTimestamp(),
    });
    return response;
  });
}
