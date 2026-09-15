import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { initializeDatabase } from '@/database';
import { colors } from '@/theme/tokens';

function Loading() {
  return <View style={styles.loading}><ActivityIndicator color={colors.moss} /></View>;
}

export default function RootLayout() {
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName="wardrobe.db" onInit={initializeDatabase} useSuspense>
        <StatusBar style="dark" />
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="garment/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="section/[id]" options={{ presentation: 'modal' }} />
        </Stack>
      </SQLiteProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({ loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' } });
