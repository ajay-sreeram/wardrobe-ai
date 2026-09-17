import { createRemoteJWKSet, jwtVerify } from 'jose';

import type { IntegrityEnv } from './integrity';

export interface UserAuthEnv extends IntegrityEnv {
  API_ANALYTICS?: AnalyticsEngineDataset;
}

export type UsageKind = 'muse' | 'gemini';
export type UserAccess = { provided: boolean; userId: string | null };

const appleKeys = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const accountLifetimeSeconds = 7 * 24 * 60 * 60;

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(first: Uint8Array, second: Uint8Array) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) difference |= first[index] ^ second[index];
  return difference === 0;
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

async function userIdForAppleSubject(subject: string, env: UserAuthEnv) {
  return base64Url(await hmac(`apple:${subject}`, env.SESSION_SECRET));
}

async function createAccountSession(userId: string, env: UserAuthEnv) {
  const expiresAt = Math.floor(Date.now() / 1000) + accountLifetimeSeconds;
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({ type: 'user', userId, expiresAt })));
  const signature = base64Url(await hmac(payload, env.SESSION_SECRET));
  return { token: `${payload}.${signature}`, expiresAt, userId };
}

async function verifyAccountToken(token: string, env: UserAuthEnv) {
  const [payload, encodedSignature, extra] = token.split('.');
  if (!payload || !encodedSignature || extra) return null;
  try {
    const supplied = decodeBase64Url(encodedSignature);
    const expected = await hmac(payload, env.SESSION_SECRET);
    if (!constantTimeEqual(supplied, expected)) return null;
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as {
      type?: unknown;
      userId?: unknown;
      expiresAt?: unknown;
    };
    if (claims.type !== 'user' || typeof claims.userId !== 'string' || typeof claims.expiresAt !== 'number') return null;
    if (claims.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return claims.userId;
  } catch {
    return null;
  }
}

export async function verifyUserAccess(request: Request, env: UserAuthEnv): Promise<UserAccess> {
  const token = request.headers.get('X-Wardrobe-User');
  if (!token) return { provided: false, userId: null };
  return { provided: true, userId: await verifyAccountToken(token, env) };
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return Response.json(body, { status, headers: { ...cors, 'Cache-Control': 'no-store' } });
}

async function appleLogin(request: Request, env: UserAuthEnv, cors: Record<string, string>, deviceKeyId: string | null) {
  const body: unknown = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid login request.' }, 400, cors);
  const identityToken = (body as { identityToken?: unknown }).identityToken;
  if (typeof identityToken !== 'string' || identityToken.length > 12_000) return json({ error: 'An Apple identity token is required.' }, 400, cors);

  try {
    const verified = await jwtVerify(identityToken, appleKeys, {
      issuer: 'https://appleid.apple.com',
      audience: env.APPLE_BUNDLE_ID,
    });
    if (!verified.payload.sub) throw new Error('Missing Apple subject');
    const userId = await userIdForAppleSubject(verified.payload.sub, env);
    const now = Math.floor(Date.now() / 1000);
    await env.ATTEST_DB.prepare(
      `INSERT INTO users (id, created_at, last_seen_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
    ).bind(userId, now, now).run();
    if (deviceKeyId) {
      await env.ATTEST_DB.prepare(
        `INSERT INTO device_users (key_id, user_id, linked_at) VALUES (?, ?, ?)
         ON CONFLICT(key_id) DO UPDATE SET user_id = excluded.user_id, linked_at = excluded.linked_at`,
      ).bind(deviceKeyId, userId, now).run();
    }
    return json(await createAccountSession(userId, env), 200, cors);
  } catch {
    return json({ error: 'Apple sign-in could not be verified.' }, 401, cors);
  }
}

async function usageSummary(request: Request, env: UserAuthEnv, cors: Record<string, string>) {
  const access = await verifyUserAccess(request, env);
  if (!access.userId) return json({ error: 'A valid account session is required.' }, 401, cors);
  const start = new Date();
  start.setUTCDate(1);
  const monthStart = start.toISOString().slice(0, 10);
  const rows = await env.ATTEST_DB.prepare(
    `SELECT COALESCE(SUM(muse_requests), 0) AS museRequests,
            COALESCE(SUM(gemini_requests), 0) AS geminiRequests,
            COALESCE(SUM(failed_requests), 0) AS failedRequests,
            COALESCE(SUM(input_tokens), 0) AS inputTokens,
            COALESCE(SUM(output_tokens), 0) AS outputTokens
     FROM usage_daily WHERE user_id = ? AND usage_date >= ?`,
  ).bind(access.userId, monthStart).first();
  return json({ periodStart: monthStart, ...rows }, 200, cors);
}

export async function handleUserRoute(
  request: Request,
  url: URL,
  env: UserAuthEnv,
  cors: Record<string, string>,
  deviceKeyId: string | null,
) {
  if (url.pathname === '/v1/auth/apple' && request.method === 'POST') return appleLogin(request, env, cors, deviceKeyId);
  if (url.pathname === '/v1/usage' && request.method === 'GET') return usageSummary(request, env, cors);
  return json({ error: 'Not found.' }, 404, cors);
}

function tokenCounts(body: unknown) {
  if (!body || typeof body !== 'object') return { input: 0, output: 0 };
  const record = body as Record<string, unknown>;
  const usage = (record.usage ?? record.usage_metadata ?? record.usageMetadata) as Record<string, unknown> | undefined;
  if (!usage || typeof usage !== 'object') return { input: 0, output: 0 };
  const number = (...keys: string[]) => {
    for (const key of keys) if (typeof usage[key] === 'number') return Math.max(0, Math.floor(usage[key] as number));
    return 0;
  };
  return {
    input: number('prompt_tokens', 'input_tokens', 'promptTokenCount'),
    output: number('completion_tokens', 'output_tokens', 'candidatesTokenCount'),
  };
}

export async function recordUsage(
  env: UserAuthEnv,
  userId: string | null,
  kind: UsageKind,
  status: number,
  durationMs: number,
  response: Response,
) {
  let tokens = { input: 0, output: 0 };
  try {
    tokens = tokenCounts(await response.clone().json());
  } catch {
    // Image and error responses do not always contain token metadata.
  }

  env.API_ANALYTICS?.writeDataPoint({
    indexes: [userId ?? 'anonymous'],
    blobs: [kind, String(status)],
    doubles: [durationMs, tokens.input, tokens.output],
  });

  if (!userId) return;
  const date = new Date().toISOString().slice(0, 10);
  const muse = kind === 'muse' ? 1 : 0;
  const gemini = kind === 'gemini' ? 1 : 0;
  const failed = status >= 400 ? 1 : 0;
  await env.ATTEST_DB.prepare(
    `INSERT INTO usage_daily
       (user_id, usage_date, muse_requests, gemini_requests, failed_requests, input_tokens, output_tokens)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, usage_date) DO UPDATE SET
       muse_requests = muse_requests + excluded.muse_requests,
       gemini_requests = gemini_requests + excluded.gemini_requests,
       failed_requests = failed_requests + excluded.failed_requests,
       input_tokens = input_tokens + excluded.input_tokens,
       output_tokens = output_tokens + excluded.output_tokens`,
  ).bind(userId, date, muse, gemini, failed, tokens.input, tokens.output).run();
}
