# Wardrobe

An iOS-first, local-first wardrobe assistant built with Expo SDK 57 and React Native.

## Current milestone

The app currently includes:

- Chat, Wardrobe, and Timeline tabs
- rich chat message, progress, and confirmation examples
- an on-device SQLite schema with development seed data
- on-device Markdown memory initialization
- a small internal design system
- strict TypeScript and Zod-validated domain boundaries
- chat-only image selection with an explicit preview and send step

Live AI analysis, gallery scanning, and wardrobe editing are intentionally deferred.

The app never scans the photo gallery. It can see only images the user explicitly selects from the system picker inside Chat. Selected images are copied into app-private storage when the user presses Send; they are not sent to an AI provider in the current milestone.

## Run locally

Requirements: Node.js 22.13 or newer and Expo Go with SDK 57, or Xcode 26.4 or newer for an iOS Simulator.

```bash
npm install
npx expo start
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

## Local API references

When AI integration begins, development-only curl samples or credentials can be placed under `local-secrets/`. The directory is ignored by Git and must never be imported into the application bundle. Runtime user credentials will use `expo-secure-store` after the credential strategy is agreed.
