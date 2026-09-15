import { Directory, Paths } from 'expo-file-system';

export function removeLegacyChatImageCopies() {
  const directory = new Directory(Paths.document, 'garment-observations');
  if (directory.exists) directory.delete();
}
