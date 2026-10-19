import {createHmac, randomUUID} from "node:crypto";
import {FieldValue} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";

const ENABLED_FLAG = "SATHI_WELCOME_IDENTITY_ENABLED";
const CASES = "welcome_coin_identity_cases";
const PRIVATE = "welcome_coin_identity_private";
const PERSON_CLAIMS = "welcome_coin_person_claims";
const ACCEPTED_TYPES = new Set([
  "NEPALI_CITIZENSHIP_CERTIFICATE",
  "NATIONAL_ID",
  "PASSPORT",
]);
const HMAC_VERSION = 1;
const HMAC_SECRET = defineSecret("SATHI_WELCOME_IDENTITY_HMAC_KEY");
const APPEAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

type ReviewAction = "APPROVE" | "REJECT" | "ESCALATE";

function assertEnabled(): void {
  if (process.env[ENABLED_FLAG] !== "true") {
    throw new HttpsError("failed-precondition", "Identity review is not enabled.");
  }
}

function normalizedDocumentNumber(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "A document number is required for review.");
  }
  const normalized = value.normalize("NFKC").trim().toUpperCase().replace(/[\s-]+/gu, "");
  if (normalized.length < 3 || normalized.length > 160) {
    throw new HttpsError("invalid-argument", "The document number is invalid.");
  }
  return normalized;
}

function fingerprint(type: string, documentNumber: string, secret: string): string {
  const normalized = normalizedDocumentNumber(documentNumber);
  const payload = `sathi-welcome-person:v${HMAC_VERSION}:${type.length}:${type}:${normalized.length}:${normalized}`;
  return `v${HMAC_VERSION}_${createHmac("sha256", secret).update(payload, "utf8").digest("hex")}`;
}

function assertUid(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new HttpsError("invalid-argument", "A valid account is required.");
  }
}

async function roleFor(uid: string, claims: Record<string, unknown>): Promise<string> {
  if (typeof claims.adminRole === "string") return claims.adminRole;
  if (claims.admin === true) return "super_admin";
  const adminRecord = await admin.firestore().collection("admins").doc(uid).get();
  return typeof adminRecord.data()?.role === "string" ? adminRecord.data()!.role : "";
}

async function requireReviewer(uid: string, claims: Record<string, unknown>): Promise<string> {
  const role = await roleFor(uid, claims);
  if (role !== "kyc_reviewer" && role !== "super_admin") {
    throw new HttpsError("permission-denied", "Identity review access is required.");
  }
  return role;
}

function auditData(actorUid: string, action: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    actorUid,
    action,
    ...extra,
    createdAt: FieldValue.serverTimestamp(),
  };
}

function evidenceObject(path: unknown, uid: string, kind: "id" | "selfie"): string {
  if (typeof path !== "string") throw new HttpsError("invalid-argument", "Both identity files are required.");
  const prefix = `kyc/${uid}/welcome-coins/`;
  const name = path.slice(prefix.length);
  const validName = /^[A-Za-z0-9_-]{16,96}\.(jpg|jpeg|png|pdf)$/i.test(name);
  if (!path.startsWith(prefix) || !validName || (kind === "selfie" && /\.pdf$/i.test(name))) {
    throw new HttpsError("invalid-argument", "Identity evidence path is invalid.");
  }
  return path;
}

