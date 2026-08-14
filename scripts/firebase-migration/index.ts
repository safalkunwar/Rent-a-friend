import { sourceDb, targetDb, MIGRATION_ORDER, SKIP_COLLECTIONS, type MigrationReport } from './config.js';
import { exportCollection, type ExportedDocument } from './export.js';
import { transformDocument } from './transform.js';
import { importDocuments } from './import.js';
import { generateRollbackReport } from './rollback.js';

const isDryRun = process.argv.includes('--dry-run');
const args = process.argv.slice(2);
const targetCollection = args.find(a => !a.startsWith('--'));

const runMigration = async (): Promise<void> => {
  console.log('=== SATHI Firebase Migration ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Source: ai-studio-ccc6f8a5-34d2-4bfc-a68f-689d7d401cb4`);
  console.log(`Target: (default)`);
  console.log('');

  const collectionsToMigrate = targetCollection
    ? [targetCollection]
    : MIGRATION_ORDER;

  const reports: MigrationReport[] = [];

  for (const collectionName of collectionsToMigrate) {
    try {
      console.log(`\n--- Migrating ${collectionName} ---`);

      // Export from source
      const docs = await exportCollection(sourceDb, collectionName);
      console.log(`Exported ${docs.length} documents`);

      if (docs.length === 0) {
        console.log(`No documents to migrate for ${collectionName}`);
        continue;
      }

      // Transform documents
      const transformedDocs: ExportedDocument[] = docs.map(doc => ({
        ...doc,
        data: transformDocument(collectionName, doc.data),
      }));

      // Import to target
      const report = await importDocuments(transformedDocs, isDryRun);
      reports.push(report);

      console.log(`Import complete: ${report.stats.imported} imported, ${report.stats.failed} failed`);
    } catch (err) {
      console.error(`Failed to migrate ${collectionName}:`, err);
      reports.push({
        collection: collectionName,
        stats: {
          exported: 0,
          skipped: 0,
          imported: 0,
          failed: 1,
          duplicates: 0,
          orphans: 0,
        },
        errors: [String(err)],
        duplicates: [],
        orphans: [],
      });
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log('');

  if (isDryRun) {
    console.log('This was a dry run. No data was modified.');
    console.log('Run without --dry-run to perform the actual migration.');
  }

  // Print summary
  let totalImported = 0;
  let totalFailed = 0;
  let totalDuplicates = 0;
  let totalOrphans = 0;

  for (const report of reports) {
    totalImported += report.stats.imported;
    totalFailed += report.stats.failed;
    totalDuplicates += report.duplicates.length;
    totalOrphans += report.orphans.length;
  }

  console.log('\n=== Summary ===');
  console.log(`Collections processed: ${reports.length}`);
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total failed: ${totalFailed}`);
  console.log(`Total duplicates skipped: ${totalDuplicates}`);
  console.log(`Total orphans: ${totalOrphans}`);

  if (totalFailed > 0) {
    console.log('\n⚠️  Some documents failed to migrate. Review errors above.');
  }

  if (!isDryRun) {
    await generateRollbackReport(reports);
  }
};

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
