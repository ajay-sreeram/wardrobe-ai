import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { coordinateWearRecord } from '@/agents/coordinator';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { ChatMessage } from '@/models/agent';
import { useChatStore } from '@/state/chat';
import { colors, radius, spacing } from '@/theme/tokens';

type WearConfirmationMessage = Extract<ChatMessage, { kind: 'wear_confirmation' }>;

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function WearConfirmationCard({ message }: { message: WearConfirmationMessage }) {
  const db = useSQLiteContext();
  const replaceMessage = useChatStore((state) => state.replaceMessage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const garmentNames = message.garments.map((garment) => garment.name);
  const date = dateFormatter.format(new Date(`${message.wornAt}T12:00:00`));

  function finish(logged: boolean) {
    replaceMessage(message.id, {
      id: message.id,
      kind: 'wear_status',
      garmentNames,
      wornAt: message.wornAt,
      logged,
    });
  }

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      await coordinateWearRecord(db, {
        garmentIds: message.garmentIds,
        garmentNames,
        wornAt: message.wornAt,
        note: message.note,
      });
      finish(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'I could not log this outfit.');
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <AppText variant="caption" style={styles.eyebrow}>Review wear entry</AppText>
      <AppText variant="heading">Log this outfit for {date}?</AppText>
      <ScrollView horizontal contentContainerStyle={styles.rail} showsHorizontalScrollIndicator={false}>
        {message.garments.map((garment) => (
          <View key={garment.id} style={styles.garment}>
            <View style={styles.imageWrap}>
              {garment.canonicalImage ? (
                <Image contentFit="contain" source={{ uri: garment.canonicalImage }} style={styles.image} />
              ) : (
                <Ionicons color={colors.moss} name="shirt-outline" size={34} />
              )}
            </View>
            <AppText numberOfLines={2} variant="label">{garment.name}</AppText>
          </View>
        ))}
      </ScrollView>
      {message.note ? <AppText style={styles.note}>{message.note}</AppText> : null}
      <View style={styles.actions}>
        <AppButton label="Log outfit" loading={saving} onPress={confirm} style={styles.flex} />
        <AppButton disabled={saving} label="Not now" onPress={() => finish(false)} tone="secondary" style={styles.flex} />
      </View>
      {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.sm, width: '92%' },
  eyebrow: { color: colors.clay, letterSpacing: 0.7, textTransform: 'uppercase' },
  rail: { gap: spacing.sm },
  garment: { gap: spacing.xs, width: 104 },
  imageWrap: { alignItems: 'center', backgroundColor: '#F2F0EA', borderRadius: radius.sm, height: 124, justifyContent: 'center', overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  note: { color: colors.inkMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  error: { color: colors.danger },
});
