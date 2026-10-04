# What’s Cooking 2.0 — QA report
3 October 2026 · Asia/Calcutta · app 1.0.0 · commit a098e48cbec422d5b0921ca5d16c86d6a6419037

## Release assessment
**Not ready for public release against the attached FSD.** The app compiles and its original tests pass, but dietary safety and key household/cook workflows fail. The three Critical findings are allergy enforcement (D01), unsafe custom-dish classification (D03), and hard-rule bypass through manual planning (D05).

**44 findings:** 3 Critical, 23 High, 18 Medium. Of these, 36 finding groups have executable failing regression evidence; D35–D42 are evidenced by browser interaction and/or source review, with native follow-up clearly labelled. A failed assertion count is not the number of unique defects.

## Test results and limits
| Check | Result |
|---|---|
| Existing automated tests | 25/25 passed; two suites |
| New targeted audit checks | 55 executed: 16 passed, 39 failed; no skipped tests |
| TypeScript check / lint | Both passed |
| Expo dependency/configuration diagnosis | 21/21 passed |
| Production bundle exports | Android, iOS and web passed; this does not certify native installation/runtime |
| Desktop ranking benchmark | 1,095 historical meals; 30 measured runs; median 8.9 ms, p95 11.5 ms, max 21.1 ms |
| Public Cook and privacy pages | HTTP HEAD returned 200 for both default URLs |
| Functional requirement inventory | 55 IDs: 34 Must, 16 Should, 5 Could |

The added tests assert the expected FSD behavior and intentionally remain failing until fixes are made. There are now 80 checks across the existing and audit suites, with 41 passing and 39 failing. They are not a statistical estimate of product-wide reliability: the new suite deliberately targets high-risk boundaries.

Browser testing used synthetic data in a local preview, including a 390 × 844 mobile viewport. Native notifications were tested through mocked scheduling calls, not actual device delivery. The attached AAB was located but not installed: no Android device/emulator/adb or iOS runtime was available in this workspace. Camera, speech, native sharing, background execution and actual messaging still require physical-device tests. The desktop benchmark does not prove the mobile <300 ms target or cached Today render <1 s.

The FSD was treated as a requirements reference, not as permission to publish, message contacts, spend money or perform legal/compliance actions. No real messages, purchases, family deletion or paid Gemini calls were made. Existing changes in app/app.json and app/package-lock.json were preserved. Application source was not changed; the audit files are under artifacts/qa.

Existing document/testing skills and browser capabilities were sufficient. Expo Doctor was invoked through the standard npm registry; no additional skill/plugin installation was necessary.

## What worked in the tested paths
- Onboarding with a child, saved milk allergy and ten frequent dishes reached Today and persisted after reload.
- English/Hinglish multi-day meal notes produced separate yesterday/today drafts and saved into date-grouped Memory.
- Manual lunch/dinner logging offered leftover capture; per-member reactions, history search and member filters worked.
- Exact peanut exclusions, ordinary vegetarian/Jain rules, pure school-holiday filtering and initial tiffin-primary distinctness passed controls.
- Pure auto-log ran once per due plan, created pending confirmation entries and allowed manual replacement.
- Cook page rendered Hindi headings, allowed a ranked selection and missing-item text; valid manual reply parsing merged grocery items.
- Weather failures returned a safe fallback; mocked rain/cold context and denied-notification-permission handling passed.

## Recommended repair order
1. **Dietary safety:** fix D01–D05 and D14 together around a complete canonical dish/ingredient/allergen model. Enforce safety at all plan mutation boundaries, including swap and custom dish creation. Recheck saved plans when family rules change.
2. **Meal integrity and cook identity:** fix D06–D10, D22–D24, D34–D42. Preserve selected options, plate membership and portions; authenticate/expire links; distinguish opening a composer from sending/delivery.
3. **Reminder/auto-log reliability:** fix D26 and D28–D33/D37. Preserve reminders per family, account for holidays/box settings, reconcile at slot end and implement the exception digest.
4. **Learning and convenience:** fix leftover inference, negation, novelty and feedback scope (D11–D19, D43–D44); complete editing controls and shopping logic.
5. **FSD completion and real-device gate:** implement the missing Must portions first—shared family/invites, member-owned consent, complete Indic voice, audio attachment, complete calendar and cook handoff—then perform Android/iOS closed-beta testing. The Should/Could items remain visible in the matrix rather than being silently reclassified as launch blockers.

## FSD gaps beyond individual defects
| Gap | Requirement / scope |
|---|---|
| Shared family, sign-in and invite acceptance | FR-216; no Auth/backend/cloud sync or signed expiring invites. Multiple families exist only on one device. |
| Member-owned consent | FR-292; planner checkbox replaces self opt-in link. Cook STOP requires manual planner paste. This is a specification gap, not a legal compliance opinion. |
| Full voice-first workflow | FR-220/231; keyboard dictation substitutes for app recognition; TTS plays locally instead of creating attached audio. |
| Editable food/school calendars | FR-212/265; no user editing of bundled fast dates/holidays, and missing Pradosh/Ramzan/Shravan. |
| Standing menu bank and full cook loop | FR-233/236; no automatic response ingestion, shopper ping or fallback bank for unplanned days. |
| Natural-language ask / widget | FR-204/207; absent. |
| Family vote / picture-card kid mode | FR-240/241; absent. |
| Incoming WhatsApp photo proof | FR-223; absent. |
| Occasion memory and life modes | FR-262/263; no guest groups, five-course menus, event rules, preparation timeline, Served record or date-range modes. |
| Calendar grid/drag/image sharing | FR-261; implemented as a day list with tap swaps and text sharing. |
| Balance rings / festival packs / food-saved counter | FR-271/264/254; absent. |
| Heirloom recordings / shareable recaps | FR-282/283; absent. |
| Full launch localisation | FSD §9; main UI remains English; cook headings cover five languages, dish/quantity text remains English. Marathi/Bengali absent. |
| Offline sync/queued messaging | FSD §9; local decide/log/history exist, but no cloud reconciliation, offline message queue or conflict handling. |
| Server-side AI key, caching, spend cap | FSD §9; native key uses SecureStore and web key uses AsyncStorage; requests go directly to Gemini, with no server ownership, caching, family budget or robust timeout/retry layer. |
| Remote ranking config, crash/metric instrumentation | FSD §8–10; weights are source constants; no Remote Config/Crashlytics or shown/accepted denominator instrumentation. |
| Architecture decision drift | FSD specifies Kotlin Multiplatform/Room/Ktor/Supabase; repository implements Expo/React Native/Zustand/AsyncStorage. Record an approved architecture revision separately from functional defects. |

The [app README](D:/codex/whats_cooking2/app/README.md) says every Must requirement is implemented, but its own deferred-sync section and the matrix contradict that claim. “Implemented foundation” below means the mechanism exists and basic controls were exercised; it is not native release certification. “Partial” may be a missing subfeature, a defect, or a pending platform integration check. “Absent” is reserved for requirements with no implementation found.

