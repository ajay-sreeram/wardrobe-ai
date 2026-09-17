import type { SQLiteDatabase } from 'expo-sqlite';

import { garmentSchema, type Garment, type WardrobeSection, type WearEntry } from '@/models/wardrobe';

export type WardrobeSectionOption = { id: string; name: string };
export type WardrobeSectionDetails = WardrobeSectionOption & { position: number; garmentCount: number; archivedGarmentCount: number; sectionCount: number };
export type NewGarment = {
  id: string;
  name: string;
  sectionId: string;
  description: string;
  tags: string[];
  canonicalImageUri: string;
};

export type GarmentUpdate = {
  name: string;
  description: string;
  sectionId: string;
  tags: string[];
};

type GarmentRow = {
  id: string;
  name: string;
  section_id: string | null;
  description: string | null;
  tags: string;
  canonical_image: string | null;
  created_at: string;
  updated_at: string;
  wear_count: number;
  last_worn_at: string | null;
  position: number;
};

function mapGarment(row: GarmentRow): Garment {
  return garmentSchema.parse({
    id: row.id,
    name: row.name,
    sectionId: row.section_id,
    description: row.description,
    tags: JSON.parse(row.tags) as unknown,
    canonicalImage: row.canonical_image,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    wearCount: row.wear_count,
    lastWornAt: row.last_worn_at,
    position: row.position,
  });
}

export async function getWardrobeSections(db: SQLiteDatabase): Promise<WardrobeSection[]> {
  const [sectionRows, garmentRows] = await Promise.all([
    db.getAllAsync<{ id: string; name: string; position: number }>('SELECT id, name, position FROM sections ORDER BY position'),
    db.getAllAsync<GarmentRow>('SELECT * FROM garments WHERE archived_at IS NULL ORDER BY section_id, position, created_at'),
  ]);
  const garments = garmentRows.map(mapGarment);
  return sectionRows.map((section) => ({
    ...section,
    garments: garments.filter((garment) => garment.sectionId === section.id),
  }));
}

export async function getActiveGarments(db: SQLiteDatabase): Promise<Garment[]> {
  const rows = await db.getAllAsync<GarmentRow>('SELECT * FROM garments WHERE archived_at IS NULL ORDER BY section_id, position, updated_at DESC');
  return rows.map(mapGarment);
}

export async function getArchivedGarments(db: SQLiteDatabase): Promise<Garment[]> {
  const rows = await db.getAllAsync<GarmentRow>('SELECT * FROM garments WHERE archived_at IS NOT NULL ORDER BY archived_at DESC');
  return rows.map(mapGarment);
}

export async function getActiveGarment(db: SQLiteDatabase, garmentId: string): Promise<Garment | null> {
  const row = await db.getFirstAsync<GarmentRow>('SELECT * FROM garments WHERE id = ? AND archived_at IS NULL', garmentId);
  return row ? mapGarment(row) : null;
}

export async function getWardrobeSectionOptions(db: SQLiteDatabase): Promise<WardrobeSectionOption[]> {
  return db.getAllAsync<WardrobeSectionOption>('SELECT id, name FROM sections ORDER BY position');
}

export async function getWardrobeSectionDetails(db: SQLiteDatabase, sectionId: string): Promise<WardrobeSectionDetails | null> {
  return db.getFirstAsync<WardrobeSectionDetails>(
    `SELECT id, name, position,
       (SELECT COUNT(*) FROM garments WHERE section_id = sections.id AND archived_at IS NULL) AS garmentCount,
       (SELECT COUNT(*) FROM garments WHERE section_id = sections.id AND archived_at IS NOT NULL) AS archivedGarmentCount,
       (SELECT COUNT(*) FROM sections) AS sectionCount
     FROM sections WHERE id = ?`,
    sectionId,
  );
}

export async function insertGarment(db: SQLiteDatabase, garment: NewGarment) {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO garments
        (id, name, section_id, description, tags, canonical_image, created_at, updated_at, wear_count, last_worn_at, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL,
         (SELECT COALESCE(MAX(position), -1) + 1 FROM garments WHERE section_id = ?))`,
      garment.id,
      garment.name,
      garment.sectionId,
      garment.description,
      JSON.stringify(garment.tags),
      garment.canonicalImageUri,
      now,
      now,
      garment.sectionId,
    );

    await db.runAsync(
      'INSERT INTO garment_images (id, garment_id, image_path, image_type, created_at) VALUES (?, ?, ?, ?, ?)',
      `image-${garment.id}`,
      garment.id,
      garment.canonicalImageUri,
      'canonical',
      now,
    );
  });
}

export async function insertGarments(db: SQLiteDatabase, garments: NewGarment[]) {
  await db.withTransactionAsync(async () => {
    for (const garment of garments) {
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO garments
          (id, name, section_id, description, tags, canonical_image, created_at, updated_at, wear_count, last_worn_at, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL,
           (SELECT COALESCE(MAX(position), -1) + 1 FROM garments WHERE section_id = ?))`,
        garment.id,
        garment.name,
        garment.sectionId,
        garment.description,
        JSON.stringify(garment.tags),
        garment.canonicalImageUri,
        now,
        now,
        garment.sectionId,
      );
      await db.runAsync(
        'INSERT INTO garment_images (id, garment_id, image_path, image_type, created_at) VALUES (?, ?, ?, ?, ?)',
        `image-${garment.id}`,
        garment.id,
        garment.canonicalImageUri,
        'canonical',
        now,
      );
    }
  });
}

