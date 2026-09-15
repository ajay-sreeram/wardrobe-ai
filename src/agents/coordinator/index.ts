import type { SQLiteDatabase } from 'expo-sqlite';

import { rememberConversation, readMemoryContext, rememberGarmentAddition } from '@/agents/memory';
import { specialistRequestSchema, type SpecialistRequest } from '@/models/agent';
import { analyzeGarmentImages, generateCanonicalGarmentImage } from '@/agents/vision';
import { requestImageObservationPlan, requestMuseReply } from '@/agents/coordinator/muse';
import { addGarmentToWardrobe, listWardrobeSections } from '@/agents/wardrobe';
import { removeFlatBackgroundToPng } from '@/image/removeFlatBackground';
import { saveGeneratedGarmentPreview } from '@/storage/canonicalImages';

export function createSpecialistRequest(input: SpecialistRequest) {
  return specialistRequestSchema.parse(input);
}

type SelectedImage = { uri: string; mimeType: string | null };

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
    onProgress?.(`Generating wardrobe image ${index + 1} of ${analysis.garments.length}…`);
    const sourceImage = images[Math.min(garment.sourceImageIndex, images.length - 1)];
    const generatedJpeg = await generateCanonicalGarmentImage(geminiApiKey, sourceImage, garment);
    const transparentPng = removeFlatBackgroundToPng(generatedJpeg);
    const suggestedSection = sections.find((section) => section.name.toLocaleLowerCase() === garment.suggestedSectionName.toLocaleLowerCase()) ?? sections[0];
    garments.push({
      ...garment,
      canonicalImageUri: saveGeneratedGarmentPreview(transparentPng, `preview-${Date.now()}-${index}`),
      suggestedSectionId: suggestedSection.id,
      suggestedSectionName: suggestedSection.name,
    });
  }

  return { ...analysis, garments, memoryFacts: plan.memoryFacts };
}

export async function coordinateTextConversation(apiKey: string, userMessage: string) {
  const memory = await readMemoryContext();
  const reply = await requestMuseReply(apiKey, userMessage, memory);
  await rememberConversation(userMessage, reply).catch(() => undefined);
  return reply;
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
