import { describe, it, expect, vi } from 'vitest';
import { createMediaDraft } from '../services/mediaUploadCore';
import { imageExtension, visibleStory, visibleAvatar, visibleEventImage } from '../services/mediaContract';
import { Timestamp } from 'firebase/firestore';
import type { ExperienceStory, Event } from '../types';

const story = (extra: Partial<ExperienceStory> = {}): ExperienceStory => ({
  id:'s', userId:'A', userName:'A', userAvatar:'', companionName:'', imageUrl:'https://example.test/test.jpg',
  mediaPath:'stories/A/s.jpg', caption:'',timeAgo:'',status:'active',moderationStatus:'ACTIVE',
  visibilityStatus:'PUBLIC',expiresAt:Timestamp.fromMillis(Date.now()+60000),...extra,
});
describe('media visibility and draft contract', () => {
  it('creates distributed stable per-selection IDs and UID-owned paths', () => {
    const file = new File(['image'],'photo.jpg',{type:'image/jpeg'});
    const a=createMediaDraft('story','A',file), b=createMediaDraft('story','A',file);
    expect(a.id).not.toBe(b.id); expect(a.contentId).toBe(a.id);
    expect(a.path).toBe('stories/A/'+a.id+'.jpg');
  });
  it('profile identity is the authenticated UID, with versioned binary paths', () => {
    const draft=createMediaDraft('profile','A',new File(['image'],'photo.png',{type:'image/png'}));
    expect(draft.contentId).toBe('A'); expect(draft.path).toMatch(/^avatars\/A\//);
  });
  it('rejects scripts, wrong extension, empty and oversized images', () => {
    for (const file of [
      {name:'x.svg',type:'image/svg+xml',size:4},
      {name:'x.exe',type:'image/jpeg',size:4},
      {name:'x.jpg',type:'image/png',size:4},
      {name:'x.jpg',type:'image/jpeg',size:0},
      {name:'x.jpg',type:'image/jpeg',size:10485761},
    ]) expect(()=>imageExtension(file)).toThrow();
  });
  it('only active public unexpired classified Stories render', () => {
    expect(visibleStory(story())).toBe(true);
    for(const moderationStatus of ['UNDER_REVIEW','RESTRICTED','REMOVED'] as const)
      expect(visibleStory(story({moderationStatus}))).toBe(false);
    expect(visibleStory(story({expiresAt:Timestamp.fromMillis(0)}))).toBe(false);
    expect(visibleStory(story({moderationStatus:undefined}))).toBe(false);
    expect(visibleStory(story({visibilityStatus:'PRIVATE'}))).toBe(false);
  });
  it('profile rendering does not trust an image URL without visibility metadata', () => {
    expect(visibleAvatar({avatar:'https://example.test/a.jpg'})).toBe('');
    expect(visibleAvatar({avatar:'a',photoModerationStatus:'RESTRICTED',photoVisibilityStatus:'PUBLIC'})).toBe('');
    expect(visibleAvatar({avatar:'a',photoModerationStatus:'ACTIVE',photoVisibilityStatus:'PUBLIC'})).toBe('a');
  });
  it('event image visibility does not remove the event or trust legacy image fallback', () => {
    const event={id:'e',imageUrl:'a',image:'legacy',mediaModerationStatus:'RESTRICTED',mediaVisibilityStatus:'PUBLIC'} as Event;
    expect(visibleEventImage(event)).toBe('');
    expect(visibleEventImage({...event,mediaModerationStatus:'ACTIVE'})).toBe('a');
  });
});
