import { doc, getDocFromServer, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { ref, getMetadata, deleteObject, type FirebaseStorage } from 'firebase/storage';
import type { Auth } from 'firebase/auth';

export const MAX_EVENT_PARTICIPANTS = 10000;
export function eventCapacity(data: Record<string, any>) {
  const valid = data.participationVersion === 1 && Number.isInteger(data.spots) && data.spots > 0 && data.spots <= MAX_EVENT_PARTICIPANTS &&
    Number.isInteger(data.participantCount) && data.participantCount >= 0 && data.participantCount <= data.spots;
  return { valid, count: valid ? data.participantCount as number : null, remaining: valid ? data.spots - data.participantCount : null };
}
type Dependencies = { auth: Auth; db: Firestore; storage?: FirebaseStorage };
function uidOf(auth: Auth) {
  if (!auth.currentUser || auth.currentUser.isAnonymous) throw new Error('Sign in to join an event.');
  return auth.currentUser.uid;
}
function identity(eventId: string, auth: Auth) {
  if (!/^[a-zA-Z0-9_-]+$/.test(eventId)) throw new Error('Invalid event.');
  const uid = uidOf(auth);
  return { uid, id: `${eventId}_${uid}` };
}
export async function setEventParticipation(deps: Dependencies, eventId: string, joined: boolean) {
  const { uid, id } = identity(eventId, deps.auth);
  let attemptedCount: unknown;
  const commit = () => runTransaction(deps.db, async tx => {
    if (uidOf(deps.auth) !== uid) throw new Error('Account changed. Please retry.');
    const eventRef = doc(deps.db, 'events', eventId), memberRef = doc(deps.db, 'event_participants', id);
    const [event, member] = await Promise.all([tx.get(eventRef), tx.get(memberRef)]);
    if (!event.exists()) throw new Error('Event is no longer available.');
    const data = event.data(), wasJoined = member.data()?.status === 'joined';
    attemptedCount = data.participantCount;
    if (wasJoined === joined) return;
    // Preserve legitimate cancellation of legacy memberships without guessing a total.
    if (!joined && data.participationVersion !== 1) {
      tx.update(memberRef, { status: 'cancelled', updatedAt: serverTimestamp() });
      return;
    }
    const capacity = eventCapacity(data);
    if (!capacity.valid) throw new Error('Registration is unavailable until this event’s capacity is verified.');
    if (joined && (data.status !== 'ACTIVE' || data.moderationStatus !== 'ACTIVE' || data.visibilityStatus !== 'PUBLIC' || data.startAt?.toMillis() <= Date.now())) throw new Error('Event is no longer available for joining.');
    if (joined && capacity.remaining === 0) throw new Error('Event is full');
    if (!joined && capacity.count === 0) throw new Error('Participant count needs verification.');
    tx.update(eventRef, { participantCount: capacity.count! + (joined ? 1 : -1), updatedAt: serverTimestamp() });
    if (member.exists()) tx.update(memberRef, { status: joined ? 'joined' : 'cancelled', updatedAt: serverTimestamp() });
    else tx.set(memberRef, { id, eventId, userId: uid, userName: (deps.auth.currentUser?.displayName || 'User').slice(0,120), status: 'joined', joinedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  // A rules getAfter() check can see a winner before the stale write returns ABORTED.
  // Retry only a proven changed counter; never retry a generic authorization failure.
  for (let attempt=0; attempt<4; attempt++) {
    try { await commit(); return id; }
    catch(error) {
      if ((error as {code?:string}).code !== 'permission-denied') throw error;
      const fresh = await readEventParticipation(deps,eventId);
      if (fresh.joined === joined) return id;
      const current = eventCapacity(fresh.event);
      if (joined && current.valid && current.remaining === 0) throw new Error('Event is full');
      if (attempt<3 && current.valid && current.count!==attemptedCount) continue;
      throw error;
    }
  }
  throw new Error('Event changed. Please retry.');
}
export async function readEventParticipation(deps: Dependencies, eventId: string) {
  const { uid, id } = identity(eventId, deps.auth);
  const [event, member] = await Promise.all([getDocFromServer(doc(deps.db,'events',eventId)),getDocFromServer(doc(deps.db,'event_participants',id))]);
  if(uidOf(deps.auth)!==uid) throw new Error('Account changed. Please retry.');
  if(!event.exists()) throw new Error('Event is no longer available.');
  return { event: { ...event.data(), id: eventId }, joined: member.data()?.status === 'joined' };
}
/** Tombstone first: preserve participant/reference history. Unlink media so existing orphan tickets can reclaim it. */
export async function deleteOwnedEvent(deps: Dependencies, eventId: string) {
  const { uid } = identity(eventId, deps.auth);
  const paths = await runTransaction(deps.db, async tx => {
    if(uidOf(deps.auth)!==uid) throw new Error('Account changed. Please retry.');
    const target=doc(deps.db,'events',eventId), snapshot=await tx.get(target);
    if(!snapshot.exists()) return [] as string[];
    const data=snapshot.data();
    if(data.ownerId!==uid) throw new Error('Only the event owner can delete this event.');
    if(data.status==='DELETED') return [] as string[];
    const ownedPaths = data.imageOwnerId === uid ? [data.imagePath,data.mediaPreviewPath].filter((path): path is string=>typeof path==='string' && new RegExp(`^events/${uid}/[a-zA-Z0-9_-]+\\.(jpg|jpeg|png|webp)$`).test(path)) : [];
    tx.update(target,{status:'DELETED',visibilityStatus:'PRIVATE',mediaVisibilityStatus:'PRIVATE',deletedAt:serverTimestamp(),updatedAt:serverTimestamp(),imagePath:'',imageUrl:'',mediaPreviewPath:'',mediaPreviewUrl:''});
    return ownedPaths;
  });
  let mediaCleanupPending=false;
  for(const path of paths) {
    try {
      if(!deps.storage || uidOf(deps.auth)!==uid) throw new Error('Media cleanup unavailable');
      const object=ref(deps.storage,path), metadata=await getMetadata(object);
      if(metadata.customMetadata?.ownerUid!==uid || metadata.customMetadata?.contentId!==eventId) throw new Error('Media identity mismatch');
      await deleteObject(object); // Upload paths are immutable under the existing Storage rules.
    } catch(error) { if((error as {code?:string}).code!=='storage/object-not-found') mediaCleanupPending=true; }
  }
  return { mediaCleanupPending };
}
