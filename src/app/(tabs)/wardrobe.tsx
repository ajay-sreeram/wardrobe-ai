import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';

import { coordinateGarmentReorder } from '@/agents/coordinator';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { Chip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GarmentTile } from '@/components/wardrobe/GarmentTile';
import { getWardrobeSections } from '@/database/repository';
import type { WardrobeSection } from '@/models/wardrobe';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';
import { useChatStore } from '@/state/chat';

type GridSort = 'wardrobe' | 'least-worn' | 'oldest-worn' | 'newest' | 'name';

const gridSorts: { id: GridSort; label: string }[] = [
  { id: 'wardrobe', label: 'Wardrobe order' },
  { id: 'least-worn', label: 'Least worn' },
  { id: 'oldest-worn', label: 'Not worn recently' },
  { id: 'newest', label: 'Newest' },
  { id: 'name', label: 'A–Z' },
];

export default function WardrobeScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const setDraft = useChatStore((state) => state.setDraft);
  const [sections, setSections] = useState<WardrobeSection[]>([]);
  const [organizingSectionId, setOrganizingSectionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'sections' | 'grid'>('sections');
  const [query, setQuery] = useState('');
  const [gridSort, setGridSort] = useState<GridSort>('wardrobe');

  const loadSections = useCallback(async () => setSections(await getWardrobeSections(db)), [db]);

  useFocusEffect(useCallback(() => {
    let active = true;
    getWardrobeSections(db).then((result) => { if (active) setSections(result); });
    return () => { active = false; };
  }, [db]));

  const garmentCount = sections.reduce((total, section) => total + section.garments.length, 0);
  const allGarments = useMemo(() => sections.flatMap((section) => section.garments), [sections]);
  const filteredGarments = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matching = !terms.length ? allGarments : allGarments.filter((garment) => {
      const searchable = [garment.name, garment.description ?? '', ...garment.tags].join(' ').toLocaleLowerCase();
      return terms.every((term) => searchable.includes(term));
    });
    if (gridSort === 'wardrobe') return matching;
    return [...matching].sort((left, right) => {
      if (gridSort === 'least-worn') return left.wearCount - right.wearCount || (left.lastWornAt ?? '').localeCompare(right.lastWornAt ?? '') || left.name.localeCompare(right.name);
      if (gridSort === 'oldest-worn') {
        if (!left.lastWornAt && right.lastWornAt) return -1;
        if (left.lastWornAt && !right.lastWornAt) return 1;
        return (left.lastWornAt ?? '').localeCompare(right.lastWornAt ?? '') || left.name.localeCompare(right.name);
      }
      if (gridSort === 'newest') return right.createdAt.localeCompare(left.createdAt) || left.name.localeCompare(right.name);
      return left.name.localeCompare(right.name);
    });
  }, [allGarments, gridSort, query]);
  const gridColumns = Math.max(2, Math.min(5, Math.floor((width - spacing.lg * 2) / 105)));

  function addToSection(sectionName: string) {
    setDraft(`I want to add a garment to ${sectionName}.`);
    router.push('/(tabs)/chat');
  }

  function askMuseForInsights() {
    setDraft('Give me a few useful wardrobe insights based on what I own, what I wear, and my saved preferences.');
    router.push('/(tabs)/chat');
  }

  async function finishGarmentDrag(sectionId: string, garments: WardrobeSection['garments']) {
    setSections((current) => current.map((section) => section.id === sectionId ? { ...section, garments } : section));
    try {
      await coordinateGarmentReorder(db, sectionId, garments.map((garment) => garment.id));
    } catch {
      await loadSections();
      Alert.alert('Could not reorder', 'Your wardrobe changed while organizing it. Please try again.');
    }
  }

  function renderGarment(sectionId: string, { item, drag, isActive }: RenderItemParams<WardrobeSection['garments'][number]>) {
    return (
      <ScaleDecorator>
        <GarmentTile
          active={isActive}
          garment={item}
          organizing={organizingSectionId === sectionId}
          onLongPress={drag}
          onPress={organizingSectionId ? undefined : () => router.push({ pathname: '/garment/[id]', params: { id: item.id } })}
        />
      </ScaleDecorator>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScreenHeader eyebrow={`${garmentCount} pieces · ${sections.length} sections`} title="Wardrobe" />
      <View accessibilityLabel="Wardrobe view" style={styles.viewSwitch}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: viewMode === 'sections' }} onPress={() => setViewMode('sections')} style={[styles.viewOption, viewMode === 'sections' && styles.viewOptionSelected]}>
          <Ionicons color={viewMode === 'sections' ? colors.surface : colors.inkMuted} name="albums-outline" size={17} />
          <AppText variant="label" style={viewMode === 'sections' ? styles.viewOptionTextSelected : styles.viewOptionText}>Sections</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: viewMode === 'grid' }} onPress={() => { setOrganizingSectionId(null); setViewMode('grid'); }} style={[styles.viewOption, viewMode === 'grid' && styles.viewOptionSelected]}>
          <Ionicons color={viewMode === 'grid' ? colors.surface : colors.inkMuted} name="grid-outline" size={17} />
          <AppText variant="label" style={viewMode === 'grid' ? styles.viewOptionTextSelected : styles.viewOptionText}>All pieces</AppText>
        </Pressable>
      </View>

      {garmentCount ? (
        <Pressable accessibilityHint="Opens Chat with a wardrobe check-in ready" accessibilityRole="button" onPress={askMuseForInsights} style={({ pressed }) => [styles.insightPrompt, pressed && styles.insightPromptPressed]}>
          <View style={styles.introIcon}><Ionicons color={colors.clay} name="analytics-outline" size={22} /></View>
          <View style={styles.flex}>
            <AppText variant="label">Ask Muse for a wardrobe check-in</AppText>
            <AppText variant="caption" style={styles.muted}>Explore wear patterns, pairings, and pieces worth rediscovering.</AppText>
          </View>
          <Ionicons color={colors.inkMuted} name="chevron-forward" size={20} />
        </Pressable>
      ) : null}

      {viewMode === 'sections' ? <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!garmentCount ? (
          <View style={styles.intro}>
            <View style={styles.introIcon}><Ionicons color={colors.clay} name="sparkles-outline" size={22} /></View>
            <View style={styles.flex}>
              <AppText variant="label">Your wardrobe is ready</AppText>
              <AppText variant="caption" style={styles.muted}>Add your first garment from Chat and it will appear here.</AppText>
            </View>
          </View>
        ) : null}

        {garmentCount ? (
          <AppText variant="caption" style={[styles.hint, organizingSectionId && styles.organizingHint]}>
            {organizingSectionId ? 'Organizing wardrobe · drag pieces into the order you want.' : 'Swipe to browse. Tap for details, or long press a piece to organize.'}
          </AppText>
        ) : null}

        {sections.map((section) => (
          <View key={section.id} style={[styles.section, organizingSectionId === section.id && styles.sectionOrganizing]}>
            <View style={[styles.sectionHeader, organizingSectionId === section.id && styles.sectionHeaderOrganizing]}>
              <View>
                <View style={styles.sectionTitleRow}>
                  {organizingSectionId === section.id ? <Ionicons color={colors.clay} name="reorder-three" size={22} /> : null}
                  <AppText variant="heading">{section.name}</AppText>
                </View>
                <AppText variant="caption" style={styles.muted}>{organizingSectionId === section.id ? 'Drag handles are active' : `${section.garments.length} pieces`}</AppText>
              </View>
              {organizingSectionId === section.id ? (
                <Pressable accessibilityLabel="Finish organizing" onPress={() => setOrganizingSectionId(null)} style={styles.doneButton}>
                  <AppText variant="label" style={styles.doneText}>Done</AppText>
                </Pressable>
              ) : (
                <Pressable accessibilityLabel={`Edit ${section.name}`} hitSlop={10} onPress={() => router.push({ pathname: '/section/[id]', params: { id: section.id } })}>
                  <Ionicons color={colors.inkMuted} name="ellipsis-horizontal" size={22} />
                </Pressable>
              )}
            </View>
            <DraggableFlatList
              activationDistance={12}
              containerStyle={styles.railContainer}
              contentContainerStyle={styles.rail}
              data={section.garments}
              horizontal
              keyExtractor={(garment) => garment.id}
              ListFooterComponent={(
                <Pressable accessibilityLabel={`Add to ${section.name}`} onPress={() => addToSection(section.name)} style={styles.addCard}>
                  <Ionicons color={colors.moss} name="add" size={28} />
                  <AppText variant="caption" style={styles.muted}>Add piece</AppText>
                </Pressable>
              )}
              onDragBegin={() => setOrganizingSectionId(section.id)}
              onDragEnd={({ data }) => finishGarmentDrag(section.id, data)}
              renderItem={(params) => renderGarment(section.id, params)}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ))}
        <AppButton label="Create a section" onPress={() => router.push({ pathname: '/section/[id]', params: { id: 'new' } })} tone="secondary" style={styles.createSection} />
      </ScrollView> : (
        <View style={styles.gridView}>
          <View style={styles.searchBox}>
            <Ionicons color={colors.inkMuted} name="search" size={20} />
            <TextInput
              accessibilityLabel="Search wardrobe"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={setQuery}
              placeholder="Search name, tags, or details"
              placeholderTextColor={colors.inkMuted}
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {query ? (
              <Pressable accessibilityLabel="Clear wardrobe search" hitSlop={10} onPress={() => setQuery('')}>
                <Ionicons color={colors.inkMuted} name="close-circle" size={20} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView contentContainerStyle={styles.sortRail} horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroller}>
            {gridSorts.map((sort) => <Chip key={sort.id} label={sort.label} onPress={() => setGridSort(sort.id)} selected={gridSort === sort.id} />)}
          </ScrollView>
          <AppText variant="caption" style={styles.resultCount}>{query.trim() ? `${filteredGarments.length} of ${garmentCount} pieces` : `${garmentCount} pieces`}</AppText>
          <FlashList
            contentContainerStyle={styles.gridContent}
            data={filteredGarments}
            key={`wardrobe-grid-${gridColumns}-${gridSort}`}
            keyExtractor={(garment) => garment.id}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={(
              <View style={styles.gridEmpty}>
                <Ionicons color={colors.clay} name="search-outline" size={28} />
                <AppText variant="heading">No matching pieces</AppText>
                <AppText style={styles.gridEmptyText}>Try a color, garment name, pattern, brand, or another saved tag.</AppText>
              </View>
            )}
            numColumns={gridColumns}
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
                <GarmentTile garment={item} grid onPress={() => router.push({ pathname: '/garment/[id]', params: { id: item.id } })} />
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  viewSwitch: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, flexDirection: 'row', marginBottom: spacing.md, marginHorizontal: spacing.lg, padding: 4 },
  viewOption: { alignItems: 'center', borderRadius: radius.pill, flex: 1, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', minHeight: 40 },
  viewOptionSelected: { backgroundColor: colors.moss },
  viewOptionText: { color: colors.inkMuted },
  viewOptionTextSelected: { color: colors.surface },
  content: { paddingBottom: spacing.xl },
  flex: { flex: 1 },
  intro: { alignItems: 'center', backgroundColor: colors.claySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, marginHorizontal: spacing.lg, padding: spacing.md },
  insightPrompt: { alignItems: 'center', backgroundColor: colors.claySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, marginHorizontal: spacing.lg, padding: spacing.sm },
  insightPromptPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  introIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  muted: { color: colors.inkMuted },
  hint: { color: colors.inkMuted, marginBottom: spacing.md, marginHorizontal: spacing.lg },
  organizingHint: { backgroundColor: colors.claySoft, borderRadius: radius.sm, color: colors.clay, padding: spacing.sm },
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  sectionOrganizing: { backgroundColor: colors.claySoft, borderColor: colors.clay, borderRadius: radius.md, borderWidth: 1, marginHorizontal: spacing.sm, paddingVertical: spacing.sm },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  sectionHeaderOrganizing: { paddingHorizontal: spacing.md },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  doneButton: { backgroundColor: colors.moss, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  doneText: { color: colors.surface },
  rail: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  railContainer: { height: 234 },
  addCard: { alignItems: 'center', borderColor: colors.line, borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 1.5, gap: spacing.xs, height: 234, justifyContent: 'center', width: 112 },
  createSection: { marginHorizontal: spacing.lg },
  gridView: { flex: 1 },
  searchBox: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, minHeight: 46, paddingHorizontal: spacing.md },
  searchInput: { color: colors.ink, flex: 1, fontSize: 16, minHeight: 44 },
  sortScroller: { flexGrow: 0, flexShrink: 0, height: 44 },
  sortRail: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  resultCount: { color: colors.inkMuted, marginHorizontal: spacing.lg, paddingBottom: spacing.xs, paddingTop: spacing.sm },
  gridContent: { paddingBottom: spacing.xl, paddingHorizontal: spacing.md },
  gridItem: { flex: 1, padding: spacing.xs },
  gridEmpty: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: 64 },
  gridEmptyText: { color: colors.inkMuted, textAlign: 'center' },
});
