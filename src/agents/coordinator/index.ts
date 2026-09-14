import { specialistRequestSchema, type SpecialistRequest } from '@/models/agent';
import { analyzeGarmentImages } from '@/agents/vision';
import { requestImageObservationPlan } from '@/agents/coordinator/muse';

export function createSpecialistRequest(input: SpecialistRequest) {
  return specialistRequestSchema.parse(input);
}

type SelectedImage = { uri: string; mimeType: string | null };

export async function coordinateImageObservation({
  museApiKey,
  geminiApiKey,
  images,
  userMessage,
  onProgress,
}: {
  museApiKey: string;
  geminiApiKey: string;
  images: SelectedImage[];
  userMessage: string;
  onProgress?: (text: string) => void;
}) {
  onProgress?.('Understanding your request…');
  const plan = await requestImageObservationPlan(museApiKey, userMessage);
  onProgress?.('Analyzing garment…');
  return analyzeGarmentImages(geminiApiKey, images, {
    focusGarments: plan.focusGarments,
    intent: plan.intent,
    userMessage,
  });
}
