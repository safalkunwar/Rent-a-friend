import { doc, getDocFromServer, runTransaction, serverTimestamp, Timestamp, type Firestore } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, getMetadata, deleteObject, type FirebaseStorage } from 'firebase/storage';
import type { Auth } from 'firebase/auth';
import { imageExtension, mediaCategory, mediaPath, type MediaKind } from './mediaContract';
import { validateFileSignature } from './uploadContract';
import type { ExperienceStory } from '../types';
import { mediaDeadline } from './mediaDeadline';
import { eventFields } from './eventContract';

export interface MediaDependencies { auth: Auth; db: Firestore; storage: FirebaseStorage }
export interface MediaDraft {
  kind: MediaKind; uid: string; id: string; contentId: string; path: string; file: File;
  url?: string; busy?: boolean; uploadAttempted?: boolean; uploaded?: boolean;
  preview?: { file: File; path: string; url?: string; uploaded?: boolean };
}
export function createMediaDraft(kind: MediaKind, uid: string, file: File, contentId?: string): MediaDraft {
  if (contentId && !/^[a-zA-Z0-9_-]+$/.test(contentId)) throw new Error('Invalid media content identity.');
  const id = crypto.randomUUID();
  return { kind, uid, id, contentId: kind === 'profile' ? uid : contentId || id, file,
    path: mediaPath(kind, uid, id, imageExtension(file)) };
}
function requireOwner(auth: Auth, uid: string) {
  if (!auth.currentUser || auth.currentUser.isAnonymous || auth.currentUser.uid !== uid) throw new Error('Sign in with the account that selected this image.');
}
const statusField = (kind: MediaKind) => kind === 'profile' ? 'photoModerationStatus' : kind === 'event' ? 'mediaModerationStatus' : 'moderationStatus';
const pathField = (kind: MediaKind) => kind === 'profile' ? 'photoPath' : kind === 'event' ? 'imagePath' : 'mediaPath';
const collectionName = (kind: MediaKind) => kind === 'profile' ? 'users' : kind === 'event' ? 'events' : 'stories';

