import Constants from 'expo-constants';
import { z } from 'zod';

const developmentEnvSchema = z.object({
  museApiKey: z.string().min(1).optional(),
  geminiApiKey: z.string().min(1).optional(),
});

const parsed = developmentEnvSchema.safeParse(Constants.expoConfig?.extra ?? {});

// Development only. These values are embedded in the Expo client bundle.
export const developmentEnv = parsed.success ? parsed.data : {};
