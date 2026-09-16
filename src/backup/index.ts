import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

import { exportBackupFile, pickBackupFile, readBackupImage, writeBackupImage } from '@/backup/files';
import type { WardrobeChatGarment } from '@/models/agent';
import { readChatHistory, writeChatHistory, type PersistedChatMessage } from '@/storage/chatHistory';
import { readMemoryFile, writeMemoryFile } from '@/storage/memory';

const wardrobeChatGarmentSchema = z.object({
  id: z.string(), name: z.string(), sectionName: z.string(), description: z.string().nullable(), tags: z.array(z.string()),
  canonicalImage: z.string().nullable(), wearCount: z.number().int().nonnegative(), lastWornAt: z.string().nullable(),
});

const persistedChatMessageSchema = z.discriminatedUnion('kind', [
  z.object({ id: z.string(), kind: z.literal('text'), role: z.enum(['assistant', 'user']), text: z.string() }),
  z.object({ id: z.string(), kind: z.literal('error'), text: z.string() }),
  z.object({ id: z.string(), kind: z.literal('conversation_boundary'), createdAt: z.string().datetime() }),
  z.object({ id: z.string(), kind: z.literal('wardrobe_results'), garments: z.array(wardrobeChatGarmentSchema) }),
  z.object({ id: z.string(), kind: z.literal('outfit_suggestion'), suggestionKind: z.enum(['outfit', 'packing', 'capsule']).optional(), title: z.string(), reason: z.string(), garments: z.array(wardrobeChatGarmentSchema) }),
  z.object({ id: z.string(), kind: z.literal('wear_status'), garmentNames: z.array(z.string()), wornAt: z.string(), logged: z.boolean() }),
  z.object({ id: z.string(), kind: z.literal('action_status'), summary: z.string(), applied: z.boolean() }),
]);

const backupSchema = z.object({
  format: z.literal('wardrobe-ai-backup'),
  version: z.literal(1),
  createdAt: z.string().datetime(),
  sections: z.array(z.object({ id: z.string(), name: z.string(), position: z.number().int().nonnegative() })).max(500),
  garments: z.array(z.object({
    id: z.string(), name: z.string(), sectionId: z.string().nullable(), description: z.string().nullable(), tags: z.array(z.string()).max(50),
    createdAt: z.string().datetime(), updatedAt: z.string().datetime(), wearCount: z.number().int().nonnegative(), lastWornAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    archivedAt: z.string().datetime().nullable(), position: z.number().int().nonnegative(), imageBase64: z.string().min(4).max(70_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/).nullable(),
  })).max(5000),
  wears: z.array(z.object({ id: z.string(), garmentIds: z.array(z.string()).max(50), wornAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().nullable() })).max(20000),
  memory: z.object({ user: z.string().max(2_000_000), recent: z.string().max(2_000_000) }),
  chat: z.array(persistedChatMessageSchema).max(150),
});

export type WardrobeBackup = z.infer<typeof backupSchema>;

type SectionRow = { id: string; name: string; position: number };
type GarmentRow = {
  id: string; name: string; section_id: string | null; description: string | null; tags: string; canonical_image: string | null;
  created_at: string; updated_at: string; wear_count: number; last_worn_at: string | null; archived_at: string | null; position: number;
};
type WearRow = { id: string; garment_ids: string; worn_at: string; note: string | null };

function assertUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`The backup contains duplicate ${label} IDs.`);
}

function validateReferences(backup: WardrobeBackup) {
  assertUnique(backup.sections.map((item) => item.id), 'section');
  assertUnique(backup.garments.map((item) => item.id), 'garment');
  assertUnique(backup.wears.map((item) => item.id), 'Timeline');
  const sectionIds = new Set(backup.sections.map((item) => item.id));
  const garmentIds = new Set(backup.garments.map((item) => item.id));
  if (backup.garments.some((item) => item.sectionId && !sectionIds.has(item.sectionId))) throw new Error('The backup references a missing wardrobe section.');
  if (backup.wears.some((item) => item.garmentIds.some((id) => !garmentIds.has(id)))) throw new Error('The backup Timeline references a missing garment.');
}

