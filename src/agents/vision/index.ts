import { z } from 'zod';

import { providerConfig } from '@/config/providers';
import { readChatImageBase64 } from '@/storage/chatImageData';
import type { DuplicateCandidate } from '@/agents/wardrobe';

export const visionAgentScope = {
  canAnalyzeImages: true,
  canGenerateCanonicalImages: true,
  canMutateWardrobe: false,
} as const;

export const garmentObservationSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.string().min(1),
  description: z.string().min(1),
  colors: z.array(z.string().min(1)).max(5),
  tags: z.array(z.string().min(1)).max(8),
  confidence: z.number().min(0).max(1),
  sourceImageIndex: z.number().int().nonnegative(),
  suggestedSectionName: z.string().min(1),
});

export type GarmentObservation = z.infer<typeof garmentObservationSchema>;

const analysisSchema = z.object({
  garments: z.array(garmentObservationSchema).max(12),
  note: z.string(),
});

const duplicateResultSchema = z.object({
  candidateId: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

const interactionSchema = z.object({
  steps: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
      data: z.string().optional(),
      mime_type: z.string().optional(),
    })).optional(),
  })),
});

const outputJsonSchema = {
  type: 'object',
  properties: {
    garments: {
      type: 'array',
      description: 'Distinct garments visible across the submitted photos.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 80, description: 'Short, searchable wardrobe name using the most useful visible identifier(s), usually a primary color plus the culturally correct garment type. Include a contrasting coordinated piece when it distinguishes a set, for example "Purple half saree with brown chuni". Keep finer details in description and tags if the name would become long.' },
          category: { type: 'string', description: 'General garment category.' },
          description: { type: 'string', description: 'One concise object-focused sentence preserving useful colors, pattern, cut, material, coordinated-piece details, distinctive features, and a clearly readable brand when present. Never mention the person, pose, photo, visibility, or background items.' },
          colors: { type: 'array', description: 'Specific everyday names for the main and useful contrasting garment colors.', items: { type: 'string' }, maxItems: 5 },
          tags: { type: 'array', description: 'Searchable garment facts. Put an observed pattern and clearly readable brand first, followed by culturally correct terms and distinctive details. Avoid guesses and do not repeat the colors array.', items: { type: 'string' }, maxItems: 8 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sourceImageIndex: { type: 'integer', minimum: 0, description: 'Zero-based index of the photo that shows this garment most clearly.' },
          suggestedSectionName: { type: 'string', description: 'Best matching name from the supplied wardrobe sections.' },
        },
        required: ['name', 'category', 'description', 'colors', 'tags', 'confidence', 'sourceImageIndex', 'suggestedSectionName'],
      },
      maxItems: 12,
    },
    note: { type: 'string', description: 'A brief caveat only about an ambiguous target-garment detail; otherwise an empty string. Never summarize people, poses, accessories, or background garments.' },
  },
  required: ['garments', 'note'],
} as const;

type VisionImage = { uri: string; mimeType: string | null };
type VisionContext = { focusGarments: string[]; intent: string; userMessage: string; availableSections: string[] };

export class VisionRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VisionRequestError';
  }
}

function inferMimeType(image: VisionImage) {
  if (image.mimeType?.startsWith('image/')) return image.mimeType;
  if (/\.png$/i.test(image.uri)) return 'image/png';
  if (/\.webp$/i.test(image.uri)) return 'image/webp';
  if (/\.hei[cf]$/i.test(image.uri)) return 'image/heic';
  return 'image/jpeg';
}

function parseJsonObject(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new SyntaxError('No JSON object found.');
  return JSON.parse(text.slice(start, end + 1));
}

