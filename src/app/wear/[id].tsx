import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { coordinateWearDelete, coordinateWearUpdate } from '@/agents/coordinator';
import { listActiveWardrobeGarments, readWardrobeWear } from '@/agents/wardrobe';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import type { Garment, WearEntry } from '@/models/wardrobe';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function PieceOption({ garment, selected, onPress }: { garment: Garment; selected: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${garment.name}`} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.piece, selected && styles.pieceSelected, pressed && styles.pressed]}>
      <View style={styles.pieceImageWrap}>
        {garment.canonicalImage ? <Image contentFit="contain" source={{ uri: garment.canonicalImage }} style={styles.pieceImage} /> : <Ionicons color={colors.moss} name="shirt-outline" size={34} />}
        {selected ? <View style={styles.check}><Ionicons color={colors.surface} name="checkmark" size={14} /></View> : null}
      </View>
      <AppText numberOfLines={2} variant="caption" style={styles.pieceName}>{garment.name}</AppText>
    </Pressable>
  );
}

export default function WearDetailsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const [entry, setEntry] = useState<WearEntry | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wornAt, setWornAt] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([readWardrobeWear(db, id), listActiveWardrobeGarments(db)])
      .then(([result, activeGarments]) => {
        if (!active) return;
        setEntry(result);
        if (result) {
          const byId = new Map([...result.garments, ...activeGarments].map((garment) => [garment.id, garment]));
          setGarments([...byId.values()]);
          setSelectedIds(result.garmentIds);
          setWornAt(result.wornAt);
          setNote(result.note ?? '');
        }
      })
      .catch(() => { if (active) setError('I could not load this Timeline entry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [db, id]);

  const selectedNames = useMemo(() => selectedIds.flatMap((garmentId) => {
    const garment = garments.find((item) => item.id === garmentId);
    return garment ? [garment.name] : [];
  }), [garments, selectedIds]);

  function toggleGarment(garmentId: string) {
    setSelectedIds((current) => current.includes(garmentId) ? current.filter((idToKeep) => idToKeep !== garmentId) : [...current, garmentId]);
  }

  async function save() {
    if (!entry || !selectedIds.length || !isValidDate(wornAt)) return;
    setSaving(true);
    setError(null);
    try {
      await coordinateWearUpdate(db, {
        wearId: entry.id,
        garmentIds: selectedIds,
        garmentNames: selectedNames,
        wornAt,
        note,
      });
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'I could not update this Timeline entry.');
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!entry) return;
    Alert.alert('Delete this Timeline entry?', 'This corrects your wear history and updates the wear counts for these garments.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete entry',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          setError(null);
          try {
            await coordinateWearDelete(db, entry.id, entry.wornAt);
            router.back();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'I could not delete this Timeline entry.');
            setSaving(false);
          }
        },
      },
    ]);
  }

  const dateError = wornAt.length > 0 && !isValidDate(wornAt);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" style={styles.eyebrow}>Clothing diary</AppText>
            <AppText variant="title">View or correct</AppText>
          </View>
          <Pressable accessibilityLabel="Close Timeline details" hitSlop={12} onPress={() => router.back()} style={styles.close}>
            <Ionicons color={colors.ink} name="close" size={22} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {loading ? <AppText style={styles.muted}>Loading outfit…</AppText> : null}
          {!loading && !entry ? <AppText style={styles.muted}>This Timeline entry no longer exists.</AppText> : null}
          {entry ? (
            <>
              <View style={styles.field}>
                <AppText variant="label">Pieces worn</AppText>
                <AppText variant="caption" style={styles.muted}>Select every piece that belonged to this outfit.</AppText>
                <View style={styles.pieceGrid}>
                  {garments.map((garment) => <PieceOption garment={garment} key={garment.id} onPress={() => toggleGarment(garment.id)} selected={selectedIds.includes(garment.id)} />)}
                </View>
                {!selectedIds.length ? <AppText variant="caption" style={styles.error}>Keep at least one wardrobe piece in this entry.</AppText> : null}
              </View>

              <View style={styles.field}>
                <AppText variant="label">Date worn</AppText>
                <TextInput accessibilityLabel="Date worn" autoCapitalize="none" keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} maxLength={10} onChangeText={setWornAt} placeholder="YYYY-MM-DD" placeholderTextColor={colors.inkMuted} style={[styles.input, dateError && styles.inputError]} value={wornAt} />
                {dateError ? <AppText variant="caption" style={styles.error}>Use a valid date in YYYY-MM-DD format.</AppText> : null}
              </View>

              <View style={styles.field}>
                <AppText variant="label">Context or reason</AppText>
                <TextInput accessibilityLabel="Outfit context or reason" maxLength={160} multiline onChangeText={setNote} placeholder="Where you went, the occasion, weather, comfort, or why you paired it" placeholderTextColor={colors.inkMuted} style={[styles.input, styles.noteInput]} value={note} />
                <AppText variant="caption" style={styles.muted}>Muse can use this context for more personal suggestions.</AppText>
              </View>

              {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
              <AppButton disabled={!selectedIds.length || !isValidDate(wornAt)} label="Save correction" loading={saving} onPress={save} />
              <AppButton disabled={saving} label="Delete entry" onPress={confirmDelete} tone="quiet" style={styles.deleteButton} />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  eyebrow: { color: colors.clay, letterSpacing: 0.8, textTransform: 'uppercase' },
  close: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  content: { gap: spacing.lg, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  field: { gap: spacing.sm },
  muted: { color: colors.inkMuted },
  pieceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  piece: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.sm, borderWidth: 1, overflow: 'hidden', width: '31%' },
  pieceSelected: { borderColor: colors.moss, borderWidth: 2 },
  pieceImageWrap: { alignItems: 'center', backgroundColor: '#F2F0EA', height: 96, justifyContent: 'center' },
  pieceImage: { height: '100%', width: '100%' },
  pieceName: { minHeight: 48, padding: spacing.xs, textAlign: 'center' },
  check: { alignItems: 'center', backgroundColor: colors.moss, borderRadius: 13, height: 26, justifyContent: 'center', position: 'absolute', right: spacing.xs, top: spacing.xs, width: 26 },
  pressed: { opacity: 0.76 },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.sm, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: 12 },
  inputError: { borderColor: colors.danger },
  noteInput: { minHeight: 96, textAlignVertical: 'top' },
  error: { color: colors.danger },
  deleteButton: { borderColor: colors.line, borderWidth: 1 },
});
