import { specialistRequestSchema, type SpecialistRequest } from '@/models/agent';
import { analyzeGarmentImages, generateCanonicalGarmentImage } from '@/agents/vision';
import { requestImageObservationPlan } from '@/agents/coordinator/muse';
import { removeFlatBackgroundToPng } from '@/image/removeFlatBackground';
import { saveGeneratedGarmentPreview } from '@/storage/canonicalImages';

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
  const analysis = await analyzeGarmentImages(geminiApiKey, images, {
    focusGarments: plan.focusGarments,
    intent: plan.intent,
    userMessage,
  });

  const garments = [];
  for (const [index, garment] of analysis.garments.entries()) {
    onProgress?.(`Generating wardrobe image ${index + 1} of ${analysis.garments.length}…`);
    const sourceImage = images[Math.min(garment.sourceImageIndex, images.length - 1)];
    const generatedJpeg = await generateCanonicalGarmentImage(geminiApiKey, sourceImage, garment);
    const transparentPng = removeFlatBackgroundToPng(generatedJpeg);
    garments.push({
      ...garment,
      canonicalImageUri: saveGeneratedGarmentPreview(transparentPng, `preview-${Date.now()}-${index}`),
    });
  }

  return { ...analysis, garments };
}
