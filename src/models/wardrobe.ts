import { z } from 'zod';

export const garmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  sectionId: z.string().nullable(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  canonicalImage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  wearCount: z.number().int().nonnegative(),
  lastWornAt: z.string().nullable(),
});

export type Garment = z.infer<typeof garmentSchema>;

export type WardrobeSection = {
  id: string;
  name: string;
  position: number;
  garments: Garment[];
};

export type WearEntry = {
  id: string;
  garmentIds: string[];
  wornAt: string;
  note: string | null;
  garments: Garment[];
};
