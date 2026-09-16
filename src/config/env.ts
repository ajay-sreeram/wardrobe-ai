import Constants from 'expo-constants';
import { z } from 'zod';

const appEnvSchema = z.object({
  apiBaseUrl: z.string().url().transform((value) => value.replace(/\/$/, '')).optional(),
});

const parsed = appEnvSchema.safeParse(Constants.expoConfig?.extra ?? {});

// This URL is public by design. Provider credentials are never included in Expo configuration.
export const appEnv = parsed.success ? parsed.data : {};
