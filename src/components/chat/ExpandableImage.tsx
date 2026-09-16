import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, type StyleProp, StyleSheet, type ViewStyle, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

type GarmentPreviewDetails = {
  name: string;
  sectionName?: string;
  description?: string | null;
  tags?: string[];
};

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  badge?: string;
  details?: GarmentPreviewDetails;
  onPress?: () => void;
};

export function ExpandableImage({ uri, style, badge = 'Tap to view', details, onPress }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(false);
  const open = onPress ?? (() => setExpanded(true));
  return (
    <>
      <Pressable
        accessibilityHint={onPress ? 'Opens the full garment details' : 'Opens the full image and garment details'}
        accessibilityLabel={details ? `View ${details.name}` : 'View garment image'}
        accessibilityRole="button"
        onPress={open}
        style={[styles.preview, style]}>
        <Image contentFit="contain" source={{ uri }} style={styles.image} transition={150} />
        <View style={styles.badge}>
          <Ionicons color={colors.surface} name="expand-outline" size={13} />
          <AppText variant="caption" style={styles.badgeText}>{badge}</AppText>
        </View>
      </Pressable>
      <Modal animationType="fade" onRequestClose={() => setExpanded(false)} transparent visible={expanded && !onPress}>
        <SafeAreaView style={styles.modalOverlay}>
          <Pressable accessibilityLabel="Close full image" onPress={() => setExpanded(false)} style={styles.modalBackdrop} />
          <View style={[styles.modalCard, !details && styles.imageOnlyCard]}>
            <View style={[styles.fullImageWrap, !details && styles.imageOnlyWrap]}>
              <Image contentFit="contain" source={{ uri }} style={styles.image} transition={150} />
            </View>
            {details ? (
              <ScrollView contentContainerStyle={styles.details} showsVerticalScrollIndicator={false}>
                <View style={styles.detailsHeading}>
                  <View style={styles.detailsTitle}>
                    <AppText variant="caption" style={styles.eyebrow}>Garment details</AppText>
                    <AppText variant="title">{details.name}</AppText>
                  </View>
                  {details.sectionName ? <AppText variant="caption" style={styles.section}>{details.sectionName}</AppText> : null}
                </View>
                {details.description ? <AppText style={styles.description}>{details.description}</AppText> : null}
                {details.tags?.length ? (
                  <View style={styles.tags}>
                    {details.tags.map((tag) => (
                      <View key={tag} style={styles.tag}><AppText variant="caption" style={styles.tagText}>{tag}</AppText></View>
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
            <Pressable accessibilityLabel="Close full image" hitSlop={10} onPress={() => setExpanded(false)} style={styles.modalClose}>
              <Ionicons color={colors.ink} name="close" size={24} />
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  preview: { backgroundColor: '#E8E7E2', overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  badge: { alignItems: 'center', backgroundColor: 'rgba(30,33,30,0.72)', borderRadius: radius.pill, bottom: spacing.sm, flexDirection: 'row', gap: 5, left: spacing.sm, paddingHorizontal: 9, paddingVertical: 5, position: 'absolute' },
  badgeText: { color: colors.surface },
  modalOverlay: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.md },
  modalBackdrop: { backgroundColor: colors.background, bottom: 0, left: 0, opacity: 0.97, position: 'absolute', right: 0, top: 0 },
  modalCard: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, maxHeight: '90%', overflow: 'hidden', width: '100%' },
  imageOnlyCard: { height: '82%' },
  fullImageWrap: { backgroundColor: '#F2F0EA', height: 430, width: '100%' },
  imageOnlyWrap: { flex: 1, height: undefined },
  details: { gap: spacing.md, padding: spacing.lg },
  detailsHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  detailsTitle: { flex: 1 },
  eyebrow: { color: colors.clay, letterSpacing: 0.8, marginBottom: 2, textTransform: 'uppercase' },
  section: { backgroundColor: colors.mossSoft, borderRadius: radius.pill, color: colors.moss, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
  description: { color: colors.inkMuted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 7 },
  tagText: { color: colors.inkMuted },
  modalClose: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', position: 'absolute', right: spacing.sm, top: spacing.sm, width: 44 },
});