export async function updateGarment(db: SQLiteDatabase, garmentId: string, update: GarmentUpdate) {
  const result = await db.runAsync(
    `UPDATE garments
     SET name = ?,
         description = ?,
         position = CASE WHEN section_id = ? THEN position ELSE
           (SELECT COALESCE(MAX(position), -1) + 1 FROM garments AS target WHERE target.section_id = ?)
         END,
         section_id = ?, tags = ?, updated_at = ?
     WHERE id = ? AND archived_at IS NULL`,
    update.name,
    update.description,
    update.sectionId,
    update.sectionId,
    update.sectionId,
    JSON.stringify(update.tags),
    new Date().toISOString(),
    garmentId,
  );
  if (!result.changes) throw new Error('Garment not found.');
}

export async function moveGarmentPosition(db: SQLiteDatabase, garmentId: string, direction: -1 | 1) {
  const garment = await db.getFirstAsync<{ id: string; section_id: string; position: number }>(
    'SELECT id, section_id, position FROM garments WHERE id = ? AND archived_at IS NULL',
    garmentId,
  );
  if (!garment) throw new Error('Garment not found.');
  const neighbor = await db.getFirstAsync<{ id: string; position: number }>(
    direction < 0
      ? 'SELECT id, position FROM garments WHERE section_id = ? AND archived_at IS NULL AND position < ? ORDER BY position DESC LIMIT 1'
      : 'SELECT id, position FROM garments WHERE section_id = ? AND archived_at IS NULL AND position > ? ORDER BY position ASC LIMIT 1',
    garment.section_id,
    garment.position,
  );
  if (!neighbor) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE garments SET position = ?, updated_at = ? WHERE id = ?', neighbor.position, new Date().toISOString(), garment.id);
    await db.runAsync('UPDATE garments SET position = ?, updated_at = ? WHERE id = ?', garment.position, new Date().toISOString(), neighbor.id);
  });
}

export async function setGarmentPositions(db: SQLiteDatabase, sectionId: string, garmentIds: string[]) {
  await db.withTransactionAsync(async () => {
    for (const [position, garmentId] of garmentIds.entries()) {
      const result = await db.runAsync(
        'UPDATE garments SET position = ?, updated_at = ? WHERE id = ? AND section_id = ? AND archived_at IS NULL',
        position,
        new Date().toISOString(),
        garmentId,
        sectionId,
      );
      if (!result.changes) throw new Error('A garment could not be reordered.');
    }
  });
}

export async function createWardrobeSection(db: SQLiteDatabase, id: string, name: string) {
  await db.runAsync(
    'INSERT INTO sections (id, name, position) VALUES (?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM sections))',
    id,
    name,
  );
}

export async function renameWardrobeSection(db: SQLiteDatabase, sectionId: string, name: string) {
  const result = await db.runAsync('UPDATE sections SET name = ? WHERE id = ?', name, sectionId);
  if (!result.changes) throw new Error('Section not found.');
}

export async function moveWardrobeSection(db: SQLiteDatabase, sectionId: string, direction: -1 | 1) {
  const section = await db.getFirstAsync<{ id: string; position: number }>('SELECT id, position FROM sections WHERE id = ?', sectionId);
  if (!section) throw new Error('Section not found.');
  const neighbor = await db.getFirstAsync<{ id: string; position: number }>(
    direction < 0
      ? 'SELECT id, position FROM sections WHERE position < ? ORDER BY position DESC LIMIT 1'
      : 'SELECT id, position FROM sections WHERE position > ? ORDER BY position ASC LIMIT 1',
    section.position,
  );
  if (!neighbor) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE sections SET position = ? WHERE id = ?', neighbor.position, section.id);
    await db.runAsync('UPDATE sections SET position = ? WHERE id = ?', section.position, neighbor.id);
  });
}

export async function deleteWardrobeSection(db: SQLiteDatabase, sectionId: string, destinationSectionId: string | null) {
  const source = await db.getFirstAsync<{ id: string; position: number }>('SELECT id, position FROM sections WHERE id = ?', sectionId);
  if (!source) throw new Error('Section not found.');
  const sectionCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM sections');
  if ((sectionCount?.count ?? 0) <= 1) throw new Error('Keep at least one wardrobe section.');
  const garments = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM garments WHERE section_id = ? ORDER BY archived_at IS NOT NULL, position, created_at',
    sectionId,
  );
  if (garments.length && !destinationSectionId) throw new Error('Choose where to move this section’s garments.');
  if (destinationSectionId === sectionId) throw new Error('Choose a different destination section.');
  if (destinationSectionId) {
    const destination = await db.getFirstAsync<{ id: string }>('SELECT id FROM sections WHERE id = ?', destinationSectionId);
    if (!destination) throw new Error('Destination section not found.');
  }

  await db.withTransactionAsync(async () => {
    if (destinationSectionId) {
      const destinationPosition = await db.getFirstAsync<{ position: number }>(
        'SELECT COALESCE(MAX(position), -1) AS position FROM garments WHERE section_id = ?',
        destinationSectionId,
      );
      const start = (destinationPosition?.position ?? -1) + 1;
      for (const [index, garment] of garments.entries()) {
        await db.runAsync(
          'UPDATE garments SET section_id = ?, position = ?, updated_at = ? WHERE id = ?',
          destinationSectionId,
          start + index,
          new Date().toISOString(),
          garment.id,
        );
      }
    }
    await db.runAsync('DELETE FROM sections WHERE id = ?', sectionId);
    await db.runAsync('UPDATE sections SET position = position - 1 WHERE position > ?', source.position);
  });
  return garments.length;
}

