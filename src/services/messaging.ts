import { firestore } from './firestore';

const TYPING_TIMEOUT_MS = 3000;

type TypingListener = (userId: string, isTyping: boolean) => void;

class TypingManager {
  private listeners: Set<TypingListener> = new Set();
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe(listener: TypingListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const typingRef = `conversations/${conversationId}/typing/${userId}`;

    if (isTyping) {
      await firestore.setDocument(typingRef, {
        userId,
        isTyping: true,
        updatedAt: new Date().toISOString(),
      });

      const existingTimeout = this.timeouts.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(async () => {
        await this.setTyping(conversationId, userId, false);
        this.timeouts.delete(userId);
      }, TYPING_TIMEOUT_MS);

      this.timeouts.set(userId, timeout);
    } else {
      await firestore.deleteDocument(typingRef);
      const existingTimeout = this.timeouts.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.timeouts.delete(userId);
      }
    }
  }

  startListening(conversationId: string): () => void {
    const unsubscribe = firestore.subscribeDocument<{ userId: string; isTyping: boolean }>(
      `conversations/${conversationId}/typing`,
      (doc) => {
        if (doc && doc.isTyping) {
          this.listeners.forEach(listener => listener(doc.userId, true));
        }
      }
    );

    return unsubscribe;
  }
}

export const messagingService = {
  typingManager: new TypingManager(),

  async sendMessage(conversationId: string, senderId: string, text: string): Promise<string> {
    const messageId = `msg-${Date.now()}`;
    const timestamp = new Date().toISOString();

    await firestore.setDocument(`messages/${messageId}`, {
      id: messageId,
      conversationId,
      senderId,
      text,
      timestamp,
      isRead: false,
    });

    await firestore.updateDocument(`conversations/${conversationId}`, {
      lastMessage: {
        id: messageId,
        conversationId,
        senderId,
        text,
        timestamp,
        isRead: false,
      },
      updatedAt: timestamp,
    });

    return messageId;
  },

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const messages = await firestore.getDocuments<any>('messages', {
      where: [
        { field: 'conversationId', operator: '==', value: conversationId },
        { field: 'senderId', operator: '!=', value: userId },
        { field: 'isRead', operator: '==', value: false },
      ],
      limitCount: 100,
    });

    const updatePromises = messages.map(msg =>
      firestore.updateDocument(`messages/${msg.id}`, { isRead: true })
    );

    await Promise.all(updatePromises);

    await firestore.updateDocument(`conversations/${conversationId}`, {
      unreadCount: 0,
    });
  },

  async createConversation(participantIds: string[]): Promise<string> {
    const convoId = participantIds.sort().join('_');
    const timestamp = new Date().toISOString();

    await firestore.setDocument(`conversations/${convoId}`, {
      id: convoId,
      participantIds,
      unreadCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    }, true);

    return convoId;
  },
};
