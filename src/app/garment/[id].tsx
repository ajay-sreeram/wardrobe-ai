import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { coordinateGarmentArchive, coordinateGarmentMove, coordinateGarmentUpdate } from '@/agents/coordinator';
import { listWardrobeSections, readGarment } from '@/agents/wardrobe';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import type { Garment } from '@/models/wardrobe';
import type { WardrobeSectionOption } from '@/database/repository';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

export default function GarmentDetailsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const [garment, setGarment] = useState<Garment | null>(null);
  const [sections, setSections] = useState<WardrobeSectionOption[]>([]);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([readGarment(db, id), listWardrobeSections(db)])
      .then(([result, sectionOptions]) => {
        if (!active) return;
        setGarment(result);
        setSections(sectionOptions);
        if (result) {
          setName(result.name);
          setTags(result.tags.join(', '));
          setDescription(result.description ?? '');
          setSectionId(result.sectionId ?? sectionOptions[0]?.id ?? '');
        }
      })
      .catch(() => { if (active) setError('I could not load this garment.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [db, id]);

  async function save() {
    if (!garment) return;
    const normalizedTags = [...new Set(tags.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 12);
    setSaving(true);
    setError(null);
    try {
      await coordinateGarmentUpdate(db, { garmentId: garment.id, name, description, sectionId, tags: normalizedTags });
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'I could not update this garment.');
    } finally {
      setSaving(false);
    }
  }

  async function move(direction: -1 | 1) {
    if (!garment) return;
    setSaving(true);
    setError(null);
    try {
      await coordinateGarmentMove(db, garment.id, direction);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'I could not reorder this garment.');
      setSaving(false);
    }
  }

  function confirmArchive() {
    if (!garment) return;
    Alert.alert(
      `Archive ${garment.name}?`,
      'It will disappear from your active wardrobe, but its record will remain recoverable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            setError(null);
            try {
              await coordinateGarmentArchive(db, garment.id);
              router.back();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'I could not archive this garment.');
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" style={styles.eyebrow}>Wardrobe piece</AppText>
            <AppText variant="title">View or edit</AppText>
          </View>
          <Pressable accessibilityLabel="Close garment details" hitSlop={12} onPress={() => router.back()} style={styles.close}>
            <Ionicons color={colors.ink} name="close" size={22} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {loading ? <AppText style={styles.muted}>Loading garment…</AppText> : null}
          {!loading && !garment ? <AppText style={styles.muted}>This garment is no longer in your active wardrobe.</AppText> : null}
          {garment ? (
            <>
              <View style={styles.imageWrap}>
                {garment.canonicalImage ? (
                  <Image contentFit="contain" source={{ uri: garment.canonicalImage }} style={styles.image} />
                ) : (
                  <Ionicons color={colors.moss} name="shirt-outline" size={72} />
                )}
              </View>

              <View style={styles.field}>
                <AppText variant="label">Name</AppText>
                <TextInput accessibilityLabel="Garment name" maxLength={80} onChangeText={setName} style={styles.input} value={name} />
              </View>

              <View style={styles.field}>
                <AppText variant="label">Section</AppText>
                <View style={styles.chips}>
                  {sections.map((section) => <Chip key={section.id} label={section.name} onPress={() => setSectionId(section.id)} selected={section.id === sectionId} />)}
                </View>
              </View>

              <View style={styles.field}>
                <AppText variant="label">Order in section</AppText>
                <View style={styles.orderButtons}>
                  <AppButton disabled={saving || sectionId !== garment.sectionId} label="Move earlier" onPress={() => move(-1)} tone="secondary" style={styles.flexButton} />
                  <AppButton disabled={saving || sectionId !== garment.sectionId} label="Move later" onPress={() => move(1)} tone="secondary" style={styles.flexButton} />
                </View>
                {sectionId !== garment.sectionId ? <AppText variant="caption" style={styles.muted}>Save the new section before changing its order.</AppText> : null}
              </View>

              <View style={styles.field}>
                <AppText variant="label">Tags</AppText>
                <TextInput
                  accessibilityLabel="Garment tags"
                  autoCapitalize="none"
                  multiline
                  onChangeText={setTags}
                  placeholder="shirt, white, office"
                  placeholderTextColor={colors.inkMuted}
                  style={[styles.input, styles.tagsInput]}
                  value={tags}
                />
                <AppText variant="caption" style={styles.muted}>Separate tags with commas.</AppText>
              </View>

              <View style={styles.field}>
                <AppText variant="label">Garment details</AppText>
                <TextInput
                  accessibilityLabel="Garment details"
                  maxLength={500}
                  multiline
                  onChangeText={setDescription}
                  placeholder="Color, pattern, cut, brand, and distinctive details"
                  placeholderTextColor={colors.inkMuted}
                  style={[styles.input, styles.descriptionInput]}
                  value={description}
                />
                <AppText variant="caption" style={styles.muted}>Corrections improve wardrobe search and Muse’s suggestions.</AppText>
              </View>

              {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
              <AppButton disabled={!name.trim() || !sectionId} label="Save changes" loading={saving} onPress={save} />
              <AppButton disabled={saving} label="Archive garment" onPress={confirmArchive} tone="quiet" style={styles.archiveButton} />
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
  imageWrap: { alignItems: 'center', backgroundColor: colors.garmentCanvas, borderRadius: radius.lg, height: 320, justifyContent: 'center', overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  field: { gap: spacing.sm },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.sm, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: 12 },
  tagsInput: { minHeight: 76, textAlignVertical: 'top' },
  descriptionInput: { minHeight: 112, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  orderButtons: { flexDirection: 'row', gap: spacing.sm },
  flexButton: { flex: 1 },
  muted: { color: colors.inkMuted },
  error: { color: colors.danger },
  archiveButton: { borderColor: colors.line, borderWidth: 1 },
});
