import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportBackupFile(contents: string, fileName: string) {
  const directory = new Directory(Paths.cache, 'backups');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, fileName);
  file.create({ overwrite: true, intermediates: true });
  file.write(contents);
  if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { dialogTitle: 'Export Wardrobe backup', mimeType: 'application/json', UTI: 'public.json' });
}

export async function pickBackupFile() {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: 'application/json' });
  if (result.canceled) return null;
  if ((result.assets[0].size ?? 0) > 250 * 1024 * 1024) throw new Error('That backup is larger than the 250 MB restore limit.');
  return new File(result.assets[0].uri).text();
}

export async function readBackupImage(uri: string) {
  try {
    const file = new File(uri);
    return file.exists ? file.base64() : null;
  } catch {
    return null;
  }
}

export async function writeBackupImage(garmentId: string, base64: string) {
  const directory = new Directory(Paths.document, 'wardrobe-garments');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `${garmentId}.png`);
  file.create({ overwrite: true, intermediates: true });
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}
