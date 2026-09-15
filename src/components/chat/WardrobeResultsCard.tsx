import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { WardrobeChatGarment } from '@/models/agent';
import { colors, radius, spacing } from '@/theme/tokens';

export function WardrobeResultsCard({ garments }: { garments: WardrobeChatGarment[] }) {
  return (
    <Card style={styles.card}>
      <AppText variant="caption" style={styles.eyebrow}>From your wardrobe</AppText>
      <ScrollView horizontal contentContainerStyle={styles.rail} showsHorizontalScrollIndicator={false}>
        {garments.map((garment) => (
          <View key={garment.id} style={styles.garment}>
            <View style={styles.imageWrap}>
              {garment.canonicalImage ? (
                <Image contentFit="contain" source={{ uri: garment.canonicalImage }} style={styles.image} />
              ) : (
                <Ionicons color={colors.moss} name="shirt-outline" size={34} />
              )}
            </View>
            <AppText numberOfLines={2} variant="label">{garment.name}</AppText>
            <AppText numberOfLines={1} variant="caption" style={styles.muted}>{garment.sectionName}</AppText>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.sm, width: '92%' },
  eyebrow: { color: colors.clay, letterSpacing: 0.7, textTransform: 'uppercase' },
  rail: { gap: spacing.sm },
  garment: { gap: 4, width: 112 },
  imageWrap: { alignItems: 'center', backgroundColor: '#F2F0EA', borderRadius: radius.sm, height: 142, justifyContent: 'center', overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  muted: { color: colors.inkMuted },
});
