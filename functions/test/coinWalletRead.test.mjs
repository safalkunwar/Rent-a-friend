import test from "node:test";
import assert from "node:assert/strict";
import { readCoinWalletForUid } from "../lib/domains/wallet/coinWalletRead.js";

function makeDb({ wallet, rows = [] } = {}) {
  const calls = { collection: [], doc: [], orderBy: [], limit: [] };
  const db = {
    collection(name) {
      calls.collection.push(name);
      return {
        doc(id) {
          calls.doc.push(id);
          return {
            async get() {
              return { exists: wallet !== undefined, data: () => wallet };
            },
            collection(name) {
              calls.collection.push(name);
              return {
                orderBy(...args) {
                  calls.orderBy.push(args);
                  return this;
                },
                limit(value) {
                  calls.limit.push(value);
                  return this;
                },
                async get() {
                  return {
                    docs: rows.map((row) => ({ id: row.id, data: () => row.data })),
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  return { db, calls };
}

test("does not query statements or invent a zero for an account without a wallet", async () => {
  const { db, calls } = makeDb();
  assert.deepEqual(await readCoinWalletForUid(db, "owner-uid"), {
    status: "NO_WALLET",
    entries: [],
  });
  assert.deepEqual(calls.collection, ["wallet_accounts"]);
});

test("reads only the authenticated owner's wallet and caps the newest statement window at 20", async () => {
  const { db, calls } = makeDb({
    wallet: { status: "ACTIVE", availableCoins: 40, reservedCoins: 10, privateField: "hidden" },
    rows: [{
      id: "statement-1",
      data: {
        deltaCoins: 50,
        direction: "CREDIT",
        purpose: "NEW_USER_WELCOME",
        displayLabel: "Welcome Coins",
        createdAt: { toMillis: () => 1791849600000 },
        fundingRef: "private-funding-ref",
        journalRef: "ledger_transactions/private",
      },
    }],
  });
  const result = await readCoinWalletForUid(db, "owner-uid");

  assert.equal(calls.doc[0], "owner-uid");
  assert.equal(calls.limit[0], 20);
  assert.equal(calls.orderBy.length, 2);
  assert.deepEqual(result, {
    status: "ACTIVE",
    availableCoins: 40,
    reservedCoins: 10,
    entries: [{
      id: "statement-1",
      deltaCoins: 50,
      direction: "CREDIT",
      purpose: "NEW_USER_WELCOME",
      label: "Welcome Coins",
      createdAtMillis: 1791849600000,
    }],
  });
  assert.equal(JSON.stringify(result).includes("private-funding-ref"), false);
  assert.equal(JSON.stringify(result).includes("ledger_transactions"), false);
});

test("hides frozen or malformed wallet projections", async () => {
  for (const wallet of [
    { status: "FROZEN", availableCoins: 40, reservedCoins: 0 },
    { status: "ACTIVE", availableCoins: -1, reservedCoins: 0 },
    { status: "ACTIVE", availableCoins: 40, reservedCoins: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    const { db, calls } = makeDb({ wallet });
    assert.deepEqual(await readCoinWalletForUid(db, "owner-uid"), {
      status: "WALLET_UNAVAILABLE",
      entries: [],
    });
    assert.deepEqual(calls.collection, ["wallet_accounts"]);
  }
});

test("drops malformed statement records and caps display labels", async () => {
  const { db } = makeDb({
    wallet: { status: "ACTIVE", availableCoins: 1, reservedCoins: 0 },
    rows: [
      { id: "valid", data: { deltaCoins: -1, direction: "DEBIT", purpose: "PROFILE_UNLOCK", displayLabel: "x".repeat(100) } },
      { id: "fraction", data: { deltaCoins: 0.5, direction: "CREDIT", purpose: "BAD" } },
      { id: "unknown-direction", data: { deltaCoins: 1, direction: "TRANSFER", purpose: "BAD" } },
    ],
  });
  const result = await readCoinWalletForUid(db, "owner-uid");
  assert.equal(result.status, "ACTIVE");
  if (result.status !== "ACTIVE") return;
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].label.length, 80);
  assert.equal(result.entries[0].createdAtMillis, null);
});

test("rejects malformed UIDs before touching Firestore", async () => {
  const { db, calls } = makeDb();
  await assert.rejects(readCoinWalletForUid(db, "../../another-user"), /Invalid authenticated UID/);
  assert.deepEqual(calls.collection, []);
});
