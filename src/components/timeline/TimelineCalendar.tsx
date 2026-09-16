import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { WearEntry } from '@/models/wardrobe';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const monthFormatter = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });
const selectedDateFormatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' });

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function OutfitRow({ entry, onPress }: { entry: WearEntry; onPress: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable accessibilityHint="View or correct this outfit" accessibilityLabel={entry.garments.map((garment) => garment.name).join(' and ')} accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.outfitCard, pressed && styles.pressed]}>
          <View style={styles.outfitImages}>
            {entry.garments.slice(0, 3).map((garment) => (
              <View key={garment.id} style={styles.outfitImageWrap}>
                {garment.canonicalImage ? <Image contentFit="contain" source={{ uri: garment.canonicalImage }} style={styles.outfitImage} /> : <Ionicons color={colors.moss} name="shirt-outline" size={24} />}
              </View>
            ))}
            {entry.garments.length > 3 ? <AppText variant="caption" style={styles.more}>+{entry.garments.length - 3}</AppText> : null}
          </View>
          <View style={styles.outfitCopy}>
            <AppText numberOfLines={2} variant="label">{entry.garments.map((garment) => garment.name).join(' + ')}</AppText>
            {entry.note ? <AppText numberOfLines={2} variant="caption" style={styles.muted}>{entry.note}</AppText> : null}
          </View>
          <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
        </Card>
      )}
    </Pressable>
  );
}

export function TimelineCalendar({ entries, onOpenEntry }: { entries: WearEntry[]; onOpenEntry: (entry: WearEntry) => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const initialized = useRef(false);
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (initialized.current || !entries.length) return;
    const latest = dateFromKey(entries[0].wornAt);
    setVisibleMonth(new Date(latest.getFullYear(), latest.getMonth(), 1));
    setSelectedDate(entries[0].wornAt);
    initialized.current = true;
  }, [entries]);

  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, WearEntry[]>();
    for (const entry of entries) grouped.set(entry.wornAt, [...(grouped.get(entry.wornAt) ?? []), entry]);
    return grouped;
  }, [entries]);

  const cells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const leading = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const count = Math.ceil((leading + days) / 7) * 7;
    return Array.from({ length: count }, (_, index) => {
      const day = index - leading + 1;
      return day >= 1 && day <= days ? day : null;
    });
  }, [visibleMonth]);

  const activeSelectedDate = selectedDate && entriesByDate.has(selectedDate) ? selectedDate : null;
  const selectedEntries = activeSelectedDate ? entriesByDate.get(activeSelectedDate) ?? [] : [];

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setSelectedDate(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable accessibilityLabel="Previous month" hitSlop={10} onPress={() => moveMonth(-1)} style={styles.monthButton}>
            <Ionicons color={colors.ink} name="chevron-back" size={20} />
          </Pressable>
          <AppText variant="heading">{monthFormatter.format(visibleMonth)}</AppText>
          <Pressable accessibilityLabel="Next month" hitSlop={10} onPress={() => moveMonth(1)} style={styles.monthButton}>
            <Ionicons color={colors.ink} name="chevron-forward" size={20} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {weekdays.map((weekday, index) => <AppText key={`${weekday}-${index}`} variant="caption" style={styles.weekday}>{weekday}</AppText>)}
        </View>
        <View style={styles.days}>
          {cells.map((day, index) => {
            if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
            const key = dateKey(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
            const dayEntries = entriesByDate.get(key) ?? [];
            const selected = activeSelectedDate === key;
            const preview = dayEntries[0]?.garments[0];
            return (
              <View key={key} style={styles.dayCell}>
                <Pressable
                  accessibilityLabel={`${selectedDateFormatter.format(dateFromKey(key))}${dayEntries.length ? `, ${dayEntries.length} logged ${dayEntries.length === 1 ? 'outfit' : 'outfits'}` : ', no logged outfit'}`}
                  accessibilityRole={dayEntries.length ? 'button' : undefined}
                  disabled={!dayEntries.length}
                  onPress={() => setSelectedDate(key)}
                  style={[styles.day, dayEntries.length > 0 && styles.dayWithEntry, selected && styles.daySelected]}>
                  <AppText variant="caption" style={[styles.dayNumber, selected && styles.dayNumberSelected]}>{day}</AppText>
                  {preview?.canonicalImage ? <Image contentFit="contain" source={{ uri: preview.canonicalImage }} style={styles.dayImage} /> : dayEntries.length ? <View style={[styles.dayDot, selected && styles.dayDotSelected]} /> : null}
                  {dayEntries.length > 1 ? <View style={styles.countBadge}><AppText variant="caption" style={styles.countText}>{dayEntries.length}</AppText></View> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      </Card>

      {activeSelectedDate ? (
        <View style={styles.selectedSection}>
          <AppText variant="heading">{selectedDateFormatter.format(dateFromKey(activeSelectedDate))}</AppText>
          {selectedEntries.map((entry) => <OutfitRow entry={entry} key={entry.id} onPress={() => onOpenEntry(entry)} />)}
        </View>
      ) : (
        <View style={styles.hint}>
          <Ionicons color={colors.clay} name="calendar-outline" size={22} />
          <AppText variant="caption" style={styles.muted}>{entries.length ? 'Choose a marked day to see what you wore.' : 'Logged outfits will appear on their calendar days.'}</AppText>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  calendarCard: { alignSelf: 'center', maxWidth: 560, padding: spacing.sm, width: '100%' },
  monthHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.xs },
  monthButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  weekRow: { flexDirection: 'row', paddingTop: spacing.sm },
  weekday: { color: colors.inkMuted, textAlign: 'center', width: `${100 / 7}%` },
  days: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: spacing.xs },
  dayCell: { aspectRatio: 0.86, padding: 2, width: `${100 / 7}%` },
  day: { alignItems: 'center', borderColor: 'transparent', borderRadius: radius.sm, borderWidth: 1, flex: 1, gap: 2, justifyContent: 'center' },
  dayWithEntry: { backgroundColor: colors.claySoft, borderColor: colors.clay },
  daySelected: { backgroundColor: colors.moss, borderColor: colors.moss },
  dayNumber: { color: colors.inkMuted },
  dayNumberSelected: { color: colors.surface },
  dayImage: { height: 24, width: 24 },
  dayDot: { backgroundColor: colors.clay, borderRadius: 3, height: 6, width: 6 },
  dayDotSelected: { backgroundColor: colors.surface },
  countBadge: { alignItems: 'center', backgroundColor: colors.clay, borderRadius: 8, height: 16, justifyContent: 'center', position: 'absolute', right: 2, top: 2, width: 16 },
  countText: { color: colors.surface, fontSize: 9, lineHeight: 11 },
  selectedSection: { alignSelf: 'center', gap: spacing.sm, maxWidth: 560, width: '100%' },
  outfitCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  outfitImages: { alignItems: 'center', flexDirection: 'row' },
  outfitImageWrap: { alignItems: 'center', backgroundColor: colors.garmentCanvas, borderColor: colors.surface, borderRadius: radius.sm, borderWidth: 2, height: 52, justifyContent: 'center', marginRight: -10, overflow: 'hidden', width: 44 },
  outfitImage: { height: '100%', width: '100%' },
  more: { color: colors.inkMuted, marginLeft: spacing.sm },
  outfitCopy: { flex: 1, gap: 2 },
  muted: { color: colors.inkMuted },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  hint: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.claySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, maxWidth: 560, padding: spacing.md, width: '100%' },
});
