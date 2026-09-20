import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { initializeDatabase } from '@/database';
import { AppThemeProvider, useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import type { ThemeColors } from '@/theme/tokens';

function Loading() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.loading}><ActivityIndicator color={colors.moss} /></View>;
}

function ThemedRootLayout() {
  const { colors, isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <GestureHandlerRootView style={styles.flex}>
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName="wardrobe.db" onInit={initializeDatabase} useSuspense>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="privacy" options={{ presentation: 'modal' }} />
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

export default function RootLayout() {
  return <AppThemeProvider><ThemedRootLayout /></AppThemeProvider>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
});
