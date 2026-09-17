import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';

import { appEnv } from '@/config/env';
import { authenticatedRequestInit } from '@/network/appIntegrity';

const accountStorageKey = 'wardrobe.account.session';

export type AccountSession = { token: string; expiresAt: number; userId: string };
export type UsageSummary = {
  periodStart: string;
  museRequests: number;
  geminiRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
};

async function request<T>(path: string, init: RequestInit) {
  if (!appEnv.apiBaseUrl) throw new Error('The API Worker is not configured.');
  const url = `${appEnv.apiBaseUrl}${path}`;
  const secured = await authenticatedRequestInit(url, init);
  const response = await fetch(url, secured);
  const body = await response.json().catch(() => ({})) as { error?: unknown };
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The account request failed.');
  return body as T;
}

export async function isAppleAccountAvailable() {
  return AppleAuthentication.isAvailableAsync();
}

export async function readAccountSession() {
  const stored = await SecureStore.getItemAsync(accountStorageKey);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as AccountSession;
    if (typeof session.token === 'string' && typeof session.userId === 'string' && session.expiresAt > Math.floor(Date.now() / 1000)) {
      return session;
    }
  } catch {
    // Remove malformed or obsolete account data.
  }
  await SecureStore.deleteItemAsync(accountStorageKey);
  return null;
}

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
  const session = await request<AccountSession>('/v1/auth/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityToken: credential.identityToken }),
  });
  await SecureStore.setItemAsync(accountStorageKey, JSON.stringify(session));
  return session;
}

export async function signOutAccount() {
  await SecureStore.deleteItemAsync(accountStorageKey);
}

export async function accountRequestInit(init: RequestInit) {
  const session = await readAccountSession();
  if (!session) return init;
  const headers = new Headers(init.headers);
  headers.set('X-Wardrobe-User', session.token);
  return { ...init, headers };
}

export async function readUsageSummary() {
  const session = await readAccountSession();
  if (!session) return null;
  return request<UsageSummary>('/v1/usage', { headers: { 'X-Wardrobe-User': session.token } });
}
