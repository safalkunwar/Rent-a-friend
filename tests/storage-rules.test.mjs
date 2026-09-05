import { before, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, updateMetadata, deleteObject } from 'firebase/storage';
if (process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9195') throw new Error('Local Storage emulator required.');
let env;
before(async () => { env = await initializeTestEnvironment({ projectId: 'hamrosathi1', storage: { host: '127.0.0.1', port: 9195, rules: await readFile('storage.rules', 'utf8') } }); });
after(async () => { await env?.cleanup(); });
const store = (uid, claims = {}) => env.authenticatedContext(uid, claims).storage();
const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
const metadata = (ownerUid, category) => ({ contentType: 'image/jpeg', customMetadata: { ownerUid, category } });
test('public media owner upload/public read; other user overwrite/delete denied', async () => {
  const path = 'posts/A/owned.jpg';
  await assertSucceeds(uploadBytes(ref(store('A'), path), bytes, metadata('A','posts')));
  await assertSucceeds(getBytes(ref(env.unauthenticatedContext().storage(),path)));
  await assertFails(uploadBytes(ref(store('B'),path),bytes,metadata('B','posts')));
  await assertFails(deleteObject(ref(store('B'),path)));
  await assertFails(updateMetadata(ref(store('A'),path), { customMetadata: { ownerUid: 'B' } }));
});
test('wrong owner/path/category/type/size rejected', async () => {
  await assertFails(uploadBytes(ref(store('A'),'posts/B/wrong.jpg'),bytes,metadata('A','posts')));
  await assertFails(uploadBytes(ref(store('A'),'posts/wrong.jpg'),bytes,metadata('A','posts')));
  await assertFails(uploadBytes(ref(store('A'),'posts/A/category.jpg'),bytes,metadata('A','kyc')));
  await assertFails(uploadBytes(ref(store('A'),'posts/A/script.html'),bytes,{ ...metadata('A','posts'),contentType:'text/html' }));
  await assertFails(uploadBytes(ref(store('A'),'posts/A/large.jpg'),new Uint8Array(10*1024*1024+1),metadata('A','posts')));
});
test('KYC uploader/other/guest cannot read; only reviewer can read private bytes', async () => {
  const path = 'kyc/A/document.jpg';
  await assertSucceeds(uploadBytes(ref(store('A'),path),bytes,metadata('A','kyc')));
  await assertFails(getBytes(ref(store('A'),path)));
  await assertFails(getBytes(ref(store('B'),path)));
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(),path)));
  await assertFails(getBytes(ref(store('reader',{ adminRole:'read_only_admin', admin:true }),path)));
  await assertSucceeds(getBytes(ref(store('reviewer',{ adminRole:'kyc_reviewer' }),path)));
});
test('KYC allows real PDF MIME but rejects over-limit documents', async () => {
  await assertSucceeds(uploadBytes(ref(store('A'),'kyc/A/document.pdf'),new Uint8Array([37,80,68,70]),{ ...metadata('A','kyc'),contentType:'application/pdf' }));
  await assertFails(uploadBytes(ref(store('A'),'kyc/A/large.jpg'),new Uint8Array(5*1024*1024+1),metadata('A','kyc')));
});
test('unauthenticated and anonymous uploads denied', async () => {
  await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(),'posts/A/guest.jpg'),bytes,metadata('A','posts')));
  await assertFails(uploadBytes(ref(store('A',{ firebase:{ sign_in_provider:'anonymous' } }),'posts/A/anon.jpg'),bytes,metadata('A','posts')));
});
