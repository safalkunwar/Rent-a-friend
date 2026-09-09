import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp, getDocs, query, collection, where, orderBy, documentId, limit } from 'firebase/firestore';
import { patchCommentRules } from '../ops/media-rollout/comment-rules-patch.mjs';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085') throw new Error('Loopback emulator required');
const baseline = execFileSync('git',['show','a22d863:ops/media-rollout/firestore.rules'],{encoding:'utf8'}).replace(/\r/g,'');
const candidate = patchCommentRules(baseline);
let env: RulesTestEnvironment;
const db = (uid: string) => env.authenticatedContext(uid).firestore();
before(async()=>{env=await initializeTestEnvironment({projectId:'hamrosathi1',firestore:{host:'127.0.0.1',port:8085,rules:candidate}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'community_posts','post'),{userId:'owner',status:'published',commentsCount:0,likesCount:0});});});
async function create(uid='A', id='comment') {
  const store=db(uid), post=doc(store,'community_posts','post');
  await runTransaction(store,async tx=>{const snap=await tx.get(post);tx.set(doc(store,'comments',id),{id,postId:'post',userId:uid,userName:uid,userAvatar:'',text:'Real comment',createdAt:serverTimestamp()});tx.update(post,{commentsCount:snap.data()!.commentsCount+1,lastCommentMutationId:id,updatedAt:new Date().toISOString()});});
}
test('current app server timestamp and mutation marker commit together, and the bounded query reads them',async()=>{
  await create();const store=db('B');
  const rows=await getDocs(query(collection(store,'comments'),where('postId','==','post'),orderBy('createdAt','desc'),orderBy(documentId(),'desc'),limit(50)));
  assert.equal(rows.size,1);assert.equal((await getDoc(doc(store,'community_posts','post'))).data()!.commentsCount,1);
});
test('unauthenticated, unpaired, draft-post and cross-user writes are denied',async()=>{
  const value={id:'bad',postId:'post',userId:'A',userName:'A',userAvatar:'',text:'x',createdAt:serverTimestamp()};
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),'comments','bad'),value));
  await assertFails(setDoc(doc(db('A'),'comments','bad'),value));
  await assertFails(updateDoc(doc(db('A'),'community_posts','post'),{commentsCount:100,lastCommentMutationId:'bad'}));
  await env.withSecurityRulesDisabled(async ctx=>{await updateDoc(doc(ctx.firestore(),'community_posts','post'),{status:'draft'});});
  await assert.rejects(create());
});
test('owner can edit/delete atomically; another user cannot change or delete their comment',async()=>{
  await create();await assertFails(updateDoc(doc(db('B'),'comments','comment'),{text:'forged'}));
  await assertFails(deleteDoc(doc(db('B'),'comments','comment')));
  await assertFails(updateDoc(doc(db('A'),'comments','comment'),{userId:'B'}));
  await updateDoc(doc(db('A'),'comments','comment'),{text:'Edited'});
  const store=db('A');await runTransaction(store,async tx=>{const post=doc(store,'community_posts','post');await tx.get(post);tx.delete(doc(store,'comments','comment'));tx.update(post,{commentsCount:0,lastCommentMutationId:'comment',updatedAt:new Date().toISOString()});});
  assert.equal((await getDoc(doc(store,'comments','comment'))).exists(),false);
});
test('only Community posts and comments change; every unrelated rule byte remains identical',()=>{
  const strip=(source:string)=>{for(const path of ['community_posts/{postId}','comments/{commentId}']) {const marker=`    match /${path} {`;const start=source.indexOf(marker);let end=start+marker.length,depth=1;for(;depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}source=source.slice(0,start)+source.slice(end);}return source.replace(/\s+/g,' ');};
  assert.equal(strip(candidate),strip(baseline));
});
