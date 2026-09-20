import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { coordinateGarmentBatchAddition, coordinateWearRecord } from '@/agents/coordinator';
import { ExpandableImage } from '@/components/chat/ExpandableImage';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { ChatMessage } from '@/models/agent';
import { useChatStore } from '@/state/chat';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

type BatchMessage = Extract<ChatMessage, { kind: 'garment_batch_confirmation' }>;

export function GarmentBatchConfirmationCard({ message }: { message: BatchMessage }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const addError = useChatStore((state) => state.addError);
  const replaceMessage = useChatStore((state) => state.replaceMessage);
  const [selected, setSelected] = useState(() => message.garments.map((_, index) => index));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(index: number) {
    if (saving) return;
    setSelected((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  }

  async function save(logWear: boolean) {
    const garments = message.garments.filter((_, index) => selected.includes(index));
    if (!garments.length) return;
    setSaving(true);
    setError(null);
    try {
      const savedGarments = await coordinateGarmentBatchAddition({
        db,
        garments: garments.map((garment) => ({
          garmentName: garment.garmentName,
          sectionId: garment.suggestedSectionId,
          sectionName: garment.suggestedSectionName,
          description: garment.description,
          tags: garment.tags,
          canonicalImageUri: garment.canonicalImageUri,
        })),
        userMessage: message.userMessage,
        memoryFacts: message.memoryFacts,
      });
      if (logWear) {
        try {
          await coordinateWearRecord(db, {
            garmentIds: savedGarments.map((garment) => garment.id),
            garmentNames: garments.map((garment) => garment.garmentName),
            wornAt: message.wearContext.wornAt,
            note: message.wearContext.note,
          });
          replaceMessage(message.id, {
            id: message.id,
            kind: 'wear_status',
            garmentNames: savedGarments.map((garment) => garment.name),
            garments: savedGarments.map((garment) => ({ ...garment, wearCount: garment.wearCount + 1, lastWornAt: message.wearContext.wornAt })),
            wornAt: message.wearContext.wornAt,
            logged: true,
          });
        } catch {
          replaceMessage(message.id, { id: message.id, kind: 'wardrobe_results', garments: savedGarments });
          addError('The garments were saved, but I could not add the outfit to Timeline.');
        }
      } else {
        replaceMessage(message.id, { id: message.id, kind: 'wardrobe_results', garments: savedGarments });
      }
    } catch {
      setError('I could not save this outfit locally. Nothing was added to your wardrobe.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <AppText variant="caption" style={styles.eyebrow}>Review worn outfit</AppText>
      <AppText variant="heading">Add these pieces together?</AppText>
      <AppText style={styles.muted}>Keep only the garments that belong to this outfit. They will share one Timeline entry.</AppText>
      <View style={styles.list}>
        {message.garments.map((garment, index) => {
          const included = selected.includes(index);
          return (
            <View key={`${garment.garmentName}-${index}`} style={[styles.garmentRow, !included && styles.excluded]}>
              <ExpandableImage
                badge="View garment details"
                compactBadge
                details={{ name: garment.garmentName, sectionName: garment.suggestedSectionName, description: garment.description, tags: garment.tags }}
                style={styles.preview}
                uri={garment.canonicalImageUri}
              />
              <View style={styles.garmentCopy}>
                <AppText variant="label">{garment.garmentName}</AppText>
                <AppText numberOfLines={2} variant="caption" style={styles.muted}>{garment.description}</AppText>
                <AppText variant="caption" style={styles.section}>{garment.suggestedSectionName}</AppText>
              </View>
              <Pressable
                accessibilityLabel={`${included ? 'Exclude' : 'Include'} ${garment.garmentName}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: included }}
                disabled={saving}
                hitSlop={8}
                onPress={() => toggle(index)}
                style={[styles.check, included && styles.checkSelected]}
              >
                {included ? <Ionicons color={colors.surface} name="checkmark" size={17} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>
      <AppText variant="caption" style={styles.date}>{message.wearContext.wornAt}{message.wearContext.note ? ` · ${message.wearContext.note}` : ''}</AppText>
      <AppButton disabled={!selected.length} label="Add & log as one outfit" loading={saving} onPress={() => save(true)} />
      <View style={styles.actions}>
        <AppButton disabled={!selected.length} label="Add only" loading={saving} onPress={() => save(false)} style={styles.flex} tone="secondary" />
        <AppButton disabled={saving} label="Not mine" onPress={() => replaceMessage(message.id, { id: message.id, kind: 'wear_status', garmentNames: [], wornAt: message.wearContext.wornAt, logged: false })} style={styles.flex} tone="quiet" />
      </View>
      {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
    </Card>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.sm, width: '94%' },
  eyebrow: { color: colors.clay, letterSpacing: 0.7, textTransform: 'uppercase' },
  muted: { color: colors.inkMuted },
  list: { gap: spacing.sm },
  garmentRow: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderColor: colors.line, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.xs },
  excluded: { opacity: 0.48 },
  preview: { backgroundColor: colors.garmentCanvas, borderRadius: radius.sm, height: 88, overflow: 'hidden', width: 68 },
  garmentCopy: { flex: 1, gap: 3 },
  section: { color: colors.moss },
  check: { alignItems: 'center', borderColor: colors.line, borderRadius: 13, borderWidth: 1.5, height: 26, justifyContent: 'center', width: 26 },
  checkSelected: { backgroundColor: colors.moss, borderColor: colors.moss },
  date: { backgroundColor: colors.mossSoft, borderRadius: radius.sm, color: colors.moss, padding: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  error: { color: colors.danger },
});
