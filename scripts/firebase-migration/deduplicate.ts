import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { targetDb } from './config.js';
import { type ExportedDocument } from './export.js';
import { transformDocument } from './transform.js';

export interface DeduplicationResult {
  toImport: ExportedDocument[];
  toSkip: Array<{ id: string; reason: string; existingData?: any }>;
  toMerge: Array<{ id: string; source: ExportedDocument; target: any; mergeStrategy: string }>;
}

const STATUS_ORDER = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

export const deduplicate = async (
  docs: ExportedDocument[]
): Promise<DeduplicationResult> => {
  const toImport: ExportedDocument[] = [];
  const toSkip: Array<{ id: string; reason: string; existingData?: any }> = [];
  const toMerge: Array<{ id: string; source: ExportedDocument; target: any; mergeStrategy: string }> = [];

  if (docs.length === 0) {
    return { toImport, toSkip, toMerge };
  }

  const collection = docs[0].collection;

  // Batch check existence
  const refs = docs.map(d => targetDb.collection(collection).doc(d.id));
  const snapshots = await targetDb.getAll(...refs);

  const existingMap = new Map<string, any>();
  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    if (snap.exists) {
      existingMap.set(docs[i].id, snap.data());
    }
  }

  for (const doc of docs) {
    const existingData = existingMap.get(doc.id);

    if (!existingData) {
      toImport.push(doc);
      continue;
    }

    // Deduplication strategy per collection
    if (collection === 'users') {
      const sourceCompleteness = Object.keys(doc.data).length;
      const targetCompleteness = Object.keys(existingData).length;
      
      if (sourceCompleteness > targetCompleteness) {
        toMerge.push({
          id: doc.id,
          source: doc,
          target: existingData,
          mergeStrategy: 'source_wins',
        });
      } else {
        toSkip.push({
          id: doc.id,
          reason: 'target_has_more_complete_data',
          existingData,
        });
      }
    } else if (collection === 'companions') {
      const sourceTime = doc.data.updatedAt ? new Date(doc.data.updatedAt).getTime() : 0;
      const targetTime = existingData.updatedAt ? new Date(existingData.updatedAt).getTime() : 0;
      
      if (sourceTime > targetTime) {
        toMerge.push({
          id: doc.id,
          source: doc,
          target: existingData,
          mergeStrategy: 'source_wins',
        });
      } else {
        toSkip.push({
          id: doc.id,
          reason: 'target_is_newer',
          existingData,
        });
      }
    } else if (collection === 'bookings') {
      const statusOrder = STATUS_ORDER;
      const sourceStatus = statusOrder.indexOf(doc.data.status || 'pending');
      const targetStatus = statusOrder.indexOf(existingData?.status || 'pending');
      const sourceTime = doc.data.updatedAt ? new Date(doc.data.updatedAt).getTime() : 0;
      const targetTime = existingData?.updatedAt ? new Date(existingData.updatedAt).getTime() : 0;
      
      if (sourceStatus > targetStatus || (sourceStatus === targetStatus && sourceTime > targetTime)) {
        toMerge.push({
          id: doc.id,
          source: doc,
          target: existingData,
          mergeStrategy: 'source_wins',
        });
      } else {
        toSkip.push({
          id: doc.id,
          reason: 'target_has_advanced_status',
          existingData,
        });
      }
    } else {
      const sourceTime = doc.updateTime?.getTime() || 0;
      const targetTime = existingData?.updatedAt ? new Date(existingData.updatedAt).getTime() : 0;
      
      if (sourceTime > targetTime) {
        toMerge.push({
          id: doc.id,
          source: doc,
          target: existingData,
          mergeStrategy: 'source_wins',
        });
      } else {
        toSkip.push({
          id: doc.id,
          reason: 'target_is_newer',
          existingData,
        });
      }
    }
  }

  return { toImport, toSkip, toMerge };
};
