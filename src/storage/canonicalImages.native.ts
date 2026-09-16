import { Directory, File, Paths } from 'expo-file-system';

import { cleanTransparentPngBase64 } from '@/image/removeFlatBackground';

const CUTOUT_CLEANUP_VERSION = 'cutout-despill-v1';

export function saveGeneratedGarmentPreview(base64: string, id: string) {
  const directory = new Directory(Paths.cache, 'generated-garment-previews');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `${id}.png`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

export async function persistCanonicalGarmentImage(previewUri: string, garmentId: string) {
  const directory = new Directory(Paths.document, 'wardrobe-garments');
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, `${garmentId}.png`);
  await new File(previewUri).copy(destination, { overwrite: true });
  return destination.uri;
}

export async function cleanCanonicalGarmentImages() {
  const settingsDirectory = new Directory(Paths.document, 'settings');
  const marker = new File(settingsDirectory, CUTOUT_CLEANUP_VERSION);
  if (marker.exists) return;

  const garmentDirectory = new Directory(Paths.document, 'wardrobe-garments');
  if (garmentDirectory.exists) {
    for (const entry of garmentDirectory.list()) {
      if (!(entry instanceof File) || !entry.name.toLowerCase().endsWith('.png')) continue;
      try {
        const cleaned = cleanTransparentPngBase64(await entry.base64());
        entry.write(cleaned, { encoding: 'base64' });
      } catch {
        // One unreadable image should not block the wardrobe from opening.
      }
    }
  }

  settingsDirectory.create({ idempotent: true, intermediates: true });
  marker.create({ overwrite: true });
  marker.write(new Date().toISOString());
}
