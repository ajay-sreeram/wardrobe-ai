import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { coordinateGarmentAddition, coordinateWearRecord } from '@/agents/coordinator';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ExpandableImage } from '@/components/chat/ExpandableImage';
import type { ChatMessage } from '@/models/agent';
import { colors, radius, spacing } from '@/theme/tokens';

type ConfirmationMessage = Extract<ChatMessage, { kind: 'confirmation' }>;

export function ConfirmationCard({ title, description, garmentName, tags, canonicalImageUri, userMessage, memoryFacts, suggestedSectionId, suggestedSectionName, wearContext }: ConfirmationMessage) {
  const db = useSQLiteContext();
  const [choice, setChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(logWear = false) {
    setError(null);
    setSaving(true);
    try {
      const garmentId = await coordinateGarmentAddition({
        db,
        garmentName,
        sectionId: suggestedSectionId,
        sectionName: suggestedSectionName,
        description,
        tags,
        canonicalImageUri,
        userMessage,
        memoryFacts,
      });
      if (logWear && wearContext) {
        try {
          await coordinateWearRecord(db, {
            garmentIds: [garmentId],
            garmentNames: [garmentName],
            wornAt: wearContext.wornAt,
            note: wearContext.note,
          });
          setChoice(`Added to ${suggestedSectionName} and Timeline`);
        } catch {
          setChoice(`Added to ${suggestedSectionName}`);
          setError('The garment was saved, but I could not add the wear entry to Timeline.');
        }
      } else {
        setChoice(`Added to ${suggestedSectionName}`);
      }
    } catch {
      setError('I could not save this garment locally. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (choice) {
    return (
      <Card style={styles.complete}>
        <Ionicons color={colors.moss} name="checkmark-circle" size={24} />
        <View style={styles.flex}>
          <AppText variant="label">{choice}</AppText>
          <AppText variant="caption" style={error ? styles.error : styles.muted}>{error ?? (choice.startsWith('Added') ? 'Saved locally to your wardrobe.' : 'No wardrobe data was changed.')}</AppText>
        </View>
      </Card>
    );
  }
  return (
    <Card style={styles.card}>
      <ExpandableImage
        badge="View garment details"
        details={{ name: garmentName, sectionName: suggestedSectionName, description, tags }}
        style={styles.preview}
        uri={canonicalImageUri}
      />
      <AppText variant="caption" style={styles.eyebrow}>Review suggested garment</AppText>
      <AppText variant="heading">{title}</AppText>
      <AppText style={styles.muted}>{description}</AppText>
      <View style={styles.nameRow}>
        <AppText variant="label">{garmentName}</AppText>
        <AppText variant="caption" style={styles.sectionSuggestion}>Suggested section · {suggestedSectionName}</AppText>
        <View style={styles.chips}>{tags.map((tag) => <Chip key={tag} label={tag} />)}</View>
      </View>
      {wearContext ? <AppButton label="Add & log wear" loading={saving} onPress={() => save(true)} /> : null}
      <View style={styles.actions}>
        <AppButton label={wearContext ? 'Add only' : `Add to ${suggestedSectionName}`} loading={saving} onPress={() => save(false)} style={styles.flex} tone={wearContext ? 'secondary' : 'primary'} />
        <AppButton disabled={saving} label="Not mine" onPress={() => setChoice('Not mine')} tone="secondary" style={styles.flex} />
      </View>
      <AppButton disabled={saving} label="Already exists" onPress={() => setChoice('Already exists')} tone="quiet" />
      {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.sm, width: '92%' },
  preview: { alignItems: 'center', backgroundColor: '#F2F0EA', borderRadius: radius.sm, height: 220, justifyContent: 'center', overflow: 'hidden' },
  eyebrow: { color: colors.clay, letterSpacing: 0.7, textTransform: 'uppercase' },
  muted: { color: colors.inkMuted },
  nameRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  sectionSuggestion: { color: colors.moss },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  error: { color: colors.danger },
  flex: { flex: 1 },
  complete: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, width: '88%' },
});
