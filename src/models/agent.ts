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

export type ChatMessage =
  | { id: string; kind: 'text'; role: 'assistant' | 'user'; text: string }
  | { id: string; kind: 'image'; role: 'user'; uri: string; width: number; height: number }
  | { id: string; kind: 'status'; stage: AgentStage; text: string }
  | { id: string; kind: 'error'; text: string }
  | { id: string; kind: 'confirmation'; title: string; description: string; garmentName: string; tags: string[]; sourceImageUri?: string };
