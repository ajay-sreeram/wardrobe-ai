import { Appearance } from 'react-native';
import { create } from 'zustand';

import { readThemePreference, writeThemePreference } from '@/storage/themePreference';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeState = {
  preference: ThemePreference;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => void;
};

function applyPreference(preference: ThemePreference) {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  hydrate: async () => {
    const preference = await readThemePreference() ?? 'system';
    applyPreference(preference);
    set({ preference });
  },
  setPreference: (preference) => {
    applyPreference(preference);
    writeThemePreference(preference);
    set({ preference });
  },
}));
