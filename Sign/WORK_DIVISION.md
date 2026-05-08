# Work Division (3 people)

Last updated: 2026-05-08

This file defines **who owns what** so we can work in parallel with minimal merge conflicts.  
Rule: **every PR must update** `sign/Sign/PROGRESS.md` with what changed.

## Shared goal (near-term)
- Turn free-form **speech or typed text** into a **phrase-aware playback queue**
- Play that queue reliably on Android using **Skia 2D by default**
- Keep 3D as an **opt-in** renderer (fallback to 2D if it fails)

## “Separate workspaces” (Git lanes, beginner-friendly)
If multiple people edit the same files without branches, work gets overwritten.  
So we use **branches + PRs**: everyone has their own lane, then merges into the stable project.

### Branches we’ll use
- `main`: stable / demo-ready
- `dev`: integration/testing (optional but recommended)
- Feature branches:
  - Sam: `sign-library`
  - Frank: `avatar-3d-upgrade`
  - Jeff: `ui-ux`

### First time setup (each person)
Clone once:

```bash
git clone https://github.com/geeked101/sign.git
cd sign
```

Create your lane:

```bash
git checkout -b <your-branch-name>
```

Examples:
- `git checkout -b sign-library`
- `git checkout -b avatar-3d-upgrade`
- `git checkout -b ui-ux`

### Daily workflow (the 90% commands)
Before coding (get latest stable updates):

```bash
git checkout <your-branch-name>
git pull origin main
```

After coding (save checkpoints + upload):

```bash
git add .
git commit -m "Short clear message"
git push -u origin <your-branch-name>
```

Then open GitHub and create a **Pull Request** into `dev` (or `main` if you’re skipping `dev`).

### Beginner team rules (prevents civil war)
- Never code directly on `main`
- Commit small and often (1 feature/fix per commit)
- If Git says “merge conflict”: it just means two people edited the same lines; fix it together and move on

## Ownership map

### Sam — Sign library expansion (data + coverage)
**Owns** the sign inventory and anything that affects what we can interpret.

- **Add/curate signs**: add more `assets/signs/*.json` for words + common phrases
- **Registry hygiene**: keep `SIGNS` map accurate and consistent (keys, naming, schema)
- **Phrase strategy**: decide which multi-word phrases get dedicated signs vs composed signs
- **Data validation**: catch missing frames/fps/shape mismatches early (simple checks are enough)

**Definition of done**
- New signs added with consistent schema
- Phrase keys match how users naturally type/speak (e.g. “good morning”, “thank you”, “how are you”)
- Updates recorded in `PROGRESS.md` under Supported signs + Features

### Frank — Avatar (rendering + playback quality)
**Owns** how signs are rendered and how playback feels.

- **Skia 2D renderer**: smoothness (basic interpolation), scaling, stable timing
- **Completion correctness**: `onSignComplete` should fire exactly once per unit playback
- **Performance**: avoid stutters/memory growth with longer sentences
- **3D avatar upgrade (explicit deliverable)**:
  - Keep 3D behind a flag while it’s unstable
  - Improve reliability/perf and move toward a “real” 3D avatar (better rig, proportions, and motion)
  - Define the “3D-ready” bar (startup reliability on Android dev build + acceptable FPS)
  -Or just jump to a 3d figure if you can.

**Definition of done**
- Playback is stable on Android dev build (no black screens; no random resets)
- Long sessions don’t degrade performance
- Updates recorded in `PROGRESS.md` under Avatar sign playback + Reliability

### Jeff — Product/UI + interpretation experience (integration owner)
**Owns** the user experience end-to-end and the app screen(s) that tie everything together.

- **Input UX**: typed text flow, speech flow, clear “what’s happening” state
- **Sentence UX**: chips/queue UI, progress indicator, replay unit, speed/pause
- **Unknown handling**: toggles like **Skip unknown** vs **Pause on unknown**, and messages/suggestions
- **Refactor for maintainability**: move `SIGNS` + parsing into a small module (e.g. `lib/signs.ts`)
- **Release readiness**: keep the main flow working; avoid regressions; keep docs updated
- Add a **Skip unknown** mode so sentences keep flowing even with partial vocabulary
- Add **autocomplete suggestions** from known phrases while typing
- Add “Recents” / “Favorites” chips (makes the app useful immediately)

**Definition of done**
- Typed + spoken sentences feel natural and robust
- Users can keep going even when some words are unknown
- `PROGRESS.md` stays accurate and up to date

## Interfaces (so work stays parallel)

### Interpretation output contract
The “interpreter” produces an ordered list of units:
- `text`: what the unit represents (word or phrase)
- `signData`: the JSON payload for the avatar (or `null` if unknown)
- `isKnown`: boolean

The UI consumes this list and the avatar consumes `signData`.

### Renderer contract
`StickFigureAvatar` takes:
- `signData`, `isPlaying`, `speed`, `onSignComplete`
- optional renderer selection via prop or `EXPO_PUBLIC_AVATAR_RENDERER`

## Working agreement (fast + low-conflict)
- **Small PRs**: 1 feature/fix per PR
- **One owner per file** by default:
  - Sam: `assets/signs/`, sign registry module
  - Frank: `components/StickFigureAvatar*`
  - You: `app/(tabs)/index.tsx`, UI components, glue code
- **Always update** `sign/Sign/PROGRESS.md`

