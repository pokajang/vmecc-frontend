# Report Cross-Module Corrective Action Implementation

Date: 2026-07-16  
Modules: ERCO, Drill, Fitness Test, shared reporting workflow, shared application header  
Result: Engineering actions complete; physical iOS/Android qualification remains open.

## Outcome

| Action                            | Result | Evidence                                                                                                                       |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| CA-05 tablet header targets       | Closed | Named shared actions are at least 44 x 44 px from 768 through 1024 px. The audit fails on regression.                          |
| CA-06 physical devices            | Open   | A release-ready physical-device checklist was added; real camera, keyboard, safe-area, and OS evidence still requires devices. |
| CA-07 authenticated report media  | Closed | Real ERCO and Drill flows cover upload, server draft, reload, ordered review viewer, final submit, record detail, and cleanup. |
| CA-08 registry drift              | Closed | Registry, metadata, permissions, navigation, workflow settings, and audit descriptors are compared by a contract test.         |
| CA-09 16-point preventive control | Closed | Each report type declares capabilities and classifies all 16 UAT concerns with evidence or a reason.                           |

## Corrective changes

### Shared header and mobile/tablet UX

- Added one `app-header-action` contract to sidebar, AI, feedback, notification, message, and account actions.
- Preserved 16-18 px icon sizing while expanding the interactive box to 44 x 44 px at tablet widths.
- Preserved accessible names, supplemental tooltips, badges, keyboard focus, desktop labels, and phone bottom navigation.
- Expanded the responsive audit to 320 portrait, 390 portrait, 844 landscape, 768/820/912 portrait tablets, 1024 landscape tablet, and 1440 desktop.
- Separated native checkbox measurements from standalone action-target failures.

### Registry and preventive UAT gate

- Extracted report descriptors into `tests/e2e/support/report-mobile-audit-matrix.js`.
- Added stable setup-ready test IDs for ERCO, Drill, and Fitness Test.
- Added an exported report-permission map instead of keeping a private duplicate in the route component.
- Added a contract test that fails when runtime forms, metadata, permissions, navigation, workflow settings, or audit descriptors drift.
- Required explicit photo, location, submission, and stage capabilities plus dispositions for concerns 1 through 16.

### Real media workflow and restore hardening

- Added a dedicated Playwright environment on isolated ports. Drill uploads are enabled only in that E2E backend process; the production default remains disabled.
- Generated non-operational portrait and landscape PNG fixtures and exercised real backend image processing.
- Verified media IDs, ordered descriptions, thumbnail URLs, full-image URLs, server draft reload, final record round trip, and record-detail viewer behavior.
- Added deterministic report/draft/media cleanup and refreshed CSRF handling for cleanup after browser session refreshes.
- Changed report photo descriptions from a single-line input to a two-row textarea so multiline descriptions can be entered and retained.
- Fixed a server-draft hydration race that could redirect ERCO deep links to setup before the draft loaded.
- Stabilized shared draft lifecycle callbacks so unrelated rerenders cannot cancel an in-flight restore and permanently suppress retry.

## Audit result

- 24 responsive module/viewport rows executed.
- Maximum horizontal overflow: 0 px.
- Clipped critical context values: 0.
- Shared header minimum at every audited 768-1024 px viewport: 44 x 44 px.
- ERCO, Drill, and Fitness setup routes all passed stable readiness checks.
- Native Drill checkbox glyphs remain browser-native and are reported separately; their labels/rows are the interactive target and the audit does not misclassify them as standalone icon buttons.

## Automated evidence

- Authenticated report-media Playwright: 2 passed (ERCO and Drill, 1.9 minutes); post-run active and soft-deleted E2E artifact counts are zero.
- Cross-module responsive Playwright: 1 scenario, 24 module/viewport rows passed.
- Backend media lifecycle, hardening, and guarded E2E cleanup: 24 tests, 132 assertions passed.
- Report-focused Vitest: 33 files and 116 tests passed.
- Targeted ESLint passed and the production Vite build completed successfully.

## Residual release gate

Physical-device qualification is not replaced by Chromium emulation. Execute `REPORT_PHYSICAL_DEVICE_QUALIFICATION_CHECKLIST_2026-07-16.md` on real iOS Safari and Android Chrome, attach evidence, and close CA-06 before a camera-dependent field release.
