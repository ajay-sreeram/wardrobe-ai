import { verifyAssertion, verifyAttestation } from 'node-app-attest';

export interface IntegrityEnv {
  APPLE_BUNDLE_ID: string;
  APPLE_TEAM_ID: string;
  ATTEST_DB: D1Database;
  INTEGRITY_MODE: string;
  SESSION_SECRET: string;
}

type CorsHeaders = Record<string, string>;
type ChallengePurpose = 'attest' | 'session';
type AttestedKey = { key_id: string; public_key: string; sign_count: number };

const challengeLifetimeSeconds = 90;
const sessionLifetimeSeconds = 60 * 60;

function json(body: unknown, status: number, cors: CorsHeaders, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...cors, 'Cache-Control': 'no-store', ...extra } });
}

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

async function sessionSignature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

async function createSessionToken(keyId: string, env: IntegrityEnv) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionLifetimeSeconds;
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({ keyId, expiresAt })));
  const signature = base64Url(await sessionSignature(payload, env.SESSION_SECRET));
  return { token: `${payload}.${signature}`, expiresAt };
}

async function sessionKeyId(request: Request, env: IntegrityEnv) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const [payload, encodedSignature, extra] = authorization.slice(7).split('.');
  if (!payload || !encodedSignature || extra) return null;
  try {
    const supplied = decodeBase64Url(encodedSignature);
    const expected = await sessionSignature(payload, env.SESSION_SECRET);
    if (!constantTimeEqual(supplied, expected)) return null;
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as { keyId?: unknown; expiresAt?: unknown };
    if (typeof claims.keyId !== 'string' || typeof claims.expiresAt !== 'number') return null;
    if (claims.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return claims.keyId;
  } catch {
    return null;
  }
}

function validString(value: unknown, maximum = 16_384): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum;
}

async function objectBody(request: Request) {
  const value: unknown = await request.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid body');
  return value as Record<string, unknown>;
}

async function issueChallenge(request: Request, env: IntegrityEnv, cors: CorsHeaders) {
  const body = await objectBody(request);
  const purpose = body.purpose;
  const keyId = body.keyId;
  if (purpose !== 'attest' && purpose !== 'session') return json({ error: 'Invalid challenge purpose.' }, 400, cors);
  if (purpose === 'session' && !validString(keyId, 256)) return json({ error: 'A key ID is required.' }, 400, cors);

  if (purpose === 'session') {
    const known = await env.ATTEST_DB.prepare('SELECT 1 FROM attested_keys WHERE key_id = ?').bind(keyId).first();
    if (!known) return json({ error: 'Unknown device key.' }, 401, cors, { 'X-Wardrobe-Auth': 'required' });
  }

  const random = crypto.getRandomValues(new Uint8Array(32));
  const id = crypto.randomUUID();
  const challenge = base64Url(random);
  const expiresAt = Math.floor(Date.now() / 1000) + challengeLifetimeSeconds;
  await env.ATTEST_DB.prepare(
    'INSERT INTO integrity_challenges (id, challenge, purpose, key_id, expires_at) VALUES (?, ?, ?, ?, ?)',
  ).bind(id, challenge, purpose, purpose === 'session' ? keyId : null, expiresAt).run();
  return json({ id, challenge, expiresAt }, 200, cors);
}

async function consumeChallenge(id: string, purpose: ChallengePurpose, keyId: string | null, env: IntegrityEnv) {
  return env.ATTEST_DB.prepare(
    `DELETE FROM integrity_challenges
     WHERE id = ? AND purpose = ? AND expires_at >= ? AND (key_id IS ? OR key_id = ?)
     RETURNING challenge`,
  ).bind(id, purpose, Math.floor(Date.now() / 1000), keyId, keyId).first<{ challenge: string }>();
}

