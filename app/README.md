# What's Cooking 2.0 — app

One TypeScript codebase (Expo / React Native) that runs on **Android, iPhone and the web**.
It implements the single-phone part of the **must-have** requirements of the FSD *What's
Cooking 2.0 — Functional Specification* (30 Sep 2026). Data stays on the phone; the parts of
the FSD that need a server (shared family sign-in, signed invites, live sync, automatic cook
replies) are not built yet — see "Known limits" and `artifacts/qa/fsd-traceability.csv`.

## Try it on your phone (no Mac, no Android Studio)

1. Install **Node.js 22.13 or newer** on your computer (nodejs.org) — Expo SDK 57 needs it.
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

## Food safety rules (QA audit, October 2026)

Hard rules are enforced in one place (`checkMember` / `checkPlan` in `src/domain`) and every
path that suggests or saves a meal goes through it: suggestions, Tomorrow, the week calendar,
swaps, and custom dishes.

- **Allergies** use a canonical model (`src/domain/allergens.ts`): milk covers paneer, curd,
  ghee and butter; wheat covers atta, rava, bread and maida, and so on. Allergens the model
  can't see reliably are matched by ingredient name only, and the app says so.
- **Custom dishes** need their diet and allergens confirmed before they can be planned for
  anyone with rules. Unconfirmed dishes are never suggested.
- **Spice** is a hard limit: a dish one step hotter is offered only as its mild version.
- The catalogue's ingredient and allergen data is a household guide written by the
  developers. Have someone who knows the food review it before a public launch, and never
  rely on the app alone for a serious allergy.

## Known limits in this first build

- Data lives on one phone. Invite links and live family sync need the Supabase pass.
- Voice uses the keyboard's mic (Gboard / iOS dictation). A native speech button needs a
  development build.
- The cook's “voice note” is a **Read aloud** button in the app and a **Listen** button on the
  Cook page (free device text-to-speech), not an attached audio file.
- Blinkit and Zomato have no public ordering APIs; the app opens their search pages and
  copies the item name.
- Cook Card dish names, ingredients and units are in Hindi, Kannada, Tamil and Telugu
  (`src/domain/i18n.ts`). They were written by the developers and must be reviewed by a native
  speaker of each language. Marathi and Bengali are not included. The app's own screens are
  in English.
- Cook Card links expire and carry a signature, and the app only accepts a reply for a card
  it issued. Because the Cook page is a static page with no server, it cannot verify who
  made a link or revoke one; that needs the backend pass.
- "Sent" means the planner confirmed the WhatsApp message went out, or the cook replied.
  The app cannot see WhatsApp delivery.
- Auto-logging runs while the app is open (every minute) and when it is reopened; there is no
  background job.
- 2027 festival and Ekadashi dates are approximate (edit `src/domain/calendar.ts`).

## Developer commands

```bash
npm test          # 105 tests: engine, drafts, notifications and the QA regression suite
npm run typecheck
npx expo lint
npx expo-doctor
```
See `AGENTS.md` for Expo conventions used in this repo.
