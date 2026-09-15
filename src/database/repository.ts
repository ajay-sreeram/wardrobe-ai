import type { SQLiteDatabase } from 'expo-sqlite';

import { garmentSchema, type Garment, type WardrobeSection, type WearEntry } from '@/models/wardrobe';

export type WardrobeSectionOption = { id: string; name: string };
export type NewGarment = {
  id: string;
  name: string;
  sectionId: string;
  description: string;
  tags: string[];
  canonicalImageUri: string;
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
  });
}

export async function getWardrobeSections(db: SQLiteDatabase): Promise<WardrobeSection[]> {
  const [sectionRows, garmentRows] = await Promise.all([
    db.getAllAsync<{ id: string; name: string; position: number }>('SELECT id, name, position FROM sections ORDER BY position'),
    db.getAllAsync<GarmentRow>('SELECT * FROM garments WHERE archived_at IS NULL ORDER BY created_at DESC'),
  ]);
  const garments = garmentRows.map(mapGarment);
  return sectionRows.map((section) => ({
    ...section,
    garments: garments.filter((garment) => garment.sectionId === section.id),
  }));
}

export async function getActiveGarments(db: SQLiteDatabase): Promise<Garment[]> {
  const rows = await db.getAllAsync<GarmentRow>('SELECT * FROM garments WHERE archived_at IS NULL ORDER BY updated_at DESC');
  return rows.map(mapGarment);
}

export async function getWardrobeSectionOptions(db: SQLiteDatabase): Promise<WardrobeSectionOption[]> {
  return db.getAllAsync<WardrobeSectionOption>('SELECT id, name FROM sections ORDER BY position');
}

export async function insertGarment(db: SQLiteDatabase, garment: NewGarment) {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO garments
        (id, name, section_id, description, tags, canonical_image, created_at, updated_at, wear_count, last_worn_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
      garment.id,
      garment.name,
      garment.sectionId,
      garment.description,
      JSON.stringify(garment.tags),
      garment.canonicalImageUri,
      now,
      now,
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
