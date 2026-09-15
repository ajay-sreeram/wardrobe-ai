import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WearCard } from '@/components/timeline/WearCard';
import { AppText } from '@/components/ui/AppText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getWearTimeline } from '@/database/repository';
import type { WearEntry } from '@/models/wardrobe';
import { colors, spacing } from '@/theme/tokens';

export default function TimelineScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [entries, setEntries] = useState<WearEntry[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    getWearTimeline(db).then((result) => { if (active) setEntries(result); });
    return () => { active = false; };
  }, [db]));

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScreenHeader eyebrow="Your clothing diary" title="Timeline" />
      <FlashList
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons color={colors.clay} name="calendar-outline" size={28} /></View>
            <AppText variant="heading">Your clothing diary starts here</AppText>
            <AppText style={styles.emptyText}>Tell the wardrobe assistant what you wore, then confirm the entry in Chat.</AppText>
          </View>
        )}
        renderItem={({ item, index }) => <WearCard entry={item} onPress={() => router.push({ pathname: '/wear/[id]', params: { id: item.id } })} showLine={index < entries.length - 1} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: 72 },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.claySoft, borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  emptyText: { color: colors.inkMuted, textAlign: 'center' },
});
