import type { SQLiteDatabase } from 'expo-sqlite';

import { rememberConversation, readMemoryContext, rememberExistingGarmentReference, rememberGarmentAddition, rememberWear } from '@/agents/memory';
import { specialistRequestSchema, type SpecialistRequest } from '@/models/agent';
import { analyzeGarmentImages, compareGarmentAgainstCandidates, generateCanonicalGarmentImage, type GarmentObservation } from '@/agents/vision';
import { requestImageObservationPlan, requestNaturalGarmentPresentation, requestWardrobeAwareReply } from '@/agents/coordinator/muse';
import { addGarmentToWardrobe, archiveWardrobeGarment, createSection, findPotentialDuplicateCandidates, listWardrobeSections, moveSection, moveWardrobeGarment, readWardrobeCatalog, recordWardrobeWear, renameSection, reorderWardrobeGarments, updateWardrobeGarment } from '@/agents/wardrobe';
import { removeFlatBackgroundToPng } from '@/image/removeFlatBackground';
import { saveGeneratedGarmentPreview } from '@/storage/canonicalImages';

export function createSpecialistRequest(input: SpecialistRequest) {
  return specialistRequestSchema.parse(input);
}

export type SelectedImage = { uri: string; mimeType: string | null };

function fallbackDescription(garmentName: string) {
  return `I found the ${garmentName.toLocaleLowerCase()} you shared.`;
}

function fallbackDuplicateReason(existingGarmentName: string) {
  return `Its color, shape, and details look close to your ${existingGarmentName}.`;
}

export async function coordinateGarmentImageGeneration(geminiApiKey: string, sourceImage: SelectedImage, garment: GarmentObservation) {
  const generatedJpeg = await generateCanonicalGarmentImage(geminiApiKey, sourceImage, garment);
  const transparentPng = removeFlatBackgroundToPng(generatedJpeg);
  return saveGeneratedGarmentPreview(transparentPng, `preview-${Date.now()}`);
}

export async function coordinateImageObservation({
  museApiKey,
  geminiApiKey,
  db,
  images,
  userMessage,
  onProgress,
}: {
  museApiKey: string;
  geminiApiKey: string;
  db: SQLiteDatabase;
  images: SelectedImage[];
  userMessage: string;
  onProgress?: (text: string) => void;
}) {
  onProgress?.('Understanding your request…');
  const [plan, sections] = await Promise.all([
    requestImageObservationPlan(museApiKey, userMessage),
    listWardrobeSections(db),
  ]);
  if (!sections.length) throw new Error('Create a wardrobe section before adding a garment.');
  onProgress?.('Analyzing garment…');
  const analysis = await analyzeGarmentImages(geminiApiKey, images, {
    focusGarments: plan.focusGarments,
    intent: plan.intent,
    userMessage,
    availableSections: sections.map((section) => section.name),
  });

  const garments = [];
  for (const [index, garment] of analysis.garments.entries()) {
    const sourceImage = images[Math.min(garment.sourceImageIndex, images.length - 1)];
    const suggestedSection = sections.find((section) => section.name.toLocaleLowerCase() === garment.suggestedSectionName.toLocaleLowerCase()) ?? sections[0];
    onProgress?.('Checking wardrobe…');
    const candidates = await findPotentialDuplicateCandidates(db, garment);
    const duplicate = await compareGarmentAgainstCandidates(geminiApiKey, sourceImage, garment, candidates);

    if (duplicate && duplicate.confidence >= 0.82) {
      garments.push({
        ...garment,
        sourceImage,
        duplicateCandidate: duplicate.candidate,
        duplicateConfidence: duplicate.confidence,
        duplicateReason: duplicate.reason,
        suggestedSectionId: suggestedSection.id,
        suggestedSectionName: suggestedSection.name,
      });
      continue;
    }

    onProgress?.(`Generating wardrobe image ${index + 1} of ${analysis.garments.length}…`);
    garments.push({
      ...garment,
      canonicalImageUri: await coordinateGarmentImageGeneration(geminiApiKey, sourceImage, garment),
      suggestedSectionId: suggestedSection.id,
      suggestedSectionName: suggestedSection.name,
    });
  }

  onProgress?.('Putting it together…');
  const presentation = await requestNaturalGarmentPresentation(museApiKey, {
    userMessage,
    rawNote: analysis.note,
    garments: garments.map((garment, index) => ({
      index,
      name: garment.name,
      rawDescription: garment.description,
      rawDuplicateReason: 'duplicateReason' in garment ? garment.duplicateReason : undefined,
    })),
  });

  const presentedGarments = garments.map((garment, index) => {
    const copy = presentation?.garments.find((item) => item.index === index);
    const description = copy?.description || fallbackDescription(garment.name);
    if ('duplicateReason' in garment) {
      return {
        ...garment,
        description,
        duplicateReason: copy?.duplicateReason || fallbackDuplicateReason(garment.duplicateCandidate.name),
      };
    }
    return { ...garment, description };
  });

  return {
    ...analysis,
    note: presentation?.note || (analysis.note ? 'A few details were unclear, so please review the suggestion before adding it.' : ''),
    garments: presentedGarments,
    memoryFacts: plan.memoryFacts,
  };
}

