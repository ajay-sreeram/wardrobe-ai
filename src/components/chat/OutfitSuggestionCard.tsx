import { GarmentCollectionCard } from '@/components/chat/GarmentCollectionCard';
import type { ChatMessage } from '@/models/agent';

type OutfitSuggestionMessage = Extract<ChatMessage, { kind: 'outfit_suggestion' }>;

export function OutfitSuggestionCard({ message }: { message: OutfitSuggestionMessage }) {
  const eyebrow = message.suggestionKind === 'packing'
    ? 'Packing list'
    : message.suggestionKind === 'capsule'
      ? 'Capsule wardrobe'
      : 'Outfit suggestion';
  return (
    <GarmentCollectionCard
      description={message.reason}
      eyebrow={eyebrow}
      garments={message.garments}
      title={message.title}
    />
  );
}
