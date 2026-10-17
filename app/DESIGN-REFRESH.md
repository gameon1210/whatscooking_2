# A family kitchen journal

The visual refresh keeps the existing meal engine and local-first family data. It adds original food photography, a lighter editorial layout and a home that each family can personalise.

## Make it yours

Open **Today → Personalise** or **Settings → Personalise my home**.

- Choose Around the table, Fresh from the garden, or a photo from your own device.
- Adjust a personal photo’s framing to keep the top, centre or bottom visible.
- Pick Sunday saffron, Garden sage, Berry breakfast or Cocoa evenings; following the device’s light/dark mode is optional.
- Add a cover message, up to 70 characters.
- Show or hide the family strip, weather, pantry, tomorrow card and food-memory card.
- Review changes and tap **Save my home**. Cancel leaves the saved home unchanged. Reset affects only the current preview until saved.

Appearance is saved per family. These choices do not edit meal history, reactions, hard food rules or reminders. Hiding tomorrow’s card does not disable notifications.

## Photos

Family covers do not go to AI or an upload service. Web photos are re-encoded locally to a bounded JPEG data URI so they survive page reloads; native photos are copied into app document storage. Browser storage can fill or be cleared, so photo saves report a storage failure and restore the preceding home rather than claiming success. A photo-save failure also preserves meals logged while the write was pending.

Changing or removing a native cover cleans up unreferenced app-owned photo copies. Family deletion includes its cover while retaining images still referenced by another family. Native gallery selection, file lifetime and cleanup still need physical-device verification. A browser export contains its local photo data; a native export contains a device-local file URI, which is not a portable photo backup.

The existing optional AI recognition path for *meal* photos is separate from family covers.

## First use

Onboarding has original food imagery, visible step progress, a fixed action footer, explicit planner diet/allergy choices and a searchable optional favourites step. The draft now retains an in-progress member sheet as well as saved people, names and favourites. There is no mandatory AI-key or theme step.

Today puts the meal decision before pantry/shopping, distinguishes **Plan this meal** from **Log as cooked**, keeps Next/Back, and uses recorded food for its memory card. Bundled cover images are mood photography, not photos of the suggested dish.

## Assets and validation

[Original image prompts and asset notes](assets/images/kitchen/README.md).

The current test evidence, screenshots, remaining product gaps and platform limits are in [the design refresh QA report](../artifacts/design-refresh/QA-report.md). Native bundle export is not device certification. The changes are local source changes and have not been published to the shared Expo deployment.
