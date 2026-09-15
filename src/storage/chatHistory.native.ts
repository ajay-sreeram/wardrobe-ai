import { Directory, File, Paths } from 'expo-file-system';

import type { PersistedChatMessage } from './chatHistory';

const historyDirectory = new Directory(Paths.document, 'chat');
const historyFile = new File(historyDirectory, 'history.json');

export async function readChatHistory(): Promise<PersistedChatMessage[]> {
  try {
    if (!historyFile.exists) return [];
    const parsed: unknown = JSON.parse(await historyFile.text());
    return Array.isArray(parsed) ? parsed as PersistedChatMessage[] : [];
  } catch {
    return [];
  }
}

export function writeChatHistory(messages: PersistedChatMessage[]) {
  historyDirectory.create({ idempotent: true, intermediates: true });
  if (!historyFile.exists) historyFile.create({ intermediates: true });
  historyFile.write(JSON.stringify(messages));
}
