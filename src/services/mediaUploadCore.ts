import { doc, getDocFromServer, runTransaction, Timestamp, type Firestore } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, getMetadata, deleteObject, type FirebaseStorage } from 'firebase/storage';
import type { Auth } from 'firebase/auth';
import { imageExtension, mediaCategory, mediaPath, type MediaKind } from './mediaContract';
import { validateFileSignature } from './uploadContract';
import type { ExperienceStory } from '../types';

export interface MediaDependencies { auth: Auth; db: Firestore; storage: FirebaseStorage }
export interface MediaDraft {
  kind: MediaKind; uid: string; id: string; contentId: string; path: string; file: File;
  url?: string; busy?: boolean; uploadAttempted?: boolean; uploaded?: boolean;
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
  try {
    requireOwner(deps.auth, draft.uid);
    imageExtension(draft.file);
    validateFileSignature(draft.file.type, new Uint8Array(await draft.file.slice(0,16).arrayBuffer()));
    // Check current moderation before transferring bytes; rules repeat the check at commit.
    const before = await getDocFromServer(target);
    if (draft.kind === 'profile' && !before.exists()) throw new Error('Create your account profile before uploading a photo.');
    if (before.exists() && ![undefined,'ACTIVE'].includes(before.data()[statusField(draft.kind)])) throw new Error('This media is under moderation. Contact support before replacing it.');
    if (draft.kind === 'event' && before.exists() && before.data().imageOwnerId && before.data().imageOwnerId !== draft.uid) throw new Error('Only the existing event image owner can replace this image.');
    if (before.exists() && before.data()[pathField(draft.kind)] === draft.path) {
      return { ...before.data(), id: before.id }; // Lost acknowledgement: never reset moderation/counters.
    }
    if (!draft.url) {
      const object = ref(deps.storage, draft.path);
      // Recover a lost upload acknowledgement without overwriting the immutable object.
      if (draft.uploadAttempted && !draft.uploaded) {
        try {
          const existing = await getMetadata(object);
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
      await new Promise<void>((resolve,reject) => task.on('state_changed', snapshot => {
        if (deps.auth.currentUser?.uid !== draft.uid) task.cancel();
        onProgress?.(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes));
      }, reject, resolve));
      draft.uploaded = true;
      }
      requireOwner(deps.auth,draft.uid);
      draft.url = await getDownloadURL(object);
    }
    requireOwner(deps.auth,draft.uid);
    return await runTransaction(deps.db, async tx => {
      const current = await tx.get(target);
      if (current.exists() && current.data()[pathField(draft.kind)] === draft.path) return { ...current.data(), id: current.id };
      if (current.exists() && ![undefined,'ACTIVE'].includes(current.data()[statusField(draft.kind)])) throw new Error('Media was restricted during upload; it was not published.');
      const now = new Date().toISOString();
      let data: Record<string, unknown>;
      if (draft.kind === 'story') {
        if (current.exists()) throw new Error('Story identity already exists.');
        data = { id: draft.contentId, userId: draft.uid, contentType: 'story', mediaType: 'image',
          userName: typeof fields.userName === 'string' ? fields.userName : 'User', userAvatar: '', companionName: '',
          caption: typeof fields.caption === 'string' ? fields.caption.trim() : '', timeAgo: 'Just now',
          imageUrl: draft.url, mediaPath: draft.path, createdAt: now, updatedAt: now,
          expiresAt: Timestamp.fromMillis(Date.now() + 86400000), status: 'active',
          moderationStatus: 'ACTIVE', visibilityStatus: 'PUBLIC', reportedCount: 0,
          likes: 0, likesCount: 0, comments: 0, commentsCount: 0 };
        tx.set(target,data);
      } else if (draft.kind === 'profile') {
        data = { avatar: draft.url, photoPath: draft.path, photoUpdatedAt: now,
          photoModerationStatus: 'ACTIVE', photoVisibilityStatus: 'PUBLIC', photoReportedCount: current.data()?.photoReportedCount ?? 0 };
        tx.update(target,data);
      } else {
        const allowed = ['title','description','location','category','date','time','spots'];
        const content = Object.fromEntries(Object.entries(fields).filter(([key,value]) => allowed.includes(key) && value !== undefined));
        data = { ...content, imageUrl: draft.url, imagePath: draft.path, imageOwnerId: draft.uid,
          mediaModerationStatus: 'ACTIVE', mediaVisibilityStatus: 'PUBLIC', mediaReportedCount: current.data()?.mediaReportedCount ?? 0,
          imageUpdatedAt: now, updatedAt: now, ...(!current.exists() ? { id: draft.contentId, createdAt: now } : {}) };
        if (current.exists()) tx.update(target,data); else tx.set(target,data);
      }
      return { ...(current.exists() ? current.data() : {}), ...data, id: draft.contentId };
    });
  } catch (error) {
    // Never delete after an ambiguous acknowledgement unless a server read proves no reference.
    // Timeout/offline errors retain the stable draft for retry; backend lifecycle cleanup is still needed.
    const code = (error as { code?: string }).code;
    if (draft.url && ['permission-denied','invalid-argument'].includes(code || '')) {
      try {
        requireOwner(deps.auth,draft.uid);
        const saved = await getDocFromServer(target);
        if (!saved.exists() || saved.data()[pathField(draft.kind)] !== draft.path) {
          await deleteObject(ref(deps.storage,draft.path));
          draft.url = undefined;
          draft.uploaded = false;
          draft.uploadAttempted = false;
        }
      } catch { /* No safe proof/permission: retain object for authorized orphan cleanup. */ }
    }
    throw error;
  } finally { draft.busy = false; }
}

export type SavedStory = ExperienceStory;
