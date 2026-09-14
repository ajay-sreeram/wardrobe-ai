import type { SQLiteDatabase } from 'expo-sqlite';

import { schemaSql } from '@/database/schema';

export async function migrateInitialSchema(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((row?.user_version ?? 0) >= 1) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync(schemaSql);
    await db.execAsync('PRAGMA user_version = 1');
  });
}
