import type { PendingChatImage } from '@/state/chat';

export async function persistChatImage(image: PendingChatImage) {
  return image.uri;
}