export async function archiveGarment(db: SQLiteDatabase, garmentId: string) {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'UPDATE garments SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL',
    now,
    now,
    garmentId,
  );
  if (!result.changes) throw new Error('Garment not found.');
}

export async function restoreGarment(db: SQLiteDatabase, garmentId: string) {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'UPDATE garments SET archived_at = NULL, updated_at = ? WHERE id = ? AND archived_at IS NOT NULL',
    now,
    garmentId,
  );
  if (!result.changes) throw new Error('Archived garment not found.');
}

export async function insertWearRecord(db: SQLiteDatabase, input: { id: string; garmentIds: string[]; wornAt: string; note: string | null }) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO wears (id, garment_ids, worn_at, note) VALUES (?, ?, ?, ?)',
      input.id,
      JSON.stringify(input.garmentIds),
      input.wornAt,
      input.note,
    );
    for (const garmentId of input.garmentIds) {
      const result = await db.runAsync(
        `UPDATE garments
         SET wear_count = wear_count + 1,
             last_worn_at = CASE WHEN last_worn_at IS NULL OR last_worn_at < ? THEN ? ELSE last_worn_at END,
             updated_at = ?
         WHERE id = ? AND archived_at IS NULL`,
        input.wornAt,
        input.wornAt,
        new Date().toISOString(),
        garmentId,
      );
      if (!result.changes) throw new Error('A garment is no longer in your active wardrobe.');
    }
  });
}

async function recalculateGarmentWearStats(db: SQLiteDatabase) {
  const wearRows = await db.getAllAsync<{ garment_ids: string; worn_at: string }>('SELECT garment_ids, worn_at FROM wears');
  const stats = new Map<string, { count: number; lastWornAt: string }>();

  for (const wear of wearRows) {
    const garmentIds = JSON.parse(wear.garment_ids) as string[];
    for (const garmentId of garmentIds) {
      const current = stats.get(garmentId);
      stats.set(garmentId, {
        count: (current?.count ?? 0) + 1,
        lastWornAt: !current || wear.worn_at > current.lastWornAt ? wear.worn_at : current.lastWornAt,
      });
    }
  }

  await db.runAsync('UPDATE garments SET wear_count = 0, last_worn_at = NULL');
  for (const [garmentId, garmentStats] of stats) {
    await db.runAsync(
      'UPDATE garments SET wear_count = ?, last_worn_at = ? WHERE id = ?',
      garmentStats.count,
      garmentStats.lastWornAt,
      garmentId,
    );
  }
}

export async function updateWearRecord(db: SQLiteDatabase, input: { id: string; garmentIds: string[]; wornAt: string; note: string | null }) {
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      'UPDATE wears SET garment_ids = ?, worn_at = ?, note = ? WHERE id = ?',
      JSON.stringify(input.garmentIds),
      input.wornAt,
      input.note,
      input.id,
    );
    if (!result.changes) throw new Error('Timeline entry not found.');
    await recalculateGarmentWearStats(db);
  });
}

export async function deleteWearRecord(db: SQLiteDatabase, wearId: string) {
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync('DELETE FROM wears WHERE id = ?', wearId);
    if (!result.changes) throw new Error('Timeline entry not found.');
    await recalculateGarmentWearStats(db);
  });
}

export async function getWearTimeline(db: SQLiteDatabase): Promise<WearEntry[]> {
  const [wearRows, garmentRows] = await Promise.all([
    db.getAllAsync<{ id: string; garment_ids: string; worn_at: string; note: string | null }>('SELECT * FROM wears ORDER BY worn_at DESC'),
    db.getAllAsync<GarmentRow>('SELECT * FROM garments'),
  ]);
  const garments = garmentRows.map(mapGarment);
  return wearRows.map((wear) => {
    const garmentIds = JSON.parse(wear.garment_ids) as string[];
    return {
      id: wear.id,
      garmentIds,
      wornAt: wear.worn_at,
      note: wear.note,
      garments: garmentIds.flatMap((id) => garments.filter((garment) => garment.id === id)),
    };
  });
}

export async function getWearEntry(db: SQLiteDatabase, wearId: string): Promise<WearEntry | null> {
  const timeline = await getWearTimeline(db);
  return timeline.find((entry) => entry.id === wearId) ?? null;
}
