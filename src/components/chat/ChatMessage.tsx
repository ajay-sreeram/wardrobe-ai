import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AgentProgress } from '@/components/chat/AgentProgress';
import { ConfirmationCard } from '@/components/chat/ConfirmationCard';
import { DuplicateCandidateCard } from '@/components/chat/DuplicateCandidateCard';
import { ExpandableImage } from '@/components/chat/ExpandableImage';
import { AppText } from '@/components/ui/AppText';
import type { ChatMessage as ChatMessageModel } from '@/models/agent';
import { colors, radius, spacing } from '@/theme/tokens';

export function ChatMessage({ message }: { message: ChatMessageModel }) {
  if (message.kind === 'status') return <AgentProgress text={message.text} />;
  if (message.kind === 'confirmation') return <ConfirmationCard {...message} />;
  if (message.kind === 'duplicate') return <DuplicateCandidateCard message={message} />;
  if (message.kind === 'image') return <ExpandableImage badge="Attached" style={styles.imageBubble} uri={message.uri} />;
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

const styles = StyleSheet.create({
  bubble: { borderRadius: radius.md, maxWidth: '84%', paddingHorizontal: spacing.md, paddingVertical: 12 },
  user: { alignSelf: 'flex-end', backgroundColor: colors.moss, borderBottomRightRadius: 5 },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 5 },
  userText: { color: colors.surface },
  imageBubble: { alignSelf: 'flex-end', backgroundColor: '#E8E7E2', borderRadius: radius.md, height: 112, overflow: 'hidden', width: 92 },
  error: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#F6E3DF', borderRadius: radius.sm, flexDirection: 'row', gap: spacing.sm, maxWidth: '88%', padding: spacing.sm },
  errorText: { color: colors.danger, flex: 1 },
});
