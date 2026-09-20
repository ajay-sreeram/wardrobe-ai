import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { LaunchStarter } from '@/content/launchContent';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

const icons = ['sparkles-outline', 'refresh-outline', 'analytics-outline', 'today-outline'] as const;
const actionIcons = {
  explain_app: 'git-network-outline',
  explain_privacy: 'lock-closed-outline',
  pick_garment: 'shirt-outline',
  pick_worn_outfit: 'today-outline',
} as const;

export function StarterActions({ disabled, firstUse = false, onSelect, starters }: { disabled: boolean; firstUse?: boolean; onSelect: (starter: LaunchStarter) => void; starters: LaunchStarter[] }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" style={styles.eyebrow}>{firstUse ? 'Start here' : 'Try asking'}</AppText>
      <View style={styles.grid}>
        {starters.map((starter, index) => (
          <Pressable
            accessibilityHint={starter.subtitle}
            accessibilityLabel={starter.title}
            accessibilityRole="button"
            disabled={disabled}
            key={`${index}-${starter.title}`}
            onPress={() => onSelect(starter)}
            style={({ pressed }) => [styles.action, pressed && styles.pressed, disabled && styles.disabled]}>
            <View style={styles.icon}>
              <Ionicons color={colors.clay} name={starter.action ? actionIcons[starter.action] : (icons[index] ?? 'chatbubble-ellipses-outline')} size={20} />
            </View>
            <AppText variant="label">{starter.title}</AppText>
            <AppText variant="caption" style={styles.subtitle}>{starter.subtitle}</AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.contextNote}>
        <Ionicons color={colors.moss} name="lock-closed-outline" size={14} />
        <AppText variant="caption" style={styles.contextText}>{firstUse ? 'You choose every photo. The app never scans your library.' : 'Uses your local wardrobe, memory, and Timeline context.'}</AppText>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { gap: spacing.sm, paddingTop: spacing.xs },
  eyebrow: { color: colors.clay, letterSpacing: 0.7, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.xs, minHeight: 132, padding: spacing.sm, width: '48.4%' },
  icon: { alignItems: 'center', backgroundColor: colors.claySoft, borderRadius: 18, height: 36, justifyContent: 'center', marginBottom: 2, width: 36 },
  subtitle: { color: colors.inkMuted },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  contextNote: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  contextText: { color: colors.inkMuted, flex: 1 },
});
