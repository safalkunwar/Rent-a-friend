import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { targetDb, sourceDb } from './config.js';
import { type ExportedDocument } from './export.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  orphanedReferences: Array<{ docId: string; collection: string; field: string; missingRef: string }>;
}

export const validateDocument = async (
  doc: ExportedDocument
): Promise<ValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const orphanedReferences: Array<{ docId: string; collection: string; field: string; missingRef: string }> = [];

  const data = doc.data;

  // Validate users
  if (doc.collection === 'users') {
    if (!data.email && !data.phone && !data.displayName) {
      warnings.push(`User ${doc.id} has no email, phone, or displayName`);
    }
  }

  // Validate companions
  if (doc.collection === 'companions') {
    if (!data.userId && !data.uid) {
      errors.push(`Companion ${doc.id} has no userId/uid reference`);
    }
      if (data.userId) {
      const userDoc = await targetDb.collection('users').doc(data.userId).get();
      if (!userDoc.exists) {
        orphanedReferences.push({
          docId: doc.id,
          collection: 'companions',
          field: 'userId',
          missingRef: data.userId,
        });
      }
    }
  }

  // Validate bookings
  if (doc.collection === 'bookings') {
    if (!data.userId) {
      errors.push(`Booking ${doc.id} has no userId`);
    }
    if (!data.companionId) {
      errors.push(`Booking ${doc.id} has no companionId`);
    }
    if (data.userId) {
      const userDoc = await targetDb.collection('users').doc(data.userId).get();
      if (!userDoc.exists) {
        orphanedReferences.push({
          docId: doc.id,
          collection: 'bookings',
          field: 'userId',
          missingRef: data.userId,
        });
      }
    }
  }

  // Validate conversations
  if (doc.collection === 'conversations') {
    if (!data.participantIds || !Array.isArray(data.participantIds) || data.participantIds.length === 0) {
      errors.push(`Conversation ${doc.id} has no participantIds`);
    }
  }

  // Validate messages
  if (doc.collection === 'messages') {
    if (!data.conversationId) {
      errors.push(`Message ${doc.id} has no conversationId`);
    }
    if (!data.senderId) {
      errors.push(`Message ${doc.id} has no senderId`);
    }
  }

  // Validate community posts
  if (doc.collection === 'community_posts') {
    if (!data.userId) {
      errors.push(`Post ${doc.id} has no userId`);
    }
  }

  // Validate comments
  if (doc.collection === 'comments') {
    if (!data.postId) {
      errors.push(`Comment ${doc.id} has no postId`);
    }
    if (!data.userId) {
      errors.push(`Comment ${doc.id} has no userId`);
    }
  }

  // Validate likes
  if (doc.collection === 'likes') {
    if (!data.postId) {
      errors.push(`Like ${doc.id} has no postId`);
    }
    if (!data.userId) {
      errors.push(`Like ${doc.id} has no userId`);
    }
  }

  // Validate stories
  if (doc.collection === 'stories') {
    if (!data.userId) {
      errors.push(`Story ${doc.id} has no userId`);
    }
  }

  // Validate notifications
  if (doc.collection === 'notifications') {
    if (!data.userId) {
      errors.push(`Notification ${doc.id} has no userId`);
    }
  }

  // Validate reviews
  if (doc.collection === 'reviews') {
    if (!data.userId) {
      errors.push(`Review ${doc.id} has no userId`);
    }
    if (!data.companionId) {
      errors.push(`Review ${doc.id} has no companionId`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    orphanedReferences,
  };
};

export const validateCollection = async (
  docs: ExportedDocument[]
): Promise<ValidationResult> => {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const allOrphaned: Array<{ docId: string; collection: string; field: string; missingRef: string }> = [];

  for (const doc of docs) {
    const result = await validateDocument(doc);
    allErrors.push(...result.errors.map(e => `${doc.collection}/${doc.id}: ${e}`));
    allWarnings.push(...result.warnings.map(w => `${doc.collection}/${doc.id}: ${w}`));
    allOrphaned.push(...result.orphanedReferences);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    orphanedReferences: allOrphaned,
  };
};
