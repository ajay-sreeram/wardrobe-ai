import type { ThemePreference } from '@/state/theme';

const storageKey = 'wardrobe-theme-preference';

export async function readThemePreference(): Promise<ThemePreference | null> {
  if (typeof localStorage === 'undefined') return null;
  const value = localStorage.getItem(storageKey);
  return value === 'light' || value === 'dark' || value === 'system' ? value : null;
}

export function writeThemePreference(preference: ThemePreference) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, preference);
}
