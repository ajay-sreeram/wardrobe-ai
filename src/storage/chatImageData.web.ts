export async function readChatImageBase64(uri: string) {
  if (uri.startsWith('data:')) return uri.slice(uri.indexOf(',') + 1);

  const blob = await (await fetch(uri)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(',') + 1));
    reader.readAsDataURL(blob);
  });
}
