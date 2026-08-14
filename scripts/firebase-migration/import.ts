import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { targetDb, type MigrationStats, type MigrationReport } from './config.js';
import { type ExportedDocument } from './export.js';
import { transformDocument } from './transform.js';
import { deduplicate, type DeduplicationResult } from './deduplicate.js';

export const importDocuments = async (
  docs: ExportedDocument[],
  dryRun: boolean = false
): Promise<MigrationReport> => {
  const stats: MigrationStats = {
    exported: docs.length,
    skipped: 0,
    imported: 0,
    failed: 0,
    duplicates: 0,
    orphans: 0,
  };

  const errors: string[] = [];
  const duplicates: Array<{ id: string; reason: string }> = [];
  const orphans: Array<{ id: string; reason: string }> = [];

  console.log(`\n[import] Processing ${docs.length} documents from ${docs[0]?.collection || 'unknown'}...`);

  // Deduplicate against existing data
  const dedupResult = await deduplicate(docs);
  stats.skipped += dedupResult.toSkip.length;
  stats.duplicates += dedupResult.toSkip.length;
  duplicates.push(...dedupResult.toSkip.map(s => ({ id: s.id, reason: s.reason })));

  // Process merges
  for (const merge of dedupResult.toMerge) {
    if (dryRun) {
      console.log(`[dry-run] Would merge ${merge.id} (strategy: ${merge.mergeStrategy})`);
      stats.imported++;
      continue;
    }

    try {
      const transformed = transformDocument(merge.source.collection, merge.source.data);
      await targetDb.collection(merge.source.collection).doc(merge.id).set(transformed, { merge: true });
      stats.imported++;
    } catch (err) {
      console.error(`[import] Failed to merge ${merge.id}:`, err);
      stats.failed++;
      errors.push(`${merge.source.collection}/${merge.id}: ${err}`);
    }
  }

  // Import new documents
  for (const doc of dedupResult.toImport) {
    if (dryRun) {
      console.log(`[dry-run] Would import ${doc.id}`);
      stats.imported++;
      continue;
    }

    try {
      const transformed = transformDocument(doc.collection, doc.data);
      await targetDb.collection(doc.collection).doc(doc.id).set(transformed);
      stats.imported++;
    } catch (err) {
      console.error(`[import] Failed to import ${doc.id}:`, err);
      stats.failed++;
      errors.push(`${doc.collection}/${doc.id}: ${err}`);
    }
  }

  return {
    collection: docs[0]?.collection || 'unknown',
    stats,
    errors,
    duplicates,
    orphans,
  };
};
