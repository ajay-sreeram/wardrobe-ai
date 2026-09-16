import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { coordinateGarmentRestore } from '@/agents/coordinator';
import { readArchivedWardrobeCatalog, type WardrobeCatalogItem } from '@/agents/wardrobe';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

export default function ArchivedPiecesScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const router = useRouter();
  const [garments, setGarments] = useState<WardrobeCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    readArchivedWardrobeCatalog(db)
      .then((items) => { if (active) setGarments(items); })
      .catch(() => { if (active) setError('I could not load archived pieces.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [db]);

  function confirmRestore(garment: WardrobeCatalogItem) {
    Alert.alert(`Restore ${garment.name}?`, `It will return to ${garment.sectionName}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: async () => {
          setRestoringId(garment.id);
          setError(null);
          try {
            await coordinateGarmentRestore(db, garment.id);
            setGarments((items) => items.filter((item) => item.id !== garment.id));
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'I could not restore this garment.');
          } finally {
            setRestoringId(null);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption" style={styles.eyebrow}>Recoverable pieces</AppText>
          <AppText variant="title">Archived Pieces</AppText>
        </View>
        <Pressable accessibilityLabel="Close archived pieces" hitSlop={12} onPress={() => router.back()} style={styles.close}>
          <Ionicons color={colors.ink} name="close" size={24} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <AppText style={styles.muted}>Loading archived pieces…</AppText> : null}
        {!loading && !garments.length ? (
          <View style={styles.empty}>
            <Ionicons color={colors.moss} name="archive-outline" size={34} />
            <AppText variant="heading">Nothing archived</AppText>
            <AppText style={styles.muted}>Pieces you archive will remain recoverable here.</AppText>
          </View>
        ) : null}
        {garments.map((garment) => (
          <Card key={garment.id} style={styles.card}>
            <View style={styles.imageWrap}>
              {garment.canonicalImage ? <Image contentFit="contain" source={{ uri: garment.canonicalImage }} style={styles.image} /> : <Ionicons color={colors.moss} name="shirt-outline" size={34} />}
            </View>
            <View style={styles.copy}>
              <AppText variant="label">{garment.name}</AppText>
              <AppText variant="caption" style={styles.muted}>{garment.sectionName} · Worn {garment.wearCount}×</AppText>
              <AppButton label="Restore" loading={restoringId === garment.id} onPress={() => confirmRestore(garment)} tone="secondary" style={styles.restore} />
            </View>
          </Card>
        ))}
        {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  flex: { flex: 1 },
  eyebrow: { color: colors.clay, letterSpacing: 1, marginBottom: 2, textTransform: 'uppercase' },
  close: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  content: { gap: spacing.md, padding: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: 64 },
  card: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.sm },
  imageWrap: { alignItems: 'center', backgroundColor: '#F2F0EA', borderRadius: radius.sm, height: 112, justifyContent: 'center', overflow: 'hidden', width: 92 },
  image: { height: '100%', width: '100%' },
  copy: { flex: 1, gap: spacing.xs },
  restore: { alignSelf: 'flex-start', marginTop: spacing.xs, minHeight: 38 },
  muted: { color: colors.inkMuted },
  error: { color: colors.danger },
});
