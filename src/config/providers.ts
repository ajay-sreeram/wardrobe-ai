import { appEnv } from '@/config/env';

const apiBaseUrl = appEnv.apiBaseUrl ?? '';

export const providerConfig = {
  muse: {
    baseUrl: `${apiBaseUrl}/v1/muse`,
    model: 'muse-spark-1.3-contributor',
  },
  gemini: {
    baseUrl: `${apiBaseUrl}/v1/gemini`,
    model: 'models/gemini-3.1-flash-lite-image',
  },
} as const;

export function hasApiProxy() {
  return Boolean(appEnv.apiBaseUrl);
}
