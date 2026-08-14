import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { sourceDb, SKIP_COLLECTIONS } from './config.js';

export interface ExportedDocument {
  id: string;
  collection: string;
  path: string;
  data: Record<string, any>;
  createTime?: Date;
  updateTime?: Date;
}

export const listCollections = async (db: Firestore): Promise<string[]> => {
  try {
    const collections = await db.listCollections();
    return collections.map(col => col.id);
  } catch (err) {
    console.error('Failed to list collections:', err);
    return [];
  }
};

export const countDocuments = async (db: Firestore, collectionName: string): Promise<number> => {
  try {
    const snapshot = await db.collection(collectionName).count().get();
    return snapshot.data().count || 0;
  } catch (err) {
    console.error(`Failed to count ${collectionName}:`, err);
    return -1;
  }
};

export const exportCollection = async <T = any>(
  db: Firestore,
  collectionPath: string
): Promise<ExportedDocument[]> => {
  const docs: ExportedDocument[] = [];
  const snapshot = await db.collection(collectionPath).get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Convert Firestore Timestamps to ISO strings for safe transport
    const serialized = JSON.parse(JSON.stringify(data));
    docs.push({
      id: doc.id,
      collection: collectionPath,
      path: doc.ref.path,
      data: serialized,
      createTime: doc.createTime?.toDate(),
      updateTime: doc.updateTime?.toDate(),
    });
  }

  return docs;
};

export const exportAll = async (): Promise<Map<string, ExportedDocument[]>> => {
  const collections = await sourceDb.listCollections();
  const result = new Map<string, ExportedDocument[]>();

  for (const collection of collections) {
    if (SKIP_COLLECTIONS.has(collection.id)) {
      console.log(`[export] Skipping ${collection.id}`);
      continue;
    }

    console.log(`[export] Exporting ${collection.id}...`);
    const docs = await exportCollection(sourceDb, collection.id);
    result.set(collection.id, docs);
    console.log(`[export] Exported ${docs.length} documents from ${collection.id}`);
  }

  return result;
};
