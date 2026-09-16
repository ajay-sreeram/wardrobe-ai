import { fromByteArray, toByteArray } from 'base64-js';

export async function exportBackupFile(contents: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > 250 * 1024 * 1024) return reject(new Error('That backup is larger than the 250 MB restore limit.'));
      file.text().then(resolve, reject);
    };
    input.click();
  });
}

export async function readBackupImage(uri: string) {
  try {
    if (uri.startsWith('data:image/')) return uri.slice(uri.indexOf(',') + 1);
    const response = await fetch(uri);
    if (!response.ok) return null;
    return fromByteArray(new Uint8Array(await response.arrayBuffer()));
  } catch {
    return null;
  }
}

export async function writeBackupImage(_garmentId: string, base64: string) {
  toByteArray(base64);
  return `data:image/png;base64,${base64}`;
}
