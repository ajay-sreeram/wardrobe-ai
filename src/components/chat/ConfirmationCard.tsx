import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { colors, radius, spacing } from '@/theme/tokens';

export function ConfirmationCard({ title, description, garmentName, tags }: { title: string; description: string; garmentName: string; tags: string[] }) {
  const [choice, setChoice] = useState<string | null>(null);
  if (choice) {
    return (
      <Card style={styles.complete}>
        <Ionicons color={colors.moss} name="checkmark-circle" size={24} />
        <View style={styles.flex}>
          <AppText variant="label">Saved for this preview</AppText>
          <AppText variant="caption" style={styles.muted}>You chose “{choice}”. No wardrobe data was changed.</AppText>
        </View>
      </Card>
    );
  }
  return (
    <Card style={styles.card}>
      <View style={styles.preview}>
        <View style={styles.previewHalo} />
        <Ionicons color={colors.surface} name="shirt-outline" size={54} />
      </View>
      <AppText variant="caption" style={styles.eyebrow}>Review suggested garment</AppText>
      <AppText variant="heading">{title}</AppText>
      <AppText style={styles.muted}>{description}</AppText>
      <View style={styles.nameRow}>
        <AppText variant="label">{garmentName}</AppText>
        <View style={styles.chips}>{tags.map((tag) => <Chip key={tag} label={tag} />)}</View>
      </View>
      <View style={styles.actions}>
        <AppButton label="Add garment" onPress={() => setChoice('Add garment')} style={styles.flex} />
        <AppButton label="Not mine" onPress={() => setChoice('Not mine')} tone="secondary" style={styles.flex} />
      </View>
      <AppButton label="Already exists" onPress={() => setChoice('Already exists')} tone="quiet" />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.sm, width: '92%' },
  preview: { alignItems: 'center', backgroundColor: '#AAB9C7', borderRadius: radius.sm, height: 146, justifyContent: 'center', overflow: 'hidden' },
  previewHalo: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 100, height: 150, position: 'absolute', width: 150 },
  eyebrow: { color: colors.clay, letterSpacing: 0.7, textTransform: 'uppercase' },
  muted: { color: colors.inkMuted },
  nameRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  complete: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, width: '88%' },
});
