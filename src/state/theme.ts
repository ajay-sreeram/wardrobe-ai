import { create } from 'zustand';

import { readThemePreference, writeThemePreference } from '@/storage/themePreference';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeState = {
  preference: ThemePreference;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  hydrate: async () => {
    const preference = await readThemePreference() ?? 'system';
    set({ preference });
  },
  setPreference: (preference) => {
    writeThemePreference(preference);
    set({ preference });
  },
}));
