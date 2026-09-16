# Wardrobe API Worker

This Worker keeps the Muse and Gemini provider keys out of the Expo application. It exposes only the two API routes the app uses, overrides model selection, rejects oversized or unexpected requests, and applies a Cloudflare rate-limit binding.

## Deploy

1. Install the Worker dependencies: `cd worker && npm install`.
2. Authenticate once: `npx wrangler login`.
3. Upload both existing keys together as encrypted Worker secrets: `npx wrangler secret bulk ../local-secrets/.env`.
4. Deploy: `npm run deploy`.
5. Confirm `https://<worker-url>/health` returns `{"ok":true}`.
6. Replace the provider keys in `local-secrets/.env` with only `WARDROBE_API_BASE_URL=https://<worker-url>`.
7. Restart Expo with `npx expo start -c`.

`ALLOWED_ORIGINS` is `*` so the Expo web build can be tested easily. Before hosting the web build publicly, replace it with the exact HTTPS origin. Native iOS requests do not depend on browser CORS.

The rate limit reduces accidental or casual abuse, but the Worker URL is public. Before a broad App Store launch, require a verified user session or Apple App Attest token and rate-limit by that verified identity.
