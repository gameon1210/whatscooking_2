> Update: UX01–UX17 were fixed in 1.0.5. See [repairs and verification](Fixes.md). The observations below describe the original review baseline.

# What’s Cooking — broader intuitive-use review

18 October 2026 · Expert walkthrough and exploratory testing · Source 1.0.4 / 92c93b4

## Assessment

The next improvement should make the person, date and state of every meal obvious. The app can now do more than a new user can reliably discover: important conditions are hidden in explanations, shopping completion contradicts itself, an interrupted log is lost, and a past week can look populated before any actual meals were recorded.

This review contains **17 prioritised findings: 7 High and 10 Medium**. They include observed behaviour problems, missing controls and usability opportunities; they are not 17 equivalent code defects. Priority reflects likely impact on the tested household goals, not measured frequency among users.

This was an expert review using realistic synthetic scenarios, **not a study with recruited participants**. No participant quotes, success rates or time-on-task claims are invented. The [participant test pack](Participant-test-pack.md) provides three scenarios, five post-task questions, an exploratory checklist and a note sheet for real sessions.

## Two targets, kept separate

- **Live:** [whatscooking.expo.app](https://whatscooking.expo.app). After reload it served the previous design-refresh bundle, entry-b2a1d2ebf8f585da3f7700b986cfa70f.js. Its Log and Settings did not expose the supplied 1.0.4 additions.
- **Current source:** 92c93b4, version 1.0.4. Its production web export was exercised at the [local review preview](http://127.0.0.1:8089), with bundle entry-e7795f4b76daa1c1808cb35926e33003.js.
- The source-only additions were tested locally rather than counted individually as missing live features. **UX01 is the release mismatch.** The rest of the review concerns broader household tasks.

## Coverage and verification

| Area | Exercised goals |
|---|---|
| First use / Family | Minimal household, diet and child allergy, two children, school boxes, cook role/language, optional favourites |
| Today / planning | Quick/light choices, reasons, pantry selection, plan versus cooked state, tomorrow confirmation |
| Week | Current and past views, named child boxes, repeats, bulk actions and status interpretation |
| Shopping | Planned ingredients, staple assumptions, manual item, copy feedback, bought state and recovery, date range |
| Cook | Planner preview, main handoff location, actual cook page, alternate choices and missing-item entry; no message sent |
| Log / Memory | No-AI entry, past/ordered meal, diner attribution, reload interruption, date correction, saved reaction, filters |
| Return value | Private recap, sparse/empty data, finding recap/order after customisation, preferences in everyday language |
| Layout / input | Desktop, 390 × 844, 360 × 800 home, Space activation, Escape and focus return |

- **177 tests passed across 9 suites**, with no failures. [Raw automated results](test-results.json).
- Lint and type checking passed; the current web export was generated and opened successfully. This does not certify native compilation or runtime for 1.0.4.
- At **360 px**, document width was 360 px; the primary meal action was 48 px high and ended at about 679 px in an 800 px opening viewport. [Metrics](small-phone-metrics.json), [small-phone view](35-current-home-360.png).
- Current home preferences and household/meal data persisted after reload. Unsaved logging state did not.
- The latest [food-week recap](30-current-food-week.png) correctly separated ordered-in from home-cooked food; [last week’s empty state](31-recap-empty-week.png) was honest.
- Explicit future dates were refused. The separate year-guessing ambiguity is UX16, not a claim that future validation failed.

## Changes to prioritise

1. **Restore trustworthy state:** fix bought-item reappearance, retain an unfinished meal and distinguish past records from suggestions (UX04, UX05, UX07).
2. **Carry essential context:** show required adaptations before choosing a dish and include dietary instructions in the cook handoff (UX02, UX03).
3. **Let the user tell the truth:** choose who actually ate each meal, including one adult (UX06).
4. **Keep tasks reachable:** put the cook action within reach; preserve recap and ordering access when home cards are hidden (UX08, UX15).
5. **Reduce decisions:** review ingredients individually, carry the chosen planning range, simplify child setup, complete dish browsing and use everyday explanations (UX10–UX14).
6. **Release the intended experience:** separately verify that the public URL serves the intended version (UX01). No release was published during this review.

## Finding register


| ID | Priority | Area | Finding |
|---|---|---|---|
| UX01 | High | Release | The live URL serves the previous release |
| UX02 | High | Meal decisions | A conditional recommendation looks suitable without its required change |
| UX03 | High | Cook handoff | The cook handoff omits a child’s saved allergy |
| UX04 | High | Shopping | An item marked bought immediately returns as something to buy |
| UX05 | High | Logging | A complete unsaved meal entry disappears after reload |
| UX06 | High | Logging and memory | A normal meal cannot be recorded for just one adult |
| UX07 | High | Week and history | Unlogged past days are filled with fresh meal suggestions |
| UX08 | Medium | Cook handoff | The primary cook action is buried below a long message |
| UX09 | Medium | Weekly planning | Unpinned weekdays repeat nearly identical menus |
| UX10 | Medium | Shopping | Ingredient review is all-or-nothing and the empty state contradicts it |
| UX11 | Medium | Week to shopping | Shopping from a week always uses the next three days |
| UX12 | Medium | First use | Adding a child still feels like completing a settings page |
| UX13 | Medium | Dish selection | Cuisine browsing silently stops after forty dishes |
| UX14 | Medium | Explanations and preferences | Why this? exposes scoring machinery instead of a decision explanation |
| UX15 | Medium | Navigation and customisation | Hiding home sections removes normal access to core features |
| UX16 | Medium | Dates and corrections | A yearless future date silently becomes last year |
| UX17 | Medium | Ordering | Order in offers one dish with no way to choose another |

## Detailed evidence and acceptance checks

### UX01 — The live URL serves the previous release
**High · Release mismatch · Live site**

**Observed:** After a reload, whatscooking.expo.app loaded entry-b2a1d2ebf8f585da3f7700b986cfa70f.js, the earlier design-refresh bundle. Settings had no cuisine/calendar controls or AI walkthrough, and Log had no list mode. The local 1.0.4 export loaded entry-e7795f4b76daa1c1808cb35926e33003.js and displayed those features.

**Why it matters:** People testing the supplied URL cannot experience the features described as built, and feedback can be assigned to the wrong release.

**Suggested change:** Publish the intended release through the normal release process, then smoke-test the public URL. Show an app version/build identifier in Settings so testers can name the version.

**Retest:** The public URL exposes the intended list logging, cuisine controls and walkthrough after reload; its version is visible. Keep this separate from product defects.

Evidence: [16-live-settings-version.png](16-live-settings-version.png), [17-live-settings-dom.txt](17-live-settings-dom.txt), [18-current-favourites.png](18-current-favourites.png). Source pointer: Release asset identity; app/src/app/settings.tsx.

### UX02 — A conditional recommendation looks suitable without its required change
**High · Misleading guidance · Current 1.0.4**

**Observed:** Order in offered Veg Manchurian with fried rice labelled “Spicy” and “Fits everyone’s rules” for Riya and Aarav, whose saved spice limit was Mild. Only opening Why this? revealed “Make it mild for Riya, Aarav” and “Spicy for Riya”.

**Why it matters:** A hurried person can choose the dish without seeing the change that makes the recommendation acceptable. Ordering adds a further unverified restaurant preparation step.

**Suggested change:** Put required adaptations on the main card, before the action: “Only if made mild for Riya and Aarav”. Replace an unconditional fit claim when a condition exists. Keep restaurant preparation as something the user confirms.

**Retest:** Every required adaptation is visible without opening an explanation, and survives planning and the cook/order handoff. No unqualified “fits everyone” label appears for a conditional choice.

Evidence: [33-order-in-first-open.png](33-order-in-first-open.png), [34-order-spicy-fits-rules.png](34-order-spicy-fits-rules.png). Source pointer: app/src/components/SuggestionCard.tsx; app/src/app/order-in.tsx.

### UX03 — The cook handoff omits a child’s saved allergy
**High · Missing essential context · Current 1.0.4 and generated cook preview**

**Observed:** Riya was saved with a milk allergy. The six-meal English Cook Card and the actual cook preview identified her boxes but did not show that restriction. The card generator adds mild/vegan notes, but does not carry an allergy instruction.

**Why it matters:** The recipient must already remember information that the planner supplied to the app. A meal name alone does not communicate the household’s restrictions during preparation or substitution.

**Suggested change:** Include a concise, reviewable dietary instruction per affected person/plate in the handoff. Keep essential restrictions visible in the planner’s family summary and the cook’s preview.

**Retest:** A card for this test household visibly includes Riya’s milk restriction on the relevant plates, including when an alternative is selected. Verify with someone who knows the food; this review does not certify catalogue allergen accuracy.

Evidence: [20-current-cook-card.png](20-current-cook-card.png), [21-cook-page.png](21-cook-page.png), [21-cook-page-dom.txt](21-cook-page-dom.txt). Source pointer: app/src/domain/cookcard.ts:166.

### UX04 — An item marked bought immediately returns as something to buy
**High · Behaviour bug · Current 1.0.4**

**Observed:** After Add all to list, marking bread as bought removed its row and immediately produced “Planned meals need: bread” plus Add all to list for the unchanged plans. The bought row had no visible Undo or bought-items section.

**Why it matters:** The list contradicts the completed action, can cause repeat buying, and makes a mistaken tap hard to recover from.

**Suggested change:** Track which planned need a purchase fulfils. Keep it fulfilled for that need; allow a genuinely later need to reappear. Offer Undo and a reversible bought section.

**Retest:** Mark bread bought: it does not immediately reappear for the same plans. Undo restores the open row. A new, later requirement can request it again without duplicating an already fulfilled need.

Evidence: [24-current-shopping-ingredients.png](24-current-shopping-ingredients.png), [25-shopping-bought-no-undo.png](25-shopping-bought-no-undo.png). Source pointer: app/src/domain/actions.ts:429; app/src/app/cart.tsx.

### UX05 — A complete unsaved meal entry disappears after reload
**High · Recovery gap · Current 1.0.4**

**Observed:** Selected Yesterday, Dinner, Ordered in, and Vegetable pasta in list mode, then confirmed the dish selection. Reloading before the final Save discarded the mode, day, meal, dishes and ordered-in choice with no recovery message.

**Why it matters:** A short interruption can require repeating the entire task. This conflicts with the low-attention use case even though onboarding has draft recovery.

**Suggested change:** Persist an unfinished log per family and restore it with Resume / Discard. Keep a draft distinct from a saved meal; changing or leaving a dirty edit should make the consequence clear.

**Retest:** Reload/reopen after preparing this entry restores all fields without creating a history entry. Save creates exactly one meal; Discard removes only the draft.

Evidence: [26-filled-log-before-reload.png](26-filled-log-before-reload.png), [27-log-draft-lost-after-reload.png](27-log-draft-lost-after-reload.png). Source pointer: app/src/app/(tabs)/log.tsx:56.

### UX06 — A normal meal cannot be recorded for just one adult
**High · Missing control · Current 1.0.4**

**Observed:** The normal dinner log and Edit meal flow offered day, meal, dishes and cooked/ordered status, but no choice of diners. The saved pasta dinner appeared under Riya’s Memory filter although the scenario could be an adult’s meal alone. Child tiffin ownership is a separate supported path.

**Why it matters:** People cannot accurately represent different sittings or someone eating out alone. Household and per-person history can imply participation that was never selected.

**Suggested change:** Add “Who ate this?” with Everyone as a convenient editable default. Preserve that choice through edits, repeat logging, Memory filters and recap calculations.

**Retest:** Log a dinner for Asha only: it appears for Asha, does not appear for Riya/Aarav, and can later be corrected to include another diner without changing its identity.

Evidence: [28-current-memory.png](28-current-memory.png), [29-edit-no-diner-choice.png](29-edit-no-diner-choice.png). Source pointer: app/src/app/(tabs)/log.tsx; app/src/domain/actions.ts:186.

### UX07 — Unlogged past days are filled with fresh meal suggestions
**High · Misleading state · Current 1.0.4**

**Observed:** With no meals logged for last week, Week → Prev populated 11–17 October with suggested meals, Plan day, Pin all suggestions and sharing actions. The title still said This week. The separate recap correctly said “Nothing logged last week”. The bottom legend distinguishes faded suggestions, but is far below the initial phone view.

**Why it matters:** Reviewing a past week can look like reviewing real household food. The app makes users reconcile two different representations of the same dates.

**Suggested change:** Past dates should show existing records or explicitly labelled saved plans; empty past slots should offer Log a meal. Show the visible date range and plain per-meal states such as Suggested, Planned and Logged beside each meal.

**Retest:** An unlogged past week shows empty history rather than newly generated meals. A saved plan remains visibly a plan until confirmed. The week range and state can be understood without the bottom legend.

Evidence: [23-past-week-invented-suggestions.png](23-past-week-invented-suggestions.png), [31-recap-empty-week.png](31-recap-empty-week.png). Source pointer: app/src/app/(tabs)/plan.tsx:37.

### UX08 — The primary cook action is buried below a long message
**Medium · Action placement · Current 1.0.4**

**Observed:** For a household with two children, the six-meal card printed all ranked choices, quantities and the long reply link before Send on WhatsApp. At 390 × 844, the send button began about 1,894 px below the page top.

**Why it matters:** The person reaches a large text preview instead of an immediately understandable next step. It takes more than two screen heights of content to reach the main action.

**Suggested change:** Use a compact, expandable preview and a fixed handoff action. Keep the long reply URL in the shared message, while displaying a human-readable link in the in-app preview.

**Retest:** The first phone viewport shows who/date/meal count, essential dietary instructions and the primary handoff action. Full text remains reviewable and copyable.

Evidence: [20-current-cook-card.png](20-current-cook-card.png), [21-cook-page.png](21-cook-page.png). Source pointer: app/src/app/cook-card.tsx:105.

### UX09 — Unpinned weekdays repeat nearly identical menus
**Medium · Suggestion quality · Current 1.0.4, test household**

**Observed:** The current weekly view repeated the same Tuesday/Wednesday choices and many Thursday/Friday choices, including the same dinner. Multiple school boxes also repeated. This was observed for the test household, not measured across all families.

**Why it matters:** A full-looking week still requires manual variety work. Pin all suggestions can commit a repetitive menu before a user notices it.

**Suggested change:** Consider variety across the proposed week before offering the bulk action, while respecting real family favourites and restrictions. Offer an explicit repeat/variety preference and a review before committing the week.

**Retest:** A sufficiently broad compatible catalogue yields a visibly reviewed week, with repeats explained or intentional. Regenerating unpinned slots does not overwrite confirmed choices.

Evidence: [40-current-week.png](40-current-week.png), [40-current-week-dom.txt](40-current-week-dom.txt). Source pointer: app/src/app/(tabs)/plan.tsx; app/src/state/draft.ts.

### UX10 — Ingredient review is all-or-nothing and the empty state contradicts it
**Medium · Review friction · Current 1.0.4**

**Observed:** The list showed eight ingredients under Planned meals need and an Add all to list button, followed by “Nothing to buy”. There was no per-ingredient confirmation, quantity editing or clear explanation of which meal required each ingredient. The earlier planned dal/rice produced an empty list because household staples were assumed.

**Why it matters:** The user must mentally reconcile what is required, what is assumed present and what is already on the list. “Nothing to buy” can be read as assurance that preparation is covered.

**Suggested change:** Show a reviewable ingredient checklist with meal source and optional quantity. Make “Already have it” explicit. Use “Your list is empty—review 8 suggested items” when pending suggestions exist.

**Retest:** A person can include some suggested ingredients and exclude others before adding them; edit a manually entered item; and inspect the assumptions behind an empty list.

Evidence: [24-current-shopping-ingredients.png](24-current-shopping-ingredients.png), [07-shopping-empty-after-plan.png](07-shopping-empty-after-plan.png), [08-shopping-actions.png](08-shopping-actions.png). Source pointer: app/src/app/cart.tsx:43.

### UX11 — Shopping from a week always uses the next three days
**Medium · Scope mismatch · Current 1.0.4**

**Observed:** Week’s Shopping list opens the same cart that explicitly covers today through the next two days, regardless of the week being viewed. There is no chosen-week or custom-range option.

**Why it matters:** Someone shopping for a full week has to infer which ingredients are missing from the list and cannot carry their chosen planning period into the next task.

**Suggested change:** Carry the selected week into ingredient review, or ask “Next 3 days / This plan / Choose dates” with the active range always visible.

**Retest:** Opening shopping for a future or current week includes that selected range, and changing the range updates the reviewed needs without silently mixing periods.

Evidence: [24-current-shopping-ingredients.png](24-current-shopping-ingredients.png), [40-current-week-dom.txt](40-current-week-dom.txt). Source pointer: app/src/app/(tabs)/plan.tsx:122; app/src/app/cart.tsx:25.

### UX12 — Adding a child still feels like completing a settings page
**Medium · Form burden · Live and current 1.0.4**

**Observed:** Add child opens a scrolling sheet containing role, age, diet, special dietary rules, spice, free-text restrictions, calendar and school configuration before Save person at the bottom. The current calendar switch reduces the earlier form, but the core structure remains lengthy.

**Why it matters:** A first-time parent must decide what matters before seeing the first recommendation. The form suggests that every section needs attention even though many defaults are usable.

**Suggested change:** Start with name, diet/allergies and whether school boxes are needed. Collapse advanced preferences, infer obvious child defaults and keep Save / Finish later reachable. Make later editing easy to find.

**Retest:** A basic child can be added without inspecting every settings section. The user can identify what is required, keep a draft and return to school details later.

Evidence: [02-child-sheet-first-view.png](02-child-sheet-first-view.png), [18-current-favourites.png](18-current-favourites.png). Source pointer: app/src/components/MemberForm.tsx; app/src/app/onboarding.tsx.

### UX13 — Cuisine browsing silently stops after forty dishes
**Medium · Browse dead end · Current 1.0.4**

**Observed:** In dinner logging, the Indian shelf ended at Onion uttapam followed by Save; there was no Show more. The component sorts dishes alphabetically and takes the first 40. Search can find more, but that requires knowing or typing a name.

**Why it matters:** A person who expects to browse without typing can miss later alphabetic dishes and conclude that the catalogue does not contain them.

**Suggested change:** Allow progressive loading or a complete manageable browse list, show the result count and preserve the selected dishes. Include a discoverable shelf for the family’s own dishes.

**Retest:** A compatible dish beyond the first forty is reachable without typing. A visible count/loading control explains any intentional limit.

Evidence: [41-current-picker-cutoff.png](41-current-picker-cutoff.png), [41-current-picker-cutoff-dom.txt](41-current-picker-cutoff-dom.txt). Source pointer: app/src/components/DishPicker.tsx:201.

### UX14 — Why this? exposes scoring machinery instead of a decision explanation
**Medium · Cognitive load · Live; shared component in current source**

**Observed:** Why this? showed lines such as -8 New for your family, +4 A weekend favourite, and negative spice/adaptation scores. Settings also exposes familiarity choices as 20/40/60/80. These values do not tell a household what action to take.

**Why it matters:** The explanation asks the user to interpret an internal score and can make a newly suggested dish look like a problem. Important conditions compete with numeric ranking details.

**Suggested change:** Use a short explanation ordered by importance: required changes, fit for people/time, ingredients used and reason for variety. Use named familiarity choices. Keep scoring details in a diagnostic view if needed.

**Retest:** A person can explain why the dish was suggested and what, if anything, they must change without knowing how a score works.

Evidence: [04-first-home-why.png](04-first-home-why.png), [34-order-spicy-fits-rules.png](34-order-spicy-fits-rules.png), [32-preference-preview.png](32-preference-preview.png). Source pointer: app/src/components/SuggestionCard.tsx; app/src/app/settings.tsx.

### UX15 — Hiding home sections removes normal access to core features
**Medium · Hidden capability · Current 1.0.4**

**Observed:** Turning off From your food memory removed the Our food week entry point. Turning off What’s in the kitchen removed Order in from home. The main five tabs have no independent recap or order entry; the source places those actions inside the optional cards. Shopping remains reachable from Week.

**Why it matters:** A cosmetic choice changes which tasks are discoverable. Users must remember to restore a home section to get back to a feature.

**Suggested change:** Give core tasks permanent navigation independent of home cards: for example History / Our food week within Memory, and Order in beside the meal decision or in a stable actions menu.

**Retest:** The recap and order flow are reachable with all optional home cards hidden. Hiding a card changes presentation rather than removing a task.

Evidence: [39-customising-hides-core-actions.png](39-customising-hides-core-actions.png), [28-current-memory.png](28-current-memory.png). Source pointer: app/src/app/(tabs)/index.tsx:188; app/src/app/(tabs)/index.tsx:196.

### UX16 — A yearless future date silently becomes last year
**Medium · Ambiguous inference · Current 1.0.4**

**Observed:** On 18 October 2026, typing 19 Oct selected Sunday 19 October 2025 rather than asking about the year. The toast and accessible button included 2025, but the selected day chip showed only Sun 19 Oct. Explicit 2026-10-19 was correctly refused as future.

**Why it matters:** A small typing mistake can put an entry almost a year away while still satisfying the rule against future dates. The main form makes that jump easy to overlook.

**Suggested change:** Show the fully resolved date, including a different year, before applying it. When an omitted year would roll back, ask for confirmation or request a year.

**Retest:** Typing 19 Oct on this date cannot quietly create a 2025 entry. A user deliberately selecting 2025 can still do so; explicit future dates stay blocked.

Evidence: [36-date-silent-year-rollover.png](36-date-silent-year-rollover.png), [37-date-explicit-future-blocked.png](37-date-explicit-future-blocked.png). Source pointer: app/src/domain/dates.ts:195; app/src/components/DatePickerSheet.tsx.

### UX17 — Order in offers one dish with no way to choose another
**Medium · Choice dead end · Current 1.0.4**

**Observed:** Order in presented one recommendation with Why this?, Open Zomato and Log as ordered in. It had no Next, change-dish search or alternate suggestions. It also showed cooking-oriented metadata such as Takes time.

**Why it matters:** Someone who does not want that dish must leave the task or bypass the app’s suggestions. The familiar Next interaction from Today disappears.

**Suggested change:** Keep Next / Choose another and cuisine browsing available in the order flow. Use ordering-relevant information and keep dietary conditions visible. Keep opening a provider distinct from recording a completed order.

**Retest:** The user can reject the first dish and choose a different compatible meal within the flow, without logging an order or opening an external provider first.

Evidence: [33-order-in-first-open.png](33-order-in-first-open.png), [34-order-spicy-fits-rules.png](34-order-spicy-fits-rules.png). Source pointer: app/src/app/order-in.tsx.

## A coherent direction for the app

Use a consistent meal workspace across Today, Week, the cook and Memory:

- Start with **which day, which meal and who is eating**.
- Show the chosen dish with a short reason and any required change in plain words.
- Once planned, offer **Review ingredients** and **Tell the cook** beside that same meal.
- After eating, offer **Log what actually happened**, including diners, ordered-in status and leftovers.
- After saving, show **what was saved** and a reachable **Change this meal** action.

These are design recommendations, not implemented screens. A compact status line such as “Tomorrow dinner · 3 people · Planned” should do more work than fading, pin icons or a legend at the bottom of a week.

For first use, a useful first decision can precede detailed household configuration. Offer progressive setup for school/cook details, while keeping diet/allergy boundaries clear. Keep the existing food imagery and personal covers; further visual decoration is a lower priority than understanding and recovery.

## Follow-up opportunities, not newly verified defects

- The logging picker explicitly limits a plate to four dishes; planning defaults to three ranked choices. Test a real thali and a household that wants more alternatives, then decide the appropriate limits.
- Long-press swapping is described at the bottom of Week. Provide visible Move/Swap controls and a keyboard equivalent; drag-and-drop can complement them.
- Food-week statistics would benefit from “Based on 1 logged meal” coverage, a direct route from Memory, and drill-down into the meals behind a count. Keep the agreed private/non-shareable behaviour.
- Pantry choices need an obvious “See matching meals” return, especially when selection changes suggestions above the current scroll position.
- A simpler wording distinction between **must avoid** and **prefer less** would help family preference setup. “Less spicy for the kids” currently previews “less spice” while the scope control remains Whole family; have participants explain the scope before saving.
- Whole-week ingredient-first planning, school-meal refinements, additional commerce links and receiving shared items remain backlog topics. **No Blinkit/BigBasket/Zomato share/API research was performed in this review.**
- Multi-device joining/sync remains the explicitly deferred product boundary, not a newly discovered implementation defect. Country-aware phone validation was superseded by removal of phone numbers.
- Have knowledgeable reviewers check dish/allergen metadata. This walkthrough verified selected UI boundaries, not the safety of the entire catalogue.

## What remains unverified

No physical Android/iPhone, native build for 1.0.4, device keyboard, background lifecycle or screen-reader session was available. No real Gemini key, paid AI call, real message, purchase, family deletion or personal photo was used. Full offline, storage-quota and low-memory behaviour were not retested. No backend/sync/security audit or complete rerun of the original FSD matrix was performed.

An extra browser Back and temporary accessibility-snapshot/viewport artefacts were excluded from findings rather than reported as product defects. Final small-screen measurements were taken against the intended app at 360 px.

## Deliverables and next research step

- [Interactive review](Review.html) — filter findings and inspect evidence.
- [Participant test pack](Participant-test-pack.md) — three scenarios, five questions, checklist and note sheet.
- [Findings register](Findings-register.csv), [structured findings](findings.json), [session and scope](session.json).
- [Earlier FSD and design reviews](../README.md).

Run the three goal-based sessions with actual household planners, including different digital confidence levels and someone using accessibility settings. Give only the goal, collect actual behaviour and ease ratings, and retest the same goals after changes. Use participant observations to refine priorities; do not infer abandonment rates from this expert walkthrough.

Review artifacts were added; application source was not changed and no deployment was made.
