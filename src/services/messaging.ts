import { firestore } from './firestore';
import { db } from '../firebase';
import { runTransaction, doc, getDocFromServer } from 'firebase/firestore';
import { requireUid } from './identity';
import { matchesParticipants, resolveConversation, validateParticipants } from './conversationResolution';

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

  resolveConversation,

  // Entry points historically pass either a public companion document ID or an Auth UID.
  // Never infer an Auth UID by splitting a document ID.
  async resolvePeerUid(peerId: string): Promise<string> {
    const uid = requireUid();
    validateParticipants([uid, peerId], uid);
    if (!db) throw new Error('Messaging is unavailable: Firebase is not configured.');
    const profile = await getDocFromServer(doc(db, 'companions', peerId));
    requireUid(uid);
    if (!profile.exists()) return peerId;
    const members = validateParticipants([uid, profile.data().userId], uid);
    return members.find(id => id !== uid)!;
  },

  async resolveConversationForPeer(peerId: string) {
    const uid = requireUid();
    const peerUid = await messagingService.resolvePeerUid(peerId);
    requireUid(uid);
    return resolveConversation([uid, peerUid]);
  },

  async sendMessage(conversationId: string, senderId: string, text: string): Promise<string> {
    requireUid(senderId);
    const messageId = `msg-${Date.now()}`;
    const timestamp = new Date().toISOString();

    if (!db) {
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
    }

    await runTransaction(db, async (tx) => {
      requireUid(senderId);
      const messageRef = doc(db, 'messages', messageId);
      const convoRef = doc(db, 'conversations', conversationId);

      tx.set(messageRef, {
        id: messageId,
        conversationId,
        senderId,
        text,
        timestamp,
        isRead: false,
      });

      tx.update(convoRef, {
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
    });

    return messageId;
  },

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    requireUid(userId);
    const messages = await firestore.getDocuments<any>('messages', {
      where: [
        { field: 'conversationId', operator: '==', value: conversationId },
        { field: 'senderId', operator: '!=', value: userId },
        { field: 'isRead', operator: '==', value: false },
      ],
      limitCount: 100,
    });

    if (!db || messages.length === 0) {
      if (messages.length === 0) {
        await firestore.updateDocument(`conversations/${conversationId}`, {
          unreadCount: 0,
        });
      }
      return;
    }

    await runTransaction(db, async (tx) => {
      const convoRef = doc(db, 'conversations', conversationId);
      for (const msg of messages) {
        const msgRef = doc(db, 'messages', msg.id);
        tx.update(msgRef, { isRead: true });
      }
      tx.update(convoRef, { unreadCount: 0 });
    });
  },

  async createConversation(participantIds: string[], expectedUid?: string): Promise<string> {
    const uid = requireUid(expectedUid);
    const members = validateParticipants(participantIds, uid);
    const resolved = await resolveConversation(members);
    requireUid(uid);
    if (!db) throw new Error('Messaging is unavailable: Firebase is not configured.');
    const convoId = resolved.id;
    const timestamp = new Date().toISOString();

    const initial = {
      id: convoId,
      participantIds: members,
      unreadCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await runTransaction(db, async transaction => {
        requireUid(uid);
        const ref = doc(db, 'conversations', convoId);
        const existing = await transaction.get(ref);
        requireUid(uid);
        if (existing.exists()) {
          if (!matchesParticipants(existing.data().participantIds, members)) {
            throw new Error('Conversation membership changed or the document ID is already in use.');
          }
        } else {
          if (resolved.exists) throw new Error('The conversation was removed. Reopen messaging and try again.');
          transaction.set(ref, initial);
        }
        // Existing conversations retain timestamps, membership and unread state.
    });

    return convoId;
  },
};
