import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgentProgress } from '@/components/chat/AgentProgress';
import { ConfirmationCard } from '@/components/chat/ConfirmationCard';
import { AppText } from '@/components/ui/AppText';
import type { ChatMessage as ChatMessageModel } from '@/models/agent';
import { colors, radius, spacing } from '@/theme/tokens';

export function ChatMessage({ message }: { message: ChatMessageModel }) {
  if (message.kind === 'status') return <AgentProgress text={message.text} />;
  if (message.kind === 'confirmation') return <ConfirmationCard {...message} />;
  if (message.kind === 'image') return <ChatImageMessage message={message} />;
  if (message.kind === 'error') {
    return (
      <View style={styles.error}>
        <Ionicons color={colors.danger} name="alert-circle-outline" size={18} />
        <AppText variant="caption" style={styles.errorText}>{message.text}</AppText>
      </View>
    );
  }

  const user = message.role === 'user';
  return (
    <View style={[styles.bubble, user ? styles.user : styles.assistant]}>
      <AppText style={user ? styles.userText : undefined}>{message.text}</AppText>
    </View>
  );
}

function ChatImageMessage({ message }: { message: Extract<ChatMessageModel, { kind: 'image' }> }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <Pressable
        accessibilityHint="Opens the full photo"
        accessibilityLabel="View uploaded photo"
        accessibilityRole="button"
        onPress={() => setExpanded(true)}
        style={styles.imageBubble}>
        <Image contentFit="contain" source={{ uri: message.uri }} style={styles.image} transition={150} />
        <View style={styles.privateNote}>
          <Ionicons color={colors.surface} name="expand-outline" size={13} />
          <AppText variant="caption" style={styles.privateText}>Tap to view</AppText>
        </View>
      </Pressable>
      <Modal animationType="fade" onRequestClose={() => setExpanded(false)} transparent visible={expanded}>
        <SafeAreaView style={styles.modalOverlay}>
          <Pressable accessibilityLabel="Close full photo" onPress={() => setExpanded(false)} style={styles.modalBackdrop} />
          <View style={styles.modalCard}>
            <Image contentFit="contain" source={{ uri: message.uri }} style={styles.modalImage} transition={150} />
            <Pressable accessibilityLabel="Close full photo" hitSlop={10} onPress={() => setExpanded(false)} style={styles.modalClose}>
              <Ionicons color={colors.ink} name="close" size={24} />
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: radius.md, maxWidth: '84%', paddingHorizontal: spacing.md, paddingVertical: 12 },
  user: { alignSelf: 'flex-end', backgroundColor: colors.moss, borderBottomRightRadius: 5 },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 5 },
  userText: { color: colors.surface },
  imageBubble: { alignSelf: 'flex-end', backgroundColor: '#E8E7E2', borderRadius: radius.md, height: 290, maxWidth: 320, overflow: 'hidden', width: '82%' },
  image: { height: '100%', width: '100%' },
  privateNote: { alignItems: 'center', backgroundColor: 'rgba(30,33,30,0.72)', borderRadius: radius.pill, bottom: spacing.sm, flexDirection: 'row', gap: 5, left: spacing.sm, paddingHorizontal: 9, paddingVertical: 5, position: 'absolute' },
  privateText: { color: colors.surface },
  modalOverlay: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.md },
  modalBackdrop: { backgroundColor: 'rgba(20,22,20,0.86)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  modalCard: { backgroundColor: '#111311', borderRadius: radius.lg, height: '82%', overflow: 'hidden', width: '100%' },
  modalImage: { height: '100%', width: '100%' },
  modalClose: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', position: 'absolute', right: spacing.sm, top: spacing.sm, width: 44 },
  error: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#F6E3DF', borderRadius: radius.sm, flexDirection: 'row', gap: spacing.sm, maxWidth: '88%', padding: spacing.sm },
  errorText: { color: colors.danger, flex: 1 },
});
