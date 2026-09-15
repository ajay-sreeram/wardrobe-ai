import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { coordinateGarmentAddition } from '@/agents/coordinator';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ExpandableImage } from '@/components/chat/ExpandableImage';
import { getWardrobeSectionOptions, type WardrobeSectionOption } from '@/database/repository';
import { colors, radius, spacing } from '@/theme/tokens';

export function ConfirmationCard({ title, description, garmentName, tags, canonicalImageUri, userMessage, memoryFacts }: { title: string; description: string; garmentName: string; tags: string[]; canonicalImageUri: string; userMessage: string; memoryFacts: string[] }) {
  const db = useSQLiteContext();
  const [choice, setChoice] = useState<string | null>(null);
  const [choosingSection, setChoosingSection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null);
  const [sections, setSections] = useState<WardrobeSectionOption[]>([]);

  useEffect(() => {
    let active = true;
    getWardrobeSectionOptions(db).then((result) => { if (active) setSections(result); });
    return () => { active = false; };
  }, [db]);

  async function save(section: WardrobeSectionOption) {
    setError(null);
    setSavingSectionId(section.id);
    try {
      await coordinateGarmentAddition({
        db,
        garmentName,
        sectionId: section.id,
        sectionName: section.name,
        description,
        tags,
        canonicalImageUri,
        userMessage,
        memoryFacts,
      });
      setChoice(`Added to ${section.name}`);
    } catch {
      setError('I could not save this garment locally. Please try again.');
    } finally {
      setSavingSectionId(null);
    }
  }

  if (choice) {
    return (
      <Card style={styles.complete}>
        <Ionicons color={colors.moss} name="checkmark-circle" size={24} />
        <View style={styles.flex}>
          <AppText variant="label">{choice}</AppText>
          <AppText variant="caption" style={styles.muted}>{choice.startsWith('Added') ? 'Saved locally to your wardrobe.' : 'No wardrobe data was changed.'}</AppText>
        </View>
      </Card>
    );
  }
  return (
    <Card style={styles.card}>
      <ExpandableImage badge="Generated wardrobe image" style={styles.preview} uri={canonicalImageUri} />
      <AppText variant="caption" style={styles.eyebrow}>Review suggested garment</AppText>
      <AppText variant="heading">{title}</AppText>
      <AppText style={styles.muted}>{description}</AppText>
      <View style={styles.nameRow}>
        <AppText variant="label">{garmentName}</AppText>
        <View style={styles.chips}>{tags.map((tag) => <Chip key={tag} label={tag} />)}</View>
      </View>
      <View style={styles.actions}>
        <AppButton disabled={Boolean(savingSectionId)} label="Add garment" onPress={() => setChoosingSection(true)} style={styles.flex} />
        <AppButton disabled={Boolean(savingSectionId)} label="Not mine" onPress={() => setChoice('Not mine')} tone="secondary" style={styles.flex} />
      </View>
      <AppButton disabled={Boolean(savingSectionId)} label="Already exists" onPress={() => setChoice('Already exists')} tone="quiet" />
      {choosingSection ? (
        <View style={styles.sectionPicker}>
          <AppText variant="label">Choose a wardrobe section</AppText>
          <View style={styles.sectionActions}>
            {sections.map((section) => (
              <AppButton
                key={section.id}
                disabled={Boolean(savingSectionId)}
                label={section.name}
                loading={savingSectionId === section.id}
                onPress={() => save(section)}
                tone="secondary"
              />
            ))}
          </View>
          {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.sm, width: '92%' },
  preview: { alignItems: 'center', backgroundColor: '#F2F0EA', borderRadius: radius.sm, height: 220, justifyContent: 'center', overflow: 'hidden' },
  eyebrow: { color: colors.clay, letterSpacing: 0.7, textTransform: 'uppercase' },
  muted: { color: colors.inkMuted },
  nameRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  sectionPicker: { borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm, paddingTop: spacing.sm },
  sectionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  error: { color: colors.danger },
  flex: { flex: 1 },
  complete: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, width: '88%' },
});
