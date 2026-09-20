import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { spacing, type ThemeColors } from '@/theme/tokens';

function PrivacySection({ children, title }: PropsWithChildren<{ title: string }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

function Bullet({ children }: PropsWithChildren) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.bulletRow}>
      <AppText style={styles.bullet}>•</AppText>
      <AppText style={styles.body}>{children}</AppText>
    </View>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption" style={styles.eyebrow}>Plain-language overview</AppText>
          <AppText variant="title">Privacy &amp; AI</AppText>
        </View>
        <Pressable accessibilityLabel="Close privacy information" onPress={() => router.back()} style={styles.close}>
          <Ionicons color={colors.ink} name="close" size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText style={styles.intro}>Wardrobe is a local-first app. This notice explains what is stored on your device, what is shared when you use AI features, and the controls available to you.</AppText>

        <PrivacySection title="Information stored on your device">
          <AppText style={styles.body}>Wardrobe stores the following information locally:</AppText>
          <View style={styles.bulletList}>
            <Bullet>Your active and archived garments, sections, descriptions, tags, and generated garment images.</Bullet>
            <Bullet>Your Timeline entries, wear counts, Chat history, and saved wardrobe memory.</Bullet>
            <Bullet>Your theme preference and other app settings.</Bullet>
          </View>
          <AppText style={styles.body}>The app does not require a Wardrobe account and does not automatically sync this information to a wardrobe cloud.</AppText>
        </PrivacySection>

        <PrivacySection title="AI processing">
          <AppText style={styles.body}>AI features run only when you ask for help, send a Chat message, or submit selected photos. The app may send the relevant parts of your wardrobe, Timeline, memory, and recent conversation through its API Worker to the configured AI providers so they can complete your request.</AppText>
          <AppText style={styles.body}>Provider credentials remain in the API Worker and are not included in the app. Local-first does not mean that AI request content is processed entirely on your phone.</AppText>
        </PrivacySection>

        <PrivacySection title="Photos">
          <AppText style={styles.body}>Wardrobe does not scan your photo library. Only photos you explicitly select are used for garment analysis and standardized garment-image generation. A selected photo may also be compared with a small set of saved garment images to check for duplicates.</AppText>
          <AppText style={styles.body}>The app does not provide virtual try-on or use your photos to create images of you wearing garments.</AppText>
        </PrivacySection>

        <PrivacySection title="Memory and app changes">
          <AppText style={styles.body}>Explicit, reusable wardrobe details you tell Chat may be saved to local memory and used in later conversations. Garment, section, and Timeline changes are shown for confirmation before they are applied.</AppText>
        </PrivacySection>

        <PrivacySection title="Backups">
          <AppText style={styles.body}>A backup contains your wardrobe, Timeline, memory, Chat history, and generated images. Exported backups are readable files. After export, the file is stored wherever you choose and should be kept private.</AppText>
        </PrivacySection>

        <PrivacySection title="Your controls">
          <View style={styles.bulletList}>
            <Bullet>Clear saved Chat history from Settings.</Bullet>
            <Bullet>Edit or archive garments and restore archived pieces.</Bullet>
            <Bullet>Correct or delete Timeline entries.</Bullet>
            <Bullet>Export or restore a local backup.</Bullet>
          </View>
        </PrivacySection>

        <PrivacySection title="Advertising and sale of data">
          <AppText style={styles.body}>Wardrobe does not sell your personal data, show advertising, or use your wardrobe information for ad targeting.</AppText>
        </PrivacySection>

        <PrivacySection title="Changes to this notice">
          <AppText style={styles.body}>This notice may be updated when the app’s data handling changes. The current version will remain available from Settings.</AppText>
        </PrivacySection>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  intro: { color: colors.inkMuted, lineHeight: 24, paddingBottom: spacing.lg },
  section: { borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm, paddingVertical: spacing.lg },
  body: { color: colors.inkMuted, flex: 1, fontSize: 15, lineHeight: 22 },
  bulletList: { gap: spacing.sm },
  bulletRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  bullet: { color: colors.clay, fontSize: 18, lineHeight: 22 },
});
