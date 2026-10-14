import {FieldPath, type Firestore} from "firebase-admin/firestore";

export interface CoinWalletStatementRow {
  id: string;
  deltaCoins: number;
  direction: "CREDIT" | "DEBIT" | "RESERVE" | "RELEASE";
  purpose: string;
  label: string;
  createdAtMillis: number | null;
}

export type CoinWalletReadResult =
  | { status: "NO_WALLET"; entries: [] }
  | { status: "WALLET_UNAVAILABLE"; entries: [] }
  | {
      status: "ACTIVE";
      availableCoins: number;
      reservedCoins: number;
      entries: CoinWalletStatementRow[];
    };

const DIRECTIONS = new Set(["CREDIT", "DEBIT", "RESERVE", "RELEASE"]);

/** Checks whether a Coin count is a non-negative safe integer.
 * @param {*} value Candidate count.
 * @return {boolean} Whether it is a valid Coin count.
 */
function isCoinCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

/** Reads a minimized wallet view for one trusted Auth UID.
 * @param {Firestore} db Firestore instance.
 * @param {string} uid Authenticated owner UID.
 * @return {Promise<CoinWalletReadResult>} Owner-scoped wallet projection.
 */
export async function readCoinWalletForUid(
  db: Firestore,
  uid: string,
): Promise<CoinWalletReadResult> {
  if (typeof uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
    throw new Error("Invalid authenticated UID");
  }
  const walletRef = db.collection("wallet_accounts").doc(uid);
  const walletSnapshot = await walletRef.get();
  if (!walletSnapshot.exists) return {status: "NO_WALLET", entries: []};

  const wallet = walletSnapshot.data();
  if (!wallet) return {status: "WALLET_UNAVAILABLE", entries: []};
  if (
    wallet.status !== "ACTIVE" ||
    !isCoinCount(wallet.availableCoins) ||
    !isCoinCount(wallet.reservedCoins)
  ) {
    return {status: "WALLET_UNAVAILABLE", entries: []};
  }

  const statementSnapshot = await walletRef
    .collection("statement")
    .orderBy("createdAt", "desc")
    .orderBy(FieldPath.documentId(), "desc")
    .limit(20)
    .get();
  const entries = statementSnapshot.docs.flatMap((doc) => {
    const data = doc.data();
    if (
      !Number.isSafeInteger(data.deltaCoins) ||
      data.deltaCoins === 0 ||
      !DIRECTIONS.has(data.direction) ||
      typeof data.purpose !== "string"
    ) {
      return [];
    }
    const createdAtMillis = data.createdAt?.toMillis?.();
    return [
      {
        id: doc.id,
        deltaCoins: data.deltaCoins,
        direction: data.direction as CoinWalletStatementRow["direction"],
        purpose: data.purpose.slice(0, 80),
        label:
          typeof data.displayLabel === "string" ?
            data.displayLabel.slice(0, 80) :
            data.purpose.slice(0, 80),
        createdAtMillis: Number.isSafeInteger(createdAtMillis) ?
          createdAtMillis :
          null,
      },
    ];
  });
  return {
    status: "ACTIVE",
    availableCoins: wallet.availableCoins,
    reservedCoins: wallet.reservedCoins,
    entries,
  };
}
