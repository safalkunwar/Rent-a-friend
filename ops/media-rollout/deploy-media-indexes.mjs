import { readFile } from 'node:fs/promises';
import { request } from './production-api.mjs';
if(process.env.SATHI_APPROVED_MEDIA_ROLLOUT !== 'hamrosathi1') throw new Error('Explicit approved project required');
const definitions=JSON.parse(await readFile('ops/media-rollout/media-social.indexes.json','utf8')).indexes;
for(const {collectionGroup,...definition} of definitions) {
  const url=`https://firestore.googleapis.com/v1/projects/hamrosathi1/databases/(default)/collectionGroups/${collectionGroup}/indexes`;
  try { console.log(JSON.stringify({collectionGroup,operation:await request(url,'POST',definition)})); }
  catch(error) { if(error.message.includes('ALREADY_EXISTS')) console.log(JSON.stringify({collectionGroup,status:'ALREADY_EXISTS'})); else throw error; }
}
