import type { SQLiteDatabase } from 'expo-sqlite';

const demoGarmentIds = [
  'garment-blue-shirt',
  'garment-beige-trousers',
  'garment-black-polo',
  'garment-indigo-jeans',
  'garment-cream-kurta',
  'garment-white-pajama',
  'garment-green-tee',
  'garment-navy-set',
] as const;

export async function migrateRemoveDemoData(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((row?.user_version ?? 0) >= 3) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM wears WHERE id IN ('wear-1', 'wear-2', 'wear-3')");
    for (const garmentId of demoGarmentIds) {
      await db.runAsync('DELETE FROM garment_images WHERE garment_id = ?', garmentId);
      await db.runAsync('DELETE FROM garments WHERE id = ?', garmentId);
    }
    await db.execAsync('PRAGMA user_version = 3');
  });
}