/** Same explicit-dependency implementation for main app, admin event form and emulator tests. */
export async function saveMedia(deps: MediaDependencies, draft: MediaDraft, fields: Record<string, unknown> = {}, onProgress?: (progress: number) => void): Promise<Record<string, unknown> & { id: string }> {
  if (draft.busy) throw new Error('This upload is already in progress.');
  draft.busy = true;
  const target = doc(deps.db, collectionName(draft.kind), draft.contentId);
  const wait = <T>(operation: Promise<T>, phase: string, cancel?: () => void) =>
    draft.kind === 'event' ? operation : mediaDeadline(operation, phase, cancel);
  const confirmStory = async () => {
    requireOwner(deps.auth, draft.uid);
    // Resolve the server creation time before assigning an exact 24-hour lifetime.
    // A pending Story is owner-only and can be resumed using the same draft ID.
    await wait(runTransaction(deps.db, async tx => {
      const saved = await tx.get(target);
      const data = saved.data();
      if (!data || data.mediaPath !== draft.path || data.userId !== draft.uid) throw new Error('Story confirmation failed. Retry with this image.');
      if (data.moderationStatus !== 'ACTIVE' || data.visibilityStatus !== 'PUBLIC') throw new Error('This Story is under moderation.');
      if (data.status === 'publishing' && data.createdAt instanceof Timestamp) {
        tx.update(target, { status: 'active', expiresAt: Timestamp.fromMillis(data.createdAt.toMillis() + 86400000) });
      } else if (data.status !== 'active') throw new Error('Story could not be published.');
    }), 'Story publication');
    const confirmed = await wait(getDocFromServer(target), 'Story confirmation');
    const data = confirmed.data();
    if (!data || data.status !== 'active' || data.moderationStatus !== 'ACTIVE' || data.visibilityStatus !== 'PUBLIC') throw new Error('Story is not publicly available.');
    return { ...data, id: confirmed.id };
  };
  try {
    requireOwner(deps.auth, draft.uid);
    imageExtension(draft.file);
    validateFileSignature(draft.file.type, new Uint8Array(await draft.file.slice(0,16).arrayBuffer()));
    // Check current moderation before transferring bytes; rules repeat the check at commit.
    const before = await wait(getDocFromServer(target), 'Checking your media');
    if (draft.kind === 'profile' && !before.exists()) throw new Error('Create your account profile before uploading a photo.');
    if (before.exists() && ![undefined,'ACTIVE'].includes(before.data()[statusField(draft.kind)])) throw new Error('This media is under moderation. Contact support before replacing it.');
    if (draft.kind === 'event' && before.exists() && before.data().imageOwnerId && before.data().imageOwnerId !== draft.uid) throw new Error('Only the existing event image owner can replace this image.');
    if (before.exists() && before.data()[pathField(draft.kind)] === draft.path) {
      if (draft.kind === 'story') return await confirmStory();
      return { ...before.data(), id: before.id }; // Lost acknowledgement: never reset moderation/counters.
    }
    if (!draft.url) {
      const object = ref(deps.storage, draft.path);
      // Recover a lost upload acknowledgement without overwriting the immutable object.
      if (draft.uploadAttempted && !draft.uploaded) {
        try {
          const existing = await wait(getMetadata(object), 'Recovering upload');
          if (existing.customMetadata?.ownerUid !== draft.uid || existing.customMetadata?.contentId !== draft.contentId || existing.size !== draft.file.size || existing.contentType !== draft.file.type) throw new Error('Existing media object does not match this upload.');
          draft.uploaded = true;
        } catch (error) { if ((error as {code?:string}).code !== 'storage/object-not-found') throw error; }
      }
      if (!draft.uploaded) {
      draft.uploadAttempted = true;
      const task = uploadBytesResumable(object, draft.file, {
        contentType: draft.file.type, cacheControl: 'public, max-age=300',
        customMetadata: { ownerUid: draft.uid, category: mediaCategory(draft.kind), contentId: draft.contentId },
      });
      await wait(new Promise<void>((resolve,reject) => task.on('state_changed', snapshot => {
        if (deps.auth.currentUser?.uid !== draft.uid) task.cancel();
        onProgress?.(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes));
      }, reject, resolve)), 'Image upload', () => task.cancel());
      draft.uploaded = true;
      }
      requireOwner(deps.auth,draft.uid);
      draft.url = await wait(getDownloadURL(object), 'Obtaining image URL');
    }
    requireOwner(deps.auth,draft.uid);
    if (draft.preview && !draft.preview.url) {
      const preview = draft.preview, object = ref(deps.storage, preview.path);
      // Immutable variants recover acknowledgement loss before attempting upload again.
      try {
        const existing = await wait(getMetadata(object), 'Checking image preview');
        if (existing.customMetadata?.ownerUid !== draft.uid || existing.customMetadata?.contentId !== draft.contentId || existing.size !== preview.file.size) throw new Error('Preview identity conflict.');
        preview.uploaded = true;
      } catch (error) { if ((error as { code?: string }).code !== 'storage/object-not-found') throw error; }
      if (!preview.uploaded) {
        const task = uploadBytesResumable(object, preview.file, { contentType: preview.file.type, cacheControl: 'public, max-age=300',
          customMetadata: { ownerUid: draft.uid, category: mediaCategory(draft.kind), contentId: draft.contentId } });
        await wait(new Promise<void>((resolve, reject) => task.on('state_changed', () => {
          if (deps.auth.currentUser?.uid !== draft.uid) task.cancel();
        }, reject, resolve)), 'Uploading preview', () => task.cancel());
        preview.uploaded = true;
      }
      preview.url = await wait(getDownloadURL(object), 'Obtaining preview URL');
      requireOwner(deps.auth, draft.uid);
    }
    const result = await wait(runTransaction(deps.db, async tx => {
      const current = await tx.get(target);
      if (current.exists() && current.data()[pathField(draft.kind)] === draft.path) return { ...current.data(), id: current.id };
      if (current.exists() && ![undefined,'ACTIVE'].includes(current.data()[statusField(draft.kind)])) throw new Error('Media was restricted during upload; it was not published.');
      const now = new Date().toISOString();
      let data: Record<string, unknown>;
      if (draft.kind === 'story') {
        if (current.exists()) throw new Error('Story identity already exists.');
        data = { id: draft.contentId, userId: draft.uid, contentType: 'story', mediaType: 'image',
          userName: typeof fields.userName === 'string' ? fields.userName : 'User', userAvatar: typeof fields.userAvatar === 'string' ? fields.userAvatar : '', companionName: '',
          caption: typeof fields.caption === 'string' ? fields.caption.trim() : '', timeAgo: 'Just now',
          imageUrl: draft.url, mediaPath: draft.path, createdAt: serverTimestamp(), updatedAt: now,
          expiresAt: null, status: 'publishing',
          moderationStatus: 'ACTIVE', visibilityStatus: 'PUBLIC', reportedCount: 0,
          likes: 0, likesCount: 0, comments: 0, commentsCount: 0 };
        if (draft.preview?.url) Object.assign(data, { mediaPreviewPath: draft.preview.path, mediaPreviewUrl: draft.preview.url });
        tx.set(target,data);
      } else if (draft.kind === 'profile') {
        data = { avatar: draft.url, photoPath: draft.path, photoUpdatedAt: now,
          photoModerationStatus: 'ACTIVE', photoVisibilityStatus: 'PUBLIC', photoReportedCount: current.data()?.photoReportedCount ?? 0 };
        if (draft.preview?.url) Object.assign(data, { photoPreviewPath: draft.preview.path, photoPreviewUrl: draft.preview.url });
        tx.update(target,data);
      } else {
        const allowed = ['title','description','location','category','date','time','spots'];
        const content = Object.fromEntries(Object.entries(fields).filter(([key,value]) => allowed.includes(key) && value !== undefined));
        data = { ...content, imageUrl: draft.url, imagePath: draft.path, imageOwnerId: draft.uid,
          mediaModerationStatus: 'ACTIVE', mediaVisibilityStatus: 'PUBLIC', mediaReportedCount: current.data()?.mediaReportedCount ?? 0,
          imageUpdatedAt: now, updatedAt: now, ...(!current.exists() ? { id: draft.contentId, createdAt: now } : {}) };
        // Explicit user-event contract. Existing admin form stays on its current schema.
        if (fields.userCreated === true) {
          if (current.exists()) throw new Error('Event already exists.');
          const validated = eventFields(fields);
          const { startAtMillis, ...eventContent } = validated;
          data = { ...data, ...eventContent, ownerId: draft.uid, moderationStatus: 'ACTIVE', visibilityStatus: 'PUBLIC',
            startAt: Timestamp.fromMillis(startAtMillis), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
            likesCount: 0, commentsCount: 0, status: 'ACTIVE', participationVersion: 1, participantCount: 0 };
        }
        if (draft.preview?.url) Object.assign(data, { mediaPreviewPath: draft.preview.path, mediaPreviewUrl: draft.preview.url });
        if (current.exists()) tx.update(target,data); else tx.set(target,data);
      }
      return { ...(current.exists() ? current.data() : {}), ...data, id: draft.contentId };
    }), 'Saving image metadata');
    if (draft.kind === 'story') return await confirmStory();
    if (draft.kind === 'profile') {
      const oldPreview = before.data()?.photoPreviewPath;
      if (typeof oldPreview === 'string' && oldPreview !== draft.preview?.path && oldPreview.startsWith(`avatars/${draft.uid}/`) && /^avatars\/[^/]+\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(oldPreview)) {
        try { await wait(deleteObject(ref(deps.storage, oldPreview)), 'Previous preview cleanup'); } catch { /* Canonical replacement already saved. */ }
      }
      const oldPath = before.data()?.photoPath;
      if (typeof oldPath === 'string' && oldPath !== draft.path && oldPath.startsWith(`avatars/${draft.uid}/`) && /^avatars\/[^/]+\/[^/]+\.(jpg|jpeg|png|webp)$/.test(oldPath)) {
        // Only after the canonical write; failure must not turn a saved photo into an upload error.
        try { await wait(deleteObject(ref(deps.storage, oldPath)), 'Previous photo cleanup'); } catch { /* New canonical photo remains valid. */ }
      }
    }
    return result;
  } catch (error) {
    // Never delete after an ambiguous acknowledgement unless a server read proves no reference.
    // Timeout/offline errors retain the stable draft for retry; backend lifecycle cleanup is still needed.
    const code = (error as { code?: string }).code;
    if (draft.url && ['permission-denied','invalid-argument'].includes(code || '')) {
      try {
        requireOwner(deps.auth,draft.uid);
        const saved = await wait(getDocFromServer(target), 'Checking orphan image');
        if (!saved.exists() || saved.data()[pathField(draft.kind)] !== draft.path) {
          await wait(deleteObject(ref(deps.storage,draft.path)), 'Removing orphan image');
          draft.url = undefined;
          draft.uploaded = false;
          draft.uploadAttempted = false;
        }
      } catch { /* No safe proof/permission: retain object for authorized orphan cleanup. */ }
    }
    if (draft.kind !== 'event') console.warn('[media upload]', { kind: draft.kind, id: draft.contentId, code: code || 'unknown' });
    throw error;
  } finally { draft.busy = false; }
}

export type SavedStory = ExperienceStory;
