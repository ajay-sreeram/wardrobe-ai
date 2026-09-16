import { Directory, File, Paths } from 'expo-file-system';

import type { ThemePreference } from '@/state/theme';

const directory = new Directory(Paths.document, 'settings');
const file = new File(directory, 'theme.txt');

export async function readThemePreference(): Promise<ThemePreference | null> {
  if (!file.exists) return null;
  const value = await file.text();
  return value === 'light' || value === 'dark' || value === 'system' ? value : null;
}

export function writeThemePreference(preference: ThemePreference) {
  directory.create({ idempotent: true, intermediates: true });
  if (!file.exists) file.create({ intermediates: true });
  file.write(preference);
}
