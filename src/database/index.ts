import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateInitialSchema } from '@/database/migrations/001-initial';
import { seedDevelopmentData } from '@/database/seed';
import { initializeMemoryFiles } from '@/storage/memory';

export async function initializeDatabase(db: SQLiteDatabase) {
  await migrateInitialSchema(db);
  await seedDevelopmentData(db);
  initializeMemoryFiles();
}
