import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { spacing, type ThemeColors } from '@/theme/tokens';

export function ScreenHeader({ action, eyebrow, settingsDisabled, title }: { action?: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }; eyebrow?: string; settingsDisabled?: boolean; title: string }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? <AppText variant="caption" style={styles.eyebrow}>{eyebrow}</AppText> : null}
        <AppText variant="display">{title}</AppText>
      </View>
      {action ? (
        <Pressable accessibilityLabel={action.label} disabled={action.disabled} hitSlop={10} onPress={action.onPress} style={[styles.button, action.disabled && styles.disabled]}>
          <Ionicons color={colors.ink} name={action.icon} size={23} />
        </Pressable>
      ) : null}
      <Pressable accessibilityLabel="Open settings" disabled={settingsDisabled} hitSlop={12} onPress={() => router.push('/settings')} style={[styles.button, settingsDisabled && styles.disabled]}>
        <Ionicons color={colors.ink} name="menu-outline" size={26} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  copy: { flex: 1 },
  eyebrow: { color: colors.clay, letterSpacing: 1.4, marginBottom: 2, textTransform: 'uppercase' },
  button: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  disabled: { opacity: 0.45 },
});
