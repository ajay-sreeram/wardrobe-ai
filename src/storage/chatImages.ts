import type { PendingChatImage } from '@/state/chat';

// TypeScript fallback. Metro resolves chatImages.native.ts or chatImages.web.ts.
export async function persistChatImage(image: PendingChatImage) {
  return image.uri;
}
