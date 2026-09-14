import type { SQLiteDatabase } from 'expo-sqlite';

import { garmentSchema, type Garment, type WardrobeSection, type WearEntry } from '@/models/wardrobe';

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
