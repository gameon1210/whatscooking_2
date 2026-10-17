# Product specifications and QA evidence

This repository keeps the supplied specifications and durable review evidence. Each review describes a particular source revision or deployment; historical failures are not a statement about the current app.

## Specifications

The supplied files remain in the repository root with their original names:

- [What's Cooking 2.0 — Functional Specification (FSD), Word](<../What's Cooking 2.0 — Functional Specification (FSD).docx>) and [PDF](<../What's Cooking 2.0 — Functional Specification (FSD).pdf>)
- [Full product specification](../20-4-family_meal_assistant_full_product_spec.docx)
- [MVP specification, Word](../family_meal_assistant_fsd_mvp.docx) and [Markdown](../family_meal_assistant_fsd_mvp.md)
- [Version 2 specification](../family_meal_assistant_fsd_v2.docx)
- [Version 2 feature roadmap](../family_meal_assistant_v2_feature_roadmap.docx)

These are requirements references. Their presence does not imply that every feature has been implemented or verified.

## Reviews

| Folder | Scope and baseline | Entry point |
|---|---|---|
| `qa/` | Initial FSD audit on 3 October 2026, source `a098e48`; original failures and subsequent repair report | [Audit report](qa/QA-report.md), [interactive review](qa/QA-review.html), [repair report](qa/FIX-REPORT.md) |
| `qa-2026-10-17/` | Browser review of the earlier `b0pkq3ogs8` Expo deployment, before the latest refresh | [Live web review](qa-2026-10-17/Live-web-review.md), [interactive review](qa-2026-10-17/Review.html) |
| `design-refresh/` | Updated `x7e0ymxq1t` deployment review and local design changes based on source `fd45ab3`, committed as `92f3b5b` | [Latest targeted QA report](design-refresh/QA-report.md) |

Reports include their limits and outstanding work. Screenshots, structured findings, requirement mappings, test results and supporting review helpers are versioned alongside them. The latest targeted review does not close the entire original FSD audit.

## Generated builds

The root ignore rules exclude generated `web-export/` and `all-platform-export/` folders, installable Android/iOS packages, and Python caches. Existing local files are retained. Release packages can be stored with the build service or attached to a repository release rather than committed to source history.

To recreate the current production export from `app/`:

```powershell
npx expo export --platform all --output-dir ../artifacts/design-refresh/all-platform-export
```

The optional local production preview helper is `design-refresh/serve_preview.py`. After exporting, run it with Python from the repository root; it serves the build at `http://127.0.0.1:8087`.
