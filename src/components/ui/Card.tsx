import type { PropsWithChildren } from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme/tokens';

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
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
          ...shadow,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
