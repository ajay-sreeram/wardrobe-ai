import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { initializeDatabase } from '@/database';
import { useThemeStore } from '@/state/theme';
import { colors, darkColors, lightColors } from '@/theme/tokens';

function Loading() {
  return <View style={styles.loading}><ActivityIndicator color={colors.moss} /></View>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrateTheme = useThemeStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colorScheme === 'dark' ? darkColors.background : lightColors.background);
  }, [colorScheme]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName="wardrobe.db" onInit={initializeDatabase} useSuspense>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="archived" options={{ presentation: 'modal' }} />
            <Stack.Screen name="garment/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="wear/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="section/[id]" options={{ presentation: 'modal' }} />
          </Stack>
        </SQLiteProvider>
      </Suspense>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
});
