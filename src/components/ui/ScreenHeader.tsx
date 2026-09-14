import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme/tokens';

export function ScreenHeader({ eyebrow, title }: { eyebrow?: string; title: string }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? <AppText variant="caption" style={styles.eyebrow}>{eyebrow}</AppText> : null}
        <AppText variant="display">{title}</AppText>
      </View>
      <Pressable accessibilityLabel="Open settings" hitSlop={12} onPress={() => router.push('/settings')} style={styles.button}>
        <Ionicons color={colors.ink} name="menu-outline" size={26} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  copy: { flex: 1 },
  eyebrow: { color: colors.clay, letterSpacing: 1.4, marginBottom: 2, textTransform: 'uppercase' },
  button: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
});
