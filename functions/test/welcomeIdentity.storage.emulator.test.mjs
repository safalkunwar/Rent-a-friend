import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "demo-sathi-identity";
const rules = await readFile(new URL("../../storage.rules", import.meta.url), "utf8");
const env = await initializeTestEnvironment({
  projectId,
  storage: { host: "127.0.0.1", port: 9199, rules },
});
test.after(async () => env.cleanup());

test("welcome identity files are owner-uploaded and reviewer-read-only", async () => {
  const owner = env.authenticatedContext("identity-owner").storage();
  const other = env.authenticatedContext("identity-other").storage();
  const reviewer = env.authenticatedContext("identity-reviewer", { adminRole: "kyc_reviewer" }).storage();
  const root = env.authenticatedContext("identity-root", { adminRole: "super_admin" }).storage();
  const idPath = "kyc/identity-owner/welcome-coins/0123456789abcdef0123.pdf";
  const selfiePath = "kyc/identity-owner/welcome-coins/abcdef0123456789abcd.jpg";

  await assertSucceeds(uploadBytes(ref(owner, idPath), new Uint8Array([37, 80, 68, 70]), {
    contentType: "application/pdf",
    customMetadata: { ownerUid: "identity-owner", category: "kyc" },
  }));
  await assertSucceeds(uploadBytes(ref(owner, selfiePath), new Uint8Array([0xff, 0xd8, 0xff]), {
    contentType: "image/jpeg",
    customMetadata: { ownerUid: "identity-owner", category: "kyc" },
  }));
  await assertFails(getBytes(ref(owner, idPath)));
  await assertFails(getBytes(ref(other, idPath)));
  await assertSucceeds(getBytes(ref(reviewer, idPath)));
  await assertFails(uploadBytes(ref(other, "kyc/identity-owner/welcome-coins/0123456789abcdef0123.jpg"),
    new Uint8Array([1]), { contentType: "image/jpeg", customMetadata: { ownerUid: "identity-other", category: "kyc" } }));
  await assertFails(uploadBytes(ref(owner, "kyc/identity-owner/welcome-coins/short.jpg"),
    new Uint8Array([1]), { contentType: "image/jpeg", customMetadata: { ownerUid: "identity-owner", category: "kyc" } }));
  await assertFails(deleteObject(ref(owner, idPath)));
  await assertSucceeds(deleteObject(ref(root, idPath)));
  await assertSucceeds(deleteObject(ref(root, selfiePath)));
});
