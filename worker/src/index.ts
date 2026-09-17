import { handleIntegrityRoute, type IntegrityEnv, verifyApiAccess } from './integrity';
import { handleUserRoute, recordUsage, type UserAuthEnv, verifyUserAccess } from './userAuth';

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Env extends IntegrityEnv, UserAuthEnv {
  ALLOWED_ORIGINS: string;
  API_RATE_LIMITER: RateLimitBinding;
  GEMINI_API_KEY: string;
  MUSE_API_KEY: string;
}

type ProxyRoute = {
  model: string;
  usageKind: 'muse' | 'gemini';
  upstream: string;
  authorization: (env: Env) => Record<string, string>;
  prepareBody: (body: Record<string, unknown>, model: string) => Record<string, unknown> | null;
};

const maximumBodyBytes = 25 * 1024 * 1024;

function boundedNumber(value: unknown, fallback: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(maximum, Math.floor(value))) : fallback;
}

function prepareMuseBody(body: Record<string, unknown>, model: string) {
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 4) return null;
  return {
    messages: body.messages,
    model,
    max_tokens: boundedNumber(body.max_tokens, 1024, 2048),
    reasoning_effort: 'minimal',
  };
}

function prepareGeminiBody(body: Record<string, unknown>, model: string) {
  if (!Array.isArray(body.input) || !body.input.length) return null;
  const requestedConfig = body.generation_config && typeof body.generation_config === 'object' && !Array.isArray(body.generation_config)
    ? body.generation_config as Record<string, unknown>
    : {};
  const generationConfig: Record<string, unknown> = {
    ...requestedConfig,
    thinking_level: 'minimal',
  };
  if ('max_output_tokens' in requestedConfig) {
    generationConfig.max_output_tokens = boundedNumber(requestedConfig.max_output_tokens, 1024, 2048);
  }
  if ('image_config' in requestedConfig) {
    generationConfig.image_config = { aspect_ratio: '3:4', image_size: '1K' };
  }
  return {
    model,
    store: false,
    input: body.input,
    generation_config: generationConfig,
    ...('response_format' in body ? { response_format: body.response_format } : {}),
    ...('response_modalities' in body ? { response_modalities: body.response_modalities } : {}),
  };
}

const routes: Record<string, ProxyRoute> = {
  '/v1/muse/chat/completions': {
    model: 'muse-spark-1.3-contributor',
    usageKind: 'muse',
    upstream: 'https://api.meta.ai/v1/chat/completions',
    authorization: (env) => ({ Authorization: `Bearer ${env.MUSE_API_KEY}` }),
    prepareBody: prepareMuseBody,
  },
  '/v1/gemini/interactions': {
    model: 'models/gemini-3.1-flash-lite-image',
    usageKind: 'gemini',
    upstream: 'https://generativelanguage.googleapis.com/v1beta/interactions',
    authorization: (env) => ({ 'x-goog-api-key': env.GEMINI_API_KEY }),
    prepareBody: prepareGeminiBody,
  },
};

function allowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed = env.ALLOWED_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean);
  return allowed.includes('*') || allowed.includes(origin) ? origin : false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return origin ? {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Wardrobe-User',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
  } : {};
}

function jsonResponse(body: unknown, status: number, origin: string | null) {
  return Response.json(body, { status, headers: corsHeaders(origin) });
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);
    if (origin === false) return jsonResponse({ error: 'Origin not allowed.' }, 403, null);
    const corsOrigin = origin || null;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(corsOrigin) });
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({ ok: true }, 200, corsOrigin);
    }

    if (request.method === 'GET' && url.pathname === '/v1/integrity/status') {
      return handleIntegrityRoute(request, url, env, corsHeaders(corsOrigin));
    }

    const integrityRoute = url.pathname.startsWith('/v1/integrity/');
    const userRoute = url.pathname === '/v1/auth/apple' || url.pathname === '/v1/usage';
    const route = routes[url.pathname];
    if (!route && !integrityRoute && !userRoute) return jsonResponse({ error: 'Not found.' }, 404, corsOrigin);
    if (!userRoute && request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, corsOrigin);
    if (userRoute && !((url.pathname === '/v1/auth/apple' && request.method === 'POST') || (url.pathname === '/v1/usage' && request.method === 'GET'))) {
      return jsonResponse({ error: 'Method not allowed.' }, 405, corsOrigin);
    }

    const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
    if (declaredLength > maximumBodyBytes) return jsonResponse({ error: 'Request is too large.' }, 413, corsOrigin);

    const access = integrityRoute || url.pathname === '/v1/usage'
      ? { authorized: true, actor: null }
      : await verifyApiAccess(request, env);
    if (!access.authorized) {
      const response = jsonResponse({ error: 'A verified app session is required.' }, 401, corsOrigin);
      response.headers.set('X-Wardrobe-Auth', 'required');
      return response;
    }
    const userAccess = route || url.pathname === '/v1/usage'
      ? await verifyUserAccess(request, env)
      : { provided: false, userId: null };
    if (userAccess.provided && !userAccess.userId) return jsonResponse({ error: 'Account session expired.' }, 401, corsOrigin);
    const actor = userAccess.userId ?? access.actor ?? request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.API_RATE_LIMITER.limit({ key: `${actor}:${url.pathname}` });
    if (!success) return jsonResponse({ error: 'Too many requests. Please try again shortly.' }, 429, corsOrigin);

    if (integrityRoute) return handleIntegrityRoute(request, url, env, corsHeaders(corsOrigin));
    if (userRoute) return handleUserRoute(request, url, env, corsHeaders(corsOrigin), access.actor);

    let rawBody: string;
    let body!: Record<string, unknown>;
    try {
      rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > maximumBodyBytes) {
        return jsonResponse({ error: 'Request is too large.' }, 413, corsOrigin);
      }
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
      body = parsed as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: 'A JSON object is required.' }, 400, corsOrigin);
    }

    const securedBody = route.prepareBody(body, route.model);
    if (!securedBody) return jsonResponse({ error: 'Invalid request shape.' }, 400, corsOrigin);

    try {
      const startedAt = Date.now();
      const upstream = await fetch(route.upstream, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...route.authorization(env),
        },
        body: JSON.stringify(securedBody),
      });
      const responseHeaders = new Headers(corsHeaders(corsOrigin));
      responseHeaders.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json');
      responseHeaders.set('Cache-Control', 'no-store');
      const response = new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
      context.waitUntil(recordUsage(env, userAccess.userId, route.usageKind, upstream.status, Date.now() - startedAt, response));
      return response;
    } catch {
      return jsonResponse({ error: 'The AI provider is temporarily unreachable.' }, 502, corsOrigin);
    }
  },
};
