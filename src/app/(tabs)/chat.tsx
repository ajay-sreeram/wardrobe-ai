import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { coordinateImageObservation, coordinateTextConversation } from '@/agents/coordinator';
import { AgentProgress } from '@/components/chat/AgentProgress';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { StarterActions } from '@/components/chat/StarterActions';
import { AppText } from '@/components/ui/AppText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { developmentEnv } from '@/config/env';
import type { ChatMessage as ChatMessageModel } from '@/models/agent';
import { type PendingChatImage, useChatStore } from '@/state/chat';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

type FailedSubmission = { errorId: string; images: PendingChatImage[]; text: string };

export default function ChatScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const { addAssistantMessage, addError, addMessages, addPendingImages, draft, historyReady, hydrateHistory, messages, pendingImages, removeMessage, removePendingImage, sendMessage, setDraft, startNewConversation } = useChatStore();
  const listRef = useRef<FlashListRef<ChatMessageModel>>(null);
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [failedSubmission, setFailedSubmission] = useState<FailedSubmission | null>(null);
  const [progressText, setProgressText] = useState('Thinking…');
  const canSend = historyReady && Boolean(draft.trim() || pendingImages.length) && !sending;
  const boundaryIndex = messages.reduce((latest, message, index) => message.kind === 'conversation_boundary' ? index : latest, -1);
  const activeMessageCount = messages.length - boundaryIndex - 1;

  useEffect(() => {
    if (!historyReady) void hydrateHistory();
  }, [historyReady, hydrateHistory]);

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

  async function submit(submittedText: string, submittedImages: PendingChatImage[], displayUserMessage = true) {
    if (!historyReady || sendingRef.current || (!submittedText && !submittedImages.length)) return;
    sendingRef.current = true;
    setProgressText(submittedImages.length ? 'Analyzing garment…' : 'Thinking…');
    setSending(true);
    setFailedSubmission(null);
    try {
      const imageMessages: ChatMessageModel[] = submittedImages.map((image) => ({
        id: image.id,
        kind: 'image',
        role: 'user',
        uri: image.uri,
        width: image.width,
        height: image.height,
      }));
      if (displayUserMessage) sendMessage(imageMessages, submittedText);

      if (submittedImages.length) {
        if (!developmentEnv.geminiApiKey || !developmentEnv.museApiKey) {
          addError('Image analysis needs MUSE_API_KEY and GEMINI_API_KEY in local-secrets/.env. Restart Expo after adding them.');
          return;
        }

        const analysis = await coordinateImageObservation({
          museApiKey: developmentEnv.museApiKey,
          geminiApiKey: developmentEnv.geminiApiKey,
          db,
          images: submittedImages.map((image) => ({ uri: image.uri, mimeType: image.mimeType })),
          userMessage: submittedText,
          onProgress: setProgressText,
        });

        if (!analysis.garments.length) {
          addAssistantMessage(analysis.note || 'I could not find the requested garment clearly enough. Try one closer, well-lit photo with the whole garment in frame.');
          return;
        }

        addMessages(analysis.garments.map((garment, index) => {
          const id = `garment-preview-${Date.now()}-${index}`;
          if ('duplicateCandidate' in garment) {
            return {
              id,
              kind: 'duplicate' as const,
              garmentName: garment.name,
              category: garment.category,
              description: garment.description,
              colors: garment.colors,
              tags: garment.tags,
              sourceImageUri: garment.sourceImage.uri,
              sourceImageMimeType: garment.sourceImage.mimeType,
              existingGarmentId: garment.duplicateCandidate.id,
              existingGarmentName: garment.duplicateCandidate.name,
              existingImageUri: garment.duplicateCandidate.canonicalImage,
              matchReason: garment.duplicateReason,
              matchConfidence: garment.duplicateConfidence,
              userMessage: submittedText,
              memoryFacts: analysis.memoryFacts,
              suggestedSectionId: garment.suggestedSectionId,
              suggestedSectionName: garment.suggestedSectionName,
              wearContext: analysis.wearContext,
            };
          }
          return {
            id,
            kind: 'confirmation' as const,
            title: analysis.garments.length === 1 ? 'I found one garment' : `Garment ${index + 1} of ${analysis.garments.length}`,
            description: garment.description,
            garmentName: garment.name,
            canonicalImageUri: garment.canonicalImageUri,
            userMessage: submittedText,
            memoryFacts: analysis.memoryFacts,
            suggestedSectionId: garment.suggestedSectionId,
            suggestedSectionName: garment.suggestedSectionName,
            wearContext: analysis.wearContext,
            tags: [garment.category, ...garment.colors, ...garment.tags].filter((tag, tagIndex, tags) => tags.indexOf(tag) === tagIndex).slice(0, 12),
          };
        }));
        if (analysis.note) addAssistantMessage(analysis.note);
        return;
      }

      if (!developmentEnv.museApiKey) {
        addError('Muse is not configured. Add MUSE_API_KEY to local-secrets/.env, then restart Expo with a cleared cache.');
        return;
      }

      const reply = await coordinateTextConversation(developmentEnv.museApiKey, db, submittedText, messages, setProgressText);
      addMessages([
        { id: `assistant-${Date.now()}`, kind: 'text', role: 'assistant', text: reply.text },
        ...reply.outfitSuggestions.map((suggestion, index) => ({
          id: `outfit-suggestion-${Date.now()}-${index}`,
          kind: 'outfit_suggestion' as const,
          ...suggestion,
        })),
        ...(reply.garments.length ? [{ id: `wardrobe-results-${Date.now()}`, kind: 'wardrobe_results' as const, garments: reply.garments }] : []),
        ...(reply.wearProposal ? [{
          id: `wear-confirmation-${Date.now()}`,
          kind: 'wear_confirmation' as const,
          garments: reply.wearProposal.garments,
          garmentIds: reply.wearProposal.garmentIds,
          wornAt: reply.wearProposal.wornAt,
          note: reply.wearProposal.note,
        }] : []),
        ...(reply.actionProposal ? [{
          id: `action-confirmation-${Date.now()}`,
          kind: 'action_confirmation' as const,
          ...reply.actionProposal,
        }] : []),
      ]);
    } catch (error) {
      const errorId = addError(error instanceof Error ? error.message : 'I could not complete that request. Please try again.', true);
      setFailedSubmission({ errorId, images: submittedImages, text: submittedText });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function handleSend() {
    if (!canSend) return;
    void submit(draft.trim(), [...pendingImages]);
  }

  function handleStarter(prompt: string) {
    void submit(prompt, []);
  }

  function handleRetry() {
    if (!failedSubmission || sending) return;
    const retry = failedSubmission;
    removeMessage(retry.errorId);
    void submit(retry.text, retry.images, false);
  }

  function handleNewConversation() {
    const start = () => {
      setFailedSubmission(null);
      startNewConversation();
    };
    if (!draft.trim() && !pendingImages.length) {
      start();
      return;
    }
    Alert.alert('Start a new conversation?', 'Your unsent message and selected photos will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start new', onPress: start },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88} style={styles.flex}>
        <ScreenHeader
          action={{ disabled: sending || !historyReady, icon: 'create-outline', label: 'Start a new conversation', onPress: handleNewConversation }}
          eyebrow="Wardrobe assistant"
          settingsDisabled={sending}
          title="Your closet, in conversation"
        />
        <FlashList
          contentContainerStyle={styles.listContent}
          data={messages}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyExtractor={(item) => item.id}
          ListFooterComponent={activeMessageCount === 1 ? <StarterActions disabled={sending || !historyReady} onSelect={handleStarter} /> : null}
          ref={listRef}
          renderItem={({ item }) => <ChatMessage message={item} onRetry={item.kind === 'error' && item.id === failedSubmission?.errorId ? handleRetry : undefined} />}
        />
        {sending ? <View style={styles.progress}><AgentProgress text={progressText} /></View> : null}
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
            <Pressable accessibilityLabel="Attach garment photo" disabled={!historyReady || pendingImages.length >= 4 || sending} hitSlop={8} onPress={chooseImages} style={styles.attach}>
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
  const styles = useThemedStyles(createStyles);
  return (
    <>
      <AppText variant="caption" style={styles.selectionTitle}>{count} selected</AppText>
      <AppText variant="caption" style={styles.selectionCaption}>Only these photos</AppText>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  sendDisabled: { backgroundColor: colors.inkMuted },
});
