# Wardrobe

An iOS-first, local-first wardrobe assistant built with Expo SDK 57 and React Native.

## Current milestone

The app currently includes:

- Chat, Wardrobe, and Timeline tabs
- live text conversation through Muse
- one-tap natural Chat starters for outfit help, wardrobe rediscovery, exploration, and wear logging
- Muse-proposed, confirmation-first natural-language mutations for garments, sections, and Timeline corrections
- an on-device SQLite schema with four empty starter sections
- on-device Markdown memory initialization
- a small internal design system
- strict TypeScript and Zod-validated domain boundaries
- chat-only image selection with an explicit preview and send step; selected source photos are not copied into app storage
- structured garment analysis through Gemini for only the photos attached to the current message
- searchable garment identity using useful color, pattern, coordinated-piece, and clearly visible brand details
- explicit section confirmation before the Wardrobe Agent saves a garment locally
- Gemini section suggestions validated against the user's existing sections, enabling one-tap confirmation
- transparent, consistently scaled 3:4 garment PNG generation for Chat previews and the Wardrobe
- local Markdown memory for confirmed garment terminology and recent conversations
- conservative duplicate detection against a small local shortlist of existing canonical garment images
- Coordinator-written Chat copy, so raw Vision observations and confidence scores remain internal
- agent-driven, read-only wardrobe questions with matching local garments rendered directly in Chat
- garment details and editing for names, tags, and sections, with confirmed recoverable archiving
- persistent garment and section ordering, plus section creation and renaming
- safe section deletion with required active-and-archived garment transfer, available in the UI and through Muse confirmation
- tap-to-open garment cards with long-press horizontal drag reordering
- switchable section rails and a virtualized all-pieces grid with name, tag, and description search
- all-pieces sorting for wardrobe order, least worn, not worn recently, newest, and garment name
- compact sort controls and reliable grid resets when changing an all-pieces sort order
- safe on-device Chat history across restarts, without retaining full user-uploaded source photos or stale confirmation cards
- small on-device compressed thumbnails for explicitly attached Chat photos, retained across restarts but excluded from backups
- bounded Muse context with local date/time labels plus a multi-step, read-only query loop over local wardrobe and Timeline data
- on-demand memory search plus LLM-managed durable fact additions, corrections, and explicit forgetting
- three-attempt transient API recovery, scoped fallback messages, and device-local relative-date context
- live plain-language agent stages and one-tap retry without duplicating the original Chat message
- new-conversation boundaries, independently clearable Chat history, and archive-aware Muse memory reconciliation
- a compact Archived Pieces screen with UI and confirmation-first natural-language restore support
- reusable rich garment-collection cards for Muse outfit suggestions, searches, and future grouped results
- conversational outfit revisions that preserve unchanged pieces and learn only explicit, self-contained pairing feedback
- chat-driven packing and capsule collections using the existing reusable recommendation cards
- versioned local backup export and validated restore for wardrobe, Timeline, memory, safe Chat history, and generated garment images
- confirmation-first conversational wear logging into the local Timeline diary
- tappable Timeline entries with correction and deletion controls that keep garment wear statistics accurate
- switchable Timeline diary and month-calendar views with outfit previews on logged days
- searchable Timeline diary and wardrobe-piece search while correcting an outfit
- explicit loading, retry, and stale-data states for local Wardrobe, Timeline, and archive reads
- pending outfit context across Chat follow-ups and combined add-plus-log handling for worn photo uploads
- grouped review for multi-garment worn photos, with one atomic wardrobe batch and one shared Timeline outfit
- outfit-pairing history and explicit rationale/preferences supplied to Muse for grounded recommendations

Gallery scanning and advanced wardrobe editing are intentionally deferred.

The app never scans the photo gallery. It can see only images the user explicitly selects from the system picker inside Chat. The temporary full-size picker file is sent to Gemini for garment analysis and standardized image generation, but is never copied into app storage. The app retains only a small compressed thumbnail for Chat continuity; clearing Chat history removes these thumbnails, and backups exclude them. Gemini's generated transparent garment PNG is retained after the user confirms an addition. Text-only chat messages are sent to Muse.

