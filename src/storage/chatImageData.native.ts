import { File } from 'expo-file-system';

export async function readChatImageBase64(uri: string) {
  return new File(uri).base64();
}
