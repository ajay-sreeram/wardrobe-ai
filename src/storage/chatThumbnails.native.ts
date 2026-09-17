import { Directory, File, Paths } from 'expo-file-system';

import { createChatThumbnailBase64 } from '@/image/createChatThumbnail';

const thumbnailDirectory = new Directory(Paths.document, 'chat-thumbnails');

export function saveChatThumbnail(sourceBase64: string, id: string) {
  const thumbnail = createChatThumbnailBase64(sourceBase64);
  thumbnailDirectory.create({ idempotent: true, intermediates: true });
  const file = new File(thumbnailDirectory, `${id}.jpg`);
  file.create({ overwrite: true, intermediates: true });
  file.write(thumbnail.base64, { encoding: 'base64' });
  return { uri: file.uri, width: thumbnail.width, height: thumbnail.height };
}

export function clearChatThumbnails() {
  if (thumbnailDirectory.exists) thumbnailDirectory.delete();
}

export function removeChatThumbnail(uri: string | null) {
  if (!uri) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

export function pruneChatThumbnails(retainedUris: string[]) {
  if (!thumbnailDirectory.exists) return;
  const retained = new Set(retainedUris);
  for (const entry of thumbnailDirectory.list()) {
    if (entry instanceof File && !retained.has(entry.uri)) entry.delete();
  }
}
