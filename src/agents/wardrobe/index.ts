import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

import { archiveGarment, createWardrobeSection, getActiveGarment, getActiveGarments, getWardrobeSectionDetails, getWardrobeSectionOptions, getWardrobeSections, getWearTimeline, insertGarment, insertWearRecord, moveGarmentPosition, moveWardrobeSection, renameWardrobeSection, setGarmentPositions, updateGarment } from '@/database/repository';
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

const updateGarmentRequestSchema = z.object({
  garmentId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  sectionId: z.string().min(1),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
});

const sectionNameSchema = z.string().trim().min(1).max(50);
const reorderGarmentsSchema = z.object({
  sectionId: z.string().min(1),
  garmentIds: z.array(z.string().min(1)).max(500),
});
const recordWearSchema = z.object({
  garmentIds: z.array(z.string().min(1)).min(1).max(12),
  wornAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(160),
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

export async function readGarment(db: SQLiteDatabase, garmentId: string) {
  return getActiveGarment(db, garmentId);
}

export async function updateWardrobeGarment(db: SQLiteDatabase, request: z.input<typeof updateGarmentRequestSchema>) {
  const update = updateGarmentRequestSchema.parse(request);
  const section = await db.getFirstAsync<{ id: string }>('SELECT id FROM sections WHERE id = ?', update.sectionId);
  if (!section) throw new Error('Choose a valid wardrobe section.');
  await updateGarment(db, update.garmentId, update);
}

export async function archiveWardrobeGarment(db: SQLiteDatabase, garmentId: string) {
  if (!garmentId.trim()) throw new Error('Garment ID is required.');
  await archiveGarment(db, garmentId);
}

export async function moveWardrobeGarment(db: SQLiteDatabase, garmentId: string, direction: -1 | 1) {
  if (!garmentId.trim()) throw new Error('Garment ID is required.');
  return moveGarmentPosition(db, garmentId, direction);
}

export async function reorderWardrobeGarments(db: SQLiteDatabase, input: z.input<typeof reorderGarmentsSchema>) {
  const request = reorderGarmentsSchema.parse(input);
  if (new Set(request.garmentIds).size !== request.garmentIds.length) throw new Error('Garment order contains duplicates.');
  const current = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM garments WHERE section_id = ? AND archived_at IS NULL ORDER BY position',
    request.sectionId,
  );
  const currentIds = new Set(current.map((garment) => garment.id));
  if (currentIds.size !== request.garmentIds.length || request.garmentIds.some((id) => !currentIds.has(id))) {
    throw new Error('Wardrobe changed while reordering. Please try again.');
  }
  return setGarmentPositions(db, request.sectionId, request.garmentIds);
}

export async function readSection(db: SQLiteDatabase, sectionId: string) {
  return getWardrobeSectionDetails(db, sectionId);
}

export async function createSection(db: SQLiteDatabase, name: string) {
  const parsedName = sectionNameSchema.parse(name);
  const duplicate = await db.getFirstAsync<{ id: string }>('SELECT id FROM sections WHERE lower(name) = lower(?)', parsedName);
  if (duplicate) throw new Error('A section with that name already exists.');
  const id = `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await createWardrobeSection(db, id, parsedName);
  return id;
}

export async function renameSection(db: SQLiteDatabase, sectionId: string, name: string) {
  const parsedName = sectionNameSchema.parse(name);
  const duplicate = await db.getFirstAsync<{ id: string }>('SELECT id FROM sections WHERE lower(name) = lower(?) AND id != ?', parsedName, sectionId);
  if (duplicate) throw new Error('A section with that name already exists.');
  return renameWardrobeSection(db, sectionId, parsedName);
}

export async function moveSection(db: SQLiteDatabase, sectionId: string, direction: -1 | 1) {
  return moveWardrobeSection(db, sectionId, direction);
}

export async function recordWardrobeWear(db: SQLiteDatabase, input: z.input<typeof recordWearSchema>) {
  const wear = recordWearSchema.parse(input);
  const garmentIds = [...new Set(wear.garmentIds)];
  if (garmentIds.length !== wear.garmentIds.length) throw new Error('A garment was included more than once.');
  const placeholders = garmentIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM garments WHERE archived_at IS NULL AND id IN (${placeholders})`,
    ...garmentIds,
  );
  if (rows.length !== garmentIds.length) throw new Error('One or more garments are no longer in your active wardrobe.');
  const id = `wear-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await insertWearRecord(db, { id, garmentIds, wornAt: wear.wornAt, note: wear.note || null });
  return id;
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

export type WardrobeWearHistoryItem = {
  wornAt: string;
  context: string | null;
  garments: { id: string; name: string }[];
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

export async function readWardrobeWearHistory(db: SQLiteDatabase, limit = 40): Promise<WardrobeWearHistoryItem[]> {
  const timeline = await getWearTimeline(db);
  return timeline.slice(0, limit).map((entry) => ({
    wornAt: entry.wornAt,
    context: entry.note,
    garments: entry.garments.map((garment) => ({ id: garment.id, name: garment.name })),
  }));
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
