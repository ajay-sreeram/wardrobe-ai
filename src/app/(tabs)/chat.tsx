import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatMessage } from '@/components/chat/ChatMessage';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { ChatMessage as ChatMessageModel } from '@/models/agent';
import { useChatStore } from '@/state/chat';
import { colors, radius, spacing } from '@/theme/tokens';

const messages: ChatMessageModel[] = [
  { id: '1', kind: 'text', role: 'assistant', text: 'Good morning. Want help choosing something, logging what you wore, or adding a garment?' },
  { id: '2', kind: 'text', role: 'user', text: 'I bought this blue shirt yesterday.' },
  { id: '3', kind: 'status', stage: 'analyzing_image', text: 'Analyzing garment…' },
  { id: '4', kind: 'confirmation', title: 'I found one new shirt', description: 'It looks like a light blue button-down with a structured collar and a single chest pocket.', garmentName: 'Light blue button-down', tags: ['new', 'shirt', 'workwear'] },
];

export default function ChatScreen() {
  const { draft, setDraft, clearDraft } = useChatStore();
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88} style={styles.flex}>
        <ScreenHeader eyebrow="Wardrobe assistant" title="Your closet, in conversation" />
        <FlashList
          contentContainerStyle={styles.listContent}
          data={messages}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatMessage message={item} />}
        />
        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <Pressable accessibilityLabel="Attach garment photo" hitSlop={8} style={styles.attach}>
              <Ionicons color={colors.moss} name="add" size={24} />
            </Pressable>
            <TextInput
              accessibilityLabel="Message"
              multiline
              onChangeText={setDraft}
              placeholder="Ask about your wardrobe…"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              value={draft}
            />
            <Pressable accessibilityLabel="Send message" disabled={!draft.trim()} onPress={clearDraft} style={[styles.send, !draft.trim() && styles.sendDisabled]}>
              <Ionicons color={colors.surface} name="arrow-up" size={20} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  listContent: { paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  separator: { height: spacing.md },
  composerWrap: { backgroundColor: colors.background, paddingBottom: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  composer: { alignItems: 'flex-end', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 56, padding: 6 },
  attach: { alignItems: 'center', backgroundColor: colors.mossSoft, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  input: { color: colors.ink, flex: 1, fontSize: 16, lineHeight: 22, maxHeight: 100, minHeight: 44, paddingHorizontal: 4, paddingVertical: 11 },
  send: { alignItems: 'center', backgroundColor: colors.moss, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  sendDisabled: { backgroundColor: '#B8BDB8' },
});
