import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { Card } from '@/components/ui/Card';
import { developmentEnv } from '@/config/env';
import { useChatStore } from '@/state/chat';
import { colors, radius, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const clearHistory = useChatStore((state) => state.clearHistory);
  const providerCount = Number(Boolean(developmentEnv.museApiKey)) + Number(Boolean(developmentEnv.geminiApiKey));

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'albums-outline', label: 'Gallery scanning', value: 'Disabled' },
    { icon: 'layers-outline', label: 'Manage sections', value: '4 sections' },
    { icon: 'pricetags-outline', label: 'Manage tags', value: '12 tags' },
    { icon: 'notifications-outline', label: 'Notifications', value: 'Off' },
    { icon: 'shield-checkmark-outline', label: 'Privacy & local data', value: 'On device' },
    { icon: 'sparkles-outline', label: 'AI behavior', value: providerCount ? `${providerCount} dev env` : 'Not connected' },
  ];

  function confirmClearHistory() {
    Alert.alert(
      'Clear chat history?',
      'This removes saved conversations from this device. Your wardrobe, Timeline, generated garment images, and personal memory will stay untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear history', style: 'destructive', onPress: clearHistory },
      ],
    );
  }
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
          {rows.map((row, index) => (
            <View key={row.label} style={[styles.row, index < rows.length - 1 && styles.rowBorder]}>
              <Ionicons color={colors.moss} name={row.icon} size={21} />
              <AppText style={styles.flex}>{row.label}</AppText>
              <AppText variant="caption" style={styles.muted}>{row.value}</AppText>
            </View>
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/archived')}>
          <Card style={styles.chatCard}>
            <View style={styles.localIcon}><Ionicons color={colors.moss} name="archive-outline" size={22} /></View>
            <View style={styles.flex}>
              <AppText variant="label">Archived Pieces</AppText>
              <AppText variant="caption" style={styles.muted}>View and restore garments removed from your active wardrobe.</AppText>
            </View>
            <Ionicons color={colors.inkMuted} name="chevron-forward" size={20} />
          </Card>
        </Pressable>
        <Card style={styles.chatCard}>
          <View style={styles.flex}>
            <AppText variant="label">Chat history</AppText>
            <AppText variant="caption" style={styles.muted}>Remove saved conversations without changing Muse memory or wardrobe data.</AppText>
          </View>
          <AppButton label="Clear" onPress={confirmClearHistory} tone="quiet" />
        </Card>
        <AppText variant="caption" style={styles.footnote}>Development keys load from local-secrets/.env and are bundled temporarily. Do not distribute this build.</AppText>
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
  chatCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 58 },
  rowBorder: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  footnote: { color: colors.inkMuted, paddingHorizontal: spacing.sm, textAlign: 'center' },
});
