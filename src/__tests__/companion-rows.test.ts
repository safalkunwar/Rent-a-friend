import { expect, it } from 'vitest';
import { fillCompanionRows } from '../components/discovery/companionRows';
import type { Companion } from '../types';
import type { FeedItem } from '../services/feedGenerator';
const companion=(id:string,interests=['Coffee'])=>({id,name:id,interests} as Companion);
const entry=(data:Companion):FeedItem=>({type:'companion',data,category:'Coffee',section:'Coffee'});
it('fills three seats using exact matching interests, not just the first interest',()=>{
  const a=companion('A'),b=companion('B',['Hiking','Coffee']),c=companion('C',[' coffee ']);
  const rows=fillCompanionRows([entry(a)],[a,b,c,companion('D',['Hiking'])]);
  expect(rows.map(item=>item.type==='companion'&&item.data.id)).toEqual(['A','B','C']);
});
it('does not duplicate a later profile and preserves the order of media',()=>{
  const a=companion('A'),b=companion('B');
  const post={type:'post',data:{id:'post'},section:'Coffee'} as FeedItem;
  const event={type:'event',data:{id:'event'},section:'Coffee'} as FeedItem;
  const rows=fillCompanionRows([entry(a),post,entry(b),event],[a,b]);
  expect(rows.filter(item=>item.type==='companion').map(item=>item.data.id)).toEqual(['A','B']);
  expect(rows.filter(item=>item.type!=='companion')).toEqual([post,event]);
});
it('never invents a match when only one real profile is available',()=>{
  const a=companion('A');expect(fillCompanionRows([entry(a)],[companion('B',['Hiking'])])).toEqual([entry(a)]);
});
