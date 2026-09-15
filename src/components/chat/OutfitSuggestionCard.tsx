import { GarmentCollectionCard } from '@/components/chat/GarmentCollectionCard';
import type { ChatMessage } from '@/models/agent';

type OutfitSuggestionMessage = Extract<ChatMessage, { kind: 'outfit_suggestion' }>;

export function OutfitSuggestionCard({ message }: { message: OutfitSuggestionMessage }) {
  return (
    <GarmentCollectionCard
      description={message.reason}
      eyebrow="Outfit suggestion"
      garments={message.garments}
      title={message.title}
    />
  );
}
