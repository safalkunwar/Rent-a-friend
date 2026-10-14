import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { issueNewUserWelcomeCoins } = require("../lib/domains/rewards/welcomeGrant.js");
process.env.SATHI_WELCOME_COINS_ENABLED = "true";

class FakeDocumentSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.exists = data !== undefined;
    this.value = data;
  }

  data() {
    return clone(this.value);
  }
}

class FakeDocumentReference {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.id = path.split("/").at(-1);
  }

  collection(name) {
    return new FakeCollectionReference(this.db, `${this.path}/${name}`);
  }
}

class FakeCollectionReference {
  constructor(db, path) {
    this.db = db;
    this.path = path;
  }

  doc(id) {
    return new FakeDocumentReference(this.db, `${this.path}/${id}`);
  }
}

class FakeTransaction {
  constructor(db) {
    this.db = db;
    this.writes = [];
  }

  async getAll(...refs) {
    assert.equal(this.writes.length, 0, "Firestore reads must happen before transaction writes");
    return refs.map((ref) => new FakeDocumentSnapshot(ref, this.db.documents.get(ref.path)));
  }

  async get(ref) {
    assert.equal(this.writes.length, 0, "Firestore reads must happen before transaction writes");
    return new FakeDocumentSnapshot(ref, this.db.documents.get(ref.path));
  }

  create(ref, data) {
    this.writes.push({ type: "create", ref, data: clone(data) });
  }

  update(ref, data) {
    this.writes.push({ type: "update", ref, data: clone(data) });
  }

  set(ref, data, options) {
    this.writes.push({ type: "set", ref, data: clone(data), merge: Boolean(options?.merge) });
  }

  commit() {
    const next = new Map(this.db.documents);
    for (const write of this.writes) {
      const existing = next.get(write.ref.path);
      if (write.type === "create") {
        assert.equal(existing, undefined, `create target already exists: ${write.ref.path}`);
        next.set(write.ref.path, write.data);
      } else if (write.type === "update") {
        assert.notEqual(existing, undefined, `update target is missing: ${write.ref.path}`);
        next.set(write.ref.path, { ...existing, ...write.data });
      } else {
        next.set(write.ref.path, write.merge && existing ? { ...existing, ...write.data } : write.data);
      }
    }
    this.db.documents = next;
  }
}

class FakeFirestore {
  documents = new Map();
  transactionTail = Promise.resolve();

  doc(path) {
    return new FakeDocumentReference(this, path);
  }

  collection(path) {
    return new FakeCollectionReference(this, path);
  }

  seed(path, data) {
    this.documents.set(path, clone(data));
  }

  read(path) {
    return clone(this.documents.get(path));
  }

  async runTransaction(callback) {
    let release;
    const previous = this.transactionTail;
    this.transactionTail = new Promise((resolve) => { release = resolve; });
    await previous;
    const transaction = new FakeTransaction(this);
    try {
      const result = await callback(transaction);
      transaction.commit();
      return result;
    } finally {
      release();
    }
  }
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
}

const account = (uid, overrides = {}) => ({
  uid,
  createdAtMillis: 1_800_000_000_000,
  emailVerified: true,
  phoneNumber: null,
  disabled: false,
  ...overrides,
});

const policy = (overrides = {}) => ({
  schemaVersion: 1,
  campaignId: "welcome_v1",
  policyVersion: 1,
  status: "APPROVED",
  rewardKind: "NEW_USER_WELCOME",
  sourceKind: "NEW_USER_SIGNUP",
  recipient: "ACTIVITY_OWNER",
  spendPurpose: "PROFILE_UNLOCK",
  postingMode: "IMMEDIATE",
  cashEligible: false,
  maxGrantsPerBeneficiary: 1,
  amountCoins: 100,
  maxGrantCount: 2,
  budgetNprPaisa: 2_000,
  fundingRef: "welcome-fund-1",
  approvalRef: "finance-approval-1",
  debitAccountKey: "platform:promo_fund",
  effectiveStartMillis: 1_700_000_000_000,
  effectiveEndMillis: 1_900_000_000_000,
  ...overrides,
});

