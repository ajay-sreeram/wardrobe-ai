import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

export function AgentProgress({ text }: { text: string }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.dot}><Ionicons color={colors.moss} name="sparkles" size={14} /></View>
      <AppText variant="caption" style={styles.text}>{text}</AppText>
      <View style={styles.pulse} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.mossSoft, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: 12, paddingVertical: 8 },
  dot: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, height: 24, justifyContent: 'center', width: 24 },
  pulse: { backgroundColor: colors.moss, borderRadius: 3, height: 6, opacity: 0.5, width: 6 },
  text: { color: colors.moss },
});
