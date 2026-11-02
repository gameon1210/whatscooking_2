# What’s Cooking 1.0.6 — phone fixes

Source commit: `ef38c7f`. Prepared 2 November 2026.

Web **1.0.6** is live at [whatscooking.expo.app](https://whatscooking.expo.app), deployment `xqludk4zjo`. The public site's script was verified as `entry-4344cf82f2c4262e1b7d5410e5371493.js`; the family shortcut and full dish catalogue were checked on that site. [Live home](07-production-home.png) and [live dish browser](08-production-picker.png).

| Request | Repair |
|---|---|
| Android system buttons obscure the menu | Tab-bar height and bottom padding now include the actual safe-area inset, preserving the icon, label and touch area above the system buttons. Tabs hide while typing. |
| The keyboard covers the input | Shared screens and modal sheets now use keyboard-aware scrolling with extra caret clearance. Fixed actions follow the keyboard. Modal content gets its own keyboard host, and mobile web follows the visual viewport. Android uses resize mode. |
| “x at the table” reads like an editable planning count | The home shortcut and its personalisation option now say **Our family**. The shortcut still opens Family. No new serving-count setting was added. |
| Dish options end too soon | Suggestions now lead directly into the full catalogue in a taller scrolling sheet, with visible All/Recent/Own/cuisine filters, forty-item pages and Show more. Today has a direct dish browser, and setup favourites also expand progressively. Selected choices have explicit remove controls. |

Ranked planning still saves up to three alternatives. Browsing more dishes does not relax saved diet, allergy, fasting or tiffin rules.

## Validation

- 206 tests passed across 12 suites, including regression checks for 0/16/24/34/48 dp system insets and catalogue completeness beyond six suggestions and forty rows.
- Typecheck and lint passed. Android, iPhone and web exports succeeded.
- Browser checks used 390×844, 360×800 and a reduced 390×500 viewport. These are layout checks, not a simulation of an actual Android keyboard.
- With the reduced viewport, dish search remained at y=160–208 and Save at y=440–488. A field near the bottom of Settings remained visible at y=248–296.
- Tomorrow’s three selected dishes could be changed and saved. Dinner browsing expanded from 40 to 80 of 121 additional dishes without losing the selected choices. Browser error logs were empty during these checks.
- Test households contained synthetic data. No real messages, orders, personal photographs or AI keys were used.

## Android update

The keyboard support includes a native module, so an installed Android app needs the new APK; publishing the web site alone cannot update an existing installation.

The internal Android build uses version **1.0.6**, build number **9**, the existing app identifier `com.gameon1210.whatscooking`, and the existing signing credentials. Install it as an update to preserve existing on-device family data.

Build and installer page: [Android 1.0.6](https://expo.dev/accounts/gameon1210/projects/whatscooking/builds/a868c1ba-535d-4922-9924-72cda55ff940). The build was still in Expo's free-tier queue at the last check; no ready APK is claimed. [release.json](release.json) records that timestamped status, and the build page shows current progress. When complete, use its Install button to update the app without uninstalling it.

## Device acceptance checks still needed

1. Enable Android’s three-button navigation. Open each main tab and verify its icon and label stay above the system buttons.
2. In Family, edit a name, allergies, and school pick-up time. Open and close the keyboard; the focused field and caret should remain visible, with extra scrolling available.
3. Repeat in Log text entry, shopping quantity editing, the AI-key form, and dish search inside the meal sheet. Check multiline input and switching between fields while the keyboard stays open.
4. In Tomorrow, search with three dishes already selected, replace a choice, save, and dismiss the keyboard. Check that the sheet action and main tabs return to their expected positions.
5. Repeat once with gesture navigation and a larger font size.

No physical Android/iPhone or emulator run was completed in this pass. Native system-bar and keyboard behaviour needs the device checks above; a successful export or APK build alone does not certify those interactions.

Evidence: [automated results](test-results.json), [dish search at reduced height](03-short-viewport-sheet.png), [selected meal sheet](04-selected-short-picker.png), [more dinner dishes](05-more-dinners.txt), [lower form field](06-lower-form-field.png).
