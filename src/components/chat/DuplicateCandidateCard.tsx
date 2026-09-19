import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { coordinateExistingGarmentReference, coordinateGarmentImageGeneration, coordinateWearRecord } from '@/agents/coordinator';
import { ExpandableImage } from '@/components/chat/ExpandableImage';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { hasApiProxy } from '@/config/providers';
import type { ChatMessage } from '@/models/agent';
import { useChatStore } from '@/state/chat';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

type DuplicateMessage = Extract<ChatMessage, { kind: 'duplicate' }>;

export function DuplicateCandidateCard({ message }: { message: DuplicateMessage }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const db = useSQLiteContext();
  const replaceMessage = useChatStore((state) => state.replaceMessage);
  const [choice, setChoice] = useState(false);
  const [logged, setLogged] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectExisting(logWear = false) {
    setGenerating(true);
    setError(null);
    try {
      await coordinateExistingGarmentReference({
        garmentId: message.existingGarmentId,
        garmentName: message.existingGarmentName,
        userMessage: message.userMessage,
        memoryFacts: message.memoryFacts,
      });
      if (logWear && message.wearContext) {
        await coordinateWearRecord(db, {
          garmentIds: [message.existingGarmentId],
          garmentNames: [message.existingGarmentName],
          wornAt: message.wearContext.wornAt,
          note: message.wearContext.note,
        });
        setLogged(true);
      }
      setChoice(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'I could not use this wardrobe item.');
    } finally {
      setGenerating(false);
    }
  }

  async function addAsNew() {
    if (!hasApiProxy()) {
      setError('The wardrobe assistant is not connected to the API Worker.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const canonicalImageUri = await coordinateGarmentImageGeneration(
        { uri: message.sourceImageUri, mimeType: message.sourceImageMimeType },
        {
          name: message.garmentName,
          category: message.category,
          description: message.description,
          colors: message.colors,
          tags: message.tags,
          confidence: 1,
          sourceImageIndex: 0,
          suggestedSectionName: message.suggestedSectionName,
        },
      );
      replaceMessage(message.id, {
        id: message.id,
        kind: 'confirmation',
        title: 'Add as a new garment?',
        description: message.description,
        garmentName: message.garmentName,
        tags: [message.category, ...message.colors, ...message.tags].filter((tag, index, tags) => tags.indexOf(tag) === index).slice(0, 12),
        canonicalImageUri,
        userMessage: message.userMessage,
        memoryFacts: message.memoryFacts,
        suggestedSectionId: message.suggestedSectionId,
        suggestedSectionName: message.suggestedSectionName,
        wearContext: message.wearContext,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not generate the new garment image.');
    } finally {
      setGenerating(false);
    }
  }

  if (choice) {
    return (
      <Card style={styles.complete}>
        <Ionicons color={colors.moss} name="checkmark-circle" size={24} />
        <View style={styles.flex}>
          <AppText variant="label">Using {message.existingGarmentName}</AppText>
          <AppText variant="caption" style={styles.muted}>{logged ? 'No duplicate was created, and the wear was added to Timeline.' : 'No duplicate garment was created.'}</AppText>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <ExpandableImage
        badge="View full details"
        details={{ name: message.existingGarmentName, description: message.matchReason }}
        onPress={() => router.push({ pathname: '/garment/[id]', params: { id: message.existingGarmentId } })}
        style={styles.preview}
        uri={message.existingImageUri}
      />
      <AppText variant="caption" style={styles.eyebrow}>Close wardrobe match</AppText>
      <AppText variant="heading">Could this be your {message.existingGarmentName}?</AppText>
      <AppText style={styles.muted}>{message.matchReason}</AppText>
      {message.wearContext ? <AppButton label="Use existing & log wear" loading={generating} onPress={() => selectExisting(true)} /> : null}
      <View style={styles.actions}>
        <AppButton disabled={generating} label={message.wearContext ? 'Use only' : 'Use existing'} onPress={() => selectExisting(false)} style={styles.flex} tone={message.wearContext ? 'secondary' : 'primary'} />
        <AppButton label="Add as new" loading={generating} onPress={addAsNew} tone="secondary" style={styles.flex} />
      </View>
      {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
    </Card>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.sm, width: '92%' },
  preview: { backgroundColor: colors.garmentCanvas, borderRadius: radius.sm, height: 220 },
  eyebrow: { color: colors.clay, letterSpacing: 0.7, textTransform: 'uppercase' },
  muted: { color: colors.inkMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  error: { color: colors.danger },
  complete: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, width: '88%' },
});
