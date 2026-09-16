import * as SecureStore from 'expo-secure-store';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import { appEnv } from '@/config/env';

const keyIdStorageKey = 'wardrobe.integrity.key-id';
const registeredKeyStorageKey = 'wardrobe.integrity.registered-key';
const sessionStorageKey = 'wardrobe.integrity.session';
const statusCacheMilliseconds = 5 * 60 * 1000;

type IntegrityStatus = { required: boolean };
type Challenge = { id: string; challenge: string; expiresAt: number };
type Session = { token: string; expiresAt: number };
type NativeAppIntegrity = {
  isSupported: boolean;
  generateKeyAsync(): Promise<string>;
  attestKeyAsync(keyId: string, challenge: string): Promise<string>;
  generateAssertionAsync(keyId: string, challenge: string): Promise<string>;
};

const appIntegrity = requireOptionalNativeModule<NativeAppIntegrity>('ExpoAppIntegrity');

function requiredAppIntegrity() {
  if (!appIntegrity?.isSupported) throw new Error('This device cannot verify the Wardrobe app installation.');
  return appIntegrity;
}

class IntegrityRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

let cachedStatus: { value: IntegrityStatus; checkedAt: number } | null = null;
let sessionPromise: Promise<string> | null = null;

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!appEnv.apiBaseUrl) throw new Error('The API Worker is not configured.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${appEnv.apiBaseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({})) as { error?: unknown };
    if (!response.ok) {
      const message = typeof body.error === 'string' ? body.error : 'App verification failed.';
      throw new IntegrityRequestError(message, response.status);
    }
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function integrityStatus() {
  if (cachedStatus && Date.now() - cachedStatus.checkedAt < statusCacheMilliseconds) return cachedStatus.value;
  const value = await requestJson<IntegrityStatus>('/v1/integrity/status');
  cachedStatus = { value, checkedAt: Date.now() };
  return value;
}

async function challenge(purpose: 'attest' | 'session', keyId?: string) {
  return requestJson<Challenge>('/v1/integrity/challenge', {
    method: 'POST',
    body: JSON.stringify({ purpose, ...(keyId ? { keyId } : {}) }),
  });
}

async function registerKey(keyId: string) {
  const current = await challenge('attest');
  const attestation = await requiredAppIntegrity().attestKeyAsync(keyId, current.challenge);
  await requestJson('/v1/integrity/attest', {
    method: 'POST',
    body: JSON.stringify({ challengeId: current.id, keyId, attestation }),
  });
  await SecureStore.setItemAsync(registeredKeyStorageKey, keyId);
}

async function createSession(keyId: string) {
  const current = await challenge('session', keyId);
  const assertion = await requiredAppIntegrity().generateAssertionAsync(keyId, current.challenge);
  const session = await requestJson<Session>('/v1/integrity/session', {
    method: 'POST',
    body: JSON.stringify({ challengeId: current.id, keyId, assertion }),
  });
  await SecureStore.setItemAsync(sessionStorageKey, JSON.stringify(session));
  return session.token;
}

async function clearDeviceKey() {
  await Promise.all([
    SecureStore.deleteItemAsync(keyIdStorageKey),
    SecureStore.deleteItemAsync(registeredKeyStorageKey),
    SecureStore.deleteItemAsync(sessionStorageKey),
  ]);
}

async function acquireSession(allowKeyRegeneration: boolean): Promise<string> {
  let keyId = await SecureStore.getItemAsync(keyIdStorageKey);
  if (!keyId) {
    keyId = await requiredAppIntegrity().generateKeyAsync();
    await SecureStore.setItemAsync(keyIdStorageKey, keyId);
  }

  try {
    const registeredKey = await SecureStore.getItemAsync(registeredKeyStorageKey);
    if (registeredKey !== keyId) await registerKey(keyId);
    return await createSession(keyId);
  } catch (error) {
    if (!allowKeyRegeneration) throw error;
    await clearDeviceKey();
    return acquireSession(false);
  }
}

async function validStoredSession() {
  const stored = await SecureStore.getItemAsync(sessionStorageKey);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as Session;
    if (typeof session.token === 'string' && session.expiresAt > Math.floor(Date.now() / 1000) + 60) return session.token;
  } catch {
    // Replace malformed or obsolete local session data.
  }
  await SecureStore.deleteItemAsync(sessionStorageKey);
  return null;
}

async function integritySession() {
  const stored = await validStoredSession();
  if (stored) return stored;
  if (!sessionPromise) sessionPromise = acquireSession(true).finally(() => { sessionPromise = null; });
  return sessionPromise;
}

export async function authenticatedRequestInit(url: string, init: RequestInit) {
  if (!appEnv.apiBaseUrl || !url.startsWith(appEnv.apiBaseUrl)) return init;
  const status = await integrityStatus();
  if (!status.required) return init;
  if (Platform.OS !== 'ios' || !appIntegrity?.isSupported) {
    throw new Error('This device cannot verify the Wardrobe app installation.');
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await integritySession()}`);
  return { ...init, headers };
}

export async function invalidateIntegritySession() {
  await SecureStore.deleteItemAsync(sessionStorageKey);
}