async function registerAttestation(request: Request, env: IntegrityEnv, cors: CorsHeaders) {
  const body = await objectBody(request);
  if (!validString(body.challengeId, 64) || !validString(body.keyId, 256) || !validString(body.attestation)) {
    return json({ error: 'Invalid attestation request.' }, 400, cors);
  }
  const challenge = await consumeChallenge(body.challengeId, 'attest', null, env);
  if (!challenge) return json({ error: 'Challenge is invalid or expired.' }, 401, cors, { 'X-Wardrobe-Auth': 'required' });

  try {
    const result = verifyAttestation({
      attestation: Buffer.from(body.attestation, 'base64'),
      challenge: challenge.challenge,
      keyId: body.keyId,
      bundleIdentifier: env.APPLE_BUNDLE_ID,
      teamIdentifier: env.APPLE_TEAM_ID,
      allowDevelopmentEnvironment: env.INTEGRITY_MODE !== 'enforce-production',
    });
    const now = Math.floor(Date.now() / 1000);
    await env.ATTEST_DB.prepare(
      `INSERT INTO attested_keys (key_id, public_key, sign_count, environment, created_at, last_used_at)
       VALUES (?, ?, 0, ?, ?, ?)
       ON CONFLICT(key_id) DO UPDATE SET public_key = excluded.public_key, sign_count = 0,
       environment = excluded.environment, last_used_at = excluded.last_used_at`,
    ).bind(body.keyId, result.publicKey, result.environment, now, now).run();
    return json({ ok: true }, 200, cors);
  } catch {
    return json({ error: 'App attestation could not be verified.' }, 401, cors, { 'X-Wardrobe-Auth': 'required' });
  }
}

async function createSession(request: Request, env: IntegrityEnv, cors: CorsHeaders) {
  const body = await objectBody(request);
  if (!validString(body.challengeId, 64) || !validString(body.keyId, 256) || !validString(body.assertion)) {
    return json({ error: 'Invalid assertion request.' }, 400, cors);
  }
  const challenge = await consumeChallenge(body.challengeId, 'session', body.keyId, env);
  if (!challenge) return json({ error: 'Challenge is invalid or expired.' }, 401, cors, { 'X-Wardrobe-Auth': 'required' });
  const key = await env.ATTEST_DB.prepare(
    'SELECT key_id, public_key, sign_count FROM attested_keys WHERE key_id = ?',
  ).bind(body.keyId).first<AttestedKey>();
  if (!key) return json({ error: 'Unknown device key.' }, 401, cors, { 'X-Wardrobe-Auth': 'required' });

  try {
    const result = verifyAssertion({
      assertion: Buffer.from(body.assertion, 'base64'),
      payload: challenge.challenge,
      publicKey: key.public_key,
      bundleIdentifier: env.APPLE_BUNDLE_ID,
      teamIdentifier: env.APPLE_TEAM_ID,
      signCount: key.sign_count,
    });
    const updated = await env.ATTEST_DB.prepare(
      'UPDATE attested_keys SET sign_count = ?, last_used_at = ? WHERE key_id = ? AND sign_count = ?',
    ).bind(result.signCount, Math.floor(Date.now() / 1000), body.keyId, key.sign_count).run();
    if (updated.meta.changes !== 1) throw new Error('Assertion replayed');
    return json(await createSessionToken(body.keyId, env), 200, cors);
  } catch {
    return json({ error: 'App assertion could not be verified.' }, 401, cors, { 'X-Wardrobe-Auth': 'required' });
  }
}

export function integrityIsEnforced(env: IntegrityEnv) {
  return env.INTEGRITY_MODE === 'enforce' || env.INTEGRITY_MODE === 'enforce-production';
}

export async function verifyApiAccess(request: Request, env: IntegrityEnv) {
  if (!integrityIsEnforced(env)) return { authorized: true, actor: null };
  const keyId = await sessionKeyId(request, env);
  return { authorized: Boolean(keyId), actor: keyId };
}

export async function handleIntegrityRoute(request: Request, url: URL, env: IntegrityEnv, cors: CorsHeaders) {
  if (request.method === 'GET' && url.pathname === '/v1/integrity/status') {
    return json({ required: integrityIsEnforced(env), platform: 'ios-app-attest' }, 200, cors);
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, cors);
  try {
    if (url.pathname === '/v1/integrity/challenge') return await issueChallenge(request, env, cors);
    if (url.pathname === '/v1/integrity/attest') return await registerAttestation(request, env, cors);
    if (url.pathname === '/v1/integrity/session') return await createSession(request, env, cors);
  } catch {
    return json({ error: 'Invalid integrity request.' }, 400, cors);
  }
  return json({ error: 'Not found.' }, 404, cors);
}
