# Sign — KSL Interpreter App

## Project Overview
A React Native (Expo) Android app that listens to speech, converts it to text, and displays the corresponding sign language animation/GIF for each word. Built specifically for the developer's deaf sister using Kenyan Sign Language (KSL) as the target.

## Tech Stack
- **Framework:** React Native with Expo Router (file-based routing)
- **Language:** TypeScript
- **Speech Recognition:** `expo-speech-recognition` — uses Android's built-in engine, Kenyan English (`en-KE`), no API key needed
- **Sign Display:** Local GIF files via `require()` stored in `assets/signs/`
- **Build System:** EAS Build (cloud) with `preview` profile outputting APK
- **Updates:** `expo-updates` configured for over-the-air JS updates via `eas update`
- **Hosting:** Expo cloud (projectId: `8cf99b47-9f99-4a20-913f-40e4d4559839`)

## Core Functionality
1. **Voice Input**: User taps the mic button to start recording.
2. **Speech-to-Text**: The Android speech engine transcribes speech to text in real-time.
3. **Word Processing**: The transcript is split into individual words, appearing as tappable chips.
4. **Sign Visualization**: Tapping a chip shows the corresponding sign GIF in the display box.
5. **Navigation**: Prev/Next buttons allow for easy movement through the transcript.

## Implementation Details
- **Continuous Recording**: Configured to stop only when the user explicitly clicks "Stop".
- **Asset Mapping**: Words are mapped to signs in a dictionary (`SIGNS` object in `index.tsx`).
- **Offline First**: Designed to store all sign animations locally to function without an internet connection.

## Constraints & Principles
- **Zero Cost**: No paid APIs or subscriptions.
- **Offline First**: All signs stored locally on the device.
- **KSL Focus**: Targeted at Kenyan Sign Language, using placeholders only where KSL data is pending.
- **OTA Updates**: Uses `eas update` for JS-level changes to avoid frequent full rebuilds.

## Roadmap
- [ ] Add sister's full phrase/word list to SIGNS dictionary.
- [ ] Source or record GIFs for each word/phrase.
- [ ] Implement Lottie animated avatar (Phase 2).
- [ ] Speed control + repeat button.
- [ ] Full offline mode optimization.

## How to Access the App
1. Navigate to the project root: `cd sign/Sign`
2. Install dependencies: `npm install`
3. Start the dev server: `npx expo start`
4. Use **Expo Go** on Android or press `w` for web.

## How to Update
1. **Logic/UI**: Edit `app/` or `components/`.
2. **Assets**: Add new GIFs to `assets/signs/` and update the `SIGNS` mapping.
3. **Deployment**: Run `eas build -p android --profile preview` for APK or `eas update` for JS changes.
