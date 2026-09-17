import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AgentProgress } from '@/components/chat/AgentProgress';
import { ActionConfirmationCard } from '@/components/chat/ActionConfirmationCard';
import { ConfirmationCard } from '@/components/chat/ConfirmationCard';
import { DuplicateCandidateCard } from '@/components/chat/DuplicateCandidateCard';
import { GarmentBatchConfirmationCard } from '@/components/chat/GarmentBatchConfirmationCard';
import { ExpandableImage } from '@/components/chat/ExpandableImage';
import { OutfitSuggestionCard } from '@/components/chat/OutfitSuggestionCard';
import { WardrobeResultsCard } from '@/components/chat/WardrobeResultsCard';
import { WearConfirmationCard } from '@/components/chat/WearConfirmationCard';
import { WardrobeInsightCard } from '@/components/chat/WardrobeInsightCard';
import { AppText } from '@/components/ui/AppText';
import type { ChatMessage as ChatMessageModel } from '@/models/agent';
import { useAppTheme, useThemedStyles } from '@/theme/AppThemeProvider';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';

export function ChatMessage({ message, onRetry }: { message: ChatMessageModel; onRetry?: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (message.kind === 'conversation_boundary') {
    return (
      <View accessibilityLabel="New conversation" style={styles.boundary}>
        <View style={styles.boundaryLine} />
        <AppText variant="caption" style={styles.boundaryText}>New conversation</AppText>
        <View style={styles.boundaryLine} />
      </View>
    );
  }
  if (message.kind === 'status') return <AgentProgress text={message.text} />;
  if (message.kind === 'confirmation') return <ConfirmationCard {...message} />;
  if (message.kind === 'duplicate') return <DuplicateCandidateCard message={message} />;
  if (message.kind === 'garment_batch_confirmation') return <GarmentBatchConfirmationCard message={message} />;
  if (message.kind === 'image') return <ExpandableImage badge="Attached" expandedUri={message.expandedUri} style={styles.imageBubble} uri={message.uri} />;
  if (message.kind === 'wardrobe_results') return <WardrobeResultsCard garments={message.garments} />;
  if (message.kind === 'outfit_suggestion') return <OutfitSuggestionCard message={message} />;
  if (message.kind === 'wardrobe_insight') return <WardrobeInsightCard message={message} />;
  if (message.kind === 'wear_confirmation') return <WearConfirmationCard message={message} />;
  if (message.kind === 'action_confirmation') return <ActionConfirmationCard message={message} />;
  if (message.kind === 'action_status') {
    return (
      <View style={styles.statusNote}>
        <Ionicons color={message.applied ? colors.moss : colors.inkMuted} name={message.applied ? 'checkmark-circle' : 'close-circle-outline'} size={20} />
        <AppText variant="caption" style={styles.statusText}>{message.applied ? `${message.summary}.` : 'Change not applied.'}</AppText>
      </View>
    );
  }
  if (message.kind === 'wear_status') {
    return (
      <View style={styles.statusNote}>
        <Ionicons color={message.logged ? colors.moss : colors.inkMuted} name={message.logged ? 'checkmark-circle' : 'close-circle-outline'} size={20} />
        <AppText variant="caption" style={styles.statusText}>
          {message.logged ? `${message.garmentNames.join(' + ')} added to your Timeline.` : 'Wear entry not added.'}
        </AppText>
      </View>
    );
  }
  if (message.kind === 'error') {
    return (
      <View style={styles.error}>
        <Ionicons color={colors.danger} name="alert-circle-outline" size={18} />
        <AppText variant="caption" style={styles.errorText}>{message.text}</AppText>
        {message.retryable && onRetry ? (
          <Pressable accessibilityLabel="Retry failed request" hitSlop={8} onPress={onRetry} style={styles.retry}>
            <Ionicons color={colors.danger} name="refresh" size={15} />
            <AppText variant="caption" style={styles.retryText}>Retry</AppText>
          </Pressable>
        ) : null}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bubble: { borderRadius: radius.md, maxWidth: '84%', paddingHorizontal: spacing.md, paddingVertical: 12 },
  user: { alignSelf: 'flex-end', backgroundColor: colors.moss, borderBottomRightRadius: 5 },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 5 },
  userText: { color: colors.surface },
  imageBubble: { alignSelf: 'flex-end', backgroundColor: colors.garmentCanvasMuted, borderRadius: radius.md, height: 112, overflow: 'hidden', width: 92 },
  error: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.claySoft, borderRadius: radius.sm, flexDirection: 'row', gap: spacing.sm, maxWidth: '88%', padding: spacing.sm },
  errorText: { color: colors.danger, flex: 1 },
  retry: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 7 },
  retryText: { color: colors.danger },
  statusNote: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.mossSoft, borderRadius: radius.sm, flexDirection: 'row', gap: spacing.sm, maxWidth: '88%', padding: spacing.sm },
  statusText: { color: colors.inkMuted, flex: 1 },
  boundary: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  boundaryLine: { backgroundColor: colors.line, flex: 1, height: StyleSheet.hairlineWidth },
  boundaryText: { color: colors.inkMuted },
});
