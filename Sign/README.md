# Sign — KSL Interpreter App

## Project Overview
A React Native (Expo) Android app that listens to speech, converts it to text, and displays the corresponding sign language animation/GIF for each word.

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
- [ ] Add  full phrase/word list to SIGNS dictionary.
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

All the Ways to Run It

1. 🌐 Expo Go (Quickest — Web + Phone)

cd C:\Users\Sensei\Desktop\cudiversee\PROJECTS\Sign\sign\Sign
npx expo start --web
Then also:
npx expo start
Scan QR with Expo Go app on your phone. Works over WiFi.
- Pros: Zero setup, instant
- Cons: 3D may be limited on older phones, GLTF loading can be slow over network

2. 📱 Expo Go on Phone (Simplest mobile test)

npx expo start --tunnel
Scan QR with Expo Go. The --tunnel flag works even if your phone is on a different network.
- Pros: No build needed, test on real device
- Cons: Metro bundler streams JS, so 3D model loads from your computer

3. 🔧 Dev Build (Best for 3D testing)

eas build -p android --profile development
Installs a proper APK with native Three.js/GLTF support. You get expo-dev-client connected to your running Metro.
- Pros: Full native 3D performance, offline model loading
- Cons: Takes ~10 min to build

4. 📦 Preview APK (Standalone — no Metro needed)

eas build -p android --profile preview
Generates a standalone APK you can install directly on any Android phone.
- Pros: No Metro needed, works offline, shareable
- Cons: Takes ~10 min, need to rebuild for each code change

5. 🏗️ Local Android Build (If you want to build on your PC)

npx expo run:android
Builds and installs directly to a connected Android device/emulator.
- Pros: Fastest build, direct USB connection
- Cons: Requires Android SDK + emulator or USB debugging enabled

6. 🍎 iOS (If you have a Mac)

npx expo run:ios
Or for EAS:
eas build -p ios --profile preview

---
Viewed %23%20Contributing%20to%20Sign%20%F0%9F%A4%9F.md:48-59

Since you already have an APK installed, the choice between these commands depends on **what you changed** (Native code vs. JS code) and **how you want to test it**.

Here is the breakdown of what each command does and why you would use it:

### 1. `eas update --branch preview --message "..."`
*   **What it does:** Sends an "Over-the-Air" (OTA) update to your existing APK. It replaces the Javascript bundle and assets (images/JSON) inside the app.
*   **When to use it:** Use this **90% of the time** if you only changed React components, styles, or logic (like the Skia/3D optimizations I just made).
*   **Why:** It takes ~1 minute and you don't need to install a new APK. The app will usually download the update in the background and apply it the next time you restart it.
*   **Constraint:** It **cannot** update native modules. If you add a new library like `expo-camera` or change `app.json` permissions, this update won't work—you'll need a full build.

### 2. `eas build --platform android --profile preview`
*   **What it does:** Builds a brand new, standalone APK from scratch. 
*   **When to use it:** Use this when you have changed **native code** (e.g., modified `app.json` plugins, added a library that isn't in your current APK, or changed the App Icon).
*   **Why:** This creates a "Release" style build that is perfect for sending to someone else to test exactly how the app will feel in production.
*   **Note:** This is slow (5-10 mins) because it runs in the cloud.

### 3. `npx eas build --profile development --platform android`
*   **What it does:** Builds a **"Development Client"** (a custom version of Expo Go specific to your app).
*   **When to use it:** Use this **once** to get a special "Dev" version of your app on your phone.
*   **Why:** Once this APK is on your phone, you **never** have to build again while coding. You just run `npx expo start --dev-client` on your computer, and your phone will live-sync every time you save a file (Hot Reloading).
*   **The Big Difference:** Unlike the `preview` APK, this one connects to your laptop's Metro bundler. It is for **active coding**, whereas `preview` is for **final testing**.

---

### Summary Recommendation
*   **If you just want to see my optimizations now:** Run `eas update --branch preview --message "optimized rendering"`. Then open your current APK, wait a few seconds, close it, and reopen it.
*   **If you want to start coding and see changes instantly (Hot Reload):** Build the `development` profile once, install it, and use `npx expo start --dev-client`.
*   **If you changed native permissions/plugins:** You **must** run the full `preview` build.