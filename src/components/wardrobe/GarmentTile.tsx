import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { Garment } from '@/models/wardrobe';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

const swatches = ['#BAC9D8', '#D8CAB6', '#454C50', '#63756A', '#E8E0CE', '#C4B09B'];
const shortDateFormatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });

function gridWearSummary(garment: Garment) {
  if (!garment.lastWornAt) return 'Never worn';
  return `${garment.wearCount}× · ${shortDateFormatter.format(new Date(`${garment.lastWornAt}T12:00:00`))}`;
}

function garmentIcon(tags: string[]): keyof typeof Ionicons.glyphMap {
  if (tags.includes('trousers') || tags.includes('denim')) return 'accessibility-outline';
  if (tags.includes('traditional')) return 'sparkles-outline';
  if (tags.includes('nightwear')) return 'moon-outline';
  return 'shirt-outline';
}

export function GarmentTile({ garment, compact = false, grid = false, active = false, organizing = false, onPress, onLongPress }: { garment: Garment; compact?: boolean; grid?: boolean; active?: boolean; organizing?: boolean; onPress?: () => void; onLongPress?: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const swatch = swatches[garment.name.length % swatches.length];
  return (
    <Pressable
      accessibilityHint={onLongPress ? 'Tap to view details or long press and drag to reorder' : onPress ? 'Tap to view details' : undefined}
      accessibilityLabel={garment.name}
      accessibilityRole={onPress || onLongPress ? 'button' : undefined}
      delayLongPress={350}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, compact && styles.compactCard, grid && styles.gridCard, organizing && styles.organizing, (pressed || active) && (onPress || onLongPress) && styles.pressed, active && styles.active]}>
      <View style={[styles.image, compact && styles.compactImage, grid && styles.gridImage, { backgroundColor: garment.canonicalImage ? colors.garmentCanvas : swatch }]}>
        {garment.canonicalImage ? (
          <Image contentFit="contain" source={{ uri: garment.canonicalImage }} style={styles.canonicalImage} />
        ) : (
          <>
            <View style={styles.halo} />
            <Ionicons color="rgba(255,255,255,0.92)" name={garmentIcon(garment.tags)} size={compact ? 26 : 48} />
          </>
        )}
        {organizing && !compact ? (
          <View style={styles.dragHandle}>
            <Ionicons color={colors.surface} name="reorder-three" size={18} />
          </View>
        ) : null}
      </View>
      {!compact ? (
        <View style={[styles.copy, grid && styles.gridCopy]}>
          <AppText numberOfLines={2} variant="label">{garment.name}</AppText>
          <AppText variant="caption" style={styles.meta}>
            {grid ? gridWearSummary(garment) : garment.lastWornAt ? `Worn ${garment.wearCount}×` : 'Not worn yet'}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', width: 148 },
  compactCard: { borderRadius: radius.sm, width: 58 },
  gridCard: { borderRadius: radius.sm, width: '100%' },
  image: { alignItems: 'center', height: 158, justifyContent: 'center', overflow: 'hidden' },
  compactImage: { height: 58 },
  gridImage: { height: 118 },
  canonicalImage: { height: '100%', width: '100%' },
  halo: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 80, height: 112, position: 'absolute', width: 112 },
  copy: { gap: 4, minHeight: 76, padding: spacing.sm },
  gridCopy: { minHeight: 68, padding: spacing.xs },
  meta: { color: colors.inkMuted },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  active: { opacity: 0.92 },
  organizing: { borderColor: colors.clay, borderWidth: 1.5 },
  dragHandle: { alignItems: 'center', backgroundColor: colors.clay, borderRadius: 16, height: 30, justifyContent: 'center', position: 'absolute', right: spacing.xs, top: spacing.xs, width: 30 },
});
