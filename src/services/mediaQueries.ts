import { collection, documentId, limit, orderBy, query, startAfter, Timestamp, where, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore';
import { MEDIA_PAGE_SIZE } from './mediaContract';
export function visibleStoriesQuery(store: Firestore, now: number, count = MEDIA_PAGE_SIZE, cursor?: QueryDocumentSnapshot) {
  return query(collection(store,'stories'), where('moderationStatus','==','ACTIVE'), where('visibilityStatus','==','PUBLIC'),
    where('status','==','active'), where('expiresAt','>',Timestamp.fromMillis(now)),
    orderBy('expiresAt','desc'), orderBy(documentId(),'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(Math.min(40,Math.max(1,count))));
}
export function eventSummaryQuery(store: Firestore, count = MEDIA_PAGE_SIZE, cursorId?: string) {
  return query(collection(store,'events'),where('moderationStatus','==','ACTIVE'),where('visibilityStatus','==','PUBLIC'),orderBy(documentId(),'asc'),...(cursorId ? [startAfter(cursorId)] : []),limit(count));
}
export function ownerStoriesQuery(store: Firestore, ownerId: string, now: number, cursor?: QueryDocumentSnapshot) {
  return query(collection(store, 'stories'), where('userId', '==', ownerId), where('moderationStatus', '==', 'ACTIVE'),
    where('visibilityStatus', '==', 'PUBLIC'), where('status', '==', 'active'), where('expiresAt', '>', Timestamp.fromMillis(now)),
    orderBy('expiresAt', 'asc'), orderBy(documentId(), 'asc'), ...(cursor ? [startAfter(cursor)] : []), limit(20));
}
