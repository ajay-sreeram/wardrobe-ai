import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestMuseReply } from '@/agents/coordinator/muse';
import { AgentProgress } from '@/components/chat/AgentProgress';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { AppText } from '@/components/ui/AppText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { developmentEnv } from '@/config/env';
import type { ChatMessage as ChatMessageModel } from '@/models/agent';
import { useChatStore } from '@/state/chat';
import { persistChatImage } from '@/storage/chatImages';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ChatScreen() {
  const { addAssistantMessage, addError, addPendingImages, draft, messages, pendingImages, removePendingImage, sendMessage, setDraft } = useChatStore();
  const listRef = useRef<FlashListRef<ChatMessageModel>>(null);
  const [sending, setSending] = useState(false);
  const canSend = Boolean(draft.trim() || pendingImages.length) && !sending;

  useEffect(() => {
    const frame = requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [messages.length]);

  async function chooseImages() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        orderedSelection: true,
        quality: 0.9,
        selectionLimit: Math.max(1, 4 - pendingImages.length),
      });
      if (result.canceled) return;

      const batchId = Date.now();
      addPendingImages(result.assets.map((asset, index) => ({
        id: `observation-${batchId}-${index}`,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? null,
      })));
    } catch {
      addError('I could not open the photo picker. Please try again.');
    }
  }

  async function handleSend() {
    if (!canSend) return;
    const submittedText = draft.trim();
    const submittedImages = [...pendingImages];
    setSending(true);
    try {
      const imageMessages = await Promise.all(submittedImages.map(async (image) => ({
        id: image.id,
        kind: 'image' as const,
        role: 'user' as const,
        uri: await persistChatImage(image),
        width: image.width,
        height: image.height,
      })));
      sendMessage(imageMessages);

      if (submittedImages.length) {
        addAssistantMessage(`I saved ${submittedImages.length === 1 ? 'that selected photo' : `those ${submittedImages.length} selected photos`} on this device. Image analysis is not connected yet, so nothing was sent to an AI provider.`);
        return;
      }

      if (!developmentEnv.museApiKey) {
        addError('Muse is not configured. Add MUSE_API_KEY to local-secrets/.env, then restart Expo with a cleared cache.');
        return;
      }

      addAssistantMessage(await requestMuseReply(developmentEnv.museApiKey, submittedText));
    } catch (error) {
      addError(error instanceof Error ? error.message : 'I could not complete that request. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88} style={styles.flex}>
        <ScreenHeader eyebrow="Wardrobe assistant" title="Your closet, in conversation" />
        <FlashList
          contentContainerStyle={styles.listContent}
          data={messages}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyExtractor={(item) => item.id}
          ref={listRef}
          renderItem={({ item }) => <ChatMessage message={item} />}
        />
        {sending ? <View style={styles.progress}><AgentProgress text="Thinking…" /></View> : null}
        <View style={styles.composerWrap}>
          {pendingImages.length ? (
            <View style={styles.pendingRow}>
              {pendingImages.map((image) => (
                <View key={image.id} style={styles.pendingImageWrap}>
                  <Image contentFit="cover" source={{ uri: image.uri }} style={styles.pendingImage} />
                  <Pressable accessibilityLabel="Remove selected image" hitSlop={8} onPress={() => removePendingImage(image.id)} style={styles.removeImage}>
                    <Ionicons color={colors.surface} name="close" size={14} />
                  </Pressable>
                </View>
              ))}
              <View style={styles.selectionNote}>
                <Ionicons color={colors.moss} name="shield-checkmark-outline" size={16} />
                <View>
                  <AppPrivacyText count={pendingImages.length} />
                </View>
              </View>
            </View>
          ) : null}
          <View style={styles.composer}>
            <Pressable accessibilityLabel="Attach garment photo" disabled={pendingImages.length >= 4 || sending} hitSlop={8} onPress={chooseImages} style={styles.attach}>
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
            <Pressable accessibilityLabel="Send message" disabled={!canSend} onPress={handleSend} style={[styles.send, !canSend && styles.sendDisabled]}>
              <Ionicons color={colors.surface} name="arrow-up" size={20} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AppPrivacyText({ count }: { count: number }) {
  return (
    <>
      <AppText variant="caption" style={styles.selectionTitle}>{count} selected</AppText>
      <AppText variant="caption" style={styles.selectionCaption}>Only these photos</AppText>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  listContent: { paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  separator: { height: spacing.md },
  composerWrap: { backgroundColor: colors.background, paddingBottom: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  progress: { paddingBottom: spacing.xs, paddingHorizontal: spacing.lg },
  pendingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm, paddingHorizontal: spacing.xs },
  pendingImageWrap: { height: 64, width: 52 },
  pendingImage: { borderRadius: 10, height: 64, width: 52 },
  removeImage: { alignItems: 'center', backgroundColor: 'rgba(30,33,30,0.82)', borderRadius: 10, height: 20, justifyContent: 'center', position: 'absolute', right: -5, top: -5, width: 20 },
  selectionNote: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginLeft: spacing.xs },
  selectionTitle: { color: colors.ink },
  selectionCaption: { color: colors.inkMuted, fontSize: 12 },
  composer: { alignItems: 'flex-end', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 56, padding: 6 },
  attach: { alignItems: 'center', backgroundColor: colors.mossSoft, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  input: { color: colors.ink, flex: 1, fontSize: 16, lineHeight: 22, maxHeight: 100, minHeight: 44, paddingHorizontal: 4, paddingVertical: 11 },
  send: { alignItems: 'center', backgroundColor: colors.moss, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  sendDisabled: { backgroundColor: '#B8BDB8' },
});
