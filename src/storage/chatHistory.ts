import type { ChatMessage } from '@/models/agent';

export type PersistedChatMessage = Extract<ChatMessage,
  | { kind: 'text' }
  | { kind: 'error' }
  | { kind: 'wardrobe_results' }
  | { kind: 'wear_status' }
  | { kind: 'action_status' }
>;

export async function readChatHistory(): Promise<PersistedChatMessage[]> {
  return [];
}

export function writeChatHistory(_messages: PersistedChatMessage[]) {}
