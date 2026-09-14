import type { SQLiteDatabase } from 'expo-sqlite';

const sections = [
  ['section-work', 'Workwear', 0],
  ['section-casual', 'Casual', 1],
  ['section-traditional', 'Traditional', 2],
  ['section-night', 'Nightwear', 3],
] as const;

const garments = [
  ['garment-blue-shirt', 'Blue Oxford shirt', 'section-work', 'Soft blue button-down with a structured collar.', ['office', 'shirt', 'blue'], 8, '2026-09-13'],
  ['garment-beige-trousers', 'Beige trousers', 'section-work', 'Straight-cut neutral trousers.', ['office', 'trousers', 'neutral'], 6, '2026-09-13'],
  ['garment-black-polo', 'Black polo', 'section-casual', 'Black short-sleeve polo with tonal buttons.', ['casual', 'polo', 'black'], 5, '2026-09-10'],
  ['garment-indigo-jeans', 'Indigo jeans', 'section-casual', 'Dark indigo straight-fit jeans.', ['casual', 'denim'], 10, '2026-09-10'],
  ['garment-cream-kurta', 'Cream embroidered kurta', 'section-traditional', 'Cream kurta with subtle embroidery at the placket.', ['traditional', 'family', 'cream'], 3, '2026-09-07'],
  ['garment-white-pajama', 'White pajama', 'section-traditional', 'Clean white pajama with a relaxed cut.', ['traditional', 'white'], 3, '2026-09-07'],
  ['garment-green-tee', 'Forest green tee', 'section-casual', 'Relaxed crew-neck T-shirt.', ['casual', 'green'], 2, '2026-08-22'],
  ['garment-navy-set', 'Navy sleep set', 'section-night', 'Soft navy two-piece nightwear set.', ['nightwear', 'navy'], 4, '2026-09-11'],
] as const;

export async function seedDevelopmentData(db: SQLiteDatabase) {
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM sections');
  if ((existing?.count ?? 0) > 0) return;

  await db.withTransactionAsync(async () => {
    for (const [id, name, position] of sections) {
      await db.runAsync('INSERT INTO sections (id, name, position) VALUES (?, ?, ?)', id, name, position);
    }

    for (const [id, name, sectionId, description, tags, wearCount, lastWornAt] of garments) {
      await db.runAsync(
        `INSERT INTO garments
          (id, name, section_id, description, tags, canonical_image, created_at, updated_at, wear_count, last_worn_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
        id,
        name,
        sectionId,
        description,
        JSON.stringify(tags),
        '2026-08-01T09:00:00.000Z',
        '2026-09-13T09:00:00.000Z',
        wearCount,
        lastWornAt,
      );
    }

    await db.runAsync('INSERT INTO wears (id, garment_ids, worn_at, note) VALUES (?, ?, ?, ?)', 'wear-1', JSON.stringify(['garment-blue-shirt', 'garment-beige-trousers']), '2026-09-13', 'Office');
    await db.runAsync('INSERT INTO wears (id, garment_ids, worn_at, note) VALUES (?, ?, ?, ?)', 'wear-2', JSON.stringify(['garment-black-polo', 'garment-indigo-jeans']), '2026-09-10', 'Dinner');
    await db.runAsync('INSERT INTO wears (id, garment_ids, worn_at, note) VALUES (?, ?, ?, ?)', 'wear-3', JSON.stringify(['garment-cream-kurta', 'garment-white-pajama']), '2026-09-07', "Sister's wedding");
  });
}