export async function analyzeGarmentImages(apiKey: string, images: VisionImage[], context: VisionContext) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const encodedImages = await Promise.all(images.map(async (image) => ({
      type: 'image',
      data: await readChatImageBase64(image.uri),
      mime_type: inferMimeType(image),
    })));

    const approximateBytes = encodedImages.reduce((sum, image) => sum + image.data.length * 0.75, 0);
    if (approximateBytes > 15 * 1024 * 1024) {
      throw new VisionRequestError('Those photos are too large to analyze together. Please send fewer photos at a time.');
    }

    const response = await fetch(`${providerConfig.gemini.baseUrl}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: providerConfig.gemini.model,
        store: false,
        input: [
          {
            type: 'text',
            text: `Act only as a wardrobe vision specialist. Identify distinct garments visible in these user-selected photos. A photo may be a product shot, folded item, flat lay, hanging garment, mirror selfie, partial view, or alternate view of the same garment. Do not invent hidden details or decide whether anything belongs in the wardrobe. Support garment traditions from every culture and use a safe generic description when a culturally specific name is uncertain. Respect how the person groups and names culturally recognized coordinated sets: if they refer to a set such as a half saree as one dress or outfit, treat it as one wardrobe item unless they explicitly ask to separate its pieces.

Make every garment easy to refer to naturally later. Prefer a concise, distinctive name built from the most useful visible color or pattern plus the garment type instead of a generic type alone. Include a strongly contrasting coordinated component when useful—for example, "Purple half saree with brown chuni" instead of "Half saree". If that would make the name unwieldy, keep the name short and put the remaining color, pattern, coordinated-piece, and distinctive details in the description and tags. Record specific main and contrast colors in colors. Record patterns such as floral, striped, checked, embroidered, printed, or color-blocked when supported. Record a brand in the description and tags only when its name or logo is clearly readable and unambiguous; never infer a brand from styling alone.

In descriptions and notes, discuss only the target garment itself. Never mention the person, pose, accessories, unrelated garments, background, photo/image, visibility, or the identification process.
User message: ${context.userMessage || '(no message)'}
Coordinator intent: ${context.intent}
${context.focusGarments.length ? `Strict selection: Return ONLY garments matching these user-requested types: ${context.focusGarments.join(', ')}. Treat every other visible garment as background context and do not include it in garments.` : 'Selection: The user did not identify a specific garment type, so return all clearly visible garments.'}
Suggest the best logical wardrobe section for each garment using exactly one of these existing section names: ${context.availableSections.join(', ')}. This is only a suggestion; the user confirms the final wardrobe change.
Return only one JSON object matching this schema, with no commentary or Markdown:
${JSON.stringify(outputJsonSchema)}`,
          },
          ...encodedImages,
        ],
        generation_config: {
          max_output_tokens: 2048,
          thinking_level: 'minimal',
        },
        response_format: { type: 'text' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 400) throw new VisionRequestError('Gemini could not analyze that image format. Try a JPEG or PNG.');
      if (response.status === 401 || response.status === 403) throw new VisionRequestError('Gemini rejected GEMINI_API_KEY in local-secrets/.env.');
      if (response.status === 429) throw new VisionRequestError('Gemini is rate-limited right now. Please try again shortly.');
      throw new VisionRequestError(`Gemini image analysis failed (${response.status}).`);
    }

    const interaction = interactionSchema.safeParse(await response.json());
    if (!interaction.success) throw new VisionRequestError('Gemini returned an unexpected response.');

    const text = interaction.data.steps.flatMap((step) => step.type === 'model_output' ? step.content ?? [] : [])
      .find((content) => content.type === 'text' && content.text)?.text;
    if (!text) throw new VisionRequestError('Gemini did not return a garment analysis.');

    const analysis = analysisSchema.safeParse(parseJsonObject(text));
    if (!analysis.success) throw new VisionRequestError('Gemini returned an invalid garment analysis.');
    return analysis.data;
  } catch (error) {
    if (error instanceof VisionRequestError) throw error;
    if (error instanceof SyntaxError) throw new VisionRequestError('Gemini returned an invalid garment analysis.');
    if (error instanceof Error && error.name === 'AbortError') throw new VisionRequestError('Gemini took too long to analyze the photos. Please try again.');
    throw new VisionRequestError('Could not reach Gemini. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCanonicalGarmentImage(apiKey: string, sourceImage: VisionImage, garment: GarmentObservation) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const visibleColors = [...garment.colors, ...garment.tags].join(' ').toLowerCase();
    const chromaBackground = visibleColors.includes('green') || visibleColors.includes('lime') ? '#FF00FF' : '#00FF00';
    const response = await fetch(`${providerConfig.gemini.baseUrl}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: providerConfig.gemini.model,
        store: false,
        input: [
          {
            type: 'text',
            text: `Create a premium standardized digital-wardrobe image of only this garment: ${garment.name}. ${garment.description}
Use the attached user photo strictly as the identity reference. Preserve the exact color, pattern, cut, collar, sleeves, fasteners, texture, distinctive details, and any visible logo or branding that is genuinely printed, embroidered, or attached to the garment. Remove the person, body, other garments, phone, room, hanger, mannequin, loose retail tags, and all background objects. Do not redesign or beautify the garment into a different product.
Output one complete, uncropped garment against a perfectly flat, single-color ${chromaBackground} background for clean removal. The background must be exactly uniform edge to edge, with no gradient, texture, floor, or shadow. Center the garment upright on a 3:4 portrait canvas. Keep a consistent apparent scale: the garment's longest dimension must occupy about 82% of the canvas, with roughly 9% clear margin on every outer side. Use the same visual scale and margins for every wardrobe asset. No text, border, scenery, or props.`,
          },
          {
            type: 'image',
            data: await readChatImageBase64(sourceImage.uri),
            mime_type: inferMimeType(sourceImage),
          },
        ],
        generation_config: {
          thinking_level: 'minimal',
          image_config: {
            aspect_ratio: '3:4',
            image_size: '1K',
          },
        },
        response_modalities: ['image'],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new VisionRequestError('Gemini rejected GEMINI_API_KEY in local-secrets/.env.');
      if (response.status === 429) throw new VisionRequestError('Gemini is rate-limited while generating the wardrobe image. Please try again shortly.');
      throw new VisionRequestError(`Gemini wardrobe image generation failed (${response.status}).`);
    }

    const interaction = interactionSchema.safeParse(await response.json());
    if (!interaction.success) throw new VisionRequestError('Gemini returned an unexpected image response.');
    const image = interaction.data.steps.flatMap((step) => step.type === 'model_output' ? step.content ?? [] : [])
      .find((content) => content.type === 'image' && content.data);
    if (!image?.data) throw new VisionRequestError('Gemini did not return a wardrobe image.');
    return image.data;
  } catch (error) {
    if (error instanceof VisionRequestError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new VisionRequestError('Gemini took too long to generate the wardrobe image. Please try again.');
    throw new VisionRequestError('Could not generate the wardrobe image. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function compareGarmentAgainstCandidates(apiKey: string, sourceImage: VisionImage, garment: GarmentObservation, candidates: DuplicateCandidate[]) {
  if (!candidates.length) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const candidateInputs = await Promise.all(candidates.map(async (candidate) => [
      { type: 'text', text: `Candidate ID: ${candidate.id}\nName: ${candidate.name}\nDescription: ${candidate.description ?? ''}\nTags: ${candidate.tags.join(', ')}` },
      { type: 'image', data: await readChatImageBase64(candidate.canonicalImage), mime_type: 'image/png' },
    ]));
    const response = await fetch(`${providerConfig.gemini.baseUrl}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: providerConfig.gemini.model,
        store: false,
        input: [
          {
            type: 'text',
            text: `Determine whether the newly observed ${garment.name} is the exact same physical garment as one candidate below. Account for mirror selfies, folds, pose, lighting, camera angle, partial visibility, and the candidate's standardized cutout. Similar color or style alone is NOT a duplicate. Be conservative. If none is the same item, use an empty candidateId. In the reason, mention only garment-level similarities or differences—never the person, pose, accessories, unrelated garments, photo/image, visibility, or identification process. Return only JSON: {"candidateId":"exact candidate ID or empty string","confidence":0.0,"reason":"brief garment-level evidence"}.`,
          },
          { type: 'text', text: 'New observation:' },
          { type: 'image', data: await readChatImageBase64(sourceImage.uri), mime_type: inferMimeType(sourceImage) },
          ...candidateInputs.flat(),
        ],
        generation_config: { max_output_tokens: 1024, thinking_level: 'minimal' },
        response_format: { type: 'text' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const interaction = interactionSchema.safeParse(await response.json());
    if (!interaction.success) return null;
    const text = interaction.data.steps.flatMap((step) => step.type === 'model_output' ? step.content ?? [] : [])
      .find((content) => content.type === 'text' && content.text)?.text;
    if (!text) return null;
    const result = duplicateResultSchema.safeParse(parseJsonObject(text));
    if (!result.success || !result.data.candidateId) return null;
    const candidate = candidates.find((item) => item.id === result.data.candidateId);
    if (!candidate) return null;
    return { candidate, confidence: result.data.confidence, reason: result.data.reason };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
