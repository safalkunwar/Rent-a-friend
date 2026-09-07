import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { onDocumentWritten, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onObjectFinalized } from 'firebase-functions/v2/storage';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const db = () => admin.firestore();
type Kind = 'story' | 'event';

/** Reconcile against CURRENT source, not delivery order. A transaction receipt makes retries harmless. */
export async function reconcileInteraction(kind: Kind, action: 'likes' | 'comments', sourceId: string, targetId: string, actorId: string) {
  const sourcePath = `${kind}_${action}/${sourceId}`;
  const source = db().doc(sourcePath);
  const target = db().doc(`${kind === 'story' ? 'stories' : 'events'}/${targetId}`);
  const receipt = db().doc(`media_interaction_receipts/${hash(sourcePath)}`);
  const notification = db().doc(`notifications/media_${hash(sourcePath)}`);
  await db().runTransaction(async tx => {
    const [live, previous, content, notified, actor] = await Promise.all([tx.get(source), tx.get(receipt), tx.get(target), tx.get(notification), tx.get(db().doc(`users/${actorId}`))]);
    const wasPresent = previous.data()?.present === true;
    const present = live.exists;
    const delta = Number(present) - Number(wasPresent);
    const parent = content.data();
    const eligible = !!parent && parent.moderationStatus === 'ACTIVE' && parent.visibilityStatus === 'PUBLIC' &&
      (kind === 'event' || (parent.status === 'active' && parent.expiresAt?.toMillis() > Date.now()));
    // Deleted/expired parents cannot be recreated by delayed interaction events.
    if (delta && parent) {
      const field = action === 'likes' ? 'likesCount' : 'commentsCount';
      const count = Math.max(0, Number(parent[field] || 0) + delta);
      tx.update(target, { [field]: count, ...(kind === 'story' && action === 'likes' ? { likes: count } : {}) });
    }
    if (parent || present) tx.set(receipt, { present, targetId, kind, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    else tx.delete(receipt);
    const ownerId = kind === 'story' ? parent?.userId : parent?.ownerId;
    // One notification per like identity for its lifetime, including unlike/re-like.
    if (present && eligible && ownerId && ownerId !== actorId && !notified.exists) {
      const type = `${kind.toUpperCase()}_${action === 'likes' ? 'LIKE' : 'COMMENT'}`;
      const commentId = action === 'comments' ? sourceId : undefined;
      const actorName = typeof actor.data()?.name === 'string' ? actor.data()!.name.slice(0,100) : 'Someone';
      tx.create(notification, { userId: ownerId, actorId, actorName, type, targetType: kind, targetId,
        ...(commentId ? { commentId } : {}), title: `${kind === 'story' ? 'Story' : 'Event'} ${action === 'likes' ? 'like' : 'comment'}`,
        message: `${actorName} ${action === 'likes' ? 'liked' : 'commented on'} your ${kind}.`, isRead: false,
        timestamp: new Date().toISOString(), createdAt: admin.firestore.FieldValue.serverTimestamp(),
        link: `/${kind}/${targetId}${commentId ? '?comments=1' : ''}` });
    }
  });
}
function interaction(kind: Kind, action: 'likes' | 'comments') {
  return onDocumentWritten({ document: `${kind}_${action}/{interactionId}`, retry: true, maxInstances: 10 }, async event => {
    const data = event.data?.after.data() || event.data?.before.data();
    if (!data) return;
    const targetId = data[`${kind}Id`], actorId = data.userId;
    if (typeof targetId !== 'string' || typeof actorId !== 'string' || !/^[\w-]+$/.test(targetId) || !/^[\w-]+$/.test(actorId)) return;
    await reconcileInteraction(kind, action, event.params.interactionId, targetId, actorId);
  });
}
export const onStoryLike = interaction('story', 'likes');
export const onStoryComment = interaction('story', 'comments');
export const onEventLike = interaction('event', 'likes');
export const onEventComment = interaction('event', 'comments');

/** Only canonical, owned Story paths are deletable. Never consume arbitrary paths from a document. */
export async function deleteStoryMedia(storyId: string, data: admin.firestore.DocumentData) {
  const { userId } = data;
  for (const mediaPath of [data.mediaPath, data.mediaPreviewPath]) {
  if (typeof userId !== 'string' || typeof mediaPath !== 'string' || !/^[\w-]+$/.test(userId) ||
      !new RegExp(`^stories/${userId}/[a-zA-Z0-9_-]+\\.(jpg|jpeg|png|webp)$`).test(mediaPath)) continue;
  const file = admin.storage().bucket('hamrosathi1.firebasestorage.app').file(mediaPath);
  try {
    const [metadata] = await file.getMetadata();
    if (metadata.metadata?.ownerUid !== userId || metadata.metadata?.contentId !== storyId) throw new Error('Story media ownership mismatch');
    await file.delete({ ignoreNotFound: true, ifGenerationMatch: Number(metadata.generation) });
  } catch (error) { if (Number((error as { code?: number }).code) !== 404) throw error; }
  }
}
export const cleanupExpiredStories = onSchedule({ schedule: 'every 15 minutes', timeZone: 'Asia/Kathmandu', maxInstances: 1, retryCount: 3, timeoutSeconds: 300 }, async () => {
  // Single-field indexed query; bounded work even after an extended outage.
  const expired = await db().collection('stories').where('expiresAt', '<=', admin.firestore.Timestamp.now()).orderBy('expiresAt').limit(50).get();
  for (const story of expired.docs) {
    await deleteStoryMedia(story.id, story.data());
    await story.ref.delete();
  }
});
export const onStoryDeletedMedia = onDocumentDeleted({ document: 'stories/{storyId}', retry: true, timeoutSeconds: 300, maxInstances: 5 }, async event => {
  if (!event.data) return;
  await deleteStoryMedia(event.params.storyId, event.data.data());
  // Parent deletion does not delete interactions. Retry bounded batches until drained.
  let remaining = false;
  for (const collection of ['story_likes', 'story_comments']) {
    const page = await db().collection(collection).where('storyId', '==', event.params.storyId).limit(100).get();
    const batch = db().batch(); page.docs.forEach(item => batch.delete(item.ref)); await batch.commit();
    remaining ||= page.size === 100;
  }
  if (remaining) throw new Error('Story interaction cleanup has more bounded work; retry.');
});

// Indexed, distributed cleanup tickets avoid scanning the bucket for failed publications.
export const onMediaUploadFinalized = onObjectFinalized({ bucket: 'hamrosathi1.firebasestorage.app', region: 'us-east1', retry: true, maxInstances: 5 }, async event => {
  const object = event.data;
  const match = /^(avatars|stories|events)\/([a-zA-Z0-9_-]+)\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.exec(object.name);
  if (!match || object.metadata?.ownerUid !== match[2] || !/^[a-zA-Z0-9_-]+$/.test(object.metadata?.contentId || '')) return;
  const reference = db().doc(`media_upload_cleanup/${hash(object.name + ':' + object.generation)}`);
  await db().runTransaction(async tx => {
    if ((await tx.get(reference)).exists) return;
    tx.create(reference, { path: object.name, generation: object.generation, category: match[1], ownerId: match[2],
      contentId: object.metadata!.contentId, checkAfter: admin.firestore.Timestamp.fromMillis(new Date(object.timeCreated || Date.now()).getTime() + 48 * 3600000) });
  });
});
export const cleanupMediaOrphans = onSchedule({ schedule: 'every 60 minutes', maxInstances: 1, timeoutSeconds: 300, retryCount: 3 }, async () => {
  const page = await db().collection('media_upload_cleanup').where('checkAfter', '<=', admin.firestore.Timestamp.now()).orderBy('checkAfter').limit(100).get();
  for (const ticket of page.docs) {
    const data = ticket.data();
    const match = /^(avatars|stories|events)\/([a-zA-Z0-9_-]+)\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.exec(data.path || '');
    if (!match || match[1] !== data.category || match[2] !== data.ownerId || !/^[a-zA-Z0-9_-]+$/.test(data.contentId || '')) throw new Error('Invalid cleanup ticket');
    const collection = data.category === 'avatars' ? 'users' : data.category;
    const canonical = (await db().doc(`${collection}/${data.contentId}`).get()).data();
    const fields = data.category === 'avatars' ? ['photoPath','photoPreviewPath'] : data.category === 'stories' ? ['mediaPath','mediaPreviewPath'] : ['imagePath','mediaPreviewPath'];
    const linked = canonical && fields.some(field => canonical[field] === data.path);
    if (!linked) {
      await admin.storage().bucket('hamrosathi1.firebasestorage.app').file(data.path).delete({ ignoreNotFound: true, ifGenerationMatch: Number(data.generation) });
    }
    await ticket.ref.delete();
  }
});
