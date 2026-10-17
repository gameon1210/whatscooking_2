# What’s Cooking — design refresh and targeted regression review

17 October 2026 · Baseline source: `fd45ab3` (1.0.3)

## Outcome

Implemented a family kitchen journal design in the local codebase: original food photography, a lighter editorial opening, a meal-first home page, user-selected family photo covers, four themes and optional home sections. The shared [Expo deployment](https://whatscooking--x7e0ymxq1t.expo.app/onboarding) was tested as the baseline; these local changes have not been published there.

This is a targeted design and regression pass. It is not a complete rerun or blanket closure of the original 44-finding FSD audit.

## Verification summary

| Check | Result |
|---|---|
| Baseline automated suite | 135 tests passed across 6 suites |
| Final automated suite | **142 tests passed across 7 suites**, no skipped tests |
| TypeScript | Passed |
| Lint | Passed, no warnings |
| Production exports | Android, iOS and web bundles generated successfully; no native installation/runtime certification |
| Responsive browser checks | Desktop, 390 × 844 and 360 × 800 |
| Small-phone layout | Document width and viewport both 360 px; Plan this meal target 48 px high, within the viewport |
| Photo persistence | A locally selected synthetic image reloaded successfully as a JPEG data URI; original image width 1536 px |
| Photo/save failure protection | Storage failure, family isolation and a concurrent meal update are covered by regression checks |
| Optimised production browser smoke | Setup, bundled images, Personalise, local photo selection, theme/message save and reload all passed at the local production preview |

Raw results: [test-results.json](test-results.json). Build outputs are in `all-platform-export/`. Screenshots in this folder show actual app rendering, not interface mockups.

## What was tested on the updated shared deployment

- The first screen now identifies the current setup step and exposes selected regional choices correctly.
- Entering a name/family, advancing to step 2 and refreshing restored the setup and showed “Picked up where you left off”. This is an improvement over the previous deployment.
- Text logging without an AI key successfully parsed and saved a vegetable-pasta dinner.
- Memory now has **Edit this meal**. Changing that entry to Yesterday saved a correction, returned to Memory and retained **one** meal with an edited marker. The previous missing-edit finding is improved in this exercised path.
- The home page still put calendar, modifiers and pantry above the meal decision, and the source supplied only operating-system light/dark colours. Those observations informed the new design.

## Local improvements delivered

### A clearer opening

- Original food photography with a warm, light background, consistent branding and editorial type.
- Three visible steps with progress indicators and a fixed action footer.
- Planner diet and allergy boundaries available before the first recommendation.
- Optional favourites show a small starter selection, search and Explore all, with Skip for now always reachable in the footer.
- Draft recovery now also preserves an **in-progress member sheet**. Entering Riya, refreshing before saving the person and reopening restored that member draft as well as the planner allergy.
- Readable blocked-action styling preserves the existing field-error and focus behaviour.

### A home families can customise

Open **Today → Personalise**, or use the link in Settings.

- Add/change/remove a local family photo, with top/centre/bottom framing.
- Alternatively choose either original bundled cover: Around the table or Fresh from the garden.
- Pick **Sunday saffron**, **Garden sage**, **Berry breakfast**, **Cocoa evenings**, or device light/dark mode.
- Add a cover message up to 70 characters. Blank messages use the default; long display text is bounded so it cannot push out the banner.
- Choose whether to show people, weather, pantry, tomorrow’s planning card and food memory.
- Preview changes, save deliberately or cancel. Reset changes only the preview until saved.
- Preferences belong to the selected family and do not change meal history or dietary rules.

The upload test used a generated food photograph as a safe synthetic fixture, not a real family portrait. This exercises the same image-selection and persistence pipeline; no real family photos were supplied.

### A useful first decision

- The meal recommendation and Plan this meal action appear before pantry/shopping.
- A responsive two-column layout uses desktop space; a compact banner keeps the primary action in the opening view.
- Pantry is expandable. Existing ingredient selection, leftover selection and shopping/order navigation remain available.
- Plan this meal and Log as cooked have distinct meanings. Stale swipe instructions were removed after a meal becomes planned.
- Next and Back still record and undo the skip as appropriate. Planning and logging preserve meal/plate identity.
- The memory card uses actual recorded meals, with an honest empty state.
- Calendar dates are labelled as information, not falsely described as rules applied to everyone.
- Feedback messages sit above bottom navigation/action footers. In the phone check the toast bottom was 756 px, above the navigation at 772 px.

## Browser cases exercised locally

| Area | Case | Observed result |
|---|---|---|
| Required input | Begin setup with no name | Specific inline error, field focus and announced feedback |
| Diet | Choose planner diet and enter an allergy | Selection and text retained in the draft |
| Interrupted setup | Refresh with an unfinished child sheet | Child name, sheet and planner data restored |
| Favourites | Search pasta | Vegetable pasta returned; skip/footer remained available |
| Optional setup | Skip favourites | Reached the home page successfully |
| Photo | Select a local JPEG through the browser file chooser | Preview appeared; no AI call used |
| Photo framing | Choose Keep the top | Selection displayed and saved |
| Persistence | Reload after saving photo, message and sage palette | Photo loaded, message remained and sage palette persisted |
| Sections | Hide pantry, save and reload | Pantry heading absent; later re-enabling restored it |
| Cancellation | Select cocoa in preview, Cancel, reopen | Previously saved sage choice remained selected |
| Theme system | Save all four named palettes | Home, controls, text and navigation changed consistently in the exercised views |
| Photo removal | Remove the uploaded image and save | Bundled table cover and Add a family photo path restored |
| Keyboard | Space on a home-section switch | State toggled and exposed through aria-checked |
| Planning | Next → Back → Plan this meal | Previous suggestion restored, meal planned and explicit confirmation shown |
| Logging | Log as cooked from that plan → Save | Correct dish/date/slot handed off and marked cooked; memory card updated |
| Layout | 360 px phone | No document-level horizontal overflow; main action remained on screen |
| Feedback | Save appearance | Success message visible above bottom controls |

The other section toggles and theme controls were inspected for availability and semantics; this does not substitute for every combination of settings or a physical screen-reader audit.

## Automated protection added

Seven focused tests cover:

1. Appearance saves retain existing meal IDs and all unrelated family data.
2. A quota failure restores the preceding home in memory and storage.
3. One family’s appearance edit preserves another household and an unfinished setup.
4. Existing families without appearance settings obtain defaults without mutation.
5. Expired blob URLs and external image URLs from a backup fall back safely; native app-owned URI formats are retained.
6. Saving a removed family reports failure rather than false success.
7. A meal logged while a photo save is pending survives a later storage failure.

The last case caught a race during implementation and was fixed by applying a functional state update, awaiting persistence and rolling back only the attempted appearance edit.

## Photo and data behaviour

Family covers are kept locally and are not sent to an AI service. Web images are re-encoded into a bounded JPEG data URI, with the longest dimension capped at 1600 px and an encoded-length limit. Native images are copied to app-owned document storage. Replaced/unreferenced native copies are cleaned up while retaining referenced photos; family deletion includes its cover. Native file behaviour still requires device tests.

A failed save gives a retryable error and preserves the preceding appearance. The existing optional Gemini recognition of **meal** photos is a separate feature; the family-cover flow never invokes it.

Browser storage can be cleared or reach its quota. Native exports contain local file URIs rather than portable image files. Cloud photo backup/sync is not included.

## Remaining product gaps

These are visible boundaries of this work, not claims that the previous complete FSD is now implemented:

- Genuine multi-device family joining, sign-in/invitations and shared sync still need backend work.
- Reports/Insights remains a separate feature; the home memory card is not an analytics report.
- Broader world-cuisine categories and a curated global catalogue are still needed. A general kitchen option and a search field do not complete that request.
- A beginner-friendly AI-key walkthrough and connection test remain to be added.
- Country-aware contact setup was not validated. Confirm the intended messaging contact flow before treating its validator as complete.
- A master opt-in for fasting-calendar configuration is still separate work; individual member forms retain their calendar fields.
- Arbitrary historical-date selection and a more explicit structured manual logging mode remain useful follow-ups.

## Limits and retest before publishing

- No physical Android/iOS device was available for gallery selection, permission UI, native file lifetime/cleanup, camera, speech, notifications or background delivery. Bundle generation only verifies compilation.
- Browser-picker cancellation could not be exercised through this automation interface because its file-chooser helper requires at least one file. It was not counted as an app defect or a passed test.
- Tests used synthetic local data only. No real contacts were messaged, no real family data was deleted and no paid AI calls were made.
- No cloud authentication/access-control tests, full offline simulation, low-memory-device performance measurements or formal accessibility certification were performed.
- Recheck long names/messages, browser zoom, keyboard navigation, low-storage recovery and all home-section combinations with real users/devices. Verify Native photo handling in a development/release build.

## Screenshots and asset provenance

- [Opening before](before-onboarding.png) → [refreshed opening](after-onboarding-desktop.png)
- [Home before](before-home.png) → [refreshed desktop home](after-home-desktop.png)
- [Phone home](after-home-mobile.png), [small phone](after-home-360.png), [searchable favourites](after-favourites-mobile.png)
- [Personal photo / sage](custom-photo-sage-mobile.png), [sage desktop](custom-photo-sage-desktop.png), [cocoa](cocoa-home-mobile.png), [berry](berry-home-mobile.png)
- [Deployed history edit](deployment-history-edit.png)
- [Personalised home in the production browser build](production-personalised-home.png)

The two original editorial photos were made with the built-in image-generation tool and saved as optimised project JPEGs. [Final prompts and asset notes](../../app/assets/images/kitchen/README.md). They are mood covers, not photos of a particular suggested meal. No generated faces are presented as the user’s family.
