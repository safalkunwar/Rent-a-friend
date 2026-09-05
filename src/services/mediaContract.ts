import type { ExperienceStory, Event, User } from '../types';
import { validateUpload } from './uploadContract';

export type MediaKind = 'story' | 'profile' | 'event';
export type ModerationStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'RESTRICTED' | 'REMOVED';
export const MEDIA_PAGE_SIZE = 10;
export const mediaCategory = (kind: MediaKind) => kind === 'profile' ? 'avatars' : kind === 'story' ? 'stories' : 'events';
export function imageExtension(file: Pick<File, 'name' | 'type' | 'size'>): string {
  validateUpload('stories', file.type, file.size);
  const extension = file.name.split('.').pop()?.toLowerCase();
  const expected: Record<string, string[]> = { 'image/jpeg': ['jpg','jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] };
  if (!extension || !expected[file.type]?.includes(extension)) throw new Error('Use a matching JPG, PNG or WebP filename and image type.');
  return extension;
}
export function mediaPath(kind: MediaKind, uid: string, id: string, extension: string): string {
  if (![uid,id].every(value => /^[a-zA-Z0-9_-]+$/.test(value)) || !['jpg','jpeg','png','webp'].includes(extension)) throw new Error('Invalid media identity/path.');
  return `${mediaCategory(kind)}/${uid}/${id}.${extension}`;
}
export const mediaTime = (value: ExperienceStory['expiresAt']): number =>
  typeof value === 'string' ? Date.parse(value) : value?.toMillis() ?? 0;
export const visibleStory = (story: ExperienceStory, now = Date.now()): boolean => !!story &&
  story.status === 'active' && story.moderationStatus === 'ACTIVE' && story.visibilityStatus === 'PUBLIC' &&
  !!story.mediaPath && mediaTime(story.expiresAt) > now;
export const visibleAvatar = (user: Pick<Partial<User>, 'avatar' | 'photoModerationStatus' | 'photoVisibilityStatus'>): string =>
  user.photoModerationStatus === 'ACTIVE' && user.photoVisibilityStatus === 'PUBLIC' ? user.avatar || '' : '';
export const visibleEventImage = (event: Event): string =>
  event.mediaModerationStatus === 'ACTIVE' && event.mediaVisibilityStatus === 'PUBLIC' ? event.imageUrl || '' : '';
