import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateGarmentOrder(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((row?.user_version ?? 0) >= 4) return;

  await db.withTransactionAsync(async () => {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(garments)');
    if (!columns.some((column) => column.name === 'position')) {
      await db.execAsync('ALTER TABLE garments ADD COLUMN position INTEGER NOT NULL DEFAULT 0');
    }

    const garments = await db.getAllAsync<{ id: string; section_id: string | null }>(
      'SELECT id, section_id FROM garments ORDER BY section_id, created_at',
    );
    const nextPosition = new Map<string | null, number>();
    for (const garment of garments) {
      const position = nextPosition.get(garment.section_id) ?? 0;
      await db.runAsync('UPDATE garments SET position = ? WHERE id = ?', position, garment.id);
      nextPosition.set(garment.section_id, position + 1);
    }
    await db.execAsync('PRAGMA user_version = 4');
  });
}
