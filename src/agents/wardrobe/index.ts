import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

import { getWardrobeSectionOptions, insertGarment } from '@/database/repository';
import { persistCanonicalGarmentImage } from '@/storage/canonicalImages';

export const wardrobeAgentScope = {
  canMutateWardrobe: true,
  canAnalyzeImages: false,
} as const;

const addGarmentRequestSchema = z.object({
  name: z.string().trim().min(1),
  sectionId: z.string().min(1),
  description: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).max(12),
  canonicalImageUri: z.string().min(1),
});

export async function addGarmentToWardrobe(db: SQLiteDatabase, request: z.input<typeof addGarmentRequestSchema>) {
  const garment = addGarmentRequestSchema.parse(request);
  const id = `garment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const canonicalImageUri = await persistCanonicalGarmentImage(garment.canonicalImageUri, id);
  await insertGarment(db, { id, ...garment, canonicalImageUri });
  return id;
}

export async function listWardrobeSections(db: SQLiteDatabase) {
  return getWardrobeSectionOptions(db);
}