export async function coordinateTextConversation(apiKey: string, db: SQLiteDatabase, userMessage: string) {
  const [memory, wardrobe] = await Promise.all([readMemoryContext(), readWardrobeCatalog(db)]);
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const reply = await requestWardrobeAwareReply(apiKey, userMessage, memory, wardrobe, localDate);
  await rememberConversation(userMessage, reply.answer).catch(() => undefined);
  const byId = new Map(wardrobe.map((garment) => [garment.id, garment]));
  return {
    text: reply.answer,
    garments: reply.garmentIds.flatMap((id) => {
      const garment = byId.get(id);
      return garment ? [garment] : [];
    }),
    wearProposal: reply.proposedWear ? {
      ...reply.proposedWear,
      garments: reply.proposedWear.garmentIds.flatMap((id) => {
        const garment = byId.get(id);
        return garment ? [garment] : [];
      }),
    } : null,
  };
}

export async function coordinateGarmentAddition({
  db,
  garmentName,
  sectionId,
  sectionName,
  description,
  tags,
  canonicalImageUri,
  userMessage,
  memoryFacts,
}: {
  db: SQLiteDatabase;
  garmentName: string;
  sectionId: string;
  sectionName: string;
  description: string;
  tags: string[];
  canonicalImageUri: string;
  userMessage: string;
  memoryFacts: string[];
}) {
  const garmentId = await addGarmentToWardrobe(db, {
    name: garmentName,
    sectionId,
    description,
    tags,
    canonicalImageUri,
  });
  await rememberGarmentAddition({ garmentId, garmentName, sectionName, userMessage, memoryFacts }).catch(() => undefined);
  return garmentId;
}

export async function coordinateExistingGarmentReference(input: { garmentId: string; garmentName: string; userMessage: string; memoryFacts: string[] }) {
  await rememberExistingGarmentReference(input).catch(() => undefined);
}

export async function coordinateGarmentUpdate(db: SQLiteDatabase, input: { garmentId: string; name: string; sectionId: string; tags: string[] }) {
  return updateWardrobeGarment(db, input);
}

export async function coordinateGarmentArchive(db: SQLiteDatabase, garmentId: string) {
  return archiveWardrobeGarment(db, garmentId);
}

export async function coordinateGarmentMove(db: SQLiteDatabase, garmentId: string, direction: -1 | 1) {
  return moveWardrobeGarment(db, garmentId, direction);
}

export async function coordinateGarmentReorder(db: SQLiteDatabase, sectionId: string, garmentIds: string[]) {
  return reorderWardrobeGarments(db, { sectionId, garmentIds });
}

export async function coordinateSectionCreate(db: SQLiteDatabase, name: string) {
  return createSection(db, name);
}

export async function coordinateSectionRename(db: SQLiteDatabase, sectionId: string, name: string) {
  return renameSection(db, sectionId, name);
}

export async function coordinateSectionMove(db: SQLiteDatabase, sectionId: string, direction: -1 | 1) {
  return moveSection(db, sectionId, direction);
}

export async function coordinateWearRecord(db: SQLiteDatabase, input: { garmentIds: string[]; garmentNames: string[]; wornAt: string; note: string }) {
  const wearId = await recordWardrobeWear(db, input);
  await rememberWear(input.garmentNames, input.wornAt, input.note).catch(() => undefined);
  return wearId;
}
