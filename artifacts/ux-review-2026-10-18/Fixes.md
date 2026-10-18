# What’s Cooking 1.0.5 — high and medium issues fixed

All 17 findings from the 18 October usability review are fixed: **7 High and 10 Medium**.

Live app: [whatscooking.expo.app](https://whatscooking.expo.app). Deployment: `gf8s7lj6ra`. Public reload verified against `entry-66110f480079ece76b1380373aa1d7ce.js`.

Validation: **198 automated tests passed across 10 suites**, typecheck and lint passed, and Android, iOS and web production exports succeeded. Browser interaction checks used synthetic households at 390×844 and 360×800.

## Repairs and verification

| Finding | Change | Verification |
|---|---|---|
| UX01 · High · Release identity | Publish the verified 1.0.5 web build and show its source version in Settings. | Public Settings and Log checked after reload; production bundle compared with the tested export. [Evidence](fixes/12-production-v105.png) |
| UX02 · High · Required preparation | Show mild preparation on suggestion cards, alternatives, day/week planning, and the cook handoff. Remove unconditional suitability wording. | Conditional recommendation regression test; restaurant card and plain-language reasons checked. [Evidence](fixes/04-order-preparation-note.png) |
| UX03 · High · Cook allergy instructions | Carry each diner’s saved allergies and exclusions on the relevant cook plates, for every alternative. Localise common allergens in all five cook languages. | Payload/message tests in five languages; actual recipient page retains Riya’s milk note when choosing an alternative. [Evidence](fixes/07-cook-recipient-allergy.png) |
| UX04 · High · Bought ingredients | Tie fulfilment to the plan, date, recipe and ingredient. Keep purchases when hidden; offer undo. Capture coverage when ticking older list items. | Bought bread stays fulfilled after reload and hiding; new later requirements return; legacy-item regression. [Evidence](fixes/03-shopping-edit.png) |
| UX05 · High · Unfinished meal recovery | Persist date, meal, dishes, diners, order status, text, mode and edit identity per family. Restore on reopen, offer discard, and protect drafts when opening another meal. Report failed device writes. | Hydration, isolation, deletion and rejected-write tests; normal and linked drafts restored in browser; switching to Edit asks before discarding. [Evidence](fixes/01-restored-adult-meal.png) |
| UX06 · High · Who ate this? | Add editable diner selection. Preserve attribution in logs, edits, exports, history filters, duplicate checks and auto-log matching. Tiffins always follow the selected child. | Adult-only meal excluded from children’s history; adding a diner edits the same record; family-plan and child-switch regression tests. [Evidence](fixes/13-tiffin-child-corrected.png) |
| UX07 · High · Honest past weeks | Show recorded entries and saved plans on past dates, with explicit Logged, Needs confirmation and Planned states. Empty dates offer logging; no freshly generated past menus. | Empty past-week and mixed-record tests; browser shows empty dates, actual diners and the week range. [Evidence](fixes/02-past-week.png) |
| UX08 · Medium · Cook handoff within reach | Use a compact meal preview with dietary instructions, an expandable complete message and a persistent WhatsApp action. Preserve copy, other sharing and sent confirmation. | At 360×800 the primary action is 48 px high and ends at y=788; no horizontal page overflow. [Evidence](fixes/06-cook-handoff.png) |
| UX09 · Medium · A varied reviewed week | Generate future days sequentially in a temporary planning context, prefer different dishes, retain saved choices and require a bulk review before pinning. Add a weekly-variety preference. | Variety, hard-rule and no-mutation regression; browser reviewed and pinned 34 suggestions while Monday’s existing choices remained. [Evidence](fixes/10-week-preview.png) |
| UX10 · Medium · Ingredient review and corrections | Offer individual ingredient selection, source meal/date, already-have actions, optional quantities and item correction. Explain pending ingredients and household staple assumptions. | Excluded appam batter and beans, then added only the remaining 19; corrected apples to green apples, 6 pieces. [Evidence](fixes/11-ingredient-review.png) |
| UX11 · Medium · Shopping for the selected week | Pass the displayed week to shopping. Offer 3-day, 7-day and custom periods; separate other saved items and include the period in shared text. | Navigated to 25–31 Oct; reviewed needs changed and 26 other-period items were collapsed separately. [Evidence](fixes/11-ingredient-review.png) |
| UX12 · Medium · Shorter child setup | Start with name, diet, allergies and a school toggle. Keep Save person visible; reveal extra preferences and school details on request. Retain setup progress. | Saved a child without opening extra sections; reload retained step 2 and the child; reopened school details and pick-up time. [Evidence](fixes/08-short-child-setup.png) |
| UX13 · Medium · Complete dish browsing | Show catalogue counts and progressive loading, search more results, add an own-dish shelf and keep selected dishes visible. Explain selection limits instead of replacing another selection silently. | Expanded Indian dinner browsing from 40 to all 62 dishes without typing; in the single-choice order browser, 61 unselected dishes plus the selected dish were reachable. [Evidence](fixes/expanded-dish-browse.txt) |
| UX14 · Medium · Understandable explanations | Show plain-language reasons without ranking scores, and name the familiar/adventurous choices while preserving their stored values. | Browser reasons contain no numeric weights; Settings uses named choices and the variety preference. [Evidence](fixes/09-release-settings.png) |
| UX15 · Medium · Core tasks survive customisation | Keep Order in and Shopping by the main meal, recap access in Memory, and permanent kitchen tools in Family. | Hid all five optional home sections; Order in and Shopping stayed on Today and Our food week stayed in Memory. [Evidence](fixes/home-hidden.txt) |
| UX16 · Medium · Explicit inferred year | Confirm a missing year if resolving it changes the year. Show the full resolved date in Log, retain explicit past dates and block future dates. | 19 Oct asked to confirm Sunday 19 October 2025; selection and reload retained that full date. [Evidence](fixes/05-confirm-inferred-year.png) |
| UX17 · Medium · More order-in choices | Add Next, Previous and a compatible dish browser, choose the meal slot, remove cooking-effort labels, and open editable logging before recording an order. | Rejected the first idea, browsed another dish and opened Log with Ordered in selected; no provider or logging action was needed to browse. [Evidence](fixes/04-order-preparation-note.png) |

## Scope and remaining checks

These are implementation and expert walkthrough results, not recruited-participant research. No physical Android/iPhone install or device screen reader was tested. Native exports confirm that the app bundles, not that every device behaviour is correct.

No real messages, orders, personal photographs, real AI keys or paid AI calls were used. Saved allergy instructions are carried into the handoff; this does not certify every recipe’s allergen metadata. A knowledgeable food reviewer and native speakers should still check the catalogue and translations.

Deferred family sync, invites and sign-in remain covered by the separate family-sync plan. This report closes UX01–UX17, not every requirement in the original FSD audit.

## Evidence

- [All test results](fix-test-results.json)
- [Browser checks and limits](fixes/manual-checks.json)
- [Small-phone action measurements](fixes/phone-layout.json)
- [Exact release record](release.json)
- [Original usability review](UX-review.md)
- [Reusable participant test pack](Participant-test-pack.md)
