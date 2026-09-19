import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { spacing, type ThemeColors } from '@/theme/tokens';

export function DataLoadState({ error, label, loading, onRetry }: { error: string | null; label: string; loading: boolean; onRetry: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      {loading ? <ActivityIndicator color={colors.moss} size="large" /> : <Ionicons color={colors.clay} name="alert-circle-outline" size={32} />}
      <AppText variant="heading">{loading ? label : 'Couldn’t load this data'}</AppText>
      {!loading && error ? <AppText style={styles.message}>{error}</AppText> : null}
      {!loading ? <AppButton label="Try again" onPress={onRetry} tone="secondary" /> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { alignItems: 'center', flex: 1, gap: spacing.sm, justifyContent: 'center', padding: spacing.xl },
  message: { color: colors.inkMuted, maxWidth: 360, textAlign: 'center' },
});
