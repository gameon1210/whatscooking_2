# What's Cooking 2.0 — fixes for the QA audit of 3 October 2026

App version 1.0.1 (was 1.0.0, commit a098e48). Written 4 October 2026.

## Result

| Check | Before | After |
|---|---|---|
| Auditor's suite (`artifacts/qa/*.test.ts`, unchanged) | 16 of 55 pass | 52 of 55 pass |
| App test suite (`app`, `npm test`) | 25 pass | 105 pass (includes the auditor's tests) |
| TypeScript, lint, expo-doctor | pass | pass (21/21) |
| Web and Android bundles | export | export |
| Browser run (390×844, synthetic data) | — | onboarding, milk allergy, blocked chicken, custom dish form, Hindi Cook page |

Not done: no build was installed on a phone. Camera, notifications delivery, WhatsApp
hand-off, TalkBack and photo deletion on a real device are still unverified.

### The three auditor tests that still fail

They cannot pass as written; the app suite has corrected copies marked `FIXTURE`.

- **D13** — the test re-implements the old screen filter inline (`!f.cart.some(...)`), which
  hides anything ever bought no matter what the app returns. The screen now calls
  `cartSuggestions`, which only skips items still open on the list.
- **D22** and **Control: cook reply** — both apply a reply with card id `card`, which the app
  never issued. D23 requires exactly that to be rejected. With a card that was really issued,
  both behaviours pass.

## Status of each finding

"Fixed" means the code is changed and an automated test covers it. Notes say what is left.

| ID | Sev | Status | What changed |
|---|---|---|---|
| D01 | Critical | Fixed | Canonical allergen model (`allergens.ts`): milk covers paneer, curd, ghee, butter, raita; wheat covers atta, rava, bread, maida. Recipes completed with hidden ingredients. Unconfirmed dishes are never treated as safe for an allergy. |
| D02 | High | Fixed | Spice is a hard rule. A dish one step hotter is allowed only as its mild version, and the Cook Card says so. |
| D03 | Critical | Fixed | A new dish asks for diet, allergens, onion/garlic and spice. Until confirmed it is never suggested and can't be planned for anyone with rules. Dishes from 1.0.0 are marked "needs details" (Settings → Dishes you added). |
| D04 | High | Fixed | 64 catalogue dishes tagged vegan; a test checks none contains milk, egg or fish. Cook Card adds "use oil, no ghee/butter/curd". |
| D05 | Critical | Fixed | `upsertPlan` checks every option against diet, allergies, fasts, spice and box fit; invalid options are dropped or the save is refused. The picker shows blocked dishes with the reason. Swaps check both sides. Saved plans are re-checked when a member's rules change. |
| D06 | High | Fixed | One `planDish` / `rankedOptions` used by Tomorrow, Week, Today and the Cook Card. |
| D07 | High | Fixed | A cooked or ordered-in plan can't be re-planned; it is corrected from Log or Memory. |
| D08 | High | Fixed | A meal logged by a person replaces the cook's pick. |
| D09 | High | Fixed | Plans keep `forMemberIds`; portions are adult-equivalents (child 0.6, toddler 0.4, senior 0.8) for the people on that plate only. |
| D10 | High | Fixed | Saved and edited tiffin choices are checked against breakfast and the other box. |
| D11 | Medium | Fixed | A leftover is used up only by a later meal (date and slot). |
| D12 | Medium | Fixed | Ordered-in meals never use up leftovers. |
| D13 | Medium | Fixed | See above. |
| D14 | High | Fixed | Shopping uses the same full ingredient list as the allergy check. |
| D15 | Medium | Fixed | "Only known" shows no new dishes, unless no known dish fits at all. The dial caps new dishes in the list. |
| D16 | Medium | Fixed | Pausing freezes ranking: anything logged while paused is ignored, and the toggle says so. |
| D17 | Medium | Fixed | Tiffin returns are learned per child and per box. |
| D18 | Medium | Fixed | Favourites come only from "loved" / empty-tiffin; the badge needs three, with no rejection. |
| D19 | Medium | Fixed | Negation handled per clause. Each saved preference shows editable More/Less tags. "No maida" has its own tag. |
| D20 | High | Fixed | Parser is Unicode-aware; Hindi day and meal words; dish names in Hindi, Kannada, Tamil, Telugu script. |
| D21 | High | Fixed | Custom dish ids keep Unicode letters. |
| D22 | High | Fixed | A change request is stored on the plan with two alternates, shown on Today, and counted against the dish. |
| D23 | High | Fixed | Replies apply only to a card this phone issued: id, signature, expiry and the meals on that card. STOP is tied to that card's cook. |
| D24 | High | Partly | Links now expire and carry a signature; the reply echoes it. A static page can't verify who made a link or revoke one. That needs a server. |
| D25 | Medium | Fixed | Family fast dates apply only to members who keep fasts. Per-member fast dates added. |
| D26 | Medium | Fixed | Times must be HH:MM; invalid ones are not saved and are shown. Scheduling problems are reported. |
| D27 | Medium | Fixed | Short-break box needs dry finger food. |
| D28 | Medium | Fixed | Pick-up + 15 minutes carries into the hour. |
| D29 | High | Fixed | Each family's reminders are replaced on their own. |
| D30 | Medium | Fixed | Holidays are skipped (school holidays can now be entered per child). |
| D31 | Medium | Fixed | No box, no reminder. |
| D32 | Medium | Fixed | Cook reminder only when a card is unsent; cancelled once sent. |
| D33 | High | Fixed | 9 pm digest lists unconfirmed auto-logged meals. |
| D34 | High | Fixed | Reply number carries the country code, in the app and on the Cook page. |
| D35 | High | Fixed | Cards follow working days, meals and leave dates; an empty selection means no cards. |
| D36 | High | Fixed | Opening WhatsApp no longer marks meals sent; the planner confirms, or the cook's reply does. |
| D37 | High | Partly | Auto-log runs for every family on open, on return to the app, on family switch and every minute while open. No background job. |
| D38 | High | Fixed | "Log as cooked" carries the plan and member; a tiffin can't be saved without a child. |
| D39 | High | Fixed, device check pending | Deleting a family or a meal deletes its photos; export temp files are removed. |
| D40 | Medium | Fixed, device check pending | All buttons, chips and toggles are 48dp; inputs have programmatic labels. |
| D41 | High | Fixed | Quantities are sent for every option; the Cook page shows the selected one. |
| D42 | High | Fixed, review needed | Dish names, ingredients, units and notes in Hindi, Kannada, Tamil, Telugu. Written by the developers: a native speaker must review each. The date line is still in English. |
| D43 | Medium | Fixed | Accept, swipe and cook-change events feed ranking with decay. |
| D44 | Medium | Fixed | Top three cover rice, roti and other when each is within 30 points of the best. |

## Things that behave differently after the update

- **Dishes you added in 1.0.0** stop being suggested until you confirm them in Settings.
- **Meals marked "sent" by 1.0.0** go back to "planned": the old build had no record of the
  card, so a reply couldn't be matched. Send the card again.
- **Spice "None"** members only get dishes that are mild or can be made without chilli.
- **Family favourites** is empty until someone taps "Loved" or a tiffin comes back empty.
- **The Cook page** (`docs/cook.html`) changed. It goes live when this is pushed to GitHub.
  Push before sending cards from 1.0.1: until then the live page shows only the first option's quantities and ignores the expiry. Links from 1.0.0 still open on the new page.

## Not in scope

The audit's "FSD gaps beyond individual defects" (shared sign-in and invites, widget, family
vote, occasion planner, balance rings and the rest) are missing features, not defects, and
were not built here.
