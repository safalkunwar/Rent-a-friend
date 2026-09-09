import { describe, it, expect, vi, afterEach } from 'vitest';
import { fitImage, IMAGE_LIMITS, optimizeImage } from '../services/imageOptimization';
import { groupStories } from '../services/storyGroups';
import { notificationTarget } from '../services/notificationTarget';
import { eventFields } from '../services/eventContract';
import { Timestamp } from 'firebase/firestore';
import type { ExperienceStory } from '../types';
afterEach(() => { vi.restoreAllMocks(); });
const story = (id: string, uid: string, created: number, expires = 1000) => ({ id, userId: uid, mediaPath: 'stories/path',
  status: 'active', moderationStatus: 'ACTIVE', visibilityStatus: 'PUBLIC', createdAt: Timestamp.fromMillis(created), expiresAt: Timestamp.fromMillis(expires) } as unknown as ExperienceStory);
describe('media social contracts', () => {
  it('groups each owner once, deduplicates records and orders by server creation time then ID', () => {
    const input = [story('b','A',20), story('c','B',12), story('a','A',10), story('b','A',20)];
    expect(groupStories(input, 100).map(group => [group.ownerId, group.stories.map(item => item.id)])).toEqual([['A',['a','b']],['B',['c']]]);
    expect(input[0].id).toBe('b');
  });
  it('excludes restricted, unknown-owner and expired Stories at the exact boundary', () => {
    expect(groupStories([story('a','A',0,100), story('b','',0), {...story('c','B',0),moderationStatus:'RESTRICTED'}],100)).toEqual([]);
  });
  it('preserves aspect ratio, never upscales and enforces useful edge sizes', () => {
    expect(fitImage(8000,6000,IMAGE_LIMITS.story)).toEqual({width:1920,height:1440});
    expect(fitImage(6000,8000,IMAGE_LIMITS.profile)).toEqual({width:384,height:512});
    expect(fitImage(200,100,1600)).toEqual({width:200,height:100});
    expect(() => fitImage(0,1,512)).toThrow();
  });
  it('rejects disguised input before attempting image decoding', async () => {
    const file = { name:'attack.jpg',type:'image/jpeg',size:10,slice:()=>({arrayBuffer:async()=>new Uint8Array([60,115,99,114,105,112,116]).buffer}) } as File;
    await expect(optimizeImage(file,'story')).rejects.toThrow('content');
  });
  it('uses safe exact document routes and opens comment context', () => {
    expect(notificationTarget({targetType:'story',targetId:'abc_1',commentId:'c'})).toBe('/story/abc_1');
    expect(notificationTarget({targetType:'event',targetId:'abc_1',commentId:'c'})).toBe('/event/abc_1?comments=1');
    expect(notificationTarget({targetType:'event',targetId:'xyz'})).toBe('/event/xyz');
    expect(notificationTarget({targetType:'event',targetId:'../admin'})).toBeNull();
    expect(notificationTarget({targetType:'https://attacker.test',targetId:'x'})).toBeNull();
  });
  it('validates event fields and interprets local event time in Nepal, not device timezone', () => {
    const result = eventFields({title:' Hike ',description:'A walk',location:'Pokhara',category:'Outdoor',date:'2099-12-20',time:'10:30',spots:20,ownerId:'B'});
    expect(result.title).toBe('Hike'); expect(result).not.toHaveProperty('ownerId');
    expect(new Date(result.startAtMillis).toISOString()).toBe('2099-12-20T04:45:00.000Z');
    expect(() => eventFields({})).toThrow();
  });
});
