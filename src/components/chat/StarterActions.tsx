import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

const starters = [
  {
    icon: 'sparkles-outline' as const,
    title: 'Dress me today',
    subtitle: 'Build an outfit from my wardrobe',
    prompt: 'Help me choose an outfit for today.',
  },
  {
    icon: 'refresh-outline' as const,
    title: 'Rediscover a piece',
    subtitle: 'Bring something forgotten back',
    prompt: "Show me something I haven't worn recently and help me style it.",
  },
  {
    icon: 'shirt-outline' as const,
    title: 'Explore my wardrobe',
    subtitle: 'See a useful overview of what I own',
    prompt: 'Give me a quick, useful overview of my wardrobe and show me a few pieces worth revisiting.',
  },
  {
    icon: 'today-outline' as const,
    title: 'Log today’s outfit',
    subtitle: 'Tell Muse what I wore',
    prompt: 'Help me log what I wore today.',
  },
];

export function StarterActions({ disabled, onSelect }: { disabled: boolean; onSelect: (prompt: string) => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" style={styles.eyebrow}>Try asking Muse</AppText>
      <View style={styles.grid}>
        {starters.map((starter) => (
          <Pressable
            accessibilityHint={starter.subtitle}
            accessibilityLabel={starter.title}
            accessibilityRole="button"
            disabled={disabled}
            key={starter.title}
            onPress={() => onSelect(starter.prompt)}
            style={({ pressed }) => [styles.action, pressed && styles.pressed, disabled && styles.disabled]}>
            <View style={styles.icon}>
              <Ionicons color={colors.clay} name={starter.icon} size={20} />
            </View>
            <AppText variant="label">{starter.title}</AppText>
            <AppText variant="caption" style={styles.subtitle}>{starter.subtitle}</AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.contextNote}>
        <Ionicons color={colors.moss} name="lock-closed-outline" size={14} />
        <AppText variant="caption" style={styles.contextText}>Uses your local wardrobe, memory, and Timeline context.</AppText>
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
