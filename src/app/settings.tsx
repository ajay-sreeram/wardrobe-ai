import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/theme/tokens';

const rows = [
  ['albums-outline', 'Gallery scanning', 'Off'],
  ['layers-outline', 'Manage sections', '4 sections'],
  ['pricetags-outline', 'Manage tags', '12 tags'],
  ['notifications-outline', 'Notifications', 'Off'],
  ['shield-checkmark-outline', 'Privacy & local data', 'On device'],
  ['sparkles-outline', 'AI behavior', 'Not connected'],
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption" style={styles.eyebrow}>Private by default</AppText>
          <AppText variant="title">Wardrobe settings</AppText>
        </View>
        <Pressable accessibilityLabel="Close settings" onPress={() => router.back()} style={styles.close}>
          <Ionicons color={colors.ink} name="close" size={24} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.localCard}>
          <View style={styles.localIcon}><Ionicons color={colors.moss} name="phone-portrait-outline" size={22} /></View>
          <View style={styles.flex}>
            <AppText variant="label">Local-first foundation</AppText>
            <AppText variant="caption" style={styles.muted}>Garments, wear history, images, and memory stay on this phone.</AppText>
          </View>
        </Card>
        <View style={styles.group}>
          {rows.map(([icon, label, value], index) => (
            <Pressable key={label} style={[styles.row, index < rows.length - 1 && styles.rowBorder]}>
              <Ionicons color={colors.moss} name={icon} size={21} />
              <AppText style={styles.flex}>{label}</AppText>
              <AppText variant="caption" style={styles.muted}>{value}</AppText>
              <Ionicons color={colors.inkMuted} name="chevron-forward" size={17} />
            </Pressable>
          ))}
        </View>
        <AppText variant="caption" style={styles.footnote}>Live OpenAI and Gemini credentials are intentionally not configured in this milestone.</AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  flex: { flex: 1 },
  eyebrow: { color: colors.clay, letterSpacing: 1, marginBottom: 2, textTransform: 'uppercase' },
  close: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  content: { gap: spacing.lg, padding: spacing.lg },
  localCard: { alignItems: 'center', backgroundColor: colors.mossSoft, flexDirection: 'row', gap: spacing.md },
  localIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 23, height: 46, justifyContent: 'center', width: 46 },
  muted: { color: colors.inkMuted },
  group: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', paddingHorizontal: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 58 },
  rowBorder: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  footnote: { color: colors.inkMuted, paddingHorizontal: spacing.sm, textAlign: 'center' },
});
