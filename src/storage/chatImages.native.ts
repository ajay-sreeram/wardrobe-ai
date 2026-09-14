import { Directory, File, Paths } from 'expo-file-system';

import type { PendingChatImage } from '@/state/chat';

function extensionFor(image: PendingChatImage) {
  const fromName = image.fileName?.match(/\.[A-Za-z0-9]+$/)?.[0];
  if (fromName) return fromName.toLowerCase();
  if (image.mimeType === 'image/png') return '.png';
  if (image.mimeType === 'image/heic') return '.heic';
  return '.jpg';
}

export async function persistChatImage(image: PendingChatImage) {
  const imageDirectory = new Directory(Paths.document, 'garment-observations');
  imageDirectory.create({ idempotent: true, intermediates: true });

  const source = new File(image.uri);
  const destination = new File(imageDirectory, `${image.id}${extensionFor(image)}`);
  await source.copy(destination, { overwrite: true });
  return destination.uri;
}
