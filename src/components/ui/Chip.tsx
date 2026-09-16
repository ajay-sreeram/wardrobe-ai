import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, type ThemeColors } from '@/theme/tokens';

export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      onPress={onPress}
      style={[styles.container, selected && styles.selected]}>
      <AppText variant="caption" style={selected ? styles.selectedText : styles.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selected: { backgroundColor: colors.moss },
  text: { color: colors.inkMuted },
  selectedText: { color: colors.surface },
});
