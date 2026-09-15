import type { SQLiteDatabase } from 'expo-sqlite';

import { removeLegacyChatImageCopies } from '@/storage/legacyChatImages';

export async function migrateRemoveSourceImages(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((row?.user_version ?? 0) >= 2) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM garment_images WHERE image_type = 'observation'");
    await db.execAsync('PRAGMA user_version = 2');
  });
  removeLegacyChatImageCopies();
}