function fundedDatabase(policyOverrides = {}, fundingOverrides = {}) {
  const db = new FakeFirestore();
  db.seed("coin_reward_campaigns/current_welcome", { activeVersion: 1, fundingRef: "welcome-fund-1" });
  db.seed("coin_reward_campaigns/welcome_v1", policy(policyOverrides));
  db.seed("coin_reward_funding/welcome-fund-1", {
    campaignId: "welcome_v1",
    status: "FUNDED",
    approvalRef: "finance-approval-1",
    debitAccountKey: "platform:promo_fund",
    allocatedCoins: 200,
    remainingCoins: 200,
    ...fundingOverrides,
  });
  return db;
}

test("posts one balanced grant, wallet projection, provenance lot, and reward atomically", async () => {
  const db = fundedDatabase();
  const result = await issueNewUserWelcomeCoins(db, account("new-user"));
  assert.equal(result.status, "GRANTED");
  assert.equal(result.amountCoins, 100);

  const wallet = db.read("wallet_accounts/new-user");
  assert.equal(wallet.availableCoins, 100);
  assert.equal(wallet.cumulativeCreditedCoins, 100);
  assert.equal(wallet.version, 1);
  assert.equal(db.read("coin_reward_campaign_usage/welcome_v1").issuedGrantCount, 1);
  assert.equal(db.read("coin_reward_funding/welcome-fund-1").remainingCoins, 100);

  const reward = [...db.documents.entries()].find(([path]) => path.startsWith("rewards/"))[1];
  const journal = [...db.documents.entries()].find(([path]) => path.startsWith("ledger_transactions/"))[1];
  const lot = [...db.documents.entries()].find(([path]) => path.startsWith("wallet_accounts/new-user/lots/"))[1];
  const statement = [...db.documents.entries()].find(([path]) => path.startsWith("wallet_accounts/new-user/statement/"))[1];
  assert.equal(reward.status, "POSTED");
  assert.equal(reward.cashEligible, false);
  assert.equal(lot.remainingAvailable, 100);
  assert.equal(lot.cashEligible, false);
  assert.equal(statement.deltaCoins, 100);
  assert.equal(statement.purpose, "NEW_USER_WELCOME");
  assert.equal(journal.entries.reduce((sum, entry) => sum + entry.signedAmount, 0), 0);
});

test("same UID retries return the original grant without another credit", async () => {
  const db = fundedDatabase();
  const first = await issueNewUserWelcomeCoins(db, account("one-time-user"));
  const replay = await issueNewUserWelcomeCoins(db, account("one-time-user"));
  assert.equal(first.status, "GRANTED");
  assert.deepEqual(replay, { status: "ALREADY_GRANTED", rewardId: first.rewardId, amountCoins: 100 });
  assert.equal(db.read("wallet_accounts/one-time-user").availableCoins, 100);
  assert.equal(db.read("coin_reward_campaign_usage/welcome_v1").issuedGrantCount, 1);
});

test("replay fails closed when a prior grant's journal or statement is missing or conflicting", async () => {
  const missingStatement = fundedDatabase();
  const first = await issueNewUserWelcomeCoins(missingStatement, account("partial-user"));
  const statementPath = `wallet_accounts/partial-user/statement/${first.rewardId}_COIN`;
  missingStatement.documents.delete(statementPath);
  await assert.rejects(issueNewUserWelcomeCoins(missingStatement, account("partial-user")),
    /partial or conflicting prior grant/);
  assert.equal(missingStatement.read("wallet_accounts/partial-user").availableCoins, 100);
  assert.equal(missingStatement.read("coin_reward_campaign_usage/welcome_v1").issuedGrantCount, 1);

  const conflictingJournal = fundedDatabase();
  const grant = await issueNewUserWelcomeCoins(conflictingJournal, account("conflicting-user"));
  const journalPath = `ledger_transactions/${grant.rewardId}_COIN`;
  const journal = conflictingJournal.read(journalPath);
  journal.entries[0].accountKey = "platform:unexpected-fund";
  conflictingJournal.seed(journalPath, journal);
  await assert.rejects(issueNewUserWelcomeCoins(conflictingJournal, account("conflicting-user")),
    /partial or conflicting prior grant/);
  assert.equal(conflictingJournal.read("wallet_accounts/conflicting-user").availableCoins, 100);
  assert.equal(conflictingJournal.read("coin_reward_campaign_usage/welcome_v1").issuedGrantCount, 1);
});

