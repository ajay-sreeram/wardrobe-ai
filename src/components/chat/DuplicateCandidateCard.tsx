import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { coordinateExistingGarmentReference, coordinateGarmentImageGeneration } from '@/agents/coordinator';
import { ExpandableImage } from '@/components/chat/ExpandableImage';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { developmentEnv } from '@/config/env';
import type { ChatMessage } from '@/models/agent';
import { useChatStore } from '@/state/chat';
import { colors, radius, spacing } from '@/theme/tokens';

type DuplicateMessage = Extract<ChatMessage, { kind: 'duplicate' }>;

export function DuplicateCandidateCard({ message }: { message: DuplicateMessage }) {
  const replaceMessage = useChatStore((state) => state.replaceMessage);
  const [choice, setChoice] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function useExisting() {
    await coordinateExistingGarmentReference({
      garmentId: message.existingGarmentId,
      garmentName: message.existingGarmentName,
      userMessage: message.userMessage,
      memoryFacts: message.memoryFacts,
    });
    setChoice(true);
  }

  async function addAsNew() {
    if (!developmentEnv.geminiApiKey) {
      setError('Gemini is not configured.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const canonicalImageUri = await coordinateGarmentImageGeneration(
        developmentEnv.geminiApiKey,
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
        tags: [message.category, ...message.colors, ...message.tags].filter((tag, index, tags) => tags.indexOf(tag) === index).slice(0, 8),
        canonicalImageUri,
        userMessage: message.userMessage,
        memoryFacts: message.memoryFacts,
        suggestedSectionId: message.suggestedSectionId,
        suggestedSectionName: message.suggestedSectionName,
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
          <AppText variant="caption" style={styles.muted}>No duplicate garment was created.</AppText>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <ExpandableImage badge="Existing wardrobe item" style={styles.preview} uri={message.existingImageUri} />
      <AppText variant="caption" style={styles.eyebrow}>Possible duplicate</AppText>
      <AppText variant="heading">Is this your {message.existingGarmentName}?</AppText>
      <AppText style={styles.muted}>{message.matchReason}</AppText>
      <AppText variant="caption" style={styles.confidence}>{Math.round(message.matchConfidence * 100)}% visual match confidence</AppText>
      <View style={styles.actions}>
        <AppButton disabled={generating} label="Use existing" onPress={useExisting} style={styles.flex} />
        <AppButton label="Add as new" loading={generating} onPress={addAsNew} tone="secondary" style={styles.flex} />
      </View>
      {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.sm, width: '92%' },
  preview: { backgroundColor: '#F2F0EA', borderRadius: radius.sm, height: 220 },
  eyebrow: { color: colors.clay, letterSpacing: 0.7, textTransform: 'uppercase' },
  muted: { color: colors.inkMuted },
  confidence: { color: colors.moss },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  error: { color: colors.danger },
  complete: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, width: '88%' },
});
