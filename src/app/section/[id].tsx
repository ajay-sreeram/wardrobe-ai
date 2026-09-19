import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { coordinateSectionCreate, coordinateSectionDelete, coordinateSectionMove, coordinateSectionRename } from '@/agents/coordinator';
import { listWardrobeSections, readSection } from '@/agents/wardrobe';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import type { WardrobeSectionDetails, WardrobeSectionOption } from '@/database/repository';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

export default function SectionDetailsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const creating = id === 'new';
  const router = useRouter();
  const db = useSQLiteContext();
  const [section, setSection] = useState<WardrobeSectionDetails | null>(null);
  const [destinations, setDestinations] = useState<WardrobeSectionOption[]>([]);
  const [destinationSectionId, setDestinationSectionId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(!creating);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (creating) return;
    let active = true;
    Promise.all([readSection(db, id), listWardrobeSections(db)])
      .then(([result, sectionOptions]) => {
        if (!active) return;
        setSection(result);
        setName(result?.name ?? '');
        const availableDestinations = sectionOptions.filter((option) => option.id !== id);
        setDestinations(availableDestinations);
        setDestinationSectionId(availableDestinations[0]?.id ?? '');
      })
      .catch(() => { if (active) setError('I could not load this section.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [creating, db, id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (creating) await coordinateSectionCreate(db, name);
      else await coordinateSectionRename(db, id, name);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'I could not save this section.');
    } finally {
      setSaving(false);
    }
  }

  async function move(direction: -1 | 1) {
    setSaving(true);
    setError(null);
    try {
      await coordinateSectionMove(db, id, direction);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'I could not reorder this section.');
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!section || section.sectionCount <= 1) return;
    const totalGarments = section.garmentCount + section.archivedGarmentCount;
    const destination = destinations.find((option) => option.id === destinationSectionId);
    if (totalGarments && !destination) {
      setError('Choose where to move this section’s garments.');
      return;
    }
    Alert.alert(
      `Delete ${section.name}?`,
      destination
        ? `${totalGarments} ${totalGarments === 1 ? 'piece' : 'pieces'}, including archived pieces, will move to ${destination.name}. Timeline history will stay unchanged.`
        : 'This section is empty and will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete section',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            setError(null);
            try {
              await coordinateSectionDelete(db, section.id, destination?.id ?? null);
              router.back();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'I could not delete this section.');
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
            <AppText variant="caption" style={styles.eyebrow}>Wardrobe organization</AppText>
            <AppText variant="title">{creating ? 'New section' : 'Edit section'}</AppText>
          </View>
          <Pressable accessibilityLabel="Close section details" hitSlop={12} onPress={() => router.back()} style={styles.close}>
            <Ionicons color={colors.ink} name="close" size={22} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {loading ? <AppText style={styles.muted}>Loading section…</AppText> : null}
          {!loading && !error && !creating && !section ? <AppText style={styles.muted}>This section is no longer available.</AppText> : null}
          {(creating || section) ? (
            <>
              <View style={styles.field}>
                <AppText variant="label">Section name</AppText>
                <TextInput
                  accessibilityLabel="Section name"
                  autoFocus={creating}
                  maxLength={50}
                  onChangeText={setName}
                  placeholder="For example, Occasion wear"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.input}
                  value={name}
                />
              </View>

              {!creating && section ? (
                <View style={styles.field}>
                  <AppText variant="label">Section order</AppText>
                  <AppText variant="caption" style={styles.muted}>{section.garmentCount} {section.garmentCount === 1 ? 'piece' : 'pieces'} in this section</AppText>
                  <View style={styles.orderButtons}>
                    <AppButton disabled={saving || section.position === 0} label="Move earlier" onPress={() => move(-1)} tone="secondary" style={styles.flexButton} />
                    <AppButton disabled={saving || section.position >= section.sectionCount - 1} label="Move later" onPress={() => move(1)} tone="secondary" style={styles.flexButton} />
                  </View>
                </View>
              ) : null}

              {!creating && section ? (
                <View style={styles.deleteSection}>
                  <AppText variant="label">Delete section</AppText>
                  {section.sectionCount <= 1 ? (
                    <AppText variant="caption" style={styles.muted}>Keep at least one section in your wardrobe.</AppText>
                  ) : section.garmentCount + section.archivedGarmentCount > 0 ? (
                    <>
                      <AppText variant="caption" style={styles.muted}>
                        Choose a destination for {section.garmentCount + section.archivedGarmentCount} active and archived {(section.garmentCount + section.archivedGarmentCount) === 1 ? 'piece' : 'pieces'}.
                      </AppText>
                      <View style={styles.chips}>
                        {destinations.map((destination) => (
                          <Chip key={destination.id} label={destination.name} onPress={() => setDestinationSectionId(destination.id)} selected={destinationSectionId === destination.id} />
                        ))}
                      </View>
                    </>
                  ) : (
                    <AppText variant="caption" style={styles.muted}>This empty section can be safely removed.</AppText>
                  )}
                  <AppButton disabled={saving || section.sectionCount <= 1} label={section.garmentCount + section.archivedGarmentCount ? 'Move pieces & delete' : 'Delete empty section'} onPress={confirmDelete} tone="quiet" style={styles.deleteButton} />
                </View>
              ) : null}

              {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
              <AppButton disabled={!name.trim()} label={creating ? 'Create section' : 'Save name'} loading={saving} onPress={save} />
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
  content: { gap: spacing.lg, padding: spacing.lg },
  field: { gap: spacing.sm },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.sm, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: 12 },
  orderButtons: { flexDirection: 'row', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flexButton: { flex: 1 },
  deleteSection: { borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm, paddingTop: spacing.lg },
  deleteButton: { borderColor: colors.line, borderWidth: 1 },
  muted: { color: colors.inkMuted },
  error: { color: colors.danger },
});
