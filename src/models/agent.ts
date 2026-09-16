import { z } from 'zod';

export const agentStageSchema = z.enum([
  'idle',
  'thinking',
  'analyzing_image',
  'checking_wardrobe',
  'generating_image',
  'updating_wardrobe',
  'done',
  'error',
]);

export type AgentStage = z.infer<typeof agentStageSchema>;

export const specialistRequestSchema = z.object({
  task: z.string().min(1),
  context: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type SpecialistRequest = z.infer<typeof specialistRequestSchema>;

export type WardrobeChatGarment = {
  id: string;
  name: string;
  sectionName: string;
  description: string | null;
  tags: string[];
  canonicalImage: string | null;
  wearCount: number;
  lastWornAt: string | null;
};

export type WearContext = { wornAt: string; note: string };

export type WardrobeMutation =
  | { type: 'update_garment'; garmentId: string; name: string; description: string; sectionId: string; tags: string[] }
  | { type: 'archive_garment'; garmentId: string }
  | { type: 'restore_garment'; garmentId: string }
  | { type: 'create_section'; name: string }
  | { type: 'rename_section'; sectionId: string; name: string }
  | { type: 'update_wear'; wearId: string; garmentIds: string[]; wornAt: string; note: string }
  | { type: 'delete_wear'; wearId: string };

export type ChatMessage =
  | { id: string; kind: 'text'; role: 'assistant' | 'user'; text: string }
  | { id: string; kind: 'image'; role: 'user'; uri: string; width: number; height: number }
  | { id: string; kind: 'status'; stage: AgentStage; text: string }
  | { id: string; kind: 'error'; text: string; retryable?: boolean }
  | { id: string; kind: 'conversation_boundary'; createdAt: string }
  | { id: string; kind: 'wardrobe_results'; garments: WardrobeChatGarment[] }
  | { id: string; kind: 'outfit_suggestion'; suggestionKind?: 'outfit' | 'packing' | 'capsule'; title: string; reason: string; garments: WardrobeChatGarment[] }
  | { id: string; kind: 'wear_confirmation'; garments: WardrobeChatGarment[]; garmentIds: string[]; wornAt: string; note: string }
  | { id: string; kind: 'wear_status'; garmentNames: string[]; wornAt: string; logged: boolean }
  | { id: string; kind: 'action_confirmation'; title: string; description: string; confirmLabel: string; action: WardrobeMutation; garments: WardrobeChatGarment[] }
  | { id: string; kind: 'action_status'; summary: string; applied: boolean }
  | { id: string; kind: 'duplicate'; garmentName: string; category: string; description: string; colors: string[]; tags: string[]; sourceImageUri: string; sourceImageMimeType: string | null; existingGarmentId: string; existingGarmentName: string; existingImageUri: string; matchReason: string; matchConfidence: number; userMessage: string; memoryFacts: string[]; suggestedSectionId: string; suggestedSectionName: string; wearContext: WearContext | null }
  | { id: string; kind: 'confirmation'; title: string; description: string; garmentName: string; tags: string[]; canonicalImageUri: string; userMessage: string; memoryFacts: string[]; suggestedSectionId: string; suggestedSectionName: string; wearContext: WearContext | null };
