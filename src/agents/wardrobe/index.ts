import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

import { getActiveGarments, getWardrobeSectionOptions, getWardrobeSections, insertGarment } from '@/database/repository';
import type { GarmentObservation } from '@/agents/vision';
import type { Garment } from '@/models/wardrobe';
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

export type WardrobeCatalogItem = {
  id: string;
  name: string;
  sectionName: string;
  description: string | null;
  tags: string[];
  canonicalImage: string | null;
  wearCount: number;
  lastWornAt: string | null;
};

export async function readWardrobeCatalog(db: SQLiteDatabase): Promise<WardrobeCatalogItem[]> {
  const sections = await getWardrobeSections(db);
  return sections.flatMap((section) => section.garments.map((garment) => ({
    id: garment.id,
    name: garment.name,
    sectionName: section.name,
    description: garment.description,
    tags: garment.tags,
    canonicalImage: garment.canonicalImage,
    wearCount: garment.wearCount,
    lastWornAt: garment.lastWornAt,
  })));
}

export type DuplicateCandidate = Garment & { canonicalImage: string };

function tokens(values: string[]) {
  return new Set(values.join(' ').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

export async function findPotentialDuplicateCandidates(db: SQLiteDatabase, observation: GarmentObservation): Promise<DuplicateCandidate[]> {
  const target = tokens([observation.name, observation.category, ...observation.colors, ...observation.tags]);
  const garments = await getActiveGarments(db);
  return garments
    .filter((garment): garment is DuplicateCandidate => Boolean(garment.canonicalImage))
    .map((garment) => {
      const candidate = tokens([garment.name, garment.description ?? '', ...garment.tags]);
      const overlap = [...target].filter((token) => candidate.has(token)).length;
      return { garment, overlap };
    })
    .filter(({ overlap }) => overlap > 0)
    .sort((left, right) => right.overlap - left.overlap)
    .slice(0, 2)
    .map(({ garment }) => garment);
}
