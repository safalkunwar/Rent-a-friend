import { collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, limit, orderBy, query, runTransaction, serverTimestamp, startAfter, where, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { requireUid } from './identity';

export type InteractionTarget = 'story' | 'event';
export const interactionCollection = (kind: InteractionTarget, action: 'likes' | 'comments') => `${kind}_${action}`;
const targetField = (kind: InteractionTarget) => `${kind}Id`;
export const contentInteractions = {
  async liked(kind: InteractionTarget, id: string) {
    const uid = requireUid();
    if (!db) throw new Error('Interactions unavailable.');
    return (await getDocFromServer(doc(db, interactionCollection(kind, 'likes'), `${uid}_${id}`))).exists();
  },
  async setLiked(kind: InteractionTarget, id: string, liked: boolean) {
    const uid = requireUid();
    if (!db) throw new Error('Interactions unavailable.');
    const reference = doc(db, interactionCollection(kind, 'likes'), `${uid}_${id}`);
    if (!liked) return deleteDoc(reference);
    await runTransaction(db, async transaction => {
      if ((await transaction.get(reference)).exists()) return;
      transaction.set(reference, { userId: uid, [targetField(kind)]: id, createdAt: serverTimestamp() });
    });
  },
  async comment(kind: InteractionTarget, id: string, text: string, commentId: string) {
    if (kind === 'story') throw new Error('Stories support likes only.');
    const uid = requireUid();
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) throw new Error('Comments must contain 1–500 characters.');
    if (!db) throw new Error('Comments unavailable.');
    const reference = doc(db, interactionCollection(kind, 'comments'), commentId);
    await runTransaction(db, async transaction => {
      const existing = await transaction.get(reference);
      if (existing.exists()) {
        if (existing.data().userId !== uid || existing.data().text !== trimmed || existing.data()[targetField(kind)] !== id) throw new Error('Comment identity conflict.');
        return;
      }
      transaction.set(reference, { userId: uid, [targetField(kind)]: id, text: trimmed, createdAt: serverTimestamp() });
    });
  },
  async comments(kind: InteractionTarget, id: string, cursor?: QueryDocumentSnapshot) {
    if (kind === 'story') throw new Error('Stories support likes only.');
    if (!db) throw new Error('Comments unavailable.');
    const result = await getDocsFromServer(query(collection(db, interactionCollection(kind, 'comments')),
      where(targetField(kind), '==', id), orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(20)));
    return { items: result.docs.map(item => ({ id: item.id, ...item.data() } as { id: string; userId: string; text: string })), cursor: result.docs.at(-1), hasMore: result.size === 20 };
  },
};