Settings can export a versioned, readable JSON backup containing local wardrobe metadata, Timeline history, Markdown memory, safe text/rich Chat history, and generated garment images. Source photos, compressed Chat thumbnails, and API keys are never included. Because the file contains personal data, it should be stored and shared privately. Restore validates the format and cross-record references before replacing local data.

Before generating a new canonical image, the Wardrobe Agent shortlists at most two plausible existing garments using local metadata. Vision compares only those candidates and raises a duplicate review only for a conservative high-confidence match. Choosing “Use existing” avoids image generation and database duplication; choosing “Add as new” resumes canonical generation.

Vision stays precise and structured internally, while Muse turns its findings into concise, direct wardrobe-assistant language before Chat renders them. A deterministic friendly fallback prevents specialist wording from leaking into the interface when that presentation pass is unavailable.

For text conversations, the Wardrobe Agent supplies Muse with the current active SQLite catalog as read-only reference data. Muse can answer natural inventory questions such as counts, colors, garment types, sections, and what has not been worn recently, and can return exact garment IDs for rich Chat cards. Returned IDs are validated against SQLite before rendering; Muse cannot invent or mutate wardrobe records through this path.

Tap a garment in Wardrobe to view its canonical image and details, rename it, edit its tags, move it between sections, or archive it after confirmation. “Add piece” opens Chat with the selected section already in the draft so the normal photo-analysis and confirmation flow remains the single ingestion path.

A section can be deleted only when another section remains. If it contains active or archived garments, the user must choose a destination first; the Wardrobe Agent moves every affected garment and removes the section in one local transaction. Timeline history is unchanged. Muse can propose the same operation in natural language, but it still requires explicit confirmation.

Swipe a garment rail to browse it normally. Tap a card to open its details, or long press and drag it horizontally to rearrange its section. Long press also enters a visible organizing state with highlighted cards, drag handles, contextual guidance, and a Done button. Move earlier/later remains available in the detail screen as an accessible fallback. A section's overflow button opens section management for renaming and reliable move controls, and the Wardrobe screen can create new sections. Positions are stored in SQLite and retained across launches.

When a text message clearly says that owned garments were worn, Muse proposes exact catalog IDs and a date instead of changing history directly. Chat renders a review card, and only “Log outfit” delegates the mutation to the Wardrobe Agent. Confirmed entries update the local diary, wear counts, last-worn dates, and recent agent memory. Suggestions, future plans, and ambiguous garment matches never create a wear proposal.

Muse also receives a compact structured summary of recent rich Chat events. A follow-up such as “check in Casual” can resolve a missing garment in a pending outfit and return a new combined wear proposal without requiring the wearer to repeat the original sentence. When a photo message says a new garment was worn, garment confirmation offers “Add & log wear”; a duplicate match similarly offers “Use existing & log wear.” Both operations remain user-confirmed.

Each confirmed wear row keeps the garments together as one outfit, plus its date and any explicitly stated reason or context such as destination, occasion, weather, comfort, mood, styling goal, or feedback. The Wardrobe Agent supplies a bounded recent history of these pairings to Muse for recommendations. Explicit durable preferences are also saved in local `USER.md`; isolated outfit choices are not automatically promoted into preferences.

On upgrade, the app removes source-photo copies created by earlier development milestones; this never affects the originals in the system Photos library. After a garment is confirmed, the Memory Agent records user-owned terminology and durable context such as “my wedding dress” in `USER.md`. A bounded recent conversation trail is kept in `RECENT.md`, and both are supplied as local context for later Muse conversations.

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

Deploy the API in `worker/`, then create `local-secrets/.env` containing only its public URL:

```dotenv
WARDROBE_API_BASE_URL=https://your-worker.workers.dev
```

Muse and Gemini credentials are encrypted Cloudflare Worker secrets and are never included in the Expo bundle. See `worker/README.md` for initial setup and rotation. Restart Expo with `npx expo start --clear` after changing the URL.
