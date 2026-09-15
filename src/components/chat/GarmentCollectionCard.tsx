import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { WardrobeChatGarment } from '@/models/agent';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  description?: string;
  eyebrow: string;
  garments: WardrobeChatGarment[];
  title?: string;
};

export function GarmentCollectionCard({ description, eyebrow, garments, title }: Props) {
  const router = useRouter();
  return (
    <Card style={styles.card}>
      <AppText variant="caption" style={styles.eyebrow}>{eyebrow}</AppText>
      {title ? <AppText variant="heading">{title}</AppText> : null}
      <ScrollView horizontal contentContainerStyle={styles.rail} showsHorizontalScrollIndicator={false}>
        {garments.map((garment) => (
          <Pressable accessibilityHint="Opens garment details" accessibilityRole="button" key={garment.id} onPress={() => router.push(`/garment/${garment.id}`)} style={({ pressed }) => [styles.garment, pressed && styles.pressed]}>
            <View style={styles.imageWrap}>
              {garment.canonicalImage ? (
                <Image contentFit="contain" source={{ uri: garment.canonicalImage }} style={styles.image} />
              ) : (
                <Ionicons color={colors.moss} name="shirt-outline" size={34} />
              )}
            </View>
            <AppText numberOfLines={2} variant="label">{garment.name}</AppText>
            <AppText numberOfLines={1} variant="caption" style={styles.muted}>{garment.sectionName}</AppText>
          </Pressable>
        ))}
      </ScrollView>
      {description ? <AppText style={styles.description}>{description}</AppText> : null}
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
  description: { color: colors.inkMuted, lineHeight: 21 },
  pressed: { opacity: 0.75 },
});
