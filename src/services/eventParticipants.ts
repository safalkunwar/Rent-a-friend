import { firestore } from './firestore';
import { auth, db } from '../firebase';
import { doc, query, where, collection, getDocs, type Firestore } from 'firebase/firestore';

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  status: 'joined' | 'cancelled';
  joinedAt: string;
  updatedAt: string;
}

const EVENT_PARTICIPANTS_COLLECTION = 'event_participants';

export const eventParticipantsService = {
  async joinEvent(eventId: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to join event');

    const registrationId = `${eventId}_${user.uid}`;
    const timestamp = new Date().toISOString();

    await firestore.runTransaction(async (tx) => {
      const eventRef = doc(db!, `events/${eventId}`);
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }
      const eventData = eventSnap.data() as any;
      const spots = eventData.spots || 0;

      const participantsQuery = query(collection(db!, EVENT_PARTICIPANTS_COLLECTION), where('eventId', '==', eventId), where('status', '==', 'joined'));
      const participantsSnap = await tx.get(participantsQuery);
      const currentCount = participantsSnap.size;

      if (currentCount >= spots) {
        throw new Error('Event is full');
      }

      const registrationRef = doc(db!, `${EVENT_PARTICIPANTS_COLLECTION}/${registrationId}`);
      tx.set(registrationRef, {
        id: registrationId,
        eventId,
        userId: user.uid,
        userName: user.displayName || 'User',
        status: 'joined',
        joinedAt: timestamp,
        updatedAt: timestamp,
      });
    });

    return registrationId;
  },

  async leaveEvent(eventId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to leave event');

    const registrationId = `${eventId}_${user.uid}`;
    const timestamp = new Date().toISOString();

    await firestore.runTransaction(async (tx) => {
      const registrationRef = doc(db!, `${EVENT_PARTICIPANTS_COLLECTION}/${registrationId}`);
      const regSnap = await tx.get(registrationRef);
      if (!regSnap.exists()) {
        throw new Error('Registration not found');
      }
      const regData = regSnap.data() as any;
      if (regData.status !== 'joined') {
        throw new Error('Not joined to this event');
      }

      tx.update(registrationRef, {
        status: 'cancelled',
        updatedAt: timestamp,
      });
    });
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
    return firestore.getDocuments<EventParticipant>(EVENT_PARTICIPANTS_COLLECTION, {
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'status', operator: '==', value: 'joined' }
      ],
      orderByField: 'joinedAt',
      orderDirection: 'desc',
      limitCount: 50,
    });
  },

  async isUserJoined(eventId: string, userId: string): Promise<boolean> {
    const registrationId = `${eventId}_${userId}`;
    const doc = await firestore.getDocument<EventParticipant>(`${EVENT_PARTICIPANTS_COLLECTION}/${registrationId}`);
    return !!doc && doc.status === 'joined';
  },
};
