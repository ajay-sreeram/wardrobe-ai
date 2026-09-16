import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WearCard } from '@/components/timeline/WearCard';
import { TimelineCalendar } from '@/components/timeline/TimelineCalendar';
import { AppText } from '@/components/ui/AppText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getWearTimeline } from '@/database/repository';
import type { WearEntry } from '@/models/wardrobe';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { spacing, type ThemeColors } from '@/theme/tokens';

export default function TimelineScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const router = useRouter();
  const [entries, setEntries] = useState<WearEntry[]>([]);
  const [viewMode, setViewMode] = useState<'diary' | 'calendar'>('diary');

  useFocusEffect(useCallback(() => {
    let active = true;
    getWearTimeline(db).then((result) => { if (active) setEntries(result); });
    return () => { active = false; };
  }, [db]));

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScreenHeader eyebrow="Your clothing diary" title="Timeline" />
      <View accessibilityLabel="Timeline view" style={styles.viewSwitch}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: viewMode === 'diary' }} onPress={() => setViewMode('diary')} style={[styles.viewOption, viewMode === 'diary' && styles.viewOptionSelected]}>
          <Ionicons color={viewMode === 'diary' ? colors.surface : colors.inkMuted} name="list-outline" size={17} />
          <AppText variant="label" style={viewMode === 'diary' ? styles.viewOptionTextSelected : styles.viewOptionText}>Diary</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: viewMode === 'calendar' }} onPress={() => setViewMode('calendar')} style={[styles.viewOption, viewMode === 'calendar' && styles.viewOptionSelected]}>
          <Ionicons color={viewMode === 'calendar' ? colors.surface : colors.inkMuted} name="calendar-outline" size={17} />
          <AppText variant="label" style={viewMode === 'calendar' ? styles.viewOptionTextSelected : styles.viewOptionText}>Calendar</AppText>
        </Pressable>
      </View>
      {viewMode === 'diary' ? <FlashList
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons color={colors.clay} name="calendar-outline" size={28} /></View>
            <AppText variant="heading">Your clothing diary starts here</AppText>
            <AppText style={styles.emptyText}>Tell the wardrobe assistant what you wore, then confirm the entry in Chat.</AppText>
          </View>
        )}
        renderItem={({ item, index }) => <WearCard entry={item} onPress={() => router.push({ pathname: '/wear/[id]', params: { id: item.id } })} showLine={index < entries.length - 1} />}
      /> : <TimelineCalendar entries={entries} onOpenEntry={(entry) => router.push({ pathname: '/wear/[id]', params: { id: entry.id } })} />}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  viewSwitch: { backgroundColor: colors.surfaceMuted, borderRadius: 999, flexDirection: 'row', marginBottom: spacing.md, marginHorizontal: spacing.lg, padding: 4 },
  viewOption: { alignItems: 'center', borderRadius: 999, flex: 1, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', minHeight: 40 },
  viewOptionSelected: { backgroundColor: colors.moss },
  viewOptionText: { color: colors.inkMuted },
  viewOptionTextSelected: { color: colors.surface },
  content: { paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: 72 },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.claySoft, borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  emptyText: { color: colors.inkMuted, textAlign: 'center' },
});
