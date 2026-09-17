import { createChatThumbnailBase64 } from '@/image/createChatThumbnail';

export function saveChatThumbnail(sourceBase64: string, _id: string) {
  const thumbnail = createChatThumbnailBase64(sourceBase64);
  return { uri: `data:image/jpeg;base64,${thumbnail.base64}`, width: thumbnail.width, height: thumbnail.height };
}

export function clearChatThumbnails() {}
export function removeChatThumbnail(_uri: string | null) {}
export function pruneChatThumbnails(_retainedUris: string[]) {}
