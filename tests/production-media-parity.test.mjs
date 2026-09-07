import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8085' || process.env.FIREBASE_STORAGE_EMULATOR_HOST!=='127.0.0.1:9195') throw new Error('Loopback emulators required');
const base='docs/sathi/rollbacks/2026-09-06-production-rules';
const candidate='ops/media-rollout';
const normalize=s=>s.replace(/\r/g,'').trim();
test('exact source scope proof: all original non-media code and helpers unchanged',async()=>{
  const original=normalize(await readFile(base+'/firestore.rules','utf8'));
  let current=normalize(await readFile(candidate+'/firestore.rules','utf8'));
  current=current.replace(/\n\n    \/\/ BEGIN SATHI MEDIA ROLLOUT:[\s\S]*?    \/\/ END SATHI MEDIA ROLLOUT\n/,'');
  current=current.replace(' && !sathiPhotoChanged();',';');
  current=current.replace(`      allow read, delete: if isAdmin();
      allow create: if isAdmin() && sathiPhotoCreateSafe();
      allow update: if isAdmin() && !sathiPhotoChanged();
      allow update: if sathiProfilePhotoWrite(userId) || sathiProfilePhotoModeration();`,'      allow read, write: if isAdmin();');
  current=current.replace('isValidData(request.resource.data) && sathiPhotoCreateSafe();','isValidData(request.resource.data);');
  const stripStory=s=>s.replace(/    match \/stories\/\{storyId\} \{[\s\S]*?(?=    \/\/ Events Collection:)/,'<STORY ONLY>\n');
  assert.equal(stripStory(current),stripStory(original),'Unexpected change outside explicitly reviewed photo guards and Story branch');
  const storage=await readFile(candidate+'/storage.rules','utf8');
  assert.deepEqual([...storage.matchAll(/match ([^\n]+) \{/g)].map(m=>m[1]),[
    '/b/{bucket}/o','/avatars/{uid}/{filename}','/stories/{uid}/{filename}','/{allPaths=**}'
  ]);
  assert.match(storage,/match \/\{allPaths=\*\*\} \{ allow read, write: if false; \}/);
});

const fixtures={
  'users/A':{name:'A',role:'customer',avatar:''},'users/B':{name:'B',role:'customer',avatar:''},
  'companions/C':{userId:'C',name:'C',isVerified:true},
  'community_posts/p':{userId:'A',status:'published',content:'old',likesCount:0,commentsCount:0},
  'comments/c':{userId:'A',postId:'p',content:'old'},
  'likes/A_p':{userId:'A',postId:'p'},'story_likes/A_s':{userId:'A',storyId:'s'},
  'events/e':{title:'Event'},'bookings/b':{userId:'A',companionId:'C',status:'pending'},
  'conversations/A_B':{participantIds:['A','B']},'messages/m':{conversationId:'A_B',senderId:'A',text:'old',isRead:false},
  'notifications/n':{userId:'A',isRead:false},
  'companion_applications/a':{userId:'A',status:'DRAFT',kyc:{verificationStatus:'UNVERIFIED'}},
  'payments/pay':{userId:'A',status:'pending'},'referrals/r':{userId:'A'},'rewards/r':{userId:'A'},
  'activities/ac':{title:'Activity'},'users/A/favorites/C':{companionId:'C'}
};
const cases=[
  ['profile owner read','A','get','users/A'],['profile outsider read','B','get','users/A'],
  ['profile owner ordinary update','A','update','users/A',{name:'updated'}],
  ['profile outsider ordinary update','B','update','users/A',{name:'forged'}],
  ['profile admin ordinary update','admin','update','users/A',{role:'customer'}],
  ['profile create OAuth avatar unchanged','new','set','users/new',{name:'New',role:'customer',avatar:'https://example.test/oauth.png'}],
  ['profile self promotion','A','update','users/A',{role:'admin'}],
  ['community public read',null,'get','community_posts/p'],
  ['community owner edit','A','update','community_posts/p',{content:'new'}],
  ['community outsider edit','B','update','community_posts/p',{content:'new'}],
  ['community owned creation','A','set','community_posts/new',{userId:'A',content:'new'}],
  ['community unauth create',null,'set','community_posts/new',{userId:'A'}],
  ['community counter','B','update','community_posts/p',{likesCount:1}],
  ['community negative counter','B','update','community_posts/p',{likesCount:-1}],
  ['comments public read',null,'get','comments/c'],['comment own edit','A','update','comments/c',{content:'new'}],
  ['comment other edit','B','update','comments/c',{content:'new'}],
  ['comment own create','A','set','comments/new',{userId:'A',postId:'p',content:'new'}],
  ['comment forged author','B','set','comments/new',{userId:'A',postId:'p'}],
  ['comment own delete','A','delete','comments/c'],
  ['like own create','B','set','likes/B_p',{userId:'B',postId:'p'}],
  ['like cross-user delete','B','delete','likes/A_p'],
  ['story like own create','B','set','story_likes/B_s',{userId:'B',storyId:'s'}],
  ['story like cross-user delete','B','delete','story_likes/A_s'],
  ['event public read',null,'get','events/e'],['event normal write','A','update','events/e',{title:'new'}],
  ['event admin write','admin','update','events/e',{title:'new'}],
  ['event own participation','A','set','events/e/participants/A',{userId:'A'}],
  ['booking own read','A','get','bookings/b'],['booking outsider read','B','get','bookings/b'],
  ['booking own update','A','update','bookings/b',{status:'cancelled'}],
  ['booking outsider update','B','update','bookings/b',{status:'cancelled'}],
  ['booking admin update','admin','update','bookings/b',{status:'cancelled'}],
  ['conversation member read','A','get','conversations/A_B'],
  ['conversation outsider read','C','get','conversations/A_B'],
  ['conversation legacy outsider write','C','update','conversations/A_B',{participantIds:['C']}],
  ['message participant read','B','get','messages/m'],['message outsider read','C','get','messages/m'],
  ['message participant receipt','B','update','messages/m',{isRead:true}],
  ['message other text change','B','update','messages/m',{text:'forged'}],
  ['notification own read','A','get','notifications/n'],['notification other read','B','get','notifications/n'],
  ['KYC own read','A','get','companion_applications/a'],['KYC other read','B','get','companion_applications/a'],
  ['KYC owner edit','A','update','companion_applications/a',{applicationData:{name:'A'}}],
  ['companion public read',null,'get','companions/C'],['companion other write','A','update','companions/C',{name:'bad'}],
  ['payment own read','A','get','payments/pay'],['payment other read','B','get','payments/pay'],
  ['referral access','A','get','referrals/r'],['reward write','A','update','rewards/r',{amount:1}],
  ['activity public read',null,'get','activities/ac'],['favorites legacy cross-write','B','set','users/A/favorites/new',{companionId:'new'}],
  ['unknown write','A','set','unknown/new',{userId:'A'}]
];
test('differential production regression matrix preserves each allow/deny result',async()=>{
  const results=[];
  for(const source of [base,candidate]){
    const env=await initializeTestEnvironment({projectId:'hamrosathi1',
      firestore:{host:'127.0.0.1',port:8085,rules:await readFile(source+'/firestore.rules','utf8')},
      storage:{host:'127.0.0.1',port:9195,rules:await readFile(source+'/storage.rules','utf8')}});
    try{
      const outcomes={};
      for(const [label,uid,operation,path,data] of cases){
        await env.clearFirestore();
        await env.withSecurityRulesDisabled(async ctx=>{
          await Promise.all(Object.entries(fixtures).map(([path,data])=>setDoc(doc(ctx.firestore(),path),data)));
        });
        const ctx=uid===null?env.unauthenticatedContext():env.authenticatedContext(uid,uid==='admin'?{admin:true,adminRole:'super_admin'}:{});
        const target=doc(ctx.firestore(),path);
        try{
          await (operation==='get'?getDoc(target):operation==='set'?setDoc(target,data):operation==='update'?updateDoc(target,data):deleteDoc(target));
          outcomes[label]='ALLOWED';
        }catch(error){
          assert.equal(error.code,'permission-denied',label+' unexpected failure');
          outcomes[label]='DENIED';
        }
      }
      // Existing non-media binaries stay inaccessible, even to privileged actors.
      for(const category of ['posts','events','kyc','private','public','activities','verification','admin','unknown']){
        const path=category+'/A/test.jpg';
        await env.withSecurityRulesDisabled(ctx=>uploadBytes(ref(ctx.storage(),path),new Uint8Array([1]),{contentType:'image/jpeg'}));
        for(const uid of [null,'A','admin']){
          const ctx=uid===null?env.unauthenticatedContext():env.authenticatedContext(uid,uid==='admin'?{admin:true,adminRole:'super_admin'}:{});
          try{await getBytes(ref(ctx.storage(),path));outcomes['storage '+category+' read '+uid]='ALLOWED';}
          catch(error){assert.equal(error.code,'storage/unauthorized');outcomes['storage '+category+' read '+uid]='DENIED';}
        }
      }
      results.push(outcomes);
    }finally{await env.clearStorage();await env.cleanup();}
  }
  assert.deepEqual(results[1],results[0]);
  console.log(JSON.stringify({comparison:'production -> media candidate',cases:Object.keys(results[0]).length,results:results[1]},null,2));
});
