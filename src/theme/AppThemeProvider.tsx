import * as SystemUI from 'expo-system-ui';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/state/theme';
import { darkColors, lightColors, type ThemeColors } from '@/theme/tokens';

type AppTheme = {
  colors: ThemeColors;
  isDark: boolean;
};

const ThemeContext = createContext<AppTheme>({ colors: lightColors, isDark: false });

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const hydrate = useThemeStore((state) => state.hydrate);
  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const value = useMemo(() => ({ colors, isDark }), [colors, isDark]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

export function useThemedStyles<Styles>(factory: (colors: ThemeColors) => Styles) {
  const { colors } = useAppTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