export const submitWelcomeCoinIdentityCase = onCall({enforceAppCheck: true}, async (request) => {
  assertEnabled();
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to submit identity evidence.");
  const uid = request.auth.uid;
  const documentType = request.data?.documentType;
  if (typeof documentType !== "string" || !ACCEPTED_TYPES.has(documentType)) {
    throw new HttpsError("invalid-argument", "Choose an accepted government ID type.");
  }
  const idPath = evidenceObject(request.data?.idPath, uid, "id");
  const selfiePath = evidenceObject(request.data?.selfiePath, uid, "selfie");
  if (idPath === selfiePath) throw new HttpsError("invalid-argument", "Upload separate ID and selfie files.");
  const bucket = admin.storage().bucket();
  const [idMetadata, selfieMetadata] = await Promise.all([
    bucket.file(idPath).getMetadata(), bucket.file(selfiePath).getMetadata(),
  ]);
  for (const [metadata, kind] of [[idMetadata[0], "id"], [selfieMetadata[0], "selfie"]] as const) {
    if (metadata.metadata?.ownerUid !== uid || Number(metadata.size) > 5 * 1024 * 1024) {
      throw new HttpsError("failed-precondition", "Identity evidence could not be verified.");
    }
    const contentType = String(metadata.contentType ?? "");
    const acceptedTypes = kind === "selfie" ? ["image/jpeg", "image/png"] : ["image/jpeg", "image/png", "application/pdf"];
    if (!acceptedTypes.includes(contentType)) {
      throw new HttpsError("failed-precondition", "Identity evidence file type is not accepted.");
    }
  }
  const db = admin.firestore();
  const caseRef = db.collection(CASES).doc(uid);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(caseRef);
    if (existing.exists) {
      throw new HttpsError("failed-precondition", "An identity case already exists; use the appeal process for a new review.");
    }
    transaction.create(caseRef, {
      uid,
      status: "PENDING",
      documentType,
      evidence: {idPath, selfiePath},
      appealCount: 0,
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(caseRef.collection("audit").doc(randomUUID()), auditData(uid, "CASE_SUBMITTED", {documentType}));
  });
  return {status: "PENDING"};
});

export const getWelcomeCoinIdentityStatus = onCall({enforceAppCheck: true}, async (request) => {
  assertEnabled();
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to view identity review status.");
  const db = admin.firestore();
  const ref = db.collection(CASES).doc(request.auth.uid);
  let status = "NOT_SUBMITTED";
  let appealDeadlineMillis: number | null = null;
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return;
    const data = snapshot.data()!;
    status = String(data.status ?? "PENDING");
    if (["VERIFIED", "REJECTED", "DUPLICATE"].includes(status) && !data.decisionNotifiedAtMillis) {
      const notifiedAtMillis = Date.now();
      appealDeadlineMillis = notifiedAtMillis + APPEAL_WINDOW_MS;
      transaction.update(ref, {
        decisionNotifiedAtMillis: notifiedAtMillis,
        appealDeadlineMillis,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(ref.collection("audit").doc(randomUUID()), auditData(request.auth!.uid, "DECISION_VIEWED"));
    } else if (Number.isSafeInteger(data.appealDeadlineMillis)) {
      appealDeadlineMillis = data.appealDeadlineMillis;
    }
  });
  return {status, appealDeadlineMillis};
});

export const appealWelcomeCoinIdentityCase = onCall({enforceAppCheck: true}, async (request) => {
  assertEnabled();
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to appeal this decision.");
  const db = admin.firestore();
  const ref = db.collection(CASES).doc(request.auth.uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError("not-found", "No identity decision is available to appeal.");
    const data = snapshot.data()!;
    if (!(["REJECTED", "DUPLICATE"].includes(String(data.status))) ||
      !Number.isSafeInteger(data.appealDeadlineMillis) || Date.now() > Number(data.appealDeadlineMillis)) {
      throw new HttpsError("failed-precondition", "The appeal window is closed or this case is not appealable.");
    }
    transaction.update(ref, {status: "APPEAL_PENDING", appealCount: Number(data.appealCount ?? 0) + 1, appealedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()});
    transaction.create(ref.collection("audit").doc(randomUUID()), auditData(request.auth!.uid, "APPEAL_SUBMITTED"));
  });
  return {status: "APPEAL_PENDING"};
});

