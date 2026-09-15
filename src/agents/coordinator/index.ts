import type { SQLiteDatabase } from 'expo-sqlite';

import { forgetExplicitWardrobeFacts, rememberConversation, readMemoryContext, rememberExistingGarmentReference, rememberExplicitWardrobeFacts, rememberGarmentAddition, rememberGarmentArchive, rememberWardrobeChange, rememberWear, rememberWearCorrection, rememberWearDeletion } from '@/agents/memory';
import { specialistRequestSchema, type ChatMessage, type SpecialistRequest, type WardrobeMutation } from '@/models/agent';
import { analyzeGarmentImages, compareGarmentAgainstCandidates, generateCanonicalGarmentImage, type GarmentObservation } from '@/agents/vision';
import { requestImageObservationPlan, requestNaturalGarmentPresentation, requestWardrobeAwareReply } from '@/agents/coordinator/muse';
import { addGarmentToWardrobe, archiveWardrobeGarment, createSection, deleteWardrobeWear, findPotentialDuplicateCandidates, listWardrobeSections, moveSection, moveWardrobeGarment, readWardrobeCatalog, readWardrobeWear, readWardrobeWearHistory, recordWardrobeWear, renameSection, reorderWardrobeGarments, updateWardrobeGarment, updateWardrobeWear } from '@/agents/wardrobe';
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

function localDateContext() {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'device local time',
    weekday: now.toLocaleDateString('en-US', { weekday: 'long' }),
  };
}

function recentConversationContext(messages: ChatMessage[]) {
  const boundaryIndex = messages.reduce((latest, message, index) => message.kind === 'conversation_boundary' ? index : latest, -1);
  const contextEntries = messages.slice(boundaryIndex + 1).flatMap((message) => {
    if (message.kind === 'text') return [`${message.role === 'user' ? 'Person' : 'Assistant'}: ${message.text}`];
    if (message.kind === 'wardrobe_results') return [`Assistant showed: ${message.garments.map((garment) => `${garment.name} [${garment.id}]`).join(', ')}`];
    if (message.kind === 'wear_confirmation') return [`Pending wear proposal for ${message.wornAt}: ${message.garments.map((garment) => `${garment.name} [${garment.id}]`).join(', ')}${message.note ? `; context: ${message.note}` : ''}`];
    if (message.kind === 'wear_status') return [`Wear proposal ${message.logged ? 'logged' : 'cancelled'}: ${message.garmentNames.join(', ')}`];
    if (message.kind === 'action_confirmation') return [`Pending local change awaiting confirmation: ${message.description}`];
    if (message.kind === 'action_status') return [`Local change ${message.applied ? 'confirmed' : 'cancelled'}: ${message.summary}`];
    return [];
  });
  return contextEntries.slice(-12).join('\n').slice(-6_000);
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
  const localDate = localDateContext();
  const [plan, sections] = await Promise.all([
    requestImageObservationPlan(museApiKey, userMessage, localDate),
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
    wearContext: plan.wearContext,
  };
}

export async function coordinateTextConversation(apiKey: string, db: SQLiteDatabase, userMessage: string, messages: ChatMessage[] = [], onProgress?: (text: string) => void) {
  onProgress?.('Reading your wardrobe context…');
  const [memory, wardrobe, sections, wearHistory] = await Promise.all([readMemoryContext(), readWardrobeCatalog(db), listWardrobeSections(db), readWardrobeWearHistory(db)]);
  const reply = await requestWardrobeAwareReply(apiKey, userMessage, memory, wardrobe, sections, wearHistory, localDateContext(), recentConversationContext(messages), onProgress);
  await forgetExplicitWardrobeFacts(reply.forgottenMemoryFacts).catch(() => undefined);
  await Promise.all([
    rememberConversation(userMessage, reply.answer),
    rememberExplicitWardrobeFacts(reply.memoryFacts),
  ]).catch(() => undefined);
  const byId = new Map(wardrobe.map((garment) => [garment.id, garment]));
  const sectionById = new Map(sections.map((section) => [section.id, section.name]));
  const wearById = new Map(wearHistory.map((wear) => [wear.id, wear]));
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
    actionProposal: reply.proposedAction ? describeWardrobeMutation(reply.proposedAction, byId, sectionById, wearById) : null,
  };
}

