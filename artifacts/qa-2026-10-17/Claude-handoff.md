# What’s Cooking — changes to implement after the 17 October live review

Reference the tested deployment and evidence in [Live-web-review.md](Live-web-review.md). This is an implementation brief for review; no fixes were made in this test session. Preserve working validation, no-key logging, dietary restrictions and accessible success announcements. Inspect the current repository before implementation rather than assuming it exactly matches the deployment.

## 1. Make setup recoverable and quick

Persist a versioned onboarding draft and current step after meaningful edits, including an in-progress member. Resume after refresh/reopen; preserve Back and Skip. Show step labels and a revisit checklist. Do not silently create a finished family until completion.

Replace the opening form with a food-led welcome and a sample result, with Start planning, Join my family and Try a sample. Collect explicit dietary boundaries before making personalised food claims. Make cuisine selection multi-select and optional. Family naming, extra members, cook/tiffin details, fasting and AI setup can be completed later. Retain dietary safety at every planning boundary.

The long favourites catalogue needs search/categories and a sticky Continue / Skip for now footer. Avoid forcing a choice of ten dishes.

Acceptance: refresh/reopen each step without lost names or members; reach a useful first recommendation without filling optional logistics; modify saved preferences later.

## 2. Provide a true history edit and replacement flow

History details must include Edit. Allow changing dishes, date, slot and diners while preserving the event identity; define reaction/leftover handling explicitly. When logging into an existing slot, offer Replace existing meal / Add another meal. Do not require deleting and re-entering. Define reconciliation between planned, auto-logged and manually recorded food, and reflect it in Today, Week, Memory and reports.

Acceptance: pasta dinner changed to fried rice produces the intended single dinner event when Replace is chosen; Add another deliberately permits both. Verify related shopping, leftovers, reactions and summary totals.

## 3. Fix accessibility in shared controls

Web switches currently use role=switch without aria-checked; Space did not toggle the school switch, while Enter did. Bind state and keyboard activation correctly. Use proper radio/tab/toggle semantics for selected diet, age, meal-slot and filter choices. Keep visible focus and announce field errors and action results. Maintain working live-region success toasts.

Most Today buttons are already 48 px high. Increase the meal-picker close target from approximately 18 × 30 px to 44–48 px, and verify all modal close controls. Test focus trapping/restoration and keyboard-only completion; do not assume those tests already passed.

## 4. Add real theme support and a stronger first impression

The existing light cream/orange default is a useful base. Create semantic theme tokens for surfaces, text, accents, borders, selected states, focus, errors and charts. Offer Saffron cream, Garden sage, Berry breakfast and optional Cocoa night, with preview and persistence. Theme selection belongs in Settings, not as required onboarding work.

Put one meal recommendation and its decision action above pantry, shopping and secondary modifiers. Add an appetising dish image or intentional illustration and concise metadata. Label Cook this as Plan this meal if it only plans; use a separate Mark as eaten/cooked action. Remove swipe guidance when no swipe card is present. Provide honest personalisation and empty states.

Acceptance: first-use, Today, forms, sheets, history and reports use the selected theme consistently; check contrast and state readability for every palette and 360/390/430 px layouts. Respect reduced motion. Do not make unmeasured claims that conversion or setup time improved.

## 5. Finish the requested product features

- Join family: welcome and Family entry points, authenticated invitation acceptance and actual multi-device shared data. Define roles, expiry/revocation, offline behaviour and conflicts. Do not implement a cosmetic local-code join.
- Cuisine: multi-select tastes and a curated world-cuisine catalogue with complete ingredient/allergen/diet/time/tiffin metadata. Keep custom creation as an addition, not the only route to common international meals.
- Contacts: expose the intended contact setup where needed; country selection, flexible input, international normalisation and actionable errors. Contacts can remain optional when messaging is not used. The live test could not find phone fields in the tested planner/member/Cook forms, so first confirm the intended flow.
- Fasting: master opt-in default off, conditional fields and clear separation between festival information and actual enabled food rules.
- Tiffin: preserve flexible pickup-time validation. Explain what the time means and show the resulting reminder; verify on physical devices.
- AI: an optional clickable beginner guide, create/copy/paste steps, Save and Test connection, connection states and retry. Keep no-key mode functional; never expose keys in logs or analytics. Verify provider details at implementation time.
- Logging: obvious Type / Pick manually / Photo modes, arbitrary date picker, slot, dish search, diners and optional notes/portions/leftovers. Keep preview and saved confirmation.
- Reports: a discoverable Insights section, possibly inside Memory. Weekly logged meals, variety, repeats, reactions, tiffin feedback and recorded leftovers; filters and drill-down. No fabricated nutrition, financial savings or food-waste amounts.

## 6. Preserve and broaden the feedback improvements

Empty name, empty text log, invalid time, no selected dish and blocked diet choices already showed clear feedback in this deployment. Preserve these paths. Use one consistent interaction model: ready → saving → saved, or actionable error with retry. Prevent duplicate submissions and preserve inputs on failure. Clarify which Settings sections autosave and which require explicit Save or Update.

## Completion evidence

For each change provide before/after screenshots, relevant behavioural regression checks and a short note identifying what remains unverified. Include setup draft recovery, meal replacement without unintended duplicates, keyboard switches, selected-state semantics, every theme, opt-in calendars, no-key manual logging and cross-device joining. Test Android/iOS reminders, native sharing, camera and voice on actual devices separately. Do not claim full closure of the older 44-finding audit based only on these UI improvements.
