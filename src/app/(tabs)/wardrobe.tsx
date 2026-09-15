import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NestableDraggableFlatList, NestableScrollContainer, ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';

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

  function renderGarment({ item, drag, isActive }: RenderItemParams<WardrobeSection['garments'][number]>) {
    return (
      <ScaleDecorator>
        <GarmentTile
          active={isActive}
          garment={item}
          onLongPress={drag}
          onPress={() => router.push({ pathname: '/garment/[id]', params: { id: item.id } })}
        />
      </ScaleDecorator>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScreenHeader eyebrow={`${garmentCount} pieces · ${sections.length} sections`} title="Wardrobe" />
      <NestableScrollContainer contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!garmentCount ? (
          <View style={styles.intro}>
            <View style={styles.introIcon}><Ionicons color={colors.clay} name="sparkles-outline" size={22} /></View>
            <View style={styles.flex}>
              <AppText variant="label">Your wardrobe is ready</AppText>
              <AppText variant="caption" style={styles.muted}>Add your first garment from Chat and it will appear here.</AppText>
            </View>
          </View>
        ) : null}

        {garmentCount ? <AppText variant="caption" style={styles.hint}>Tap a piece for details. Long press and drag to rearrange it.</AppText> : null}

        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <AppText variant="heading">{section.name}</AppText>
                <AppText variant="caption" style={styles.muted}>{section.garments.length} pieces</AppText>
              </View>
              <Pressable accessibilityLabel={`Edit ${section.name}`} hitSlop={10} onPress={() => router.push({ pathname: '/section/[id]', params: { id: section.id } })}>
                <Ionicons color={colors.inkMuted} name="ellipsis-horizontal" size={22} />
              </Pressable>
            </View>
            <NestableDraggableFlatList
              activationDistance={8}
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
              onDragEnd={({ data }) => finishGarmentDrag(section.id, data)}
              renderItem={renderGarment}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ))}
        <AppButton label="Create a section" onPress={() => router.push({ pathname: '/section/[id]', params: { id: 'new' } })} tone="secondary" style={styles.createSection} />
      </NestableScrollContainer>
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
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  rail: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  railContainer: { height: 234 },
  addCard: { alignItems: 'center', borderColor: colors.line, borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 1.5, gap: spacing.xs, height: 234, justifyContent: 'center', width: 112 },
  createSection: { marginHorizontal: spacing.lg },
});
