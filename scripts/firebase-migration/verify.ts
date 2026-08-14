import { getFirestore } from 'firebase-admin/firestore';
import { sourceDb, targetDb, MIGRATION_ORDER, type MigrationReport } from './config.js';
import { countDocuments } from './export.js';

export const verifyMigration = async (reports: MigrationReport[]): Promise<void> => {
  console.log('\n=== Migration Verification ===\n');

  let totalImported = 0;
  let totalFailed = 0;
  let totalDuplicates = 0;
  let totalOrphans = 0;

  for (const report of reports) {
    console.log(`Collection: ${report.collection}`);
    console.log(`  Imported: ${report.stats.imported}`);
    console.log(`  Skipped: ${report.stats.skipped}`);
    console.log(`  Failed: ${report.stats.failed}`);
    console.log(`  Duplicates: ${report.duplicates.length}`);
    console.log(`  Orphans: ${report.orphans.length}`);
    console.log('');

    totalImported += report.stats.imported;
    totalFailed += report.stats.failed;
    totalDuplicates += report.duplicates.length;
    totalOrphans += report.orphans.length;
  }

  console.log('=== Summary ===');
  console.log(`Total Imported: ${totalImported}`);
  console.log(`Total Failed: ${totalFailed}`);
  console.log(`Total Duplicates Skipped: ${totalDuplicates}`);
  console.log(`Total Orphans: ${totalOrphans}`);

  // Verify counts
  console.log('\n=== Source vs Target Counts ===');
  for (const collection of MIGRATION_ORDER) {
    try {
      const sourceCount = await countDocuments(sourceDb, collection);
      const targetCount = await countDocuments(targetDb, collection);
      const diff = targetCount - sourceCount;
      const status = diff === 0 ? 'OK' : diff > 0 ? 'HIGH' : 'LOW';
      console.log(`${collection}: source=${sourceCount}, target=${targetCount}, diff=${diff} (${status})`);
    } catch (err) {
      console.error(`Failed to verify ${collection}:`, err);
    }
  }

  // Check for orphaned references
  console.log('\n=== Orphaned References ===');
  for (const report of reports) {
    for (const orphan of report.orphans) {
      console.log(`  ${orphan.docId} in ${orphan.collection}: missing ${orphan.missingRef}`);
    }
  }

  if (totalFailed > 0) {
    console.log('\n⚠️  Migration completed with errors. Review before proceeding.');
    process.exit(1);
  } else if (totalOrphans > 0) {
    console.log('\n⚠️  Migration completed with orphaned references. Review before proceeding.');
    process.exit(1);
  } else {
    console.log('\n✅ Migration verification passed.');
  }
};