function describeWardrobeMutation(
  action: WardrobeMutation,
  garments: Map<string, Awaited<ReturnType<typeof readWardrobeCatalog>>[number]>,
  sections: Map<string, string>,
  wears: Map<string, Awaited<ReturnType<typeof readWardrobeWearHistory>>[number]>,
) {
  if (action.type === 'update_garment') {
    const garment = garments.get(action.garmentId)!;
    const destination = sections.get(action.sectionId)!;
    return { action, title: `Update ${garment.name}?`, description: `Save the name “${action.name}”, move it to ${destination}, and use these tags: ${action.tags.join(', ') || 'none'}. Description: ${action.description || 'None'}`, confirmLabel: 'Update garment', garments: [garment] };
  }
  if (action.type === 'archive_garment') {
    const garment = garments.get(action.garmentId)!;
    return { action, title: `Archive ${garment.name}?`, description: 'It will leave your active wardrobe, while its Timeline history remains available.', confirmLabel: 'Archive garment', garments: [garment] };
  }
  if (action.type === 'create_section') return { action, title: `Create ${action.name}?`, description: 'This will add a new section to your wardrobe.', confirmLabel: 'Create section', garments: [] };
  if (action.type === 'rename_section') return { action, title: `Rename ${sections.get(action.sectionId)}?`, description: `The section will be renamed to ${action.name}. Its garments will stay in place.`, confirmLabel: 'Rename section', garments: [] };
  const wear = wears.get(action.wearId)!;
  const wearGarments = action.type === 'update_wear' ? action.garmentIds.flatMap((id) => garments.get(id) ?? []) : wear.garments.flatMap((item) => garments.get(item.id) ?? []);
  if (action.type === 'update_wear') return { action, title: `Correct the ${wear.wornAt} outfit?`, description: `Save ${wearGarments.map((garment) => garment.name).join(' + ')} for ${action.wornAt}${action.note ? ` · ${action.note}` : ''}.`, confirmLabel: 'Update Timeline', garments: wearGarments };
  return { action, title: `Delete the ${wear.wornAt} Timeline entry?`, description: `${wear.garments.map((garment) => garment.name).join(' + ')} will be removed from your wear history and garment statistics will be corrected.`, confirmLabel: 'Delete entry', garments: wearGarments };
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

export async function coordinateGarmentUpdate(db: SQLiteDatabase, input: { garmentId: string; name: string; description: string; sectionId: string; tags: string[] }) {
  return updateWardrobeGarment(db, input);
}

export async function coordinateGarmentArchive(db: SQLiteDatabase, garmentId: string) {
  const garment = await readWardrobeCatalog(db).then((items) => items.find((item) => item.id === garmentId));
  await archiveWardrobeGarment(db, garmentId);
  if (garment) await rememberGarmentArchive(garment.id, garment.name).catch(() => undefined);
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

export async function coordinateWearUpdate(db: SQLiteDatabase, input: { wearId: string; garmentIds: string[]; garmentNames: string[]; wornAt: string; note: string }) {
  await updateWardrobeWear(db, input);
  await rememberWearCorrection(input.garmentNames, input.wornAt, input.note).catch(() => undefined);
}

export async function coordinateWearDelete(db: SQLiteDatabase, wearId: string, wornAt: string) {
  await deleteWardrobeWear(db, wearId);
  await rememberWearDeletion(wornAt).catch(() => undefined);
}

export async function coordinateWardrobeMutation(db: SQLiteDatabase, action: WardrobeMutation) {
  if (action.type === 'update_garment') {
    await updateWardrobeGarment(db, action);
    await rememberWardrobeChange(`Updated garment ${action.name}.`).catch(() => undefined);
    return `Updated ${action.name}`;
  }
  if (action.type === 'archive_garment') {
    const garment = await readWardrobeCatalog(db).then((items) => items.find((item) => item.id === action.garmentId));
    await coordinateGarmentArchive(db, action.garmentId);
    const summary = `Archived ${garment?.name ?? 'garment'}`;
    return summary;
  }
  if (action.type === 'create_section') {
    await createSection(db, action.name);
    await rememberWardrobeChange(`Created wardrobe section ${action.name}.`).catch(() => undefined);
    return `Created ${action.name}`;
  }
  if (action.type === 'rename_section') {
    const oldName = await listWardrobeSections(db).then((items) => items.find((item) => item.id === action.sectionId)?.name);
    await renameSection(db, action.sectionId, action.name);
    await rememberWardrobeChange(`Renamed wardrobe section ${oldName ?? ''} to ${action.name}.`).catch(() => undefined);
    return `Renamed ${oldName ?? 'section'} to ${action.name}`;
  }
  if (action.type === 'update_wear') {
    await updateWardrobeWear(db, action);
    const corrected = await readWardrobeWear(db, action.wearId);
    const names = corrected?.garments.map((garment) => garment.name) ?? [];
    await rememberWearCorrection(names, action.wornAt, action.note).catch(() => undefined);
    return `Updated the ${action.wornAt} Timeline entry`;
  }
  const existing = await readWardrobeWear(db, action.wearId);
  await deleteWardrobeWear(db, action.wearId);
  await rememberWearDeletion(existing?.wornAt ?? 'selected date').catch(() => undefined);
  return `Deleted the ${existing?.wornAt ?? 'selected'} Timeline entry`;
}
