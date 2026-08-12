import { firestore } from './firestore';

const QUEUE_KEY = 'sathi_offline_write_queue';

interface QueuedWrite {
  id: string;
  collection: string;
  docId: string;
  data: Record<string, unknown>;
  action: 'set' | 'update' | 'delete';
  timestamp: string;
}

export const offlineWriteQueue = {
  async enqueue(entry: Omit<QueuedWrite, 'id' | 'timestamp'>): Promise<void> {
    const queue = await this.getQueue();
    const item: QueuedWrite = {
      ...entry,
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
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    const remaining: QueuedWrite[] = [];

    for (const item of queue) {
      try {
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
