# What’s Cooking — live web review

17 October 2026 · Tested deployment: [web app](https://whatscooking--b0pkq3ogs8.expo.app/onboarding)

## Assessment

The update improves validation, saved-action feedback, no-key text logging and the dietary checks exercised here. It still only partially addresses the requested first-use experience. The default already uses a light cream background and warm food-like orange; the remaining visual problem is presentation, hierarchy and missing theme choice.

The opening asks for a name and a regional kitchen before demonstrating the benefit. It has no Join family path, preview, food imagery, progress indicator or estimate of the remaining work. The last setup step is a long dish catalogue whose Skip and start action is below the initial phone viewport. This review recommends fixing interrupted setup, history correction and accessibility first, while redesigning the first minute around a useful meal decision.

**18 observations below include bugs, feature gaps, usability findings and one verification gap. They are not 18 equivalent functional defects.** High/Medium describes impact within this review, not a security rating. Visual appeal and likely abandonment are expert judgments; no participant research or retention experiment was run.

## Scope and evidence

- Live browser interactions at the exact deployment above; desktop at the default viewport and phone simulation at 390 × 844 CSS pixels.
- Fresh origin state initially showed onboarding. Synthetic household QA Kitchen 17 Oct, adult QA Tester and child QA Child were used. Child milk allergy and no-spice settings were synthetic test inputs.
- Exercised setup, adding members, required-input errors, invalid and flexible pickup times, refresh recovery, Settings, cuisine search, text logging without a key, duplicate dinner entries, history details, Week, primary-action feedback, keyboard switches and DOM accessibility measurements.
- Did not modify application source, build or deploy a release, install plugins, send messages, invite real people, enter a real API key, make paid AI requests, delete a family or purchase anything. Synthetic entries remain only in the test browser’s local app storage.
- No native Android/iOS, actual WhatsApp sending, school reminder delivery, camera, microphone, offline network simulation, backend access-control or real-user conversion testing. This is a browser review of the linked deployment, not a repeat of every earlier automated FSD test. It does not close the earlier defect register as a whole.

## Your 14 requests: current status

| # | Request | Result in this deployment | Required change / acceptance check |
|---|---|---|---|
| 1 | Join a family | **Missing from tested entry points.** Welcome and Family offer creation; no join, invite acceptance or account entry. | Show Create / Join / Try a preview. A second browser/device must receive the same shared family after valid invitation; reject expired or unauthorised invitations. Local duplicate families are not a substitute for shared access. |
| 2 | Edit/correct history | **Missing direct edit.** Details have reactions and Delete this meal. Re-logging a changed dinner leaves both dinners. | Edit dishes, date, slot and diners on the existing record. Offer Replace / Add another when a date and slot already have a meal. Preserve identity and reactions appropriately; reconcile related plan/leftover state. |
| 3 | More cuisines | **Partial.** A few international dishes exist, including pasta, noodles and fried rice. Setup still offers only South Indian / North Indian / Mix of both. Thai and pizza searches returned custom creation only. | Multi-select cuisines, distinguish cuisine from diet, and add curated international home-cooking dishes with ingredient, allergen, time and tiffin metadata. |
| 4 | Country-flexible phone validation | **Not verifiable through tested UI.** Planner, new-member and Cook-role forms exposed no phone input or country picker. | Make contact setup discoverable where needed. Provide country selection and international formatting, clear inline errors and optional contact details when no messaging is requested. Test national and international examples by supported country. |
| 5 | Intuitive, explicit setup | **Partial.** Three sequential screens exist, with a clear required-name error. No step count, completion map, sample result or clear explanation of what can wait. | Explain the benefit first, show progress, label requirements, disclose optional sections progressively and make defaults explicit. |
| 6 | Fasting calendar opt-in | **Partial.** Individual fasting switches start off, but Food calendar fields appear in every member form. Today still says Rules applied today → Navratri without opt-in. | Add a default-off calendar preference. Hide fasting configuration until enabled. Distinguish a festival date from a dietary rule actually enforced; show exactly whose rule is active. |
| 7 | Tiffin pickup time | **Present for configuration.** 25:90 was rejected with inline feedback; 3:30 pm normalised to 15:30 and saved in the member flow. | Keep this behaviour. Clarify school dismissal versus delivery/collection time and the resulting reminder. Verify delivery, time zone and background behaviour on phones. |
| 8 | Required vs optional; Save | **Improved / partial.** Optional fields are labelled; missing member name shows an inline error and toast. The first Next looks inactive but accepts a click to explain the error. | Show the readiness condition before submission. Keep field errors near the problem and preserve entered values. Use consistent save and autosave copy; avoid styling a working button as silently disabled. |
| 9 | Buttons not working / hidden errors | **Improved in exercised cases.** Empty name, empty meal input, invalid time, no dish selection and blocked food all gave feedback. | Make this a shared behaviour across forms. Verify pending, success, error and retry states; announce feedback accessibly and prevent duplicate submissions. No blanket silent-button failure was reproduced here. |
| 10 | Quick steps, return later | **Partial, with a confirmed defect.** Back and Skip exist, but a refresh during setup erased the entered adult name, family name and child. | Persist a versioned draft and current step after edits. Resume after refresh/reopen; expose saved steps and Edit later. Keep completion separate from draft state. |
| 11 | More themes, food-like light default | **Partial.** Light cream/orange already exists. No theme selector was found in setup, Settings or Family. | Keep a refined food-led default and add coherent semantic theme tokens, preview and persistence. Theme choice should be optional and available after setup. |
| 12 | AI-key instructions | **Partial.** Settings says to get a key at aistudio.google.com, but exposes no clickable guide or step-by-step setup. | Provide Open guide, create/copy/paste steps, key handling guidance, Save and Test connection, meaningful failure recovery and Continue without AI. Do not require a key during first use. |
| 13 | Rich text/manual meal logging without AI | **Partial, with a working base.** Today dinner vegetable pasta parsed and saved without a key. A draft allows slot/date/dish changes. There is no immediately visible structured manual-entry mode; dates initially expose only Today, Yesterday and one earlier day. | Explicit Type / Pick manually / Photo modes. Manual entry should immediately offer any date, slot, dishes and diners, with optional portions/notes/leftovers and an edit path. Keep preview and confirmation. |
| 14 | Reports section | **Missing from tested navigation.** Five tabs, Family and Settings have no report entry; CSV export exists in Settings. | Add a weekly household report: logged meals, repeats, variety, favourites, tiffin feedback and recorded leftovers. Include date/member filters, empty states and drill-down; do not infer nutrition or money saved without supporting data. |

## What demonstrably improved

1. Empty required-name submissions display inline guidance, focus the field and show a toast.
2. Invalid pickup and reminder times explain the problem; Settings retains the last valid reminder time.
3. Empty Understand and empty plan Save actions explain what to do next.
4. Completed setup shows a ready toast. Text meal Save shows Saved, the dish/slot and a leftover prompt.
5. A successful member Save toast is inside an announcement region, as confirmed by DOM inspection.
6. Most measured Today action buttons are 48 px high. The school toggle row is also 48 px high.
7. Chicken curry was blocked for the vegetarian family, including a click-time explanation. Paneer dishes showed a milk-allergy block for QA Child. Custom Chicken Soup opened a diet/allergen/spice form and was blocked as non-vegetarian after saving with its inferred defaults.
8. Completed household data survived a refresh. A saved breakfast plan was retained and subsequently displayed as cooked through the app’s due-meal handling. Interrupted onboarding has different behaviour, described in R01.

These are representative controls, not proof that all ingredients, recipes or dietary paths are safe.

## Prioritised observations

### R01 · High · Functional bug — setup draft is lost on refresh
**Reproduce:** Enter QA Tester and QA Kitchen 17 Oct; Next; add QA Child and save; refresh before finishing setup. **Actual:** first screen returns with blank names and no saved child. **Expected:** resume the saved draft at the appropriate step, with all entered data. **Acceptance:** refresh and reopen at every setup step, including an unsaved member sheet; no entered data disappears. [Screenshot](05-setup-progress-lost-after-refresh.png).

### R02 · High · Feature gap / data-quality risk — history cannot be corrected in place
**Reproduce:** Type Today dinner vegetable pasta → Understand → Save; Memory → dinner details. There is no Edit. Log Today dinner veg fried rice as a correction. **Actual:** two dinner records remain; the only removal path is Delete. **Expected:** edit the existing event, or explicitly choose replacement versus an additional meal. **Acceptance:** changing a dinner preserves one intended dinner event and corrects dependent state. No deletion was performed in this test. [No edit](11-history-no-edit-action.png), [two dinners](12-relogging-creates-two-dinners.png).

### R03 · High · Feature gap — no join-family path
First-use screens and Family show creation only. Add an invitation entry point on welcome and Family, authenticate the recipient and implement actual shared data. Test invitation expiry/revocation and access from a second device. An invite-like local code without shared persistence would not satisfy this request. [Family](09-family-no-join.png).

### R04 · Medium · Feature gap — no user-selectable themes
Keep the existing warm cream base, but add Saffron cream, Garden sage, Berry breakfast and optional Cocoa night as complete palettes. Theme selection must change surfaces, text, borders, focus, selected controls and charts consistently, persist across reload and preserve readability. Do not make picking a theme a required setup step.

### R05 · High · Usability — setup has steps but little wayfinding or value demonstration
There are no numbered steps, saved-step links, clear estimated effort or sample outcome. Suggested sequence: food-led welcome → dietary boundaries → optional cuisine preferences → first recommendation. Family naming, additional people and cook logistics can follow after that first useful result. The dietary step must allow an explicit answer rather than silently presenting a default vegetarian adult as personalised setup.

### R06 · Medium · Usability — the optional dish step looks like mandatory work
The long catalogue fills the 390 × 844 screen, without search or categories in the tested step. Skip and start is below the initial viewport. Keep Skip for now and Continue in a sticky footer, show a small starter selection with search, and explicitly state that favourites can be added later. [Phone view](06-dish-step-mobile.png).

### R07 · Medium · Usability / trust — fasting configuration is not progressively disclosed
Fasting switches are off by default, which is good, but calendar fields still clutter setup/member forms. Today says Rules applied today: Navratri for the newly created household without fasting opt-in. That wording implies enforcement; this test does not prove fasting restrictions were actually applied. Add a master opt-in and separate calendar information from enforced rules. [First Today screen](07-today-first-arrival-mobile.png).

### R08 · Medium · Feature gap — cuisine scope is broader than setup communicates, but still shallow
Pasta/noodles/fried rice exist; global cuisine is not entirely absent. Nevertheless, Thai and pizza searches offered only custom creation, and the opening choices only describe Indian regions. Add curated cuisine groups and home-cookable meals, with separate dietary and spice filters. [Pizza search](14-pizza-not-in-catalogue.png).

### R09 · High · Verification gap — country-aware contact setup could not be exercised
No phone or country field appeared in the planner, new-member or Cook-role member screens inspected. This is an entry-point/discoverability gap; it is not evidence that an unseen phone validator accepts invalid numbers. Confirm the intended contact flow, expose it where needed and test each supported country. [Cook form accessibility inventory](15-cook-settings-accessibility.txt).

### R10 · Medium · Usability — AI setup assumes technical knowledge
A person unfamiliar with API keys is given a sentence and a plain website name. Explain the optional feature benefit and provide a clickable illustrated guide, a key entry field, test result and recovery steps. Provide a usable no-AI path throughout. Pricing wording should reflect verified provider terms when implemented; this review made no paid requests. [Settings](08-ai-key-guidance.png).

### R11 · Medium · Usability / feature gap — manual logging is possible but not explicit enough
Typing works without AI, but the microphone-first headline and Understand action obscure the direct manual path. Add an obvious Pick manually mode with date picker, slot, dish search, diners and optional details. Permit edits after saving and retain the current preview/leftover flow. [Successful no-key log](10-no-ai-meal-saved.png).

### R12 · Medium · Feature gap — reports are not discoverable
No report section was found across Today, Week, Log, Memory, Family and Settings. CSV export is useful but not a report. A report can live within Memory as Insights to avoid adding another primary tab. Show missing-data states honestly and let each aggregate open its underlying meals.

### R13 · High · Accessibility bug — switch lacks state and Space activation
The visible on school toggle is a DIV with role=switch and a label, but no aria-checked. Its visual state is orange and aligned right. Space left its school fields visible; Enter toggled them off. The accessibility tree reported the same zero value in both states. Bind the state correctly and support Space as well as Enter; verify with a real screen reader. [DOM evidence](19-switch-accessibility.json). The [W3C switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) specifies Space activation and exposed on/off state.

### R14 · Medium · Accessibility gap — selected chips lack exposed selection state
The selected Vegetarian and Child chips and the selected Breakfast slot have neither aria-pressed nor aria-selected. The first two are mutually exclusive choices; the slot selection changes content. Use suitable radio/tab/toggle semantics and announce the selected value, with keyboard navigation appropriate to that pattern. This observation concerns web DOM semantics; native accessibility was not tested.

### R15 · Medium · Accessibility / touch usability — modal close is much smaller than other controls
The measured meal-picker close button is about 18 × 30 CSS px, while most measured primary controls are 48 px high. Enlarge the close hit area to a comfortable 44–48 px without enlarging the visible X unnecessarily. This is a design recommendation, not a blanket WCAG conformance verdict: the [WCAG 2.2 minimum target criterion](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) uses 24 × 24 px with spacing and other exceptions.

### R16 · High · Usability / visual design — the opening does not yet demonstrate a compelling food experience
The current opening is a title, tagline and form surrounded by empty space. Today puts rules, modifiers, pantry and ordering above the meal recommendation; the primary decision appears low on the initial phone view. Put the recommendation and one clear action first. Use a food photograph or thoughtfully art-directed illustration, helpful dish attributes and one short personalisation reason. Keep pantry, ordering and secondary filters expandable. [Opening](01-first-open-desktop.png), [first Today screen](07-today-first-arrival-mobile.png). This is an expert design assessment, not a measured retention result.

### R17 · Medium · Usability / copy — some action semantics remain unclear
Cook this creates a PLANNED state, followed by a separate Log as cooked action. Name the first action Plan this meal and the later action Mark as eaten/cooked. After planning, the page still says to swipe the big card although that card has been replaced. Remove stale guidance. Settings also says changes save as they are made while presenting Save/Update reminders buttons; label the actual save scope of each section. [Action feedback](18-cook-this-feedback.png).

### R18 · Medium · Product consistency gap — logged dinner and Week tell different stories
After the two manual dinner saves, Memory showed pasta and fried rice while Week still showed a live Pav bhaji dinner, without an eaten indication for those logs. This may reflect independent plan versus history records, but the UI does not explain that distinction or offer reconciliation. Define a source of truth and provide Replace plan with what we ate, Keep plan or Add extra meal when appropriate. Do not silently overwrite a shared plan. [Week after logs](13-week-does-not-show-logged-dinner.png), [Memory](12-relogging-creates-two-dinners.png).

## Proposed first minute

1. **Welcome, with a result preview.** A warm food image, “A dinner everyone can agree on”, a compact preview showing a dish/time/reason, and Start planning as the primary action. Join my family and Try a sample are clear secondary paths. Do not imply the preview was checked against unentered allergies.
2. **Food boundaries.** Ask the household diet and “Any allergies or ingredients to avoid?” before presenting personalised suggestions. Allow explicit None / Add restrictions and explain that each person can be adjusted later. Treat unknown information honestly.
3. **Optional taste.** Multi-select Indian regions and world cuisines. Default to familiar dishes if skipped. Show Step 2 of 2, Back and Skip for now; preserve every edit.
4. **First recommendation.** Dish card before pantry or shopping, with Plan this meal / Another idea / Log what we ate. Explain one reason and show relevant time/ingredient information.
5. **Progressive completion.** A dismissible setup checklist for additional members, tiffin, cook, calendars and AI. Resume each task later. Keep names and household labels lightweight; do not force theme selection or API-key setup.

This sequence is a proposed design direction. Prototype and test it before treating any completion-time target as achieved.

## Theme directions

Open the [interactive welcome and theme concept](Welcome-theme-concept.html) to compare the proposed palettes. This is a review artifact, not an implemented app change.

| Theme | Surface / accent / text | Intended feel |
|---|---|---|
| Saffron cream — default | #FFF8EF / #A93B13 / #241B15 | Warm, bright kitchen; refined continuation of the current palette |
| Garden sage | #F2F7EF / #315C3B / #1D2C21 | Calm, fresh ingredients |
| Berry breakfast | #FFF4F6 / #94334F / #321D25 | Playful, friendly households |
| Cocoa night — optional | #201B18 / #F3B979 / #FFF8F0 | Comfortable evening planning |

These are palette proposals, not a completed accessible theme system. Test every foreground/background pair, selected state, focus ring, error and chart. Use actual food visuals and consistent type hierarchy; changing a background alone will not create the desired first impression. Keep motion short, optional and respectful of reduced-motion preferences; never delay access with a mandatory intro.

## Repair order and acceptance gates

**First:** R01 draft recovery, R02 correction flow, R13–R15 accessible controls. Standardise validation and action feedback while preserving the improvements already present.

**Next:** R05/R06/R16/R17 first-minute redesign, explicit manual logging, then themes. Test at 360/390/430 px wide, keyboard-only and browser zoom; the main action and optional skip should remain reachable.

**Then:** genuine family joining, discoverable contact setup, richer cuisines and Reports. Shared family joining requires backend, authentication and synchronisation work; it is not merely another local screen.

**Suggested usability targets, not measured results:** new users can identify what the app does, find Join, skip optional setup and reach an appropriate first recommendation without coaching. Observe 5–8 first-time users doing these tasks; collect completion time, wrong turns and abandonment. Instrument consented onboarding step views/completion, first meaningful meal decision, validation errors and later return; never include API keys or sensitive free-text content in analytics.

## Retest checklist

- Refresh/reopen every setup step; draft and current step persist. Back, Skip and later editing work.
- Empty names, whitespace, invalid dates/times and incomplete dependent fields show specific errors and preserve data.
- Typed and manual logging work with no API key, including older dates and correction of existing entries.
- Replace a meal without creating an unintended duplicate; check Week, Memory, leftovers and reports.
- Invitation succeeds across two separate devices and fails correctly for invalid/expired access.
- Phone/contact formatting and validation follow the selected country and preserve an international form.
- Calendars are opt-in; only enabled dietary rules are labelled applied.
- Themes persist and maintain contrast, focus and state visibility across screens and charts.
- Every switch exposes its actual state and responds to Space; chips expose selected values; modal focus and focus restoration are verified.
- All action states have visible and announced feedback. Failure leaves a clear retry path; repeated clicks do not duplicate records.
- AI guide is usable by a nontechnical person; no-key mode remains functional. Test connection failure without exposing a key in logs.
- Reports have useful empty states, trustworthy definitions and drill-down to real source records.
- Run physical-device checks for tiffin/reminders, camera, speech, backgrounding and messaging separately.

## Cautions about observations

The first corrected pickup Save inside the onboarding child sheet appeared to normalise the field without closing; a second click completed it. The later member-page reproduction saved correctly on the first corrected submission. This is recorded as an isolated observation for retest, not a confirmed recurring defect. Browser automation selector timeouts were not counted as app defects. No claim of complete WCAG conformance or complete resolution of the earlier audit is made.
