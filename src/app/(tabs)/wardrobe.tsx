import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GarmentTile } from '@/components/wardrobe/GarmentTile';
import { getWardrobeSections } from '@/database/repository';
import type { WardrobeSection } from '@/models/wardrobe';
import { colors, radius, spacing } from '@/theme/tokens';

export default function WardrobeScreen() {
  const db = useSQLiteContext();
  const [sections, setSections] = useState<WardrobeSection[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    getWardrobeSections(db).then((result) => { if (active) setSections(result); });
    return () => { active = false; };
  }, [db]));

  const garmentCount = sections.reduce((total, section) => total + section.garments.length, 0);
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

        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <AppText variant="heading">{section.name}</AppText>
                <AppText variant="caption" style={styles.muted}>{section.garments.length} pieces</AppText>
              </View>
              <Pressable accessibilityLabel={`Edit ${section.name}`} hitSlop={10}>
                <Ionicons color={colors.inkMuted} name="ellipsis-horizontal" size={22} />
              </Pressable>
            </View>
            <ScrollView horizontal contentContainerStyle={styles.rail} showsHorizontalScrollIndicator={false}>
              {section.garments.map((garment) => <GarmentTile garment={garment} key={garment.id} />)}
              <Pressable accessibilityLabel={`Add to ${section.name}`} style={styles.addCard}>
                <Ionicons color={colors.moss} name="add" size={28} />
                <AppText variant="caption" style={styles.muted}>Add piece</AppText>
              </Pressable>
            </ScrollView>
          </View>
        ))}
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
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  rail: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  addCard: { alignItems: 'center', borderColor: colors.line, borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 1.5, gap: spacing.xs, height: 234, justifyContent: 'center', width: 112 },
});
