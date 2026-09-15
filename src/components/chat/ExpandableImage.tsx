import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, type StyleProp, StyleSheet, type ViewStyle, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

export function ExpandableImage({ uri, style, badge = 'Tap to view' }: { uri: string; style?: StyleProp<ViewStyle>; badge?: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <Pressable
        accessibilityHint="Opens the full image"
        accessibilityLabel="View garment image"
        accessibilityRole="button"
        onPress={() => setExpanded(true)}
        style={[styles.preview, style]}>
        <Image contentFit="contain" source={{ uri }} style={styles.image} transition={150} />
        <View style={styles.badge}>
          <Ionicons color={colors.surface} name="expand-outline" size={13} />
          <AppText variant="caption" style={styles.badgeText}>{badge}</AppText>
        </View>
      </Pressable>
      <Modal animationType="fade" onRequestClose={() => setExpanded(false)} transparent visible={expanded}>
        <SafeAreaView style={styles.modalOverlay}>
          <Pressable accessibilityLabel="Close full image" onPress={() => setExpanded(false)} style={styles.modalBackdrop} />
          <View style={styles.modalCard}>
            <Image contentFit="contain" source={{ uri }} style={styles.image} transition={150} />
            <Pressable accessibilityLabel="Close full image" hitSlop={10} onPress={() => setExpanded(false)} style={styles.modalClose}>
              <Ionicons color={colors.ink} name="close" size={24} />
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  preview: { backgroundColor: '#E8E7E2', overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  badge: { alignItems: 'center', backgroundColor: 'rgba(30,33,30,0.72)', borderRadius: radius.pill, bottom: spacing.sm, flexDirection: 'row', gap: 5, left: spacing.sm, paddingHorizontal: 9, paddingVertical: 5, position: 'absolute' },
  badgeText: { color: colors.surface },
  modalOverlay: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.md },
  modalBackdrop: { backgroundColor: 'rgba(20,22,20,0.86)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  modalCard: { backgroundColor: '#111311', borderRadius: radius.lg, height: '82%', overflow: 'hidden', width: '100%' },
  modalClose: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', position: 'absolute', right: spacing.sm, top: spacing.sm, width: 44 },
});
