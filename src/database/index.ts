import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateInitialSchema } from '@/database/migrations/001-initial';
import { migrateRemoveSourceImages } from '@/database/migrations/002-remove-source-images';
import { seedDevelopmentData } from '@/database/seed';
import { initializeMemoryFiles } from '@/storage/memory';

export async function initializeDatabase(db: SQLiteDatabase) {
  await migrateInitialSchema(db);
  await migrateRemoveSourceImages(db);
  await seedDevelopmentData(db);
  initializeMemoryFiles();
}
