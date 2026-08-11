import { firestore } from './firestore';

export interface QueuedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  retries: number;
}

const OFFLINE_QUEUE_KEY = 'sathi_offline_message_queue';

export const offlineMessageService = {
  async enqueue(message: Omit<QueuedMessage, 'id' | 'retries'>): Promise<void> {
    const queue = await this.getQueue();
    const queuedMessage: QueuedMessage = {
      ...message,
      id: `offline-msg-${Date.now()}`,
      retries: 0,
    };
    queue.push(queuedMessage);
    await this.saveQueue(queue);
  },

  async getQueue(): Promise<QueuedMessage[]> {
    try {
      const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveQueue(queue: QueuedMessage[]): Promise<void> {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('[OfflineMessageService] Failed to save queue:', e);
    }
  },

  async processQueue(): Promise<void> {
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    const remaining: QueuedMessage[] = [];

    for (const msg of queue) {
      try {
        await firestore.setDocument(`messages/${msg.id}`, {
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          text: msg.text,
          timestamp: msg.timestamp,
          isRead: false,
        });

        await firestore.updateDocument(`conversations/${msg.conversationId}`, {
          lastMessage: {
            id: msg.id,
            conversationId: msg.conversationId,
            senderId: msg.senderId,
            text: msg.text,
            timestamp: msg.timestamp,
            isRead: false,
          },
          updatedAt: msg.timestamp,
        });
      } catch (error) {
        console.warn('[OfflineMessageService] Failed to send message:', msg.id, error);
        remaining.push({ ...msg, retries: msg.retries + 1 });
      }
    }

    await this.saveQueue(remaining);
  },

  async clearQueue(): Promise<void> {
    await this.saveQueue([]);
  },

  async getQueueLength(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  },
};