export const reviewWelcomeCoinIdentityCase = onCall({enforceAppCheck: true, secrets: [HMAC_SECRET]}, async (request) => {
  assertEnabled();
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to review identity cases.");
  const uid = request.data?.uid;
  const action = request.data?.action as ReviewAction;
  assertUid(uid);
  if (!["APPROVE", "REJECT", "ESCALATE"].includes(action)) throw new HttpsError("invalid-argument", "Choose a valid review action.");
  const actorUid = request.auth.uid;
  const role = await requireReviewer(actorUid, request.auth.token);
  const db = admin.firestore();
  const caseRef = db.collection(CASES).doc(uid);
  const privateRef = db.collection(PRIVATE).doc(uid);
  const secret = action === "APPROVE" ? HMAC_SECRET.value() : "";
  if (action === "APPROVE" && secret.length < 32) throw new HttpsError("failed-precondition", "Identity fingerprint key is not configured.");
  let resultStatus = "";
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(caseRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "Identity case was not found.");
    const data = snapshot.data()!;
    const appeal = data.status === "APPEAL_PENDING" || data.status === "ESCALATION_PENDING";
    if (role === "super_admin" && data.status !== "ESCALATION_PENDING") {
      throw new HttpsError("failed-precondition", "Senior review is available only after escalation.");
    }
    if (role === "kyc_reviewer" && data.status === "ESCALATION_PENDING") {
      throw new HttpsError("permission-denied", "Only a senior reviewer can resolve escalated cases.");
    }
    if (appeal && data.reviewedBy === actorUid) {
      throw new HttpsError("permission-denied", "Appeals require an independent reviewer.");
    }
    if (!appeal && data.status !== "PENDING") {
      throw new HttpsError("failed-precondition", "This case is not awaiting review.");
    }
    if (action === "ESCALATE") {
      if (role !== "kyc_reviewer") throw new HttpsError("permission-denied", "Only the assigned review role can escalate a case.");
      transaction.update(caseRef, {status: "ESCALATION_PENDING", escalatedBy: actorUid, updatedAt: FieldValue.serverTimestamp()});
      transaction.create(caseRef.collection("audit").doc(randomUUID()), auditData(actorUid, "CASE_ESCALATED"));
      resultStatus = "ESCALATION_PENDING";
      return;
    }
    if (action === "REJECT") {
      transaction.update(caseRef, {
        status: "REJECTED", reviewedBy: actorUid, reviewedAt: FieldValue.serverTimestamp(),
        decisionNotifiedAtMillis: null, appealDeadlineMillis: null, updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.delete(privateRef);
      transaction.create(caseRef.collection("audit").doc(randomUUID()), auditData(actorUid, "CASE_REJECTED"));
      resultStatus = "REJECTED";
      return;
    }
    const type = data.documentType;
    if (typeof type !== "string" || !ACCEPTED_TYPES.has(type)) throw new HttpsError("failed-precondition", "Case document type is invalid.");
    const personKey = fingerprint(type, request.data?.documentNumber, secret);
    const claimRef = db.collection(PERSON_CLAIMS).doc(personKey);
    const claimSnapshot = await transaction.get(claimRef);
    const current = claimSnapshot.data();
    if (claimSnapshot.exists && current?.ownerUid !== uid) {
      transaction.update(caseRef, {
        status: "DUPLICATE", reviewedBy: actorUid, reviewedAt: FieldValue.serverTimestamp(),
        decisionNotifiedAtMillis: null, appealDeadlineMillis: null, updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.delete(privateRef);
      transaction.create(caseRef.collection("audit").doc(randomUUID()), auditData(actorUid, "CASE_DUPLICATE"));
      resultStatus = "DUPLICATE";
      return;
    }
    if (!claimSnapshot.exists) {
      transaction.create(claimRef, {
        ownerUid: uid,
        keyVersion: HMAC_VERSION,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.set(privateRef, {status: "VERIFIED", personKey, keyVersion: HMAC_VERSION, updatedAt: FieldValue.serverTimestamp()});
    transaction.update(caseRef, {
      status: "VERIFIED", reviewedBy: actorUid, reviewedAt: FieldValue.serverTimestamp(),
      decisionNotifiedAtMillis: null, appealDeadlineMillis: null, updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(caseRef.collection("audit").doc(randomUUID()), auditData(actorUid, "CASE_APPROVED", {keyVersion: HMAC_VERSION}));
    resultStatus = "VERIFIED";
  });
  return {status: resultStatus};
});
