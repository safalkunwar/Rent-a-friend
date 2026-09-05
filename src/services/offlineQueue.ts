import { firestore } from './firestore';
import { requireUid } from './identity';

const QUEUE_KEY = 'sathi_offline_write_queue';

interface QueuedWrite {
  ownerUid: string;
  id: string;
  collection: string;
  docId: string;
  data: Record<string, unknown>;
  action: 'set' | 'update' | 'delete';
  timestamp: string;
}

export const offlineWriteQueue = {
  async enqueue(entry: Omit<QueuedWrite, 'id' | 'timestamp' | 'ownerUid'>): Promise<void> {
    const ownerUid = requireUid();
    const queue = await this.getQueue();
    const item: QueuedWrite = {
      ...entry,
      ownerUid,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    queue.push(item);
    await this.saveQueue(queue);
  },

  async getQueue(): Promise<QueuedWrite[]> {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async saveQueue(queue: QueuedWrite[]): Promise<void> {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('[OfflineWriteQueue] Failed to save queue:', e);
    }
  },

  async processQueue(): Promise<void> {
    const uid = requireUid();
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    const remaining: QueuedWrite[] = [];

    for (const item of queue) {
      // Preserve legacy/unowned and other-account entries; never replay them as this user.
      if (item.ownerUid !== uid) { remaining.push(item); continue; }
      try {
        requireUid(uid);
        if (item.action === 'set') {
          await firestore.setDocument(`${item.collection}/${item.docId}`, item.data);
        } else if (item.action === 'update') {
          await firestore.updateDocument(`${item.collection}/${item.docId}`, item.data);
        } else if (item.action === 'delete') {
          await firestore.deleteDocument(`${item.collection}/${item.docId}`);
        }
      } catch (error) {
        console.warn('[OfflineWriteQueue] Failed to process item:', item.id, error);
        remaining.push(item);
      }
    }

    await this.saveQueue(remaining);
  },

  async clear(): Promise<void> {
    await this.saveQueue([]);
  },

  async length(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  },
};
