import { StyleSheet, View } from 'react-native';

import { AgentProgress } from '@/components/chat/AgentProgress';
import { ConfirmationCard } from '@/components/chat/ConfirmationCard';
import { AppText } from '@/components/ui/AppText';
import type { ChatMessage as ChatMessageModel } from '@/models/agent';
import { colors, radius, spacing } from '@/theme/tokens';

export function ChatMessage({ message }: { message: ChatMessageModel }) {
  if (message.kind === 'status') return <AgentProgress text={message.text} />;
  if (message.kind === 'confirmation') return <ConfirmationCard {...message} />;

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
});
