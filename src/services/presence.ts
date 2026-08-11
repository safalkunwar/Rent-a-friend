import { firestore } from './firestore';

export interface PresenceData {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

const PRESENCE_COLLECTION = 'presence';

export const presenceService = {
  async setOnline(userId: string): Promise<void> {
    await firestore.setDocument(`${PRESENCE_COLLECTION}/${userId}`, {
      userId,
      isOnline: true,
      lastSeen: new Date().toISOString(),
    });
  },

  async setOffline(userId: string): Promise<void> {
    await firestore.updateDocument(`${PRESENCE_COLLECTION}/${userId}`, {
      isOnline: false,
      lastSeen: new Date().toISOString(),
    });
  },

  async getPresence(userId: string): Promise<PresenceData | null> {
    return firestore.getDocument<PresenceData>(`${PRESENCE_COLLECTION}/${userId}`);
  },

  async getBatchPresence(userIds: string[]): Promise<PresenceData[]> {
    if (userIds.length === 0) return [];
    
    const results: PresenceData[] = [];
    for (const userId of userIds) {
      const presence = await this.getPresence(userId);
      if (presence) {
        results.push(presence);
      }
    }
    return results;
  },
};
