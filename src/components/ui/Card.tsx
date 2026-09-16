import type { PropsWithChildren } from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';

import { useAppTheme } from '@/theme/AppThemeProvider';
import { radius, shadow, spacing } from '@/theme/tokens';

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const { colors, isDark } = useAppTheme();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderRadius: radius.md,
          borderWidth: 1,
          padding: spacing.md,
          shadowColor: isDark ? '#000000' : '#283128',
          ...shadow,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
