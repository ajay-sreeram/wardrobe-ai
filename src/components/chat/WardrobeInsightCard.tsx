import { GarmentCollectionCard } from '@/components/chat/GarmentCollectionCard';
import type { ChatMessage } from '@/models/agent';

type InsightMessage = Extract<ChatMessage, { kind: 'wardrobe_insight' }>;

const insightLabels: Record<InsightMessage['insightKind'], string> = {
  rediscovery: 'Worth rediscovering',
  rotation: 'Wardrobe rotation',
  pairing: 'Pairing pattern',
  habit: 'Your wardrobe pattern',
};

export function WardrobeInsightCard({ message }: { message: InsightMessage }) {
  return (
    <GarmentCollectionCard
      description={message.summary}
      eyebrow={insightLabels[message.insightKind]}
      garments={message.garments}
      title={message.title}
    />
  );
}
