# Sign — Progress & Feature Map

Last updated: 2026-05-08

## Current status (what runs today)
- **App type**: Expo (SDK 54) + Expo Router (file-based routing)
- **Main user flow**:
  - Tap **Speak** → speech-to-text → text becomes a **phrase-aware playback queue** (chips)
  - Or **type text** → tap **Interpret** (or submit) → same queue + playback
  - Selecting a chip plays its sign animation/sequence in the avatar view.
- **Offline-first**: Sign data is bundled locally (JSON assets).
- **Builds**: EAS profiles for Android APK (`preview`, `production`).

## Known “run mode” constraint (Expo Go vs dev build)
This project uses native modules like **Skia** (`@shopify/react-native-skia`) and **speech recognition** (`expo-speech-recognition`).

- If you get **“Native module not found”** in Expo Go, you’ll need a **development build** (Dev Client) or a custom build via EAS.
- For local development, when you use a dev client build, you should start Metro with `npx expo start --dev-client`.

## Supported signs (current mapping)
From `app/(tabs)/index.tsx` and `AVAILABLE_SIGNS.md`:
- **Words**: `hello`, `good`, `morning`, `noon`, `afternoon`, `evening`, `night`, `day`
- **Phrases**: `good morning`, `good afternoon`, `good evening`, `good day`, `good night`

## Features implemented
- **Speech recognition**
  - Requests permissions on mount.
  - Starts/stops listening from a single mic button.
  - Uses interim + continuous results.
  - Updates transcript and builds a phrase-aware playback queue.
- **Typed input**
  - Type a sentence and press **Interpret** (or submit) to generate the same playback queue.
- **Phrase + sentence handling**
  - Greedy **longest-match** parsing over the `SIGNS` keys (e.g. `good morning` beats `good` + `morning`).
  - Falls back to per-word units for unknown phrases.
- **Playback navigation**
  - Prev/Next navigation through phrase/word units.
  - Tappable chips; unknown units are visually marked.
- **Skip unknown mode**
  - Toggle to automatically skip unknown units during sentence playback so interpretation can continue.
- **Avatar sign playback**
  - Default renderer on native is **Skia 2D** (stable startup).
  - 3D renderer exists (Three/R3F) as an opt-in path with fallback.
  - Automatic chaining support: when one unit completes it can move to the next unit.
- **UI polish**
  - Dark themed home screen, chip styling, and basic controls (play/pause, speed toggle).
  - Haptic tab component exists (template-based).
- **Expo Updates**
  - `expo-updates` enabled with runtime version policy = `sdkVersion` (OTA for JS updates via EAS channels).

## Repo map (what each folder contains)
- `app/`
  - `app/_layout.tsx`: root navigation + theme provider.
  - `app/(tabs)/_layout.tsx`: tabs config.
  - `app/(tabs)/index.tsx`: **main screen** (speech → words → avatar playback).
  - `app/modal.tsx`: template modal screen (not core to the app yet).
- `components/`
  - `StickFigureAvatar.tsx`: wrapper (chooses implementation).
  - `StickFigureAvatar3D.tsx`: 3D avatar playback using Three/R3F.
  - `StickFigureAvatar3D.native.tsx`: native-specific variant (if present/used by bundler).
  - `StickFigureAvatarCore.tsx`: Skia-based 2D renderer (default on native; supports `onSignComplete`).
  - Template UI components (`themed-text`, `themed-view`, etc.).
- `assets/`
  - `assets/signs/*.json`: sign frame datasets used by the avatar player.
  - `assets/images/*`: icon/splash/favicons.
- `lib/`
  - `lib/signs.ts`: central `SIGNS` registry + phrase parsing utilities (used by UI).
- `constants/`, `hooks/`: small app utilities (theme + color scheme).
- `scripts/`: project helper scripts (e.g., reset).
- `dist/`, `public/`: build artifacts / web assets (not primary dev surface).

## How to run (dev)
- **Expo Go (if compatible with your installed native modules)**:
  - `npm install`
  - `npx expo start`
- **If you’re using an EAS-built dev client / custom build**:
  - `npx expo start --dev-client`

## What’s next (recommended priorities)
1. **Decide the “official” runtime** (Expo Go vs Dev Client)
   - If Skia + speech recognition must work reliably, plan around **Dev Client** as the default for development/testing.
2. **Expand sign coverage**
   - Add more words/phrases and keep `AVAILABLE_SIGNS.md` + the `SIGNS` map in sync.
3. **Data + playback quality**
   - Normalize sign JSON schema, add validation, and ensure consistent fps/scale.
   - Add smoothing/interpolation controls (you already do blending in 3D; extend to all transitions).
4. **UX improvements**
   - Clear “unknown word” suggestions (closest match), search/autocomplete, favorites, and categories (Greetings, Emergency, Food, etc.).
5. **Reliability & performance**
   - Add a lightweight error boundary for the avatar view.
   - Ensure memory usage stays stable for long transcripts and long sessions.

## Team work division (3 people)
See `WORK_DIVISION.md` for ownership:
- Sam: expand sign library + phrase coverage
- Frank: avatar playback/rendering quality + **3D avatar upgrade** (Skia 2D default; 3D optional/flagged)
- You: product/UI + sentence experience + integration

