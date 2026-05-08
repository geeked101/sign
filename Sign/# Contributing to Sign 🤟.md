# Contributing to Sign 🤟

Welcome to the Sign project. We're building a free, offline-first Android app that translates speech to Kenyan Sign Language (KSL) animations for deaf users. This was built for a deaf family member and is now open to contributors.

Read this fully before writing any code.

---

## The Mission

~600,000 deaf/hard-of-hearing Kenyans have almost no accessible consumer tech built for them. KSL was only officially recognized in 2021. Sign aims to fix that — starting small, going big.

---

## Ground Rules

- **Zero cost** — no paid APIs, no paid services, nothing that costs money
- **Offline first** — everything must work without internet on the user's device
- **KSL accuracy matters** — we are building for a real deaf person. Test carefully
- **No local Android builds** — use EAS cloud builds only (explained below)
- **Ask before you architect** — big structural changes need discussion first

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- Git
- An Expo account (free at expo.dev)
- An Android phone for testing

### 2. Clone the repo
```bash
git clone https://github.com/geeked101/sign.git
cd sign/Sign
npm install
```

### 3. Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### 4. Never run this
```bash
npx expo run:android   # ❌ don't use this
```
This requires Android Studio, Java 17, Android SDK. Don't bother.

### 5. Always build like this
```bash
eas build --platform android --profile preview   # full APK build
eas update --branch preview --message "what changed"  # JS-only update (instant)
```

---

## Branch Structure

```
main                 ← stable production branch
├── dev/avatar       ← avatar rendering work
├── dev/signs        ← sign dictionary expansion
├── dev/ui           ← UI/UX improvements
└── dev/phrases      ← phrase matching logic
```

**Always branch off main. Never commit directly to main.**

```bash
git checkout main
git pull
git checkout -b dev/your-feature
```

When done, open a Pull Request to main. Pluto reviews and merges.

---

## Project Structure

```
Sign/
├── app/
│   └── (tabs)/
│       └── index.tsx        ← main screen, all core logic
├── components/
│   ├── StickFigureAvatar.tsx       ← avatar wrapper
│   ├── StickFigureAvatar3D.tsx     ← Three.js 3D renderer
│   └── StickFigureAvatarCore.tsx   ← Skia 2D renderer
├── assets/
│   └── signs/               ← JSON pose data per sign
│       ├── hello.json
│       ├── good-morning.json
│       └── ...
├── app.json                 ← Expo config (don't touch without asking)
└── eas.json                 ← EAS build profiles (don't touch)
```

---

## How Sign Data Works

Signs are not GIFs or videos. They are JSON files containing pose landmark
coordinates extracted from KSL videos using MediaPipe.

```
KSL video →
MediaPipe extracts body + hand landmark coordinates →
JSON file saved to assets/signs/ →
Avatar reads JSON and animates frame by frame
```

Each JSON looks like:
```json
{
  "sign": "hello",
  "fps": 30.0,
  "total_frames": 91,
  "frames": [
    {
      "frame": 1,
      "timestamp_ms": 33,
      "body": [{"x": 0.45, "y": 0.32, "z": 0.01, "visibility": 0.99}],
      "left_hand": [{"x": 0.42, "y": 0.28, "z": 0.02}],
      "right_hand": []
    }
  ]
}
```

The extraction pipeline lives separately and is not part of this repo.
Contact Pluto if you want access to the pipeline.

---

## Current Sign Coverage

| Word/Phrase | File |
|---|---|
| hello | hello.json |
| good | good.json |
| morning | morning.json |
| noon | noon.json |
| afternoon | afternoon.json |
| evening | evening.json |
| night | night.json |
| day | day.json |
| good morning | good-morning.json |
| good afternoon | good-afternoon.json |
| good evening | good-evening.json |
| good day | good-day.json |
| good night | good-night.json |

When you add a new sign, update this table in this file too.

---

## Open Tasks — Pick One and Own It

### 🔴 Priority: Avatar Black Screen Bug
The stick figure avatar shows a black screen on Android.
Likely a Three.js/React Three Fiber initialization issue on native.
**Skills needed**: React Native, Three.js, debugging native rendering

### 🟡 Sign Expansion
We need more signs beyond greetings.
Priority categories: Emergency, Food, Family, School, Common questions.
Contact Pluto for access to the extraction pipeline.
**Skills needed**: Python (to run pipeline), basic JSON

### 🟢 UI/UX Improvements
- Sign categories (Greetings, Emergency, Food, School, Family)
- Search/autocomplete for words
- Favorites system
- Kiswahili language toggle (sw-KE speech recognition)
- Better unknown word handling
**Skills needed**: React Native, TypeScript, UI design

### 🔵 Phrase Matching
Currently the app signs word by word.
We need it to detect phrases like "good morning" before splitting.
**Skills needed**: TypeScript, string matching logic

### ⚪ KSL Avatar Character
Design a friendly cartoon character to replace the stick figure.
We have a chibi character concept (panda hoodie girl aesthetic).
**Skills needed**: 3D/2D character design, animation, Blender or similar

---

## When You Add a New Sign

1. Get the JSON file from the pipeline (contact Pluto)
2. Add it to `assets/signs/yourword.json`
3. Import it in `app/(tabs)/index.tsx`
4. Add it to the `SIGNS` dictionary in the same file
5. Update the sign coverage table in this file
6. Test it — say the word, confirm the avatar animates
7. Submit a PR

---

## Testing Your Changes

### For JS/UI changes (no new native modules):
```bash
# Make your changes
git add .
git commit -m "feat: describe what you did"
git push
eas update --branch preview --message "describe change"
# Open app on phone → pulls update automatically
```

### For native module changes (new expo packages):
```bash
# Make your changes
git add .
git commit -m "feat: add new native module"
git push
eas build --platform android --profile preview
# Wait 10-20 mins → download APK → install on phone
```

### Rule of thumb:
- Added a new `npx expo install` package? → full `eas build`
- Everything else? → `eas update`

---

## Commit Message Format

```
feat: add good morning sign animation
fix: avatar black screen on Android
ui: add category tabs for greetings
data: add 10 emergency signs
docs: update contributing guide
```

---

## Communication

Join the Discord server — link shared by Pluto directly.

Channels:
- `#general` — general discussion
- `#avatar` — avatar rendering work
- `#sign-data` — sign extraction and dictionary
- `#bugs` — bug reports and fixes
- `#builds` — build status updates

---

## Questions?

Open a GitHub Issue or ping Pluto on Discord.

Don't guess on architecture decisions — ask first.
A 5-minute conversation saves hours of wrong work.

---

Built with purpose. For family. Let's make it count. 🤟