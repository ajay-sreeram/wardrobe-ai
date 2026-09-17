# Wardrobe API Worker

This Worker keeps the Muse and Gemini provider keys out of the Expo application. It exposes only the two API routes the app uses, overrides model selection, rejects oversized or unexpected requests, and applies a Cloudflare rate-limit binding.

## Deploy

1. Install the Worker dependencies: `cd worker && npm install`.
2. Authenticate once: `npx wrangler login`.
3. For a new Cloudflare account, create a D1 database with `npx wrangler d1 create wardrobe-ai-integrity` and put its ID in `wrangler.jsonc`.
4. Apply its schema: `npx wrangler d1 migrations apply ATTEST_DB --remote`.
5. Add each provider key through Wrangler's hidden prompt: `npx wrangler secret put MUSE_API_KEY`, then `npx wrangler secret put GEMINI_API_KEY`.
6. Generate and store a separate session signing secret: `openssl rand -base64 48 | npx wrangler secret put SESSION_SECRET`.
7. Deploy: `npm run deploy`.
8. Confirm `https://<worker-url>/health` returns `{"ok":true}`.
9. Replace the provider keys in `local-secrets/.env` with only `WARDROBE_API_BASE_URL=https://<worker-url>`.
7. Restart Expo with `npx expo start -c`.

`ALLOWED_ORIGINS` is `*` so the Expo web build can be tested easily. Before hosting the web build publicly, replace it with the exact HTTPS origin. Native iOS requests do not depend on browser CORS.

The rate limit reduces accidental or casual abuse, but the Worker URL is public. Before a broad App Store launch, require a verified user session or Apple App Attest token and rate-limit by that verified identity.

## Rotate provider keys

Generate replacement keys in the Muse and Google AI provider dashboards, then update the encrypted Worker secrets from this directory:

```bash
npx wrangler secret put MUSE_API_KEY
npx wrangler secret put GEMINI_API_KEY
```

Paste each value only into Wrangler's hidden prompt. Test Muse and garment generation in the app, then revoke the previous keys in both provider dashboards. Provider keys should never be added back to the app's `local-secrets/.env`; that file now holds only `WARDROBE_API_BASE_URL`.

## App Attest protection

The Worker has Apple App Attest support with a D1-backed challenge and device-key store. It is initially deployed with `INTEGRITY_MODE` set to `report-only`, so Expo Go and web development continue to work. In this mode the provider proxy remains protected by its existing request validation and IP rate limit, but attestation is not required.

Before enabling enforcement:

1. Register an explicit App ID in the Apple Developer portal and enable App Attest.
2. Add that bundle identifier under `expo.ios.bundleIdentifier`, and add `com.apple.developer.devicecheck.appattest-environment` with `development` under `expo.ios.entitlements`.
3. Set `APPLE_TEAM_ID` and `APPLE_BUNDLE_ID` in `wrangler.jsonc` to the exact identifiers used to sign the app.
4. Build and install a development build on a physical iPhone. App Attest cannot be validated as this app from Expo Go or the iOS Simulator.
5. Deploy with `INTEGRITY_MODE` set to `enforce`, test Muse and garment generation, then use `enforce-production` for the App Store build and change the entitlement to `production`.

API calls then acquire short-lived sessions only after the Worker validates a one-time Apple attestation or assertion. The session signing key is the encrypted `SESSION_SECRET` Worker binding; it is never included in the app.

## Accounts and API usage

Sign in with Apple is optional during development. The Worker verifies Apple's identity token, converts its subject into a keyed pseudonymous ID, and never stores the user's email, name, prompts, photos, or wardrobe content. Signed-in usage is counted exactly in D1 by UTC day: Muse requests, Gemini requests, failed provider responses, and provider-reported input/output tokens.

Before installing the native development build, enable both **Sign in with Apple** and **App Attest** for the `com.sreeram-ajay.wardrobe-ai` App ID in the Apple Developer portal, then refresh the provisioning profile in Xcode. Expo adds the corresponding native entitlements from `app.json`.

Aggregate request analytics can optionally be enabled by adding an `API_ANALYTICS` Analytics Engine binding. The exact D1 ledger remains authoritative because Analytics Engine may sample high-volume data. If Analytics Engine is not enabled on the Cloudflare account, the Worker continues normally without it.
