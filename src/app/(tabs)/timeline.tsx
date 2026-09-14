import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WearCard } from '@/components/timeline/WearCard';
import { Chip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getWearTimeline } from '@/database/repository';
import type { WearEntry } from '@/models/wardrobe';
import { colors, spacing } from '@/theme/tokens';

export default function TimelineScreen() {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<WearEntry[]>([]);
  const [view, setView] = useState<'Diary' | 'Calendar'>('Diary');

  useFocusEffect(useCallback(() => {
    let active = true;
    getWearTimeline(db).then((result) => { if (active) setEntries(result); });
    return () => { active = false; };
  }, [db]));

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScreenHeader eyebrow="Your clothing diary" title="Timeline" />
      <View style={styles.filters}>
        <Chip label="Diary" onPress={() => setView('Diary')} selected={view === 'Diary'} />
        <Chip label="Calendar" onPress={() => setView('Calendar')} selected={view === 'Calendar'} />
      </View>
      <FlashList
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <WearCard entry={item} showLine={index < entries.length - 1} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  filters: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  content: { paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
});
