import { GarmentCollectionCard } from '@/components/chat/GarmentCollectionCard';
import type { WardrobeChatGarment } from '@/models/agent';

export function WardrobeResultsCard({ garments }: { garments: WardrobeChatGarment[] }) {
  return <GarmentCollectionCard eyebrow="From your wardrobe" garments={garments} />;
}
