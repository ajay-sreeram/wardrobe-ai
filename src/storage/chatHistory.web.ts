import type { PersistedChatMessage } from './chatHistory';

const storageKey = 'wardrobe-chat-history';

export async function readChatHistory(): Promise<PersistedChatMessage[]> {
  try {
    if (typeof localStorage === 'undefined') return [];
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(parsed) ? parsed as PersistedChatMessage[] : [];
  } catch {
    return [];
  }
}

export function writeChatHistory(messages: PersistedChatMessage[]) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(messages));
}
