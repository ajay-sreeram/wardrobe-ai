import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';

import { coordinateGarmentReorder } from '@/agents/coordinator';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GarmentTile } from '@/components/wardrobe/GarmentTile';
import { getWardrobeSections } from '@/database/repository';
import type { WardrobeSection } from '@/models/wardrobe';
import { colors, radius, spacing } from '@/theme/tokens';
import { useChatStore } from '@/state/chat';

export default function WardrobeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const setDraft = useChatStore((state) => state.setDraft);
  const [sections, setSections] = useState<WardrobeSection[]>([]);
  const [organizingSectionId, setOrganizingSectionId] = useState<string | null>(null);

  const loadSections = useCallback(async () => setSections(await getWardrobeSections(db)), [db]);

  useFocusEffect(useCallback(() => {
    let active = true;
    getWardrobeSections(db).then((result) => { if (active) setSections(result); });
    return () => { active = false; };
  }, [db]));

  const garmentCount = sections.reduce((total, section) => total + section.garments.length, 0);

  function addToSection(sectionName: string) {
    setDraft(`I want to add a garment to ${sectionName}.`);
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: spacing.xl },
  flex: { flex: 1 },
  intro: { alignItems: 'center', backgroundColor: colors.claySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, marginHorizontal: spacing.lg, padding: spacing.md },
  introIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  muted: { color: colors.inkMuted },
  hint: { color: colors.inkMuted, marginBottom: spacing.md, marginHorizontal: spacing.lg },
  organizingHint: { backgroundColor: colors.claySoft, borderRadius: radius.sm, color: colors.clay, padding: spacing.sm },
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  sectionOrganizing: { backgroundColor: 'rgba(241,223,214,0.42)', borderColor: colors.clay, borderRadius: radius.md, borderWidth: 1, marginHorizontal: spacing.sm, paddingVertical: spacing.sm },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  sectionHeaderOrganizing: { paddingHorizontal: spacing.md },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  doneButton: { backgroundColor: colors.moss, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  doneText: { color: colors.surface },
  rail: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  railContainer: { height: 234 },
  addCard: { alignItems: 'center', borderColor: colors.line, borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 1.5, gap: spacing.xs, height: 234, justifyContent: 'center', width: 112 },
  createSection: { marginHorizontal: spacing.lg },
});
