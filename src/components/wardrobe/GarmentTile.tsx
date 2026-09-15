import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { Garment } from '@/models/wardrobe';
import { colors, radius, spacing } from '@/theme/tokens';

const swatches = ['#BAC9D8', '#D8CAB6', '#454C50', '#63756A', '#E8E0CE', '#C4B09B'];

function garmentIcon(tags: string[]): keyof typeof Ionicons.glyphMap {
  if (tags.includes('trousers') || tags.includes('denim')) return 'accessibility-outline';
  if (tags.includes('traditional')) return 'sparkles-outline';
  if (tags.includes('nightwear')) return 'moon-outline';
  return 'shirt-outline';
}

export function GarmentTile({ garment, compact = false, onLongPress }: { garment: Garment; compact?: boolean; onLongPress?: () => void }) {
  const swatch = swatches[garment.name.length % swatches.length];
  return (
    <Pressable
      accessibilityHint={onLongPress ? 'Long press to view or edit this garment' : undefined}
      accessibilityLabel={garment.name}
      accessibilityRole={onLongPress ? 'button' : undefined}
      delayLongPress={350}
      onLongPress={onLongPress}
      onPress={onLongPress}
      style={({ pressed }) => [styles.card, compact && styles.compactCard, pressed && onLongPress && styles.pressed]}>
      <View style={[styles.image, compact && styles.compactImage, { backgroundColor: garment.canonicalImage ? '#F2F0EA' : swatch }]}>
        {garment.canonicalImage ? (
          <Image contentFit="contain" source={{ uri: garment.canonicalImage }} style={styles.canonicalImage} />
        ) : (
          <>
            <View style={styles.halo} />
            <Ionicons color="rgba(255,255,255,0.92)" name={garmentIcon(garment.tags)} size={compact ? 26 : 48} />
          </>
        )}
      </View>
      {!compact ? (
        <View style={styles.copy}>
          <AppText numberOfLines={2} variant="label">{garment.name}</AppText>
          <AppText variant="caption" style={styles.meta}>
            {garment.lastWornAt ? `Worn ${garment.wearCount}×` : 'Not worn yet'}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', width: 148 },
  compactCard: { borderRadius: radius.sm, width: 58 },
  image: { alignItems: 'center', height: 158, justifyContent: 'center', overflow: 'hidden' },
  compactImage: { height: 58 },
  canonicalImage: { height: '100%', width: '100%' },
  halo: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 80, height: 112, position: 'absolute', width: 112 },
  copy: { gap: 4, minHeight: 76, padding: spacing.sm },
  meta: { color: colors.inkMuted },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
