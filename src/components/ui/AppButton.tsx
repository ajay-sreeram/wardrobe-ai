import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, type ThemeColors } from '@/theme/tokens';

type Props = ComponentProps<typeof Pressable> & {
  label: string;
  tone?: 'primary' | 'secondary' | 'quiet';
  loading?: boolean;
};

export function AppButton({ label, tone = 'primary', loading, disabled, style, ...props }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const foreground = tone === 'primary' ? colors.surface : colors.moss;
  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        styles[tone],
        state.pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}>
      {loading ? <ActivityIndicator color={foreground} /> : <AppText variant="label" style={{ color: foreground }}>{label}</AppText>}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.pill,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primary: { backgroundColor: colors.moss },
  secondary: { backgroundColor: colors.mossSoft },
  quiet: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
