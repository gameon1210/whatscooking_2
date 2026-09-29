# What's Cooking 2.0 — app

One TypeScript codebase (Expo / React Native) that runs on **Android, iPhone and the web**.
It implements every **must-have** requirement of the FSD *What's Cooking 2.0 — Functional
Specification* (30 Sep 2026). Data stays on the phone for now; cloud sync is the next pass.

## Try it on your phone (no Mac, no Android Studio)

1. Install **Node.js 20+** on your computer (nodejs.org).
2. In a terminal:
   ```bash
   cd app
   npm install
   npx expo start
   ```
3. Install **Expo Go** on your Android phone or iPhone (Play Store / App Store) and scan the QR
   code shown in the terminal. Phone and computer must be on the same Wi-Fi
   (or run `npx expo start --tunnel`).

Web preview: `npx expo start --web`.

## Build an installable Android APK (free, in the cloud)

```bash
npx eas-cli@latest login          # free Expo account
npx eas-cli@latest build -p android --profile preview
```
EAS builds in the cloud and gives you a link to download the `.apk`.
For the App Store / TestFlight you need an Apple Developer account (USD 99/year); then
`npx eas-cli@latest build -p ios` — still no Mac needed.

## Turn on the Cook page (free)

The Cook Card links to `docs/cook.html` in this repo. In GitHub: **Settings → Pages →
Deploy from a branch → `main` / `/docs`**. The page is then live at
`https://gameon1210.github.io/whatscooking_2/cook.html` (the default in the app's Settings).

## What's in the app

| Area | Requirements | Where |
| --- | --- | --- |
| Today card, swipe to accept / next, context chips, weather, “Why this?” | FR-201, 202, 203, 206, 290 | `src/app/(tabs)/index.tsx` |
| What's in the kitchen: vegetables, leftovers, Blinkit, Zomato | FR-208, 253, 255 | Today, `cart.tsx`, `order-in.tsx` |
| Family, members, roles, ages, hard rules, fasting calendar, one base / many plates | FR-210–216 | `onboarding.tsx`, `member.tsx`, `src/domain/rules.ts`, `calendar.ts` |
| Free-text preferences (“less spicy for kids”) | FR-217 | `preferences.tsx`, `src/domain/prefs.ts` |
| Voice (keyboard dictation, Hinglish), photo, auto-log, one-tap repeat | FR-220–224 | `src/app/(tabs)/log.tsx`, `src/domain/parse.ts` |
| Cook Card in the cook's language, quantities, ranked choices, Cook page, reply | FR-230–236 | `cook-card.tsx`, `cook-reply.tsx`, `docs/cook.html` |
| Tiffin return check, reactions | FR-242, 243 | `tiffin-check.tsx`, Memory tab |
| Leftovers and leftover chains, learned from past decisions | FR-250, 251 | Log, `src/domain/actions.ts` |
| Tomorrow plan at 9 pm, 7-day calendar, two tiffins per child | FR-260, 261, 265 | `tomorrow.tsx`, `(tabs)/plan.tsx` |
| Food-group tags, balance nudge | FR-270, 272 | `catalog.ts`, recommender |
| Memory timeline, favourites shelf | FR-280, 281 | `(tabs)/history.tsx` |
| Hide dish, pause/reset learning, consent, export and delete | FR-291–293 | `settings.tsx` |

The recommender (`src/domain/recommender.ts`) is the FSD section 8 scorer: hard filter →
candidates → score (C, H, R, P, F, A, T, L, D, B, K, X, N, Rep, Neg) → diversify → explain.

## Costs

Everything is free or on-device except the optional **Gemini** key (Settings), used only for
photo recognition and smarter parsing. Weather: Open-Meteo (free). Reminders: local
notifications. WhatsApp: click-to-chat (no API fees).

## Known limits in this first build

- Data lives on one phone. Invite links and live family sync need the Supabase pass.
- Voice uses the keyboard's mic (Gboard / iOS dictation). A native speech button needs a
  development build.
- The cook's “voice note” is a **Read aloud** button in the app and a **Listen** button on the
  Cook page (free device text-to-speech), not an attached audio file.
- Blinkit and Zomato have no public ordering APIs; the app opens their search pages and
  copies the item name.
- Cook Card translations (Hindi, Kannada, Tamil, Telugu) should be reviewed by a native speaker.
- 2027 festival and Ekadashi dates are approximate (edit `src/domain/calendar.ts`).

## Developer commands

```bash
npm test          # recommender, rules, parser and Cook Card tests
npm run typecheck
npx expo lint
npx expo-doctor
```
See `AGENTS.md` for Expo conventions used in this repo.
