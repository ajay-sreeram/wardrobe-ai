import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { chooseWardrobeBackup, createWardrobeBackup, restoreWardrobeBackup, type WardrobeBackup } from '@/backup';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { hasApiProxy } from '@/config/providers';
import { getWardrobeSections } from '@/database/repository';
import { useChatStore } from '@/state/chat';
import { useThemeStore, type ThemePreference } from '@/state/theme';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const db = useSQLiteContext();
  const clearHistory = useChatStore((state) => state.clearHistory);
  const hydrateHistory = useChatStore((state) => state.hydrateHistory);
  const themePreference = useThemeStore((state) => state.preference);
  const setThemePreference = useThemeStore((state) => state.setPreference);
  const [backupBusy, setBackupBusy] = useState<'export' | 'restore' | null>(null);
  const [wardrobeCounts, setWardrobeCounts] = useState({ sections: 0, tags: 0 });

  useFocusEffect(useCallback(() => {
    let active = true;
    getWardrobeSections(db).then((sections) => {
      if (!active) return;
      const tags = new Set(sections.flatMap((section) => section.garments.flatMap((garment) => garment.tags.map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean))));
      setWardrobeCounts({ sections: sections.length, tags: tags.size });
    }).catch(() => {
      if (active) setWardrobeCounts({ sections: 0, tags: 0 });
    });
    return () => { active = false; };
  }, [db]));

  const wardrobeRows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress: () => void }[] = [
    {
      icon: 'layers-outline',
      label: 'Manage sections',
      value: `${wardrobeCounts.sections} ${wardrobeCounts.sections === 1 ? 'section' : 'sections'}`,
      onPress: () => router.replace({ pathname: '/(tabs)/wardrobe', params: { view: 'sections' } }),
    },
    {
      icon: 'pricetags-outline',
      label: 'Browse & edit tags',
      value: `${wardrobeCounts.tags} ${wardrobeCounts.tags === 1 ? 'tag' : 'tags'}`,
      onPress: () => router.replace({ pathname: '/(tabs)/wardrobe', params: { view: 'grid' } }),
    },
  ];
  const museRows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'sparkles-outline', label: 'Muse API', value: hasApiProxy() ? 'Worker connected' : 'Not connected' },
    { icon: 'albums-outline', label: 'Gallery scanning', value: 'Disabled' },
    { icon: 'notifications-outline', label: 'Notifications', value: 'Off' },
  ];

  function confirmClearHistory() {
    Alert.alert(
      'Clear chat history?',
      'This removes saved conversations and compressed attachment previews from this device. Your wardrobe, Timeline, generated garment images, and personal memory will stay untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear history', style: 'destructive', onPress: clearHistory },
      ],
    );
  }

  async function exportBackup() {
    setBackupBusy('export');
    try {
      const result = await createWardrobeBackup(db);
      Alert.alert('Backup ready', `Exported ${result.garmentCount} garments and ${result.wearCount} Timeline entries.`);
    } catch (cause) {
      Alert.alert('Could not export backup', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBackupBusy(null);
    }
  }

  async function restoreSelectedBackup(backup: WardrobeBackup) {
    setBackupBusy('restore');
    try {
      await restoreWardrobeBackup(db, backup);
      await hydrateHistory();
      Alert.alert('Backup restored', 'Wardrobe, Timeline, memory, Chat history, and generated images are restored.');
    } catch (cause) {
      Alert.alert('Could not restore backup', cause instanceof Error ? cause.message : 'Please keep the app open and try again.');
    } finally {
      setBackupBusy(null);
    }
  }

  async function chooseBackup() {
    try {
      const backup = await chooseWardrobeBackup();
      if (!backup) return;
      const created = new Date(backup.createdAt).toLocaleString();
      Alert.alert(
        'Replace local wardrobe data?',
        `Backup from ${created}\n${backup.garments.length} garments · ${backup.wears.length} Timeline entries\n\nThis replaces the current local wardrobe, Timeline, memory, and Chat history.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restore backup', style: 'destructive', onPress: () => { void restoreSelectedBackup(backup); } },
        ],
      );
    } catch (cause) {
      Alert.alert('Could not read backup', cause instanceof Error ? cause.message : 'Choose a valid Wardrobe backup.');
    }
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
        <AppText variant="caption" style={styles.sectionTitle}>Appearance</AppText>
        <Card style={styles.themeCard}>
          <View>
            <AppText variant="label">Color theme</AppText>
            <AppText variant="caption" style={styles.muted}>Follow this iPhone or keep Muse in your preferred theme.</AppText>
          </View>
          <View accessibilityRole="radiogroup" style={styles.themeOptions}>
            {([
              ['system', 'Phone'],
              ['light', 'Light'],
              ['dark', 'Dark'],
            ] as [ThemePreference, string][]).map(([value, label]) => (
              <Chip key={value} label={label} onPress={() => setThemePreference(value)} selected={themePreference === value} />
            ))}
          </View>
        </Card>

        <AppText variant="caption" style={styles.sectionTitle}>Wardrobe</AppText>
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
        <View style={styles.group}>
          {wardrobeRows.map((row, index) => (
            <Pressable
              accessibilityHint={row.label === 'Manage sections' ? 'Opens the section view of your wardrobe' : 'Opens all pieces, where garment tags can be searched and edited'}
              accessibilityRole="button"
              key={row.label}
              onPress={row.onPress}
              style={({ pressed }) => [styles.row, index < wardrobeRows.length - 1 && styles.rowBorder, pressed && styles.rowPressed]}>
              <Ionicons color={colors.moss} name={row.icon} size={21} />
              <AppText style={styles.flex}>{row.label}</AppText>
              <AppText variant="caption" style={styles.muted}>{row.value}</AppText>
              <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
            </Pressable>
          ))}
        </View>

        <AppText variant="caption" style={styles.sectionTitle}>Muse</AppText>
        <View style={styles.group}>
          {museRows.map((row, index) => (
            <View key={row.label} style={[styles.row, index < museRows.length - 1 && styles.rowBorder]}>
              <Ionicons color={colors.moss} name={row.icon} size={21} />
              <AppText style={styles.flex}>{row.label}</AppText>
              <AppText variant="caption" style={styles.muted}>{row.value}</AppText>
            </View>
          ))}
        </View>

        <AppText variant="caption" style={styles.sectionTitle}>Your data</AppText>
        <Card style={styles.localCard}>
          <View style={styles.localIcon}><Ionicons color={colors.moss} name="phone-portrait-outline" size={22} /></View>
          <View style={styles.flex}>
            <AppText variant="label">Private and local</AppText>
            <AppText variant="caption" style={styles.muted}>Garments, wear history, images, and memory stay on this phone.</AppText>
          </View>
        </Card>
        <Card style={styles.dataCard}>
          <View>
            <AppText variant="label">Local backup</AppText>
            <AppText variant="caption" style={styles.muted}>Portable wardrobe, Timeline, memory, Chat, and generated garment images.</AppText>
            <AppText variant="caption" style={styles.warning}>Backups are readable files containing personal data. Store them privately.</AppText>
          </View>
          <View style={styles.backupActions}>
            <AppButton disabled={backupBusy !== null} label="Export backup" loading={backupBusy === 'export'} onPress={() => { void exportBackup(); }} style={styles.flex} />
            <AppButton disabled={backupBusy !== null} label="Restore backup" loading={backupBusy === 'restore'} onPress={() => { void chooseBackup(); }} tone="secondary" style={styles.flex} />
          </View>
        </Card>
        <Card style={styles.chatCard}>
          <View style={styles.flex}>
            <AppText variant="label">Chat history</AppText>
            <AppText variant="caption" style={styles.muted}>Remove saved conversations without changing Muse memory or wardrobe data.</AppText>
          </View>
          <AppButton label="Clear" onPress={confirmClearHistory} tone="quiet" />
        </Card>
        <AppText variant="caption" style={styles.footnote}>Provider credentials stay in the API Worker and are never bundled with this app.</AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  flex: { flex: 1 },
  eyebrow: { color: colors.clay, letterSpacing: 1, marginBottom: 2, textTransform: 'uppercase' },
  close: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: { color: colors.clay, letterSpacing: 1, marginTop: spacing.sm, paddingHorizontal: spacing.xs, textTransform: 'uppercase' },
  themeCard: { gap: spacing.md },
  themeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  localCard: { alignItems: 'center', backgroundColor: colors.mossSoft, flexDirection: 'row', gap: spacing.md },
  localIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 23, height: 46, justifyContent: 'center', width: 46 },
  muted: { color: colors.inkMuted },
  warning: { color: colors.clay, marginTop: spacing.xs },
  group: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', paddingHorizontal: spacing.md },
  chatCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  dataCard: { gap: spacing.md },
  backupActions: { flexDirection: 'row', gap: spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 58 },
  rowBorder: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  rowPressed: { opacity: 0.65 },
  footnote: { color: colors.inkMuted, paddingHorizontal: spacing.sm, textAlign: 'center' },
});
