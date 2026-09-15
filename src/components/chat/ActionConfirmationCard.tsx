import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { coordinateWardrobeMutation } from '@/agents/coordinator';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { ChatMessage } from '@/models/agent';
import { useChatStore } from '@/state/chat';
import { colors, radius, spacing } from '@/theme/tokens';

type ActionMessage = Extract<ChatMessage, { kind: 'action_confirmation' }>;

export function ActionConfirmationCard({ message }: { message: ActionMessage }) {
  const db = useSQLiteContext();
  const replaceMessage = useChatStore((state) => state.replaceMessage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finish(summary: string, applied: boolean) {
    replaceMessage(message.id, { id: message.id, kind: 'action_status', summary, applied });
  }

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      finish(await coordinateWardrobeMutation(db, message.action), true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'I could not apply this change.');
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <AppText variant="caption" style={styles.eyebrow}>Review local change</AppText>
      <AppText variant="heading">{message.title}</AppText>
      {message.garments.length ? (
        <ScrollView contentContainerStyle={styles.rail} horizontal showsHorizontalScrollIndicator={false}>
          {message.garments.map((garment) => (
            <View key={garment.id} style={styles.garment}>
              <View style={styles.imageWrap}>
                {garment.canonicalImage ? <Image contentFit="contain" source={{ uri: garment.canonicalImage }} style={styles.image} /> : <Ionicons color={colors.moss} name="shirt-outline" size={32} />}
              </View>
              <AppText numberOfLines={2} variant="caption">{garment.name}</AppText>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <AppText style={styles.description}>{message.description}</AppText>
      <View style={styles.actions}>
        <AppButton label={message.confirmLabel} loading={saving} onPress={confirm} style={styles.flex} />
        <AppButton disabled={saving} label="Not now" onPress={() => finish(message.title.replace(/\?$/, ''), false)} tone="secondary" style={styles.flex} />
      </View>
      {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.sm, width: '92%' },
  eyebrow: { color: colors.clay, letterSpacing: 0.7, textTransform: 'uppercase' },
  rail: { gap: spacing.sm },
  garment: { gap: spacing.xs, width: 84 },
  imageWrap: { alignItems: 'center', backgroundColor: '#F2F0EA', borderRadius: radius.sm, height: 94, justifyContent: 'center', overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  description: { color: colors.inkMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  error: { color: colors.danger },
});
