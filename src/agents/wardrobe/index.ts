import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

import { insertGarment } from '@/database/repository';

export const wardrobeAgentScope = {
  canMutateWardrobe: true,
  canAnalyzeImages: false,
} as const;

const addGarmentRequestSchema = z.object({
  name: z.string().trim().min(1),
  sectionId: z.string().min(1),
  description: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).max(12),
  sourceImageUri: z.string().optional(),
});

export async function addGarmentToWardrobe(db: SQLiteDatabase, request: z.input<typeof addGarmentRequestSchema>) {
  const garment = addGarmentRequestSchema.parse(request);
  const id = `garment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await insertGarment(db, { id, ...garment });
  return id;
}
