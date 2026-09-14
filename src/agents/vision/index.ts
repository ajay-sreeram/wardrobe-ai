import { z } from 'zod';

import { providerConfig } from '@/config/providers';
import { readChatImageBase64 } from '@/storage/chatImageData';

export const visionAgentScope = {
  canAnalyzeImages: true,
  canGenerateCanonicalImages: true,
  canMutateWardrobe: false,
} as const;

export const garmentObservationSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  colors: z.array(z.string().min(1)).max(5),
  tags: z.array(z.string().min(1)).max(8),
  confidence: z.number().min(0).max(1),
  sourceImageIndex: z.number().int().nonnegative(),
});

export type GarmentObservation = z.infer<typeof garmentObservationSchema>;

const analysisSchema = z.object({
  garments: z.array(garmentObservationSchema).max(12),
  note: z.string(),
});

const interactionSchema = z.object({
  steps: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
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
          name: { type: 'string', description: 'Short neutral wardrobe name.' },
          category: { type: 'string', description: 'General garment category.' },
          description: { type: 'string', description: 'Visible cut, material, pattern, and distinctive details.' },
          colors: { type: 'array', items: { type: 'string' }, maxItems: 5 },
          tags: { type: 'array', items: { type: 'string' }, maxItems: 8 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sourceImageIndex: { type: 'integer', minimum: 0, description: 'Zero-based index of the photo that shows this garment most clearly.' },
        },
        required: ['name', 'category', 'description', 'colors', 'tags', 'confidence', 'sourceImageIndex'],
      },
      maxItems: 12,
    },
    note: { type: 'string', description: 'A brief caveat when an image is ambiguous; otherwise an empty string.' },
  },
  required: ['garments', 'note'],
} as const;

type VisionImage = { uri: string; mimeType: string | null };
type VisionContext = { focusGarments: string[]; intent: string; userMessage: string };

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
            text: `Act only as a wardrobe vision specialist. Identify distinct garments visible in these user-selected photos. A photo may be a product shot, folded item, flat lay, hanging garment, mirror selfie, partial view, or alternate view of the same garment. Do not invent hidden details or decide whether anything belongs in the wardrobe. Support garment traditions from every culture and use a safe generic description when a culturally specific name is uncertain.
User message: ${context.userMessage || '(no message)'}
Coordinator intent: ${context.intent}
${context.focusGarments.length ? `Strict selection: Return ONLY garments matching these user-requested types: ${context.focusGarments.join(', ')}. Treat every other visible garment as background context and do not include it in garments.` : 'Selection: The user did not identify a specific garment type, so return all clearly visible garments.'}
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
