import { firestore } from './firestore';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
}

export interface LiveLocationSession {
  bookingId: string;
  companionId: string;
  userId: string;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
}

const LOCATIONS_COLLECTION = 'booking_locations';

export const locationTrackingService = {
  async startTracking(bookingId: string, companionId: string, userId: string): Promise<void> {
    await firestore.setDocument(`${LOCATIONS_COLLECTION}/${bookingId}`, {
      bookingId,
      companionId,
      userId,
      status: 'active',
      startedAt: new Date().toISOString(),
    });
  },

  async stopTracking(bookingId: string): Promise<void> {
    await firestore.updateDocument(`${LOCATIONS_COLLECTION}/${bookingId}`, {
      status: 'ended',
      endedAt: new Date().toISOString(),
    });
  },

  async updateCompanionLocation(bookingId: string, location: LocationUpdate): Promise<void> {
    await firestore.setDocument(`${LOCATIONS_COLLECTION}/${bookingId}/locations/${location.timestamp}`, location as unknown as Record<string, unknown>);
  },

  async getCompanionLocation(bookingId: string): Promise<LocationUpdate | null> {
    const locations = await firestore.getDocuments<LocationUpdate>(`${LOCATIONS_COLLECTION}/${bookingId}/locations`, {
      orderByField: 'timestamp',
      orderDirection: 'desc',
      limitCount: 1,
    });
    return locations.length > 0 ? locations[0] : null;
  },

  async getActiveSession(bookingId: string): Promise<LiveLocationSession | null> {
    return firestore.getDocument<LiveLocationSession>(`${LOCATIONS_COLLECTION}/${bookingId}`);
  },
};
