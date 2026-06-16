/**
 * Migration: Remove all archived assets
 *
 * Run: node scripts/migrate-remove-archived.js
 *
 * This script deletes all assets with status "archived" from the database.
 * Since the archive feature has been replaced with delete, any existing
 * archived assets are no longer valid and should be removed.
 */

const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const Asset = require('../src/models/Asset');

async function migrate() {
  console.log('Connecting to database...');
  await connectDatabase();

  try {
    const count = await Asset.countDocuments({ status: 'archived' });
    console.log(`Found ${count} archived assets`);

    if (count === 0) {
      console.log('Nothing to migrate.');
      return;
    }

    const result = await Asset.deleteMany({ status: 'archived' });
    console.log(`Deleted ${result.deletedCount} archived assets.`);
  } finally {
    await disconnectDatabase();
    console.log('Done.');
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});