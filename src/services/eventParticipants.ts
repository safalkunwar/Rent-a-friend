import { firestore } from './firestore';
import { auth, db, storage } from '../firebase';
import { setEventParticipation, readEventParticipation, deleteOwnedEvent } from './eventParticipationCore';
import { doc, getDocFromServer } from 'firebase/firestore';
import { requireUid } from './identity';

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  status: 'joined' | 'cancelled';
  joinedAt: string | import('firebase/firestore').Timestamp;
  updatedAt: string | import('firebase/firestore').Timestamp;
}

const EVENT_PARTICIPANTS_COLLECTION = 'event_participants';

export const eventParticipantsService = {
  async joinEvent(eventId: string): Promise<string> {
    if (!db) throw new Error('Events are unavailable.');
    return setEventParticipation({auth,db},eventId,true);
  },

  async leaveEvent(eventId: string): Promise<void> {
    if (!db) throw new Error('Events are unavailable.');
    await setEventParticipation({auth,db},eventId,false);
  },

  async getParticipation(eventId: string) {
    if (!db) throw new Error('Events are unavailable.');
    return readEventParticipation({auth,db},eventId);
  },

  async deleteEvent(eventId: string) {
    if (!db) throw new Error('Events are unavailable.');
    return deleteOwnedEvent({auth,db,storage},eventId);
  },

  async getEventParticipants(eventId: string): Promise<EventParticipant[]> {
    return firestore.getDocuments<EventParticipant>(EVENT_PARTICIPANTS_COLLECTION, {
      where: [{ field: 'eventId', operator: '==', value: eventId }],
      orderByField: 'joinedAt',
      orderDirection: 'desc',
      limitCount: 100,
    });
  },

  async getUserJoinedEvents(userId: string): Promise<EventParticipant[]> {
    requireUid(userId);
    return firestore.getDocuments<EventParticipant>(EVENT_PARTICIPANTS_COLLECTION, {
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'status', operator: '==', value: 'joined' }
      ],
      orderByField: 'joinedAt',
      orderDirection: 'desc',
      limitCount: 50,
      throwOnError: true,
    });
  },

  async getUserJoinedEventSummaries(userId: string) {
    const registrations: EventParticipant[] = (await this.getUserJoinedEvents(userId)).slice(0, 5);
    if (!registrations.length) return [];
    if (!db) throw new Error('Events are unavailable.');
    const ids = [...new Set(registrations.map(item => item.eventId))];
    // Bounded direct reads can resolve member-only tombstones without a public-list query.
    const snapshots = await Promise.all(ids.map(id => getDocFromServer(doc(db!, 'events', id))));
    const events = new Map(snapshots.map(item => [item.id, item.data()]));
    return registrations.map(registration => {
      const event = events.get(registration.eventId);
      return {
        id: registration.eventId,
        title: event?.status === 'DELETED' ? 'Event deleted' : typeof event?.title === 'string' ? event.title : 'Event details unavailable',
        date: typeof event?.date === 'string' ? event.date : '',
        time: typeof event?.time === 'string' ? event.time : '',
        location: typeof event?.location === 'string' ? event.location : '',
      };
    });
  },

  async isUserJoined(eventId: string, userId: string): Promise<boolean> {
    requireUid(userId);
    const registrationId = `${eventId}_${userId}`;
    const doc = await firestore.getDocument<EventParticipant>(`${EVENT_PARTICIPANTS_COLLECTION}/${registrationId}`);
    return !!doc && doc.status === 'joined';
  },
};
