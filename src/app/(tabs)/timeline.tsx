import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
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
  const [query, setQuery] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    getWearTimeline(db).then((result) => { if (active) setEntries(result); });
    return () => { active = false; };
  }, [db]));

  const filteredEntries = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return entries;
    return entries.filter((entry) => {
      const date = new Date(`${entry.wornAt}T12:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' });
      const searchable = [
        entry.wornAt,
        date,
        entry.note ?? '',
        ...entry.garments.flatMap((garment) => [garment.name, garment.description ?? '', ...garment.tags]),
      ].join(' ').toLocaleLowerCase();
      return terms.every((term) => searchable.includes(term));
    });
  }, [entries, query]);

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
      {viewMode === 'diary' && entries.length ? (
        <View style={styles.searchWrap}>
          <Ionicons color={colors.inkMuted} name="search-outline" size={20} />
          <TextInput
            accessibilityLabel="Search Timeline"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search pieces, occasions, or dates"
            placeholderTextColor={colors.inkMuted}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          {query ? (
            <Pressable accessibilityLabel="Clear Timeline search" hitSlop={10} onPress={() => setQuery('')}>
              <Ionicons color={colors.inkMuted} name="close-circle" size={20} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {viewMode === 'diary' ? <FlashList
        contentContainerStyle={styles.content}
        data={filteredEntries}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons color={colors.clay} name={query ? 'search-outline' : 'calendar-outline'} size={28} /></View>
            <AppText variant="heading">{query ? 'No matching outfits' : 'Your clothing diary starts here'}</AppText>
            <AppText style={styles.emptyText}>{query ? 'Try a garment name, tag, occasion, or a different date.' : 'Tell the wardrobe assistant what you wore, then confirm the entry in Chat.'}</AppText>
          </View>
        )}
        renderItem={({ item, index }) => <WearCard entry={item} onPress={() => router.push({ pathname: '/wear/[id]', params: { id: item.id } })} showLine={index < filteredEntries.length - 1} />}
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
  searchWrap: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, marginHorizontal: spacing.lg, minHeight: 48, paddingHorizontal: spacing.md },
  searchInput: { color: colors.ink, flex: 1, fontSize: 16, minHeight: 46, paddingVertical: 10 },
  content: { paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: 72 },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.claySoft, borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  emptyText: { color: colors.inkMuted, textAlign: 'center' },
});
