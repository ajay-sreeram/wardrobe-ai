import { Directory, File, Paths } from 'expo-file-system';

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
