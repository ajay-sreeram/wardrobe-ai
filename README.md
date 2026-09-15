# Wardrobe

An iOS-first, local-first wardrobe assistant built with Expo SDK 57 and React Native.

## Current milestone

The app currently includes:

- Chat, Wardrobe, and Timeline tabs
- live text conversation through Muse
- an on-device SQLite schema with development seed data
- on-device Markdown memory initialization
- a small internal design system
- strict TypeScript and Zod-validated domain boundaries
- chat-only image selection with an explicit preview and send step; selected source photos are not copied into app storage
- structured garment analysis through Gemini for only the photos attached to the current message
- explicit section confirmation before the Wardrobe Agent saves a garment locally
- transparent, consistently scaled 3:4 garment PNG generation for Chat previews and the Wardrobe

Gallery scanning and advanced wardrobe editing are intentionally deferred.

The app never scans the photo gallery. It can see only images the user explicitly selects from the system picker inside Chat. Those temporary picker files are sent to Gemini for garment analysis and standardized image generation, but are never copied into app storage. Only Gemini's generated transparent garment PNG is retained after the user confirms an addition. Text-only chat messages are sent to Muse.

On upgrade, the app removes source-photo copies created by earlier development milestones; this never affects the originals in the system Photos library. A following milestone will connect the Memory Agent so user-owned terminology and durable context such as “my wedding dress” can be recalled in later conversations.

## Run locally

Requirements: Node.js 22.13 or newer and Expo Go with SDK 57, or Xcode 26.4 or newer for an iOS Simulator.

```bash
npm install
npx expo start --clear
```

Then scan the QR code in Expo Go. The app initializes `wardrobe.db`, `memory/USER.md`, and `memory/RECENT.md` inside its private device storage on first launch.

For the web preview, press `W` in the Expo terminal or run `npm run web`. SQLite web support is alpha in Expo; the included Metro configuration provides its required WebAssembly and cross-origin-isolation setup.

## Checks

```bash
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform ios
```

## Development API configuration

Create `local-secrets/.env` with `MUSE_API_KEY` and `GEMINI_API_KEY`. The folder is ignored by Git, but Expo currently embeds these values in the development client bundle. Never distribute this build through TestFlight or the App Store. Restart with `npx expo start --clear` after changing the file.

The production credential design will move provider secrets behind a server boundary before distribution.
