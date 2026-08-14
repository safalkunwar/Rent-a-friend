import { sourceDb, targetDb } from './config.js';
import { listCollections, countDocuments } from './export.js';

export const generateRollbackReport = async (reports: any[]): Promise<void> => {
  console.log('\n=== Rollback Information ===\n');
  console.log('To rollback the migration, you have two options:');
  console.log('');
  console.log('Option 1: Revert to legacy database');
  console.log('  1. Update firebase.json database field back to: ai-studio-ccc6f8a5-34d2-4bfc-a68f-689d7d401cb4');
  console.log('  2. Update all app configs to use the legacy database ID');
  console.log('  3. Redeploy applications');
  console.log('');
  console.log('Option 2: Delete target database and re-run migration');
  console.log('  WARNING: This will delete all migrated data');
  console.log('  Use only if data integrity is compromised');
  console.log('');

  console.log('Legacy Database State:');
  const legacyCollections = await listCollections(sourceDb);
  for (const col of legacyCollections) {
    const count = await countDocuments(sourceDb, col);
    console.log(`  ${col}: ${count} documents`);
  }
  console.log('');

  console.log('Target Database State:');
  const targetCollections = await listCollections(targetDb);
  for (const col of targetCollections) {
    const count = await countDocuments(targetDb, col);
    console.log(`  ${col}: ${count} documents`);
  }
  console.log('');

  console.log('Migration Reports:');
  for (const report of reports) {
    console.log(`  ${report.collection}: ${report.stats.imported} imported, ${report.stats.failed} failed`);
  }
  console.log('');
  console.log('Keep the legacy database intact until full verification is complete.');
};
