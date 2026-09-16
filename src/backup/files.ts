export async function exportBackupFile(_contents: string, _fileName: string) {
  throw new Error('Backup export is not available on this platform.');
}

export async function pickBackupFile(): Promise<string | null> {
  return null;
}

export async function readBackupImage(_uri: string): Promise<string | null> {
  return null;
}

export async function writeBackupImage(_garmentId: string, _base64: string): Promise<string> {
  throw new Error('Backup image restore is not available on this platform.');
}
