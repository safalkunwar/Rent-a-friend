import React from 'react';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { useVisibleStories } from '../hooks/useVisibleStories';
import { useEvents } from '../hooks/useFirestoreData';
const mocks=vi.hoisted(()=>({read:vi.fn(),query:vi.fn((_db:unknown,_now:number,_count:number)=>({}))}));
vi.mock('firebase/firestore',()=>({getDocsFromServer:mocks.read}));
vi.mock('../services/mediaQueries',()=>({visibleStoriesQuery:mocks.query,eventSummaryQuery:mocks.query}));
const snapshot=(id:string)=>({size:1,docs:[{id,data:()=>({userId:'A',mediaPath:'stories/A/'+id+'.jpg',status:'active',moderationStatus:'ACTIVE',visibilityStatus:'PUBLIC',expiresAt:{toMillis:()=>Date.now()+3600000}})}]});
beforeEach(()=>{vi.clearAllMocks();mocks.read.mockResolvedValue(snapshot('first'));});
afterEach(cleanup);
describe('Story media query lifecycle',()=>{
  it('uses bounded reads and stable array identity between renders, without polling',async()=>{
    const {result,rerender}=renderHook(()=>useVisibleStories());
    await waitFor(()=>expect(result.current.stories.length).toBe(1));
    const previous=result.current.stories;rerender();
    expect(result.current.stories).toBe(previous);expect(mocks.read).toHaveBeenCalledTimes(1);
    expect(mocks.query.mock.calls[0][2]).toBe(10);
  });
  it('a focus refresh replaces old results; restricted/removed media cannot survive a merge',async()=>{
    const {result}=renderHook(()=>useVisibleStories());
    await waitFor(()=>expect(result.current.stories.length).toBe(1));
    mocks.read.mockResolvedValueOnce({docs:[],size:0});
    act(()=>{window.dispatchEvent(new Event('focus'));});
    await waitFor(()=>expect(result.current.loading).toBe(false));
    expect(result.current.stories).toEqual([]);
  });
  it('StrictMode discards the abandoned first request without leaving loading stuck',async()=>{
    const {result}=renderHook(()=>useVisibleStories(),{wrapper:({children})=><React.StrictMode>{children}</React.StrictMode>});
    await waitFor(()=>expect(result.current.loading).toBe(false));
    expect(result.current.stories[0]?.id).toBe('first');
  });
  it('event remount revalidates media status instead of replaying the previously active cached image',async()=>{
    const event=(status:string)=>({size:1,docs:[{id:'event',data:()=>({title:'Event',imageUrl:'actual-image',mediaModerationStatus:status,mediaVisibilityStatus:'PUBLIC'})}]});
    mocks.read.mockResolvedValueOnce(event('ACTIVE'));
    const first=renderHook(()=>useEvents());
    await waitFor(()=>expect(first.result.current.events[0]?.imageUrl).toBe('actual-image'));
    first.unmount(); mocks.read.mockResolvedValueOnce(event('RESTRICTED'));
    const second=renderHook(()=>useEvents());
    expect(second.result.current.events).toEqual([]);
    await waitFor(()=>expect(second.result.current.loading).toBe(false));
    expect(second.result.current.events[0]?.imageUrl).toBe('');
    expect(second.result.current.events[0]?.image).toBe('');
  });
});