test("concurrent signup deliveries cannot exceed the campaign cap", async () => {
  const db = fundedDatabase({ maxGrantCount: 1, budgetNprPaisa: 1_000 }, {
    allocatedCoins: 100,
    remainingCoins: 100,
  });
  const results = await Promise.all([
    issueNewUserWelcomeCoins(db, account("concurrent-a")),
    issueNewUserWelcomeCoins(db, account("concurrent-b")),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), ["CAP_REACHED", "GRANTED"]);
  assert.equal(db.read("coin_reward_campaign_usage/welcome_v1").issuedGrantCount, 1);
  assert.equal(db.read("coin_reward_funding/welcome-fund-1").remainingCoins, 0);
});

test("unverified, disabled, and out-of-cohort accounts receive no grant", async () => {
  const db = fundedDatabase();
  assert.deepEqual(await issueNewUserWelcomeCoins(db, account("unverified", { emailVerified: false })),
    { status: "INELIGIBLE" });
  assert.deepEqual(await issueNewUserWelcomeCoins(db, account("disabled", { disabled: true })),
    { status: "INELIGIBLE" });
  assert.deepEqual(await issueNewUserWelcomeCoins(db, account("old", { createdAtMillis: 1_600_000_000_000 })),
    { status: "INELIGIBLE" });
  assert.equal(db.documents.size, 3);
});

test("missing campaign or exhausted funding fails closed without wallet writes", async () => {
  const missing = new FakeFirestore();
  assert.deepEqual(await issueNewUserWelcomeCoins(missing, account("no-campaign")), { status: "NOT_CONFIGURED" });
  assert.equal(missing.documents.size, 0);

  const empty = fundedDatabase({}, { remainingCoins: 0 });
  assert.deepEqual(await issueNewUserWelcomeCoins(empty, account("no-funds")), { status: "NOT_FUNDED" });
  assert.equal(empty.read("wallet_accounts/no-funds"), undefined);
});

test("the server environment gate is off by default and performs no read or write", async () => {
  const wasEnabled = process.env.SATHI_WELCOME_COINS_ENABLED;
  delete process.env.SATHI_WELCOME_COINS_ENABLED;
  const db = fundedDatabase();
  try {
    assert.deepEqual(await issueNewUserWelcomeCoins(db, account("feature-off")), { status: "NOT_CONFIGURED" });
    assert.equal(db.read("wallet_accounts/feature-off"), undefined);
    assert.equal(db.read("coin_reward_funding/welcome-fund-1").remainingCoins, 200);
  } finally {
    if (wasEnabled === undefined) delete process.env.SATHI_WELCOME_COINS_ENABLED;
    else process.env.SATHI_WELCOME_COINS_ENABLED = wasEnabled;
  }
});

test("malformed budget and frozen wallet fail closed", async () => {
  const overBudget = fundedDatabase({ budgetNprPaisa: 1_999 });
  await assert.rejects(issueNewUserWelcomeCoins(overBudget, account("bad-budget")), /exceeds the approved NPR budget/);
  assert.equal(overBudget.read("wallet_accounts/bad-budget"), undefined);

  const frozen = fundedDatabase();
  frozen.seed("wallet_accounts/frozen-user", {
    status: "FROZEN",
    availableCoins: 0,
    reservedCoins: 0,
    cumulativeCreditedCoins: 0,
    cumulativeDebitedCoins: 0,
    version: 1,
  });
  assert.deepEqual(await issueNewUserWelcomeCoins(frozen, account("frozen-user")), { status: "WALLET_BLOCKED" });
  assert.equal(frozen.read("coin_reward_campaign_usage/welcome_v1"), undefined);
});

test("funding account cannot alias the beneficiary wallet account", async () => {
  const db = fundedDatabase({ debitAccountKey: "user:self-funded:available" }, {
    debitAccountKey: "user:self-funded:available",
  });
  await assert.rejects(issueNewUserWelcomeCoins(db, account("self-funded")),
    /funding account cannot be the beneficiary wallet/);
  assert.equal(db.read("wallet_accounts/self-funded"), undefined);
  assert.equal(db.read("coin_reward_campaign_usage/welcome_v1"), undefined);
});
