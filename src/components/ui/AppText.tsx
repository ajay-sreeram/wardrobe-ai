import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import { colors } from '@/theme/tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'label';

const variants = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const, letterSpacing: -1 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '700' as const },
};

export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[{ color: colors.ink }, variants[variant], style]} />;
}
