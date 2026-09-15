import type { SQLiteDatabase } from 'expo-sqlite';

const sections = [
  ['section-work', 'Workwear', 0],
  ['section-casual', 'Casual', 1],
  ['section-traditional', 'Traditional', 2],
  ['section-night', 'Nightwear', 3],
] as const;

export async function seedDevelopmentData(db: SQLiteDatabase) {
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM sections');
  if ((existing?.count ?? 0) > 0) return;

  await db.withTransactionAsync(async () => {
    for (const [id, name, position] of sections) {
      await db.runAsync('INSERT INTO sections (id, name, position) VALUES (?, ?, ?)', id, name, position);
    }
  });
}
