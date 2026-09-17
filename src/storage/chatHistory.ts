import type { ChatMessage } from '@/models/agent';

export type PersistedChatMessage = Extract<ChatMessage,
  | { kind: 'text' }
  | { kind: 'image' }
  | { kind: 'error' }
  | { kind: 'conversation_boundary' }
  | { kind: 'wardrobe_results' }
  | { kind: 'outfit_suggestion' }
  | { kind: 'wardrobe_insight' }
  | { kind: 'wear_status' }
  | { kind: 'action_status' }
>;

export async function readChatHistory(): Promise<PersistedChatMessage[]> {
  return [];
}

export function writeChatHistory(_messages: PersistedChatMessage[]) {}
