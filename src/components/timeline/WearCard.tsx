import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { GarmentTile } from '@/components/wardrobe/GarmentTile';
import type { WearEntry } from '@/models/wardrobe';
import { colors, spacing } from '@/theme/tokens';

const dateFormatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });

export function WearCard({ entry, showLine, onPress }: { entry: WearEntry; showLine: boolean; onPress: () => void }) {
  const date = new Date(`${entry.wornAt}T12:00:00`);
  return (
    <View style={styles.row}>
      <View style={styles.markerColumn}>
        <View style={styles.marker} />
        {showLine ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.flex}>
        <AppText variant="caption" style={styles.date}>{dateFormatter.format(date)}</AppText>
        <Pressable accessibilityHint="View or correct this outfit" accessibilityLabel={`${entry.garments.map((garment) => garment.name).join(' and ')}, ${dateFormatter.format(date)}`} accessibilityRole="button" onPress={onPress}>
          {({ pressed }) => (
            <Card style={[styles.card, pressed && styles.pressed]}>
              <View style={styles.thumbnails}>{entry.garments.map((garment) => <GarmentTile compact garment={garment} key={garment.id} />)}</View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <AppText variant="heading" style={styles.title}>{entry.garments.map((garment) => garment.name).join(' + ')}</AppText>
                  <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
                </View>
                {entry.note ? <AppText variant="caption" style={styles.note}>{entry.note}</AppText> : null}
              </View>
            </Card>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  markerColumn: { alignItems: 'center', width: 16 },
  marker: { backgroundColor: colors.clay, borderColor: colors.claySoft, borderRadius: 7, borderWidth: 4, height: 14, marginTop: 3, width: 14 },
  line: { backgroundColor: colors.line, flex: 1, marginVertical: 5, width: 1 },
  flex: { flex: 1, paddingBottom: spacing.lg },
  date: { color: colors.clay, marginBottom: spacing.xs, textTransform: 'uppercase' },
  card: { gap: spacing.md, padding: spacing.sm },
  thumbnails: { flexDirection: 'row', gap: spacing.xs },
  copy: { gap: 4, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  note: { color: colors.inkMuted },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  title: { flex: 1 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
});