## Prioritised defect register
| ID | Severity | Finding | Evidence |
|---|---|---|---|
| [D01](#d01) | Critical | Allergy checks miss ingredient families and incomplete recipes | Automated + browser |
| [D02](#d02) | High | Spice tolerance is treated as a soft preference | Automated |
| [D03](#d03) | Critical | Unknown custom dishes are automatically labelled vegetarian | Automated |
| [D04](#d04) | High | Every vegan household receives an empty menu | Automated |
| [D05](#d05) | Critical | Manual plan changes and swaps bypass hard rules | Automated + browser |
| [D06](#d06) | High | Cook's selected alternate is not reflected in tomorrow/week drafts | Automated |
| [D07](#d07) | High | Changing an already cooked plan preserves cooked status with a different menu | Automated |
| [D08](#d08) | High | Manual meal correction cannot replace a previous cook pick | Automated |
| [D09](#d09) | High | Split plates lose group membership and overcount main-plate portions | Automated |
| [D10](#d10) | High | Saved tiffin choices can repeat breakfast or the other box | Automated |
| [D11](#d11) | Medium | A breakfast log consumes leftovers that were created later that day | Automated |
| [D12](#d12) | Medium | Restaurant meals are counted as reuse of household leftovers | Automated |
| [D13](#d13) | Medium | A purchased cart item is suppressed from future grocery suggestions | Automated |
| [D14](#d14) | High | Shopping list omits core ingredients present only in quantities | Automated |
| [D15](#d15) | Medium | Only known still recommends never-cooked dishes | Automated |
| [D16](#d16) | Medium | Pause learning still adapts to new meal logs | Automated |
| [D17](#d17) | Medium | Feedback leaks between short-break and lunch tiffin boxes | Automated |
| [D18](#d18) | Medium | Safe choice badge can mean eight neutral logs with no positive feedback | Automated |
| [D19](#d19) | Medium | Negated preferences are inverted | Automated + browser |
| [D20](#d20) | High | Hindi-script voice transcripts are not parsed by the offline parser | Automated |
| [D21](#d21) | High | Distinct Indic custom dish names collide on the same ID | Automated |
| [D22](#d22) | High | Cook's Change request changes no persistent state | Automated |
| [D23](#d23) | High | Cook reply card ID is ignored and unknown meal IDs can add items | Automated + browser |
| [D24](#d24) | High | Cook links are unsigned, unexpired editable payloads | Automated + source |
| [D25](#d25) | Medium | A family custom fast applies to a member with only a no-meat rule | Automated |
| [D26](#d26) | Medium | Malformed reminder times are silently accepted | Automated + source |
| [D27](#d27) | Medium | Short-break box accepts wet meals without box-fit validation | Automated |
| [D28](#d28) | Medium | Pickup reminder arithmetic clamps instead of carrying minutes | Mocked native scheduling |
| [D29](#d29) | High | Updating one family cancels all scheduled notifications | Mocked native scheduling |
| [D30](#d30) | Medium | Tiffin notifications ignore school holidays | Mocked native scheduling |
| [D31](#d31) | Medium | Children with both tiffin boxes disabled still get return reminders | Mocked native scheduling |
| [D32](#d32) | Medium | Cook reminder does not check whether the card was already sent | Mocked native scheduling + source |
| [D33](#d33) | High | No 9 pm digest for unconfirmed auto-logged meals | Mocked native scheduling + source |
| [D34](#d34) | High | Cook reply phone is missing the country code | Automated + source |
| [D35](#d35) | High | Cook Cards ignore the cook's working days | Browser + source |
| [D36](#d36) | High | Opening WhatsApp immediately marks meals sent | Source-confirmed; cancellation on device pending |
| [D37](#d37) | High | Auto-log only runs on hydration or foreground transition | Source-confirmed; real-clock device run pending |
| [D38](#d38) | High | Logging can lose the tiffin or split-plate member | Source-confirmed; browser multi-child follow-up pending |
| [D39](#d39) | High | Deleting a family does not delete retained native photos | Source-confirmed; native filesystem validation pending |
| [D40](#d40) | Medium | Common controls are below the FSD touch-target size and inputs lack programmatic labels | Source + browser accessibility tree; native TalkBack pending |
| [D41](#d41) | High | Selecting an alternate retains the first dish's ingredient quantities | Browser + source |
| [D42](#d42) | High | Cook language changes headings but not dish names or quantity instructions | Browser + source |
| [D43](#d43) | Medium | Recorded swipe/accept events do not feed later ranking | Automated + source |
| [D44](#d44) | Medium | Top-three suggestions do not enforce the specified diversity | Automated |

### D01 — Allergy checks miss ingredient families and incomplete recipes
**Critical · FR-211 · Automated + browser**

**Reproduce:** Add a child with milk allergy. Pick paneer/curd/oats as frequent dishes and open Today. Separately check aloo paratha against a wheat allergy.

**Actual:** Paneer roll, curd rice and oats porridge are allowed; aloo paratha is allowed for wheat allergy. Today labels paneer/curd as fitting everyone's rules.

**Expected:** Resolve milk→paneer/curd/cheese and wheat→atta/bread; block all dishes containing the allergen. Unknown ingredient metadata must not be presented as proven safe.

**Suggested repair:** Use canonical ingredient/allergen metadata, synonym mapping and complete component recipes; fail safely for unknown ingredients.

**Source:** [app/src/domain/rules.ts:13](D:/codex/whats_cooking2/app/src/domain/rules.ts:13)

**Executable evidence:** `Dietary safety D01 milk allergy blocks paneer and curd`; `Dietary safety D01 wheat allergy blocks atta-based paratha`.

![D01 browser evidence](D:/codex/whats_cooking2/artifacts/qa/01-milk-allergy-suggestions.png)

### D02 — Spice tolerance is treated as a soft preference
**High · FR-211 · Automated**

**Reproduce:** Set a member's spice tolerance to None; check chole_rice with spice 2.

**Actual:** The hard rule returns ok=true; ranking only subtracts a score.

**Expected:** The FSD lists spice tolerance among hard per-member rules; a hotter dish requires an explicitly safe variant.

**Suggested repair:** Filter by maximum spice or model a mild variant instead of relying on ranking penalties.

**Source:** [app/src/domain/rules.ts:26](D:/codex/whats_cooking2/app/src/domain/rules.ts:26)

**Executable evidence:** `Dietary safety D02 hard spice tolerance rejects a hotter dish`.

### D03 — Unknown custom dishes are automatically labelled vegetarian
**Critical · FR-211, FR-220 · Automated**

**Reproduce:** Add Chicken soup as an unknown/custom dish and inspect its metadata.

**Actual:** It is saved as diet=veg with empty ingredients/allergens, so it can enter vegetarian recommendations.

**Expected:** An unknown dish remains unclassified until the user supplies dietary and ingredient metadata.

**Suggested repair:** Require diet and allergen confirmation for custom dishes and exclude incomplete dishes from safety-sensitive recommendations.

**Source:** [app/src/domain/catalog.ts:191](D:/codex/whats_cooking2/app/src/domain/catalog.ts:191)

**Executable evidence:** `Dietary safety D03 custom chicken dish is not classified vegetarian`.

### D04 — Every vegan household receives an empty menu
**High · FR-211, FR-215 · Automated**

**Reproduce:** Set the only eater's diet to Vegan; request breakfast, lunch and dinner.

**Actual:** All three result lists are empty. No catalogue dish is tagged vegan.

**Expected:** The supported vegan setting has usable safe catalogue options.

**Suggested repair:** Audit catalogue diet tags, explicitly distinguish vegan preparations and supply adequate options in every slot.

**Source:** [app/src/domain/catalog.ts:45](D:/codex/whats_cooking2/app/src/domain/catalog.ts:45)

**Executable evidence:** `Dietary safety D04 vegan catalogue has useful breakfast, lunch, dinner candidates`.

### D05 — Manual plan changes and swaps bypass hard rules
**Critical · FR-211, FR-212, FR-261 · Automated + browser**

**Reproduce:** In a vegetarian household, open Tomorrow → Change dinner, remove current choices, search chicken, select Chicken curry with rice, save and Confirm all. Calendar swaps also send options straight to upsertPlan.

**Actual:** Chicken is saved in the vegetarian household's week without warning. Search and swaps do not validate member/date/slot rules.

**Expected:** Every planning path enforces diet, allergy, fasting, portable-box fit and slot validity.

**Suggested repair:** Validate at the shared plan mutation boundary and filter planning pickers by full context; validate both destinations before swapping.

**Source:** [app/src/components/DishPicker.tsx:43](D:/codex/whats_cooking2/app/src/components/DishPicker.tsx:43)

**Executable evidence:** `Dietary safety D05 planning refuses a vegetarian member chicken`.

![D05 browser evidence](D:/codex/whats_cooking2/artifacts/qa/02-vegetarian-chicken-plan.png)

### D06 — Cook's selected alternate is not reflected in tomorrow/week drafts
**High · FR-233, FR-236, FR-261 · Automated**

**Reproduce:** Plan rajma/chole/dal, apply the cook's selection of chole, then generate draftDay or reopen Tomorrow/Week.

**Actual:** The row still starts with rajma because it uses options[0], ignoring chosenDishId. Regenerated Cook Cards likewise use the original first choice.

**Expected:** All views show the selected dish consistently while retaining alternates.

**Suggested repair:** Resolve the effective selected dish centrally and preserve it across drafts and Cook Card generation.

**Source:** [app/src/state/draft.ts:27](D:/codex/whats_cooking2/app/src/state/draft.ts:27)

**Executable evidence:** `Planning and meal integrity D06 picked alternate is displayed in tomorrow/week draft`.

### D07 — Changing an already cooked plan preserves cooked status with a different menu
**High · FR-222, FR-261, FR-280 · Automated**

**Reproduce:** Plan rajma, log it as cooked, then replace the plan with chole through upsertPlan.

**Actual:** The plan remains cooked but its options become chole and chosenDishId is cleared, while history still records rajma.

**Expected:** Editing a completed meal follows an explicit correction flow and updates linked history, or is refused.

**Suggested repair:** Define valid status transitions and prevent a menu edit from silently mutating a completed plan.

**Source:** [app/src/domain/actions.ts:24](D:/codex/whats_cooking2/app/src/domain/actions.ts:24)

**Executable evidence:** `Planning and meal integrity D07 editing cooked plan does not contradict its history`.

### D08 — Manual meal correction cannot replace a previous cook pick
**High · FR-222, FR-280 · Automated**

**Reproduce:** Set a plan's chosenDishId to rajma; manually log chole for the same date/slot.

**Actual:** History records chole, but the plan retains rajma due to the null-coalescing assignment.

**Expected:** A confirmed manual correction becomes the authoritative cooked dish.

**Suggested repair:** Update the linked selected dish when logging a confirmed correction.

**Source:** [app/src/domain/actions.ts:92](D:/codex/whats_cooking2/app/src/domain/actions.ts:92)

**Executable evidence:** `Planning and meal integrity D08 manual correction supersedes earlier cook pick`.

### D09 — Split plates lose group membership and overcount main-plate portions
**High · FR-210, FR-213, FR-232 · Automated**

**Reproduce:** Create one ordinary eater and two Wednesday-fasting eaters; build Wednesday lunch rows and Cook payload.

**Actual:** The second plate retains only the first fasting member ID. Main-plate quantities are multiplied by all three eaters; the special plate is sized for one.

**Expected:** Each plate retains all its eater IDs; portions exclude other plates and account for age.

**Suggested repair:** Persist forMemberIds arrays and compute per-plate adult-equivalent portions.

**Source:** [app/src/state/draft.ts:25](D:/codex/whats_cooking2/app/src/state/draft.ts:25)

**Executable evidence:** `Planning and meal integrity D09 fasting group retains every member and accurate main-plate quantities`.

### D10 — Saved tiffin choices can repeat breakfast or the other box
**High · FR-265 · Automated**

**Reproduce:** Save poha for breakfast and a short-break shortlist containing poha as an alternate; generate the day plan.

**Actual:** The saved shortlist still contains poha. Newly generated primaries differ, but persisted and edited alternatives are not checked.

**Expected:** Approved choices and subsequent selections preserve the distinctness of breakfast and both boxes.

**Suggested repair:** Revalidate the complete pair when any option changes or a cook selects an alternate.

**Source:** [app/src/state/draft.ts:57](D:/codex/whats_cooking2/app/src/state/draft.ts:57)

**Executable evidence:** `Planning and meal integrity D10 tiffin chosen alternate does not repeat breakfast`.

### D11 — A breakfast log consumes leftovers that were created later that day
**Medium · FR-251 · Automated**

**Reproduce:** Record leftover dal from Wednesday dinner; then backfill Wednesday breakfast with dal paratha.

**Actual:** The dinner leftover is marked resolved by the earlier breakfast.

**Expected:** Only meals occurring after leftover creation can consume it.

**Suggested repair:** Compare date plus slot/time, not date alone.

**Source:** [app/src/domain/actions.ts:99](D:/codex/whats_cooking2/app/src/domain/actions.ts:99)

**Executable evidence:** `Planning and meal integrity D11 future meal cannot resolve a leftover backwards within the same day`.

### D12 — Restaurant meals are counted as reuse of household leftovers
**Medium · FR-251, FR-255 · Automated**

**Reproduce:** Record leftover dal yesterday; log ordered-in dal paratha today.

**Actual:** The leftover is marked used and a transformation decision is recorded.

**Expected:** A restaurant order cannot prove that food at home was reused.

**Suggested repair:** Ask about actual leftover consumption and exclude ordered-in entries from automatic resolution.

**Source:** [app/src/domain/actions.ts:95](D:/codex/whats_cooking2/app/src/domain/actions.ts:95)

**Executable evidence:** `Planning and meal integrity D12 order-in does not claim existing leftovers were reused`.

### D13 — A purchased cart item is suppressed from future grocery suggestions
**Medium · FR-253 · Automated**

**Reproduce:** Add paneer to the cart, mark it bought, and plan another paneer meal.

**Actual:** The previous done item suppresses paneer indefinitely until bought items are manually cleared.

**Expected:** A new need can reappear without deleting previous purchase records.

**Suggested repair:** Deduplicate only open items within the relevant plan/time window.

**Source:** [app/src/app/cart.tsx:21](D:/codex/whats_cooking2/app/src/app/cart.tsx:21)

**Executable evidence:** `Planning and meal integrity D13 bought groceries can be suggested again for a later meal`.

### D14 — Shopping list omits core ingredients present only in quantities
**High · FR-253 · Automated**

**Reproduce:** Empty staples and plan dal tadka with roti.

**Actual:** Missing items contain onion/tomato but omit dal and atta, which exist only in quantity metadata.

**Expected:** All required non-staple ingredients appear in the list.

**Suggested repair:** Use a single complete ingredient model for shopping, allergy checks and portion quantities.

**Source:** [app/src/domain/actions.ts:201](D:/codex/whats_cooking2/app/src/domain/actions.ts:201)

**Executable evidence:** `Planning and meal integrity D14 empty ingredient metadata does not omit dal/atta from shopping`.

### D15 — Only known still recommends never-cooked dishes
**Medium · FR-205 · Automated**

**Reproduce:** Set adventurous=0 and make only rajma known; request three dinner suggestions.

**Actual:** Novel dishes still appear. The dial changes a score penalty rather than the eligible novelty count.

**Expected:** Only known excludes novel dishes, or the product explicitly changes the promise and specification.

**Suggested repair:** Apply the novelty quota during candidate selection and define a visible fallback when too few known dishes fit.

**Source:** [app/src/domain/recommender.ts:275](D:/codex/whats_cooking2/app/src/domain/recommender.ts:275)

**Executable evidence:** `Learning, language, cook replies D15 Only known dial excludes new dishes`.

### D16 — Pause learning still adapts to new meal logs
**Medium · FR-291 · Automated**

**Reproduce:** Pause learning, record yesterday's rajma, and compare its dinner score before and after.

**Actual:** Recency and known/novelty signals still change its score; only selected signals are paused.

**Expected:** The UI promise that suggestions stop adapting to logged meals matches the implemented pause scope.

**Suggested repair:** Freeze adaptive inputs or explicitly clarify which safety/recency signals remain active while paused.

**Source:** [app/src/domain/recommender.ts:139](D:/codex/whats_cooking2/app/src/domain/recommender.ts:139)

**Executable evidence:** `Learning, language, cook replies D16 paused learning does not adapt recency from new logs`.

### D17 — Feedback leaks between short-break and lunch tiffin boxes
**Medium · FR-242, FR-265, FSD §8 T · Automated**

**Reproduce:** Give poha a Full return in the child's lunch box, then score poha for the short-break box.

**Actual:** A negative T driver is added to the other box, despite no short-break rejection.

**Expected:** Tiffin return signals are learned per child and per box.

**Suggested repair:** Require matching child and box when aggregating tiffin acceptance.

**Source:** [app/src/domain/recommender.ts:202](D:/codex/whats_cooking2/app/src/domain/recommender.ts:202)

**Executable evidence:** `Learning, language, cook replies D17 tiffin return feedback remains specific to its box`.

### D18 — Safe choice badge can mean eight neutral logs with no positive feedback
**Medium · FR-281 · Automated**

**Reproduce:** Log rajma eight times with no reactions; read favourites.

**Actual:** The dish earns safe=true, while the screen describes it as loved again and again.

**Expected:** Repeated positive outcomes support the badge; mere logging is not evidence of love or dietary safety.

**Suggested repair:** Track positive-outcome counts separately and distinguish preference confidence from allergen safety.

**Source:** [app/src/domain/actions.ts:260](D:/codex/whats_cooking2/app/src/domain/actions.ts:260)

**Executable evidence:** `Learning, language, cook replies D18 repeated neutral logs do not earn loved safe-choice badge`.

### D19 — Negated preferences are inverted
**Medium · FR-217 · Automated + browser**

**Reproduce:** Write No millets please or Avoid sweets in Preferences.

**Actual:** The parser assigns positive millet/sweet weights. The UI previews more millets for No millets please.

**Expected:** Negation decreases the relevant preference, preserving the user's meaning.

**Suggested repair:** Handle negation and scope before keyword weights; keep previews editable.

**Source:** [app/src/domain/prefs.ts:10](D:/codex/whats_cooking2/app/src/domain/prefs.ts:10)

**Executable evidence:** `Learning, language, cook replies D19 no millets must not increase millet preference`; `Learning, language, cook replies D19 no sweets must not increase sweet preference`.

![D19 browser evidence](D:/codex/whats_cooking2/artifacts/qa/04-negated-preference.png)

### D20 — Hindi-script voice transcripts are not parsed by the offline parser
**High · FR-220 · Automated**

**Reproduce:** Parse कल रात खिचड़ी with today's date 2026-10-07.

**Actual:** Dish matching strips non-Latin text; Hindi date/slot words are not detected. The result lacks khichdi and yesterday's date.

**Expected:** The promised Hindi/on-device flow recognises dish, date and slot without requiring the optional paid service.

**Suggested repair:** Use Unicode-aware normalization and Indic aliases/date/slot vocabulary; test real dictation outputs.

**Source:** [app/src/domain/parse.ts:27](D:/codex/whats_cooking2/app/src/domain/parse.ts:27)

**Executable evidence:** `Learning, language, cook replies D20 Hindi script meal log preserves dishes/date/slot`.

### D21 — Distinct Indic custom dish names collide on the same ID
**High · FR-215, FR-220, FR-280 · Automated**

**Reproduce:** Create custom dishes खिचड़ी and पापड़.

**Actual:** Both IDs become custom_ because the ID normalization discards every character.

**Expected:** Different names produce unique stable dish IDs in every supported script.

**Suggested repair:** Generate opaque IDs and retain Unicode names separately; deduplicate on normalized name only when intended.

**Source:** [app/src/domain/catalog.ts:192](D:/codex/whats_cooking2/app/src/domain/catalog.ts:192)

**Executable evidence:** `Learning, language, cook replies D21 distinct Indic custom dishes have distinct ids`.

### D22 — Cook's Change request changes no persistent state
**High · FR-233, FSD §8 Neg · Automated**

**Reproduce:** Apply a Change reply to an existing meal.

**Actual:** A temporary note appears but the family state is byte-for-byte unchanged; there is no actionable request, alternate prompt or learning event.

**Expected:** The planner receives a persistent change request with two alternates and the outcome can influence learning.

**Suggested repair:** Persist cook responses, surface unresolved change requests and record the appropriate recommendation outcome.

**Source:** [app/src/domain/actions.ts:228](D:/codex/whats_cooking2/app/src/domain/actions.ts:228)

**Executable evidence:** `Learning, language, cook replies D22 cook Change tap produces an actionable plan transition`.

### D23 — Cook reply card ID is ignored and unknown meal IDs can add items
**High · FR-233, FR-292, FSD §9 security · Automated + browser**

**Reproduce:** Paste WC:wrongcard with a current plan ID and rank=2. Separately supply Missing items against an unknown plan ID.

**Actual:** The wrong-card reply selects curd rice and adds groceries; unknown meal IDs also create cart items. STOP is not bound to a specific cook/card.

**Expected:** Validate card, family, cook, expiration and meal membership before mutating state.

**Suggested repair:** Authenticate cook-response records and reject mismatches/replays; do not imply that the local paste screen is remotely exploitable without planner action.

**Source:** [app/src/domain/actions.ts:209](D:/codex/whats_cooking2/app/src/domain/actions.ts:209)

**Executable evidence:** `Learning, language, cook replies D23 mismatched card id cannot alter a plan`; `Learning, language, cook replies D23 unknown meal ids cannot add groceries`.

![D23 browser evidence](D:/codex/whats_cooking2/artifacts/qa/07-mismatched-reply-accepted.png)

### D24 — Cook links are unsigned, unexpired editable payloads
**High · FR-233, FSD §9 security · Automated + source**

**Reproduce:** Generate a Cook page link; decode the base64url fragment.

**Actual:** The entire menu, member names and reply phone are client-controlled JSON. Neither generator nor Cook page validates a signature, expiry or revocation.

**Expected:** A signed, expiring token controls access and integrity; base64 encoding is not authentication.

**Suggested repair:** Use a backend-validated token with expiration/revocation and minimal payload disclosure.

**Source:** [app/src/domain/cookcard.ts:167](D:/codex/whats_cooking2/app/src/domain/cookcard.ts:167)

**Executable evidence:** `Learning, language, cook replies D24 Cook page links contain authentication and expiry`.

### D25 — A family custom fast applies to a member with only a no-meat rule
**Medium · FR-212 · Automated**

**Reproduce:** Add a custom Wednesday fast date; give a member only a Tuesday no-nonveg rule.

**Actual:** The member is treated as fasting on Wednesday because any dayRules entry qualifies.

**Expected:** Custom fasts are assigned to specific members and must not convert unrelated rules into fasting.

**Suggested repair:** Associate custom calendar overrides with member/rule IDs and distinguish dietary exclusions from fasts.

**Source:** [app/src/domain/calendar.ts:69](D:/codex/whats_cooking2/app/src/domain/calendar.ts:69)

**Executable evidence:** `Learning, language, cook replies D25 edit fast date does not make a no-meat-only member fast`.

### D26 — Malformed reminder times are silently accepted
**Medium · FR-242, FR-260 · Automated + source**

**Reproduce:** Enter abc or 25:90 as a reminder/pickup time and update reminders.

**Actual:** abc becomes 00:00; out-of-range values reach the scheduling API. UI callers suppress resulting errors.

**Expected:** Reject invalid HH:MM values visibly before saving or scheduling.

**Suggested repair:** Validate hour/minute ranges, retain the last valid setting and report permission/scheduling failures.

**Source:** [app/src/domain/dates.ts:96](D:/codex/whats_cooking2/app/src/domain/dates.ts:96)

**Executable evidence:** `Learning, language, cook replies D26 malformed reminder times are rejected`.

### D27 — Short-break box accepts wet meals without box-fit validation
**Medium · FR-265 · Automated**

**Reproduce:** Check idli_sambar for tiffin_short.

**Actual:** The dish is allowed solely because portable=true and T is listed; its sambar is not dry finger food.

**Expected:** Short-break boxes enforce small/dry/finger-food suitability separately from lunch portability.

**Suggested repair:** Use explicit short-break/lunch box-fit metadata and validate it in every planning path.

**Source:** [app/src/domain/rules.ts:39](D:/codex/whats_cooking2/app/src/domain/rules.ts:39)

**Executable evidence:** `Learning, language, cook replies D27 short-break candidates satisfy dry/finger-food box fit`.

### D28 — Pickup reminder arithmetic clamps instead of carrying minutes
**Medium · FR-242 · Mocked native scheduling**

**Reproduce:** Set pickup to 15:50 and inspect the scheduled weekly trigger.

**Actual:** It is 15:59 rather than the implementation's intended pickup+15=16:05.

**Expected:** Honor the specified pickup timing policy with correct clock arithmetic.

**Suggested repair:** Add minutes through a date/time utility; clarify whether FSD pickup itself or a configurable delay is intended.

**Source:** [app/src/services/notify.ts:54](D:/codex/whats_cooking2/app/src/services/notify.ts:54)

**Executable evidence:** `D28 pickup +15 minutes carries to the next hour`.

### D29 — Updating one family cancels all scheduled notifications
**High · FR-216, FR-230, FR-242, FR-260 · Mocked native scheduling**

**Reproduce:** Schedule reminders for family A and a Cook Card; update a member or reminders in family B.

**Actual:** scheduleFamilyReminders invokes global cancellation, removing reminders belonging to other families and outstanding Cook Cards.

**Expected:** Only the relevant family's replaced reminders are cancelled.

**Suggested repair:** Persist notification IDs by family and purpose and cancel them selectively.

**Source:** [app/src/services/notify.ts:34](D:/codex/whats_cooking2/app/src/services/notify.ts:34)

**Executable evidence:** `D29 rescheduling one family does not cancel every family/cook reminder`.

### D30 — Tiffin notifications ignore school holidays
**Medium · FR-242, FR-265 · Mocked native scheduling**

**Reproduce:** Add a Wednesday holiday for a child who attends Wednesdays; schedule reminders.

**Actual:** The weekly Wednesday tiffin trigger is still scheduled and cannot skip the recorded holiday.

**Expected:** No return check for school holidays or days without a packed box.

**Suggested repair:** Schedule date-aware child/box checks and refresh upcoming notifications when calendars change.

**Source:** [app/src/services/notify.ts:45](D:/codex/whats_cooking2/app/src/services/notify.ts:45)

**Executable evidence:** `D30 school holiday does not receive a tiffin reminder`.

### D31 — Children with both tiffin boxes disabled still get return reminders
**Medium · FR-242, FR-265 · Mocked native scheduling**

**Reproduce:** Keep school information but turn off Short-break box and Lunch box; schedule reminders.

**Actual:** Weekly tiffin checks still exist because box flags are ignored.

**Expected:** No box means no box-return notification.

**Suggested repair:** Filter by enabled boxes and planned/logged tiffins.

**Source:** [app/src/services/notify.ts:43](D:/codex/whats_cooking2/app/src/services/notify.ts:43)

**Executable evidence:** `D31 no-box child does not receive a tiffin reminder`.

### D32 — Cook reminder does not check whether the card was already sent
**Medium · FR-230 · Mocked native scheduling + source**

**Reproduce:** Set tomorrow's plans to sent and schedule a Cook reminder before its configured time.

**Actual:** A reminder is created anyway. Returned notification IDs are discarded, and the send flow never cancels it.

**Expected:** The reminder is conditional on an unsent card and is cancelled after sending.

**Suggested repair:** Keep per-card notification IDs and reconcile them on plan/send state changes.

**Source:** [app/src/services/notify.ts:61](D:/codex/whats_cooking2/app/src/services/notify.ts:61)

**Executable evidence:** `D32 cook reminder is not scheduled after all cards are sent`.

### D33 — No 9 pm digest for unconfirmed auto-logged meals
**High · FR-222 · Mocked native scheduling + source**

**Reproduce:** Create an unconfirmed auto-log entry and schedule family notifications.

**Actual:** Only a generic tomorrow-plan notification and tiffin reminders are created. No exception digest is implemented.

**Expected:** At 9 pm, list unconfirmed meals and ask only about exceptions.

**Suggested repair:** Implement a date-aware digest linked to the pending entries, with an accessible confirmation/correction flow.

**Source:** [app/src/services/notify.ts:31](D:/codex/whats_cooking2/app/src/services/notify.ts:31)

**Executable evidence:** `D33 9pm unconfirmed-meal digest is scheduled`.

### D34 — Cook reply phone is missing the country code
**High · FR-233 · Automated + source**

**Reproduce:** Use the onboarding-supported ten-digit Indian planner number and build a Cook payload.

**Actual:** The payload retains ten digits, while docs/cook.html passes them straight into wa.me. The app's separate WhatsApp helper adds 91 correctly.

**Expected:** Both outgoing and reply destinations use validated international digits.

**Suggested repair:** Use one shared E.164 normalization contract for the app and Cook page. Actual WhatsApp delivery was not attempted.

**Source:** [app/src/domain/cookcard.ts:128](D:/codex/whats_cooking2/app/src/domain/cookcard.ts:128)

**Executable evidence:** `Learning, language, cook replies D34 Cook reply destination includes the India country code`.

### D35 — Cook Cards ignore the cook's working days
**High · FR-235 · Browser + source**

**Reproduce:** Add QA Cook, scheduled Tuesday lunch only. Confirm Sunday 4 October's meals.

**Actual:** A Sunday lunch Cook Card is generated. An empty cookSlots list also falls back to all slots.

**Expected:** Only on-duty dates/slots produce that cook's cards; an explicitly empty schedule is not all-day availability.

**Suggested repair:** Resolve the cook on duty using days, slots and leave before offering or sending the card.

**Source:** [app/src/app/cook-card.tsx:29](D:/codex/whats_cooking2/app/src/app/cook-card.tsx:29)

![D35 browser evidence](D:/codex/whats_cooking2/artifacts/qa/05-off-duty-cook-card.png)

### D36 — Opening WhatsApp immediately marks meals sent
**High · FR-230, FSD §9 reliability · Source-confirmed; cancellation on device pending**

**Reproduce:** Tap Send on WhatsApp, then leave or cancel the WhatsApp composer without sending.

**Actual:** Source marks planned meals sent immediately after opening the external URL, with no actual-send confirmation or acknowledgement.

**Expected:** Opening a composer must not be presented as confirmed delivery.

**Suggested repair:** Represent prepared/opened separately from user-confirmed sent and use cook acknowledgements to establish receipt.

**Source:** [app/src/app/cook-card.tsx:58](D:/codex/whats_cooking2/app/src/app/cook-card.tsx:58)

### D37 — Auto-log only runs on hydration or foreground transition
**High · FR-222 · Source-confirmed; real-clock device run pending**

**Reproduce:** Leave the app foregrounded across a meal slot end, or switch to another local family with overdue plans.

**Actual:** No timer/job or active-family dependency invokes autoLog at the slot boundary. Its pure function passes, but the workflow can remain stale until a later foreground/restart.

**Expected:** Accepted meals become logs at slot end and the active family's pending state stays current.

**Suggested repair:** Reconcile on slot boundaries, family switches and notification/digest generation, with a durable background strategy where supported.

**Source:** [app/src/app/_layout.tsx:30](D:/codex/whats_cooking2/app/src/app/_layout.tsx:30)

### D38 — Logging can lose the tiffin or split-plate member
**High · FR-213, FR-222, FR-242, FR-265 · Source-confirmed; browser multi-child follow-up pending**

**Reproduce:** With two school children, type a tiffin entry and Save without picking a child; or follow Log as cooked on a member-specific split plate.

**Actual:** Save only requires a dish. withKid assigns a child only when there is exactly one, and the Today Log link passes no member/plan ID. Entries can become family-wide and leave the intended plan unclosed.

**Expected:** Child/plate identity is mandatory and preserved from the source plan.

**Suggested repair:** Pass member/plan identifiers in links and validate required identity before saving tiffin/split-plate entries.

**Source:** [app/src/app/(tabs)/log.tsx:98](D:/codex/whats_cooking2/app/src/app/(tabs)/log.tsx:98)

### D39 — Deleting a family does not delete retained native photos
**High · FR-293 · Source-confirmed; native filesystem validation pending**

**Reproduce:** Log a native meal photo, then delete its family.

**Actual:** The deletion removes the JSON record only. keepPhoto copies files into the shared documents/photos folder; neither family nor meal deletion removes them.

**Expected:** Delete includes the associated photos and exported/cache artifacts within the promised scope.

**Suggested repair:** Track media ownership and remove unreferenced files safely; test deletion with actual native files. No real family was deleted during this audit.

**Source:** [app/src/state/store.ts:48](D:/codex/whats_cooking2/app/src/state/store.ts:48)

### D40 — Common controls are below the FSD touch-target size and inputs lack programmatic labels
**Medium · FSD §9 accessibility · Source + browser accessibility tree; native TalkBack pending**

**Reproduce:** Inspect small buttons/chips/toggles and labelled form inputs in the shared UI kit.

**Actual:** Small buttons/chips specify 36 dp, toggles 44 dp, and Input renders label text without accessibilityLabel/labelledBy. Browser textbox names are blank.

**Expected:** 48 dp interactive targets and labels that screen readers can associate with controls.

**Suggested repair:** Enforce target sizes centrally, connect labels and test keyboard, TalkBack, VoiceOver and large-font flows.

**Source:** [app/src/ui/kit.tsx:126](D:/codex/whats_cooking2/app/src/ui/kit.tsx:126)

### D41 — Selecting an alternate retains the first dish's ingredient quantities
**High · FR-232, FR-236 · Browser + source**

**Reproduce:** Open the synthetic Hindi Cook page for rajma/curd rice/aloo paratha and select Curd rice.

**Actual:** Curd rice is selected but the page still shows rajma (soak overnight) ½ cup, rice 1 cup.

**Expected:** Quantities match the selected dish and assigned eaters.

**Suggested repair:** Provide quantities per ranked option and resolve them using the selected index.

**Source:** [docs/cook.html:84](D:/codex/whats_cooking2/docs/cook.html:84)

![D41 browser evidence](D:/codex/whats_cooking2/artifacts/qa/06-alternate-quantities.png)

### D42 — Cook language changes headings but not dish names or quantity instructions
**High · FR-231, FSD §9 localisation · Browser + source**

**Reproduce:** Set the cook language to Hindi and create/open a Cook Card.

**Actual:** Headings use Hindi, but Rajma chawal, Curd rice, Aloo paratha, soak overnight and units remain English. The catalogue has no per-language name model.

**Expected:** The complete operational card, including dish names, quantities and preparation instructions, is understandable in the cook's language/script.

**Suggested repair:** Add language-aware catalogue and ingredient/quantity strings and have native speakers verify all launch languages.

**Source:** [app/src/domain/cookcard.ts:122](D:/codex/whats_cooking2/app/src/domain/cookcard.ts:122)

### D43 — Recorded swipe/accept events do not feed later ranking
**Medium · FSD §8 learning · Automated + source**

**Reproduce:** Record twenty negative swipe events for a known rajma suggestion; compare its later score.

**Actual:** The score is unchanged. Ranking never reads family.events, despite storing the events.

**Expected:** Accepted/swiped outcomes influence the intended learning signals or the FSD is explicitly revised.

**Suggested repair:** Aggregate context-aware recommendation outcomes with decay and regression-test learning from actual decisions.

**Source:** [app/src/domain/recommender.ts:50](D:/codex/whats_cooking2/app/src/domain/recommender.ts:50)

**Executable evidence:** `Learning, language, cook replies D43 recorded swipe outcomes influence later recommendations`.

### D44 — Top-three suggestions do not enforce the specified diversity
**Medium · FSD §8 diversify · Automated**

**Reproduce:** Request three lunch options for the unconstrained general catalogue fixture.

**Actual:** Only two distinct bases appear although rice, roti and other candidates exist; the algorithm accepts a different base OR main group within a score window.

**Expected:** Meet the FSD's base and main-group diversity, or document the fallback when the catalogue cannot satisfy both.

**Suggested repair:** Select with explicit diversity constraints and make a principled, visible fallback for constrained households.

**Source:** [app/src/domain/recommender.ts:300](D:/codex/whats_cooking2/app/src/domain/recommender.ts:300)

**Executable evidence:** `Learning, language, cook replies D44 top three diversify rice, roti and other when all are available`.

## Complete FSD traceability
Assessment counts: 36 Partial, 7 Implemented foundation, 12 Absent.

| ID | Priority | Status | Assessment / related defects |
|---|---|---|---|
| FR-201 | M | Partial | Time-selected card and alternates exist; meal times are hard-coded instead of a configurable family schedule. Browser onboarding/Today covered; physical-device speed pending. |
| FR-202 | M | Partial | Accept/Next and swipe implementation exist; an accepted Today plan offers a separate Send button rather than the specified enabled cook handoff. Manual paths bypass rules (D05). Native swipe validation pending. |
| FR-203 | M | Implemented foundation | Context chips and ingredient weights present; weather network failure/rain/cold exercised with mocks. Browser chip surfaces exercised. Mobile 300ms timing pending. |
| FR-204 | S | Absent | No natural-language ask box, constraint contract or ask-to-ranker integration. |
| FR-205 | S | Partial | Six preset dial buttons exist rather than a continuous slider; zero does not limit novel dishes (D15). |
| FR-206 | M | Partial | Why this shows score drivers; implementation displays up to four instead of the specified top three. Browser control exists; core reasons tested. |
| FR-207 | S | Absent | No Android/iOS home-screen widget implementation/configuration. |
| FR-208 | M | Partial | Vegetable/leftover strip and both commerce entry points exist. Vegetables come from recent history plus a fixed list, with no seasonality. Leftover chips toggle one global boost rather than selecting a specific leftover. |
| FR-210 | M | Partial | Roles, age bands and optional phone fields exist. Child spice defaults are set at member creation; changing age does not recalculate them. Age-based portion sizes are missing (D09). |
| FR-211 | M | Partial | Diet/Jain/onion flags and literal exclusions work in controls. Allergy families, complete ingredients, hard spice and custom-dish safety fail (D01–D05). |
| FR-212 | M | Partial | Weekday no-meat/fast, Ekadashi and Navratri rules exist. Pradosh, Ramzan and Shravan absent. No UI edits bundled calendar dates, custom fast assignments or school holidays; 2027 dates explicitly approximate. D25. |
| FR-213 | S | Partial | Recommendations produce split plates; persisted meals reduce groups to a single member or no member (D09), with independent dishes rather than an explicit shared-base/variant model. |
| FR-214 | M | Partial | Three-step onboarding works and was completed with ten favourites. Primary planner's rules can only be edited after finishing; skips allow no cold-start picks. Under-two-minute target not measured in an unassisted user trial. |
| FR-215 | M | Implemented foundation | North/South/general catalogue and Latin aliases exist; existing catalogue uniqueness/link integrity tests pass. See vegan coverage and Indic custom-ID defects (D04/D21); no language-specific alias model. |
| FR-216 | M | Partial | Multiple local families and switching exist. Shared identities, signed expiring invitations, invite acceptance and live cloud sync are absent; store/README explicitly defer them. |
| FR-217 | M | Partial | Visible soft weights and optional LLM parse exist. Negation is inverted (D19), no saved preference/weight editor, and no-maida is approximated as fried-food reduction rather than refined-flour matching. |
| FR-220 | M | Partial | English/Hinglish text parsing and keyboard dictation path exist. No hold-mic on-device recognition flow; Android RECORD_AUDIO explicitly blocked. Hindi-script parser fails (D20); Indic custom IDs collide (D21). Voice p90 pending. |
| FR-221 | M | Partial | Camera/gallery, optional Gemini recognition and confirm-before-save code exist. Camera permissions declared. Live camera/native capture and paid recognition not exercised; no API key supplied. |
| FR-222 | M | Partial | Pure autoLog/idempotency/manual replacement controls pass. Application trigger misses active slot boundaries (D37), no 9pm digest (D33), and correction states fail (D07/D08). |
| FR-223 | S | Absent | No WhatsApp incoming photo ingestion, attachment or cook-proof logging flow. |
| FR-224 | M | Partial | Last eight distinct dishes appear as reuse chips. A chip creates a draft requiring Save, rather than one-tap logging. Browser reuse shelf observed. |
| FR-230 | M | Partial | Cook Card preview/click-to-chat and reminder function exist. Sent status means composer opened (D36); reminder cancellation/condition fails (D32), and global rescheduling removes other cards (D29). No actual message sent in testing. |
| FR-231 | M | Partial | Five-language headings and device read-aloud exist. No generated audio file attached to WhatsApp; dish names/quantities remain English (D42). Low-literacy full voice path absent. |
| FR-232 | S | Partial | Headcount quantities exist only for a subset of dishes. No adult-equivalent child portions; split headcounts are wrong (D09); alternate selection shows old quantities (D41). |
| FR-233 | M | Partial | Static no-login page and manually pasted WhatsApp replies exist. No signed expiry (D24), automatic backend update/shopper notification, validated reply ID (D23), or persistent Change/alternates workflow (D22). Reply phone normalization fails (D34). |
| FR-234 | S | Partial | Ranker reads cook.repertoire; no screen lets the planner/cook populate or edit it. |
| FR-235 | S | Partial | Cook day/slot controls exist, but Cook Card ignores working days and treats empty slots as unrestricted (D35). No dated leave management. |
| FR-236 | M | Partial | Three ranked choices and Cook page selection work. No standing pre-approved menu bank for unplanned days; chosen alternate persistence/quantities fail (D06/D41). |
| FR-240 | S | Absent | No timed family vote page/link, vote closure or winner-to-plan workflow. |
| FR-241 | C | Absent | No picture-card Yum/Meh kid mode. |
| FR-242 | M | Partial | Empty/Half/Full controls and local reminder functions exist. Holiday/box/time behavior fails (D28/D30/D31); T scores leak between boxes (D17); no optional reason after repeated Full. Real native push/tap pending. |
| FR-243 | M | Implemented foundation | Per-member Loved/OK/Not again controls work; browser child reaction and history persistence exercised; mutually exclusive reaction control passes. |
| FR-250 | M | Partial | Manual lunch/dinner logs offer rough amounts and one selected leftover; browser save/prompt exercised. Auto-logs and other slots have no leftover capture prompt, and multi-dish leftovers require repeated flows. |
| FR-251 | M | Partial | Catalogue transformations boost ranking and prior decisions are read. Reuse is inferred from dish identity without confirmation (D11/D12); window is two days rather than the specified next one–two slots. D learning counts do not use the stated 60-day decay. |
| FR-252 | S | Implemented foundation | Default staple list and editable comma-separated values exist. Out-of-stock can be represented by removing an item; no item inventory was introduced. |
| FR-253 | S | Partial | Cook/manual/plan lists merge with search/copy/WhatsApp handoff. Missing ingredients incomplete (D14), completed items suppress future needs (D13), plan confirmation does not auto-create cart entries, and UI covers only next three days. No Zepto/Instamart direct sharing. |
| FR-254 | C | Absent | No monthly food-saved counter. |
| FR-255 | S | Partial | Three order-in cards, Zomato search and explicit Log as ordered in exist. Actual ordering/deep-link compatibility pending; dietary metadata issues apply and ordered meals incorrectly consume leftovers (D12). |
| FR-260 | M | Partial | Configured daily local reminder and one-tap Tomorrow confirmation exist. Push text is generic, not the computed meal/tiffin shortlist; multi-family scheduling fails (D29). Real native reminder/tap and 15s target pending. |
| FR-261 | M | Partial | Seven-day list, pin/edit and long-press/tap swaps exist. No drag grid, occasion/guest/holiday display or image sharing; week is shared as text. Unsafe swap path (D05), selected alternate mismatch (D06). Live unpinned days compute independently and may repeat dishes across the week. |
| FR-262 | S | Absent | No occasions, named guest groups, guest rules/headcount, five-course menu, prior-hosting avoidance, preparation timeline or Served memory. |
| FR-263 | S | Absent | No date-range Exam/Travel/Guests/Recovery/Festival life modes. |
| FR-264 | C | Absent | No festival menu packs offered seven days ahead; simple calendar festival labels are not this feature. |
| FR-265 | M | Partial | School days and two enabled boxes appear per child; initial distinct primaries and pure holiday filtering pass. No holiday editing UI; saved alternatives can repeat (D10), box fit incomplete (D27), member identity can be lost (D38), reminders ignore holidays (D30). |
| FR-270 | M | Implemented foundation | Catalogue defines food-group tags and ranking uses them. Tag/ingredient completeness needs a food-domain audit; no nutritional target or calorie model was added. |
| FR-271 | S | Absent | No weekly balance rings or pulses/greens/millets/fried target view. |
| FR-272 | S | Partial | Switchable greens/millet boosts exist. Pulse/fried weekly targets and weekly deficit model absent; based mainly on last-seen day and minimum entry count. |
| FR-280 | M | Implemented foundation | Date-grouped history, thumbnails, member filters and search exist. Browser two-day logs/search/reaction and reload persistence covered; native thumbnail retention/delete pending. |
| FR-281 | M | Partial | Automatic favourites shelf exists but safe-choice confidence can derive only from neutral frequency (D18). |
| FR-282 | C | Absent | No heirloom audio recording, transcript storage or dish association. |
| FR-283 | C | Absent | No monthly/yearly food recap or shareable image. |
| FR-290 | M | Implemented foundation | Reason strings exist and are generated from drivers; baseline reason control passes. Reason correctness inherits metadata defects such as Fits everyone's rules for milk-allergic meals (D01). |
| FR-291 | M | Partial | Hide forever/30 days, pause and reset UI exist. Pause scope fails UI promise (D16); reset leaves history-based habits/recency intact. Hidden settings are local-device only. |
| FR-292 | M | Partial | Planner can tick They agreed and Cook page sends STOP. No member-owned opt-in link, signed consent record or validated opt-out token; STOP still requires planner manual paste and reply card ID is ignored (D23). |
| FR-293 | M | Partial | JSON/CSV export code and immediate local record deletion exist. Browser JSON download capture timed out so downloaded-content verification is outstanding; photos remain after native deletion (D39). No server lifecycle/retention service because cloud storage is absent. |

## Remaining verification before release
- Install an Android preview APK or AAB-derived APK set and an iOS build; verify fresh install, upgrade, storage migration, restart and device-time/timezone changes.
- Run camera/gallery permission-denied and revoked-permission flows, large/corrupt images, photo preservation and family/meal/media deletion.
- Test Hindi/English/Kannada/Tamil/Telugu/Marathi/Bengali dictation and mixed clauses, mic denial/interruption and measured voice p90.
- Validate notification delivery with the app foregrounded, backgrounded and terminated, device restart, multiple families, school holidays and scheduled cook leave; verify cold-start route and pending digest.
- Exercise actual WhatsApp compose/cancel/send/return, installed/not-installed behavior, correct international destination and audio attachment. Verify Blinkit/Zomato links with real app versions without ordering.
- Test Gemini with approved test key/data: correct recognition, invalid response shapes, timeouts, 429/5xx, network interruption, caching and cost enforcement. No live key was used here.
- Confirm downloaded JSON and CSV contents and safe formula handling on opening CSV; no export download was captured by the browser tool during this run. A timeout alone is not reported as an app defect.
- Audit TalkBack/VoiceOver focus, names/roles, all 48dp hit targets, large text, dark mode, low-literacy voice path and offline cold start.
- After a backend exists, test signed-link tampering/expiry/replay, membership authorization, multi-user updates, sync conflicts, consent revocation and server/media deletion.
- Measure Today load (<1s), mobile chip rerank (<300ms), voice p90 (<3s), Tomorrow decision (<15s) and Cook delivery reliability on the specified dogfood/closed-beta group. No adoption/retention/reliability target is certified by this audit.

## Repeat the audit
Run from the repository root:

```powershell
node app/node_modules/jest/bin/jest.js --config artifacts/qa/jest.config.cjs --runInBand --json --outputFile artifacts/qa/audit-results.json
```

Exit status is expected to be non-zero until reproduced defects are repaired. The test files are independent of the application test configuration. Fixture dates are fixed; notification tests mock native APIs. Source-only/device-pending findings need separate device scenarios, not a passing unit test alone.

Evidence files: [machine-readable results](D:/codex/whats_cooking2/artifacts/qa/audit-results.json), [defect CSV](D:/codex/whats_cooking2/artifacts/qa/defect-register.csv), [FSD matrix CSV](D:/codex/whats_cooking2/artifacts/qa/fsd-traceability.csv), [session and limitations](D:/codex/whats_cooking2/artifacts/qa/test-session.json).

Expo API/version context was checked against [official SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/). That reference specifies Node 22.13.x minimum; the project README recommends Node 20+, which should be corrected. This environment used Node 24.16.0, so that README mismatch did not block this run.
