import { authenticatedRequestInit, invalidateIntegritySession } from '@/network/appIntegrity';

const maximumAttempts = 3;
const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

function pause(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchWithRetry(url: string, init: RequestInit, timeoutMs: number) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const authenticatedInit = await authenticatedRequestInit(url, init);
      const response = await fetch(url, { ...authenticatedInit, signal: controller.signal });
      if (response.status === 401 && response.headers.get('X-Wardrobe-Auth') === 'required' && attempt < maximumAttempts) {
        await invalidateIntegritySession();
        continue;
      }
      if (!retryableStatuses.has(response.status) || attempt === maximumAttempts) return response;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.name === 'AbortError') throw error;
      if (attempt === maximumAttempts) throw error;
    } finally {
      clearTimeout(timeout);
    }

    await pause(attempt * 400);
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed.');
}