export async function createWardrobeBackup(db: SQLiteDatabase) {
  const [sections, garmentRows, wearRows, user, recent, chat] = await Promise.all([
    db.getAllAsync<SectionRow>('SELECT id, name, position FROM sections ORDER BY position'),
    db.getAllAsync<GarmentRow>('SELECT * FROM garments ORDER BY created_at'),
    db.getAllAsync<WearRow>('SELECT * FROM wears ORDER BY worn_at'),
    readMemoryFile('USER.md'),
    readMemoryFile('RECENT.md'),
    readChatHistory(),
  ]);
  const garments = await Promise.all(garmentRows.map(async (garment) => {
    const imageBase64 = garment.canonical_image ? await readBackupImage(garment.canonical_image) : null;
    if (garment.canonical_image && !imageBase64) throw new Error(`Could not read the generated image for ${garment.name}.`);
    return {
      id: garment.id,
      name: garment.name,
      sectionId: garment.section_id,
      description: garment.description,
      tags: JSON.parse(garment.tags) as string[],
      createdAt: garment.created_at,
      updatedAt: garment.updated_at,
      wearCount: garment.wear_count,
      lastWornAt: garment.last_worn_at,
      archivedAt: garment.archived_at,
      position: garment.position,
      imageBase64,
    };
  }));
  const backup = backupSchema.parse({
    format: 'wardrobe-ai-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    sections,
    garments,
    wears: wearRows.map((wear) => ({ id: wear.id, garmentIds: JSON.parse(wear.garment_ids) as string[], wornAt: wear.worn_at, note: wear.note })),
    memory: { user, recent },
    chat,
  });
  const date = backup.createdAt.slice(0, 10);
  await exportBackupFile(JSON.stringify(backup), `wardrobe-backup-${date}.json`);
  return { garmentCount: garments.length, wearCount: backup.wears.length };
}

export async function chooseWardrobeBackup() {
  const contents = await pickBackupFile();
  if (!contents) return null;
  try {
    const backup = backupSchema.parse(JSON.parse(contents));
    validateReferences(backup);
    return backup;
  } catch (error) {
    if (error instanceof Error && !(error instanceof SyntaxError) && !(error instanceof z.ZodError)) throw error;
    throw new Error('That file is not a valid Wardrobe backup.');
  }
}

function restoredChat(backup: WardrobeBackup, imageUris: Map<string, string>) {
  const sections = new Map(backup.sections.map((section) => [section.id, section.name]));
  const garments = new Map<string, WardrobeChatGarment>(backup.garments.map((garment) => [garment.id, {
    id: garment.id,
    name: garment.name,
    sectionName: sections.get(garment.sectionId ?? '') ?? 'Unfiled',
    description: garment.description,
    tags: garment.tags,
    canonicalImage: imageUris.get(garment.id) ?? null,
    wearCount: garment.wearCount,
    lastWornAt: garment.lastWornAt,
  }]));
  return backup.chat.flatMap((message): PersistedChatMessage[] => {
    if (message.kind !== 'wardrobe_results' && message.kind !== 'outfit_suggestion') return [message as PersistedChatMessage];
    const resolved = message.garments.flatMap((garment) => garments.get(garment.id) ?? []);
    if (!resolved.length) return [];
    return [{ ...message, garments: resolved } as PersistedChatMessage];
  });
}

export async function restoreWardrobeBackup(db: SQLiteDatabase, backup: WardrobeBackup) {
  validateReferences(backup);
  const imageUris = new Map<string, string>();
  for (const garment of backup.garments) {
    if (garment.imageBase64) imageUris.set(garment.id, await writeBackupImage(garment.id, garment.imageBase64));
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM garment_images');
    await db.runAsync('DELETE FROM wears');
    await db.runAsync('DELETE FROM garments');
    await db.runAsync('DELETE FROM sections');
    for (const section of backup.sections) {
      await db.runAsync('INSERT INTO sections (id, name, position) VALUES (?, ?, ?)', section.id, section.name, section.position);
    }
    for (const garment of backup.garments) {
      const imageUri = imageUris.get(garment.id) ?? null;
      await db.runAsync(
        `INSERT INTO garments (id, name, section_id, description, tags, canonical_image, created_at, updated_at, wear_count, last_worn_at, archived_at, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        garment.id, garment.name, garment.sectionId, garment.description, JSON.stringify(garment.tags), imageUri,
        garment.createdAt, garment.updatedAt, garment.wearCount, garment.lastWornAt, garment.archivedAt, garment.position,
      );
      if (imageUri) {
        await db.runAsync(
          'INSERT INTO garment_images (id, garment_id, image_path, image_type, created_at) VALUES (?, ?, ?, ?, ?)',
          `image-${garment.id}`, garment.id, imageUri, 'canonical', garment.createdAt,
        );
      }
    }
    for (const wear of backup.wears) {
      await db.runAsync('INSERT INTO wears (id, garment_ids, worn_at, note) VALUES (?, ?, ?, ?)', wear.id, JSON.stringify(wear.garmentIds), wear.wornAt, wear.note);
    }
  });

  writeMemoryFile('USER.md', backup.memory.user);
  writeMemoryFile('RECENT.md', backup.memory.recent);
  writeChatHistory(restoredChat(backup, imageUris));
}
