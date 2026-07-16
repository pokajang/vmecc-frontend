# ERCO, Drill, and Fitness Test Corrective Action Plan

Date: 2026-07-16  
Source audit: `docs/REPORT_CROSS_MODULE_UAT_MOBILE_AUDIT_2026-07-16.md`  
Status: Ready for execution; confirmed report defects are already closed, while the P2/P3 follow-up actions below remain open.

## Objective

Close the remaining risks from the cross-module audit without reworking behavior that is already correct, weakening submission validation, or introducing a second UI system.

The corrective action work must preserve these outcomes:

1. ERCO, Drill, and Fitness Test remain reliable from setup through draft, review, submission, approval, rejection, record detail, and edit/update.
2. Report locations use the model appropriate to the report type rather than a generic inspection hierarchy.
3. Drafts may remain incomplete, but final event-level reports remain atomic and fully validated.
4. ERCO and Drill media remain ordered, authorized, durable, and associated with their post-analysis section.
5. Mobile and tablet interactions remain usable at the supported widths without horizontal overflow, clipped critical content, or obscured actions.
6. A future report type cannot enter the runtime registry without entering the audit and responsive test matrices.

## Disposition of the audit findings

Do not reopen completed work unless a regression is reproduced.

| Action | Audit finding                                                                            | Priority | Status                            | Required disposition                                                                                             |
| ------ | ---------------------------------------------------------------------------------------- | -------: | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| CA-01  | Static, cropped report photos in review/detail                                           |       P1 | Closed                            | Maintain the shared full-resolution viewer and its regression tests.                                             |
| CA-02  | Report stage changes retained the old scroll position                                    |       P1 | Closed                            | Maintain the shared viewport-reset contract for every stage transition.                                          |
| CA-03  | Excessive mobile setup whitespace and inconsistent action sizing                         |       P1 | Closed                            | Maintain responsive spacing and touch-target assertions.                                                         |
| CA-04  | Risk of losing photo descriptions or location semantics                                  |       P1 | Closed                            | Maintain frontend factory and backend round-trip tests.                                                          |
| CA-05  | Shared application-header actions measure 24–37 px at 768 px                             |       P2 | Closed 2026-07-16                 | Shared tablet actions are 44 x 44 px from 768 through 1024 px and enforced by Playwright.                        |
| CA-06  | Physical iOS/Android camera, keyboard, safe-area, and orientation behavior is unverified |       P2 | Open - physical evidence required | The executable device checklist is ready; real iOS and Android evidence cannot be produced by browser emulation. |
| CA-07  | Full report viewer is not covered by a real authenticated browser upload flow            |       P3 | Closed 2026-07-16                 | Real ERCO and Drill upload, draft, reload, review, submit, detail, and cleanup flows pass.                       |
| CA-08  | New report types can be registered without automatically joining the audit matrix        |       P3 | Closed 2026-07-16                 | Runtime/config/permission/navigation/workflow/audit keys are contract-tested.                                    |
| CA-09  | The 16 UAT concerns are not yet a formal new-module checklist                            |       P3 | Closed 2026-07-16                 | Every registered report type must classify all 16 concerns in the audit manifest.                                |

## Non-negotiable business and architecture rules

The following are intentional contracts, not defects:

- Do not add inspection-style `Next location` or `Next compartment` helpers to atomic ERCO, Drill, or Fitness Test reports.
- Do not allow an incomplete final report merely because incomplete inspection scopes can be submitted. These are different business entities.
- Continue accepting incomplete drafts for interruption, handover, or later completion.
- Do not add `Zone`, `Area`, or `No Zone` placeholders to report types that store a direct location.
- Preserve ERCO's ordered multi-location label and Drill/Fitness Test's scalar location.
- Do not add an issue icon, N/A status mapping, `All good` helper, finding hierarchy, or photo field where the report type has no such concept.
- Do not add photos to Fitness Test solely to make all forms structurally identical.
- Do not migrate CoreUI/Sass to shadcn/Tailwind as part of this remediation. The design audit criteria apply, but the repository's component system remains authoritative.
- Do not relax media ownership, module, size, count, lease, or authorization checks to make browser tests easier.
- Do not remove submission-key idempotency or optimistic version checks.

---

## Workstream 1 — Shared application-header tablet touch targets

Corrective action: CA-05  
Priority: P2  
Owner: Frontend platform/shell  
Expected effort: Small to medium  
Release recommendation: Complete before the next tablet-focused field release.

### Problem

At 768 × 1024, report-owned module navigation and form controls now meet the 44 px target. Five shared-shell controls remain smaller:

- Toggle sidebar: approximately 37 × 33 px;
- Ask AI: approximately 30 × 30 px;
- Report issue: approximately 30 × 24 px;
- Notifications: approximately 30 × 29 px;
- Account: approximately 30 × 30 px.

The icons are visually adequate, but their hit areas are unnecessarily small for a touch tablet. The correction must enlarge the interactive box without visually enlarging every icon or making the header wrap.

### Primary files

- `src/components/AppHeader.js`
- `src/components/header/AppHeaderDropdown.js`
- `src/scss/layout/_shell.scss`
- `src/scss/components/_touch-targets.scss`
- a new focused AppHeader interaction test under `src/components/header/__tests__/`
- `tests/e2e/report-cross-module-mobile-audit.spec.js`

### Implementation tasks

1. Add one semantic class, such as `app-header-action`, to every icon-oriented header action:
   - sidebar toggle;
   - Ask AI;
   - Report issue;
   - Notifications;
   - Messages when present;
   - account menu trigger.
2. Keep the icon at its current visual size. Increase the button/link hit box to at least 44 × 44 px at the `md` tablet breakpoint.
3. Use a targeted `md`-only rule rather than a global `.header .nav-link` override. Avoid changing full-width desktop links or mobile bottom-navigation controls unintentionally.
4. Retain visible focus treatment on every surface. The enlarged hit box must not clip the existing focus ring.
5. Keep notification/message badges positioned relative to the action hit box and verify counts of 0, 1, 99, and 999+.
6. Preserve the accessible names `Ask AI`, `Report issue`, `Notifications`, `Messages`, `Toggle sidebar`, and the account name/menu label.
7. Confirm that tooltips remain supplementary. A tooltip must not become the only accessible name.
8. Verify conditional combinations:
   - on-duty indicator shown and hidden;
   - Messages enabled and disabled;
   - zero and non-zero notification count;
   - long user name/role in the account menu;
   - sidebar expanded and collapsed.
9. Do not solve space pressure by hiding an authorized action at 768 px. If spacing is tight, reduce decorative gaps before reducing the hit box.

### Automated tests

Add component assertions that:

- every visible header action has a stable accessible name;
- icon-only controls are buttons or links according to their behavior;
- Ask AI retains `aria-pressed` behavior;
- notification and message badges do not replace the control's name;
- account, notification, feedback, and AI triggers still call their existing handlers;
- keyboard activation works with Enter/Space where appropriate;
- Escape closes the opened overlay through the existing overlay primitive.

Extend the responsive Playwright metrics so the 768 px row fails when any visible shared-header action is below 44 × 44 px. Native checkboxes must remain classified separately from standalone icon controls.

### Visual cases

Review at 768 × 1024, 820 × 1180, 912 × 1368, and 1024 × 768:

- default header;
- notification badge present;
- Messages present;
- on-duty pill present;
- AI panel active;
- sidebar opened and closed;
- 200% browser zoom or equivalent enlarged text.

### Acceptance criteria

- Every visible shared-header action is at least 44 × 44 px at the audited tablet breakpoint.
- The header has no horizontal overflow, wrapping, overlap, or clipped badge at the tested widths.
- Focus remains clearly visible and keyboard order follows visual order.
- Header height does not jump when a badge, tooltip, or active state appears.
- Desktop labels from `lg` upward remain unchanged.
- Phone bottom navigation remains unchanged.

### Rollback boundary

The semantic header-action class and its responsive CSS must be independently reversible. Do not roll back report-form touch-target fixes if the shared header needs adjustment.

---

## Workstream 2 — Physical mobile-device qualification

Corrective action: CA-06  
Priority: P2  
Owner: QA/UAT with reporting frontend support  
Expected effort: Medium; no code change unless a device-specific defect is reproduced  
Release recommendation: Treat as a release gate when camera evidence is used operationally.

### Required device matrix

Use at least:

- one supported iPhone running current Safari;
- one supported Android phone running current Chrome;
- portrait and landscape on each device;
- a device with a display notch/home indicator to exercise safe-area insets;
- one constrained network run using browser/devtools throttling if physical network control is unavailable.

Record device model, OS version, browser version, viewport, date, tester, and build/version identifier.

### Test scenarios

#### Authentication and restore

1. Sign in and enter each report module.
2. Start a draft, background the browser, return, and confirm the correct report and stage are restored.
3. Kill/relaunch the browser after a successful draft save and confirm data restores without duplication.
4. Repeat with an expired session and confirm the user is asked to sign in without silently losing a server-saved draft.

#### ERCO location semantics

1. Select one location and confirm review/detail show exactly that label.
2. Select multiple locations and confirm order and separators remain coherent.
3. Use long location names and confirm wrapping without `No Zone`, clipping, or horizontal overflow.
4. Return from review to edit and confirm the original multi-selection remains selected.

#### Drill and ERCO camera/upload

1. Capture portrait and landscape photos using the physical camera.
2. Upload an existing image from the photo library.
3. Where supported, test HEIC/HEIF input and verify the backend's configured processor behavior.
4. Deny camera permission, retry, and confirm a useful recovery path remains available.
5. Background the browser during capture/upload and confirm the report returns to the same stage.
6. Rotate the device while the upload or viewer is open.
7. Confirm upload progress/busy state prevents premature review but preserves completed form data.
8. Enter an empty description, a normal description, a long description, punctuation, and line breaks.
9. Confirm the description persists through draft reload, review, final submit, and record detail.
10. Open every photo and confirm the full image is contained, not cropped, and follows submission order.

#### Keyboard and safe-area behavior

1. Focus the lowest text input and photo-description field.
2. Confirm the virtual keyboard does not cover the focused control, validation message, or primary action.
3. Close the keyboard and confirm no permanent blank region or incorrect scroll offset remains.
4. Confirm the bottom navigation and modal/drawer footer respect the home-indicator safe area.
5. Move between stages after scrolling to the bottom and confirm the new stage begins at the top.

#### Failure and recovery

1. Interrupt the network before draft save, during upload, and before final submission.
2. Confirm the UI distinguishes unsaved local form state, failed server draft save, upload failure, and final submit failure.
3. Retry each recoverable action and confirm it does not create a duplicate report or duplicate media entry.
4. Confirm a failed upload can be removed/retried without blocking unrelated completed fields.

### Defect handling

For every reproduced defect, capture:

- exact device/browser/build;
- steps and expected/actual behavior;
- screen recording or screenshots;
- report type and stage;
- whether data was lost, duplicated, obscured, or merely visually degraded;
- network response/status when available without recording tokens or private payloads.

Severity guidance:

- P0: security exposure or irreversible cross-user data corruption;
- P1: data loss, duplicate final submission, inability to submit a valid report, or inaccessible camera evidence;
- P2: obscured controls, unusable keyboard/safe-area behavior, wrong scroll restoration, or broken photo viewing;
- P3: cosmetic spacing that does not impair completion.

### Acceptance criteria

- All required scenarios pass on both device families.
- No report data is lost or duplicated during camera return, background/foreground, rotation, or network retry.
- No focused field or primary action is permanently hidden by the keyboard or safe area.
- Full-size photos retain correct orientation, order, and description.
- Evidence is attached to the release/UAT record, not kept only in an individual tester's device.

---

## Workstream 3 — Authenticated report-media browser coverage

Corrective action: CA-07  
Priority: P3  
Owner: Reporting frontend with backend media support  
Expected effort: Medium

### Problem

The current Drill stress/camera E2E stubs media responses. Unit and Laravel tests prove serialization, authorization, linking, leases, and lifecycle behavior independently, but no browser test currently joins these layers through a real authenticated upload, draft, review viewer, final submission, and record-detail viewer.

### Primary files

- a new `tests/e2e/report-media-workflow-smoke.spec.js`
- reusable helpers under `tests/e2e/support/`
- `tests/e2e/reporting-workflow-smoke.spec.js` only if shared login/persona utilities can be extracted without bloating it
- `src/views/report/shared/emergency-report/ReportPhotoSection.js`
- `src/components/report-workflow/ReportPhotoGallery.js`
- backend `config/report_media.php`
- backend `tests/Feature/DrillReportMediaLifecycleTest.php`
- backend `tests/Feature/ReportMediaHardeningTest.php`

### Environment prerequisites

1. Use dedicated smoke users and dedicated report IDs/submission keys.
2. Enable Drill upload only in the E2E test environment. Do not change the production default merely to run the test.
3. Configure adequate temporary test quota and zero/controlled minimum-disk guard only in isolated test configuration.
4. Use generated test images with no personal or operational content.
5. Ensure cleanup removes created reports/drafts and allows unlinked media to be pruned. Do not delete media owned by unrelated tests/users.

### Required browser flows

#### ERCO

1. Complete setup with multiple locations.
2. Complete required team/details/chronology fields.
3. Upload at least one portrait and one landscape image.
4. Save descriptions, including one multiline description and one intentionally empty description.
5. Save the draft, reload, and verify photo order/descriptions.
6. Enter review and open each full-size photo.
7. Submit, open record details, and repeat viewer assertions.
8. Confirm the stored location remains the complete ordered multi-location label.

#### Drill

Repeat the ERCO flow using Drill's post-exercise stage and scalar location. Confirm:

- upload is permitted only when the test environment enables it;
- the report remains on the analysis stage after camera return;
- review is blocked while an upload is still processing;
- the full viewer uses the authenticated full media URL rather than the thumbnail URL;
- final record detail retains the description and order.

### Edge cases

- duplicate filenames with different media IDs;
- long filenames and long descriptions;
- a photo with a thumbnail failure that falls back to the full URL;
- one failed upload followed by a successful retry;
- deletion of a photo before final submission;
- draft deletion while the same media is already linked to a final report;
- maximum allowed photo count;
- one over-limit attempt with an actionable message;
- unauthorized user cannot open another module/user's media URL;
- stale report version cannot reconcile a new media set.

Keep expensive lifecycle/security cases in Laravel tests when browser behavior adds no value. The E2E test should prove integration, not duplicate every backend unit case.

### Assertions

- upload response is 200/201 and returns a media ID, full URL, and thumbnail URL;
- draft and final report payloads contain the expected media IDs and descriptions;
- thumbnail is used in the grid and full URL in the open viewer;
- viewer dialog is named and dismissible with Escape and close button;
- Previous/Next preserve array order;
- final submission is idempotent;
- no unexpected 401/403/409/422/500 response occurs in the happy path;
- expected negative-path status is asserted explicitly rather than ignored.

### Acceptance criteria

- Real authenticated ERCO and Drill photo workflows pass from upload through final record detail.
- The test proves description/order persistence after a server round trip.
- Media authorization remains deny-by-default.
- Test artifacts contain screenshots/traces but no authentication tokens or private response bodies.
- Cleanup is deterministic and does not leave growing smoke data.

---

## Workstream 4 — Registry and audit-matrix contract gate

Corrective action: CA-08  
Priority: P3; must be complete before registering another report type  
Owner: Reporting frontend  
Expected effort: Small to medium

### Problem

The runtime report registry, report metadata, sidebar navigation, permissions, workflow settings, and Playwright audit routes are maintained separately. A future type could be added to one list while missing responsive audit coverage or capability classification.

### Primary files

- `src/views/report/formRegistry.js`
- `src/views/report/constants.js`
- `src/views/report/Reports.js`
- `src/_nav.js`
- `src/views/settings/reportingWorkflowStorage.js`
- `tests/e2e/report-cross-module-mobile-audit.spec.js`
- a new `tests/e2e/support/report-mobile-audit-matrix.js`
- a new `src/views/report/__tests__/formRegistry.contract.test.js`

### Implementation tasks

1. Extract the Playwright module descriptors into one test-support manifest containing:
   - slug;
   - setup route;
   - heading matcher;
   - stable readiness selector/test ID;
   - whether photos are supported;
   - location model (`multiple-labels` or `single-label`);
   - submission model (`atomic-report`).
2. Add a stable setup-ready test ID to each report type so the audit does not depend on translated or editable labels such as `Training yard`.
3. Add a Vitest contract test that compares sorted keys from:
   - `FORM_REGISTRY`;
   - `REPORT_TYPE_CONFIG`;
   - the responsive audit manifest.
4. Where every report type is expected to appear in navigation/workflow settings, assert those keys too. If a type is intentionally hidden, require an explicit documented exclusion rather than silently omitting it.
5. Fail with a message explaining which registration step is missing.
6. Keep component references in the runtime registry. Do not move React components into a JSON configuration file.
7. Avoid using source-text parsing in tests. Import/export structured values so refactors do not create false failures.

### New-type gate

A new report type must not merge until it has:

- runtime component registration;
- metadata label and display-ID prefix;
- route and permission mapping;
- draft/final payload validation;
- workflow-settings declaration where applicable;
- record factory and round-trip tests;
- setup-ready test ID;
- 320/390/768 responsive audit row;
- explicit photo, location, stage, and submission capabilities;
- classification against all 16 UAT concerns.

### Acceptance criteria

- Removing any current type from the audit manifest makes the contract test fail.
- Adding a type to the runtime registry without an audit descriptor makes CI fail with a useful error.
- Existing ERCO, Drill, and Fitness Test routes remain unchanged.
- The Playwright audit still produces screenshots and JSON metrics for every registered type.

---

## Workstream 5 — Preventive 16-point UAT control

Corrective action: CA-09  
Priority: P3  
Owner: Reporting product owner, frontend/backend owners, and QA  
Expected effort: Small documentation/test work per report type

### Purpose

Turn the one-time audit into a release control without adding brittle tests that merely assert exact wording.

### Capability checklist for every report type

For each of the 16 concerns, record one of:

- **Applicable — automated:** covered by a named unit/API/E2E test;
- **Applicable — manual:** requires physical-device or visual validation;
- **Not applicable:** the underlying concept does not exist, with a short reason;
- **Intentional difference:** behavior differs by business contract, with product-owner approval.

Required decisions:

1. What answer/status values can create an issue indicator?
2. Which photo scopes exist and how are they displayed?
3. What is the location model?
4. What is the photo hierarchy and ordering rule?
5. Where do cancel/save actions appear relative to edited content?
6. Which remarks/evidence fields exist and are any semantically duplicated?
7. What is the stage/scope navigation model and scroll-reset behavior?
8. How does review summarize every selected scope/location?
9. Is partial final submission allowed, and at what business boundary?
10. What action appears after the final stage/scope?
11. What parent-child grouping must record details retain?
12. Can users add/remove photos and what is the default description?
13. How are photo descriptions and hierarchy persisted?
14. Which dynamic rows/findings can block submission?
15. Is a bulk helper relevant to the number of criteria?
16. Which next-scope helper is required, if any?

### Automated regression mapping for current reports

| Contract                               | Required regression evidence                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| ERCO ordered multi-location labels     | Record-factory unit test, backend payload round trip, review/detail assertion |
| Drill/Fitness scalar location          | Record-factory unit tests and backend payload tests                           |
| Draft incomplete/final complete        | All three backend payload validation suites                                   |
| No hard-coded one-location summary     | Review/detail component tests using multiple ERCO labels                      |
| Photo order and descriptions           | Gallery unit test, factory tests, backend lifecycle test, real-media E2E      |
| Thumbnail grid/full viewer URL         | `ReportPhotoImage`/gallery tests and real-media E2E                           |
| Stage resets to top                    | Viewport utility test plus browser stage-transition assertions                |
| Final stage reaches review             | Real-backend reporting workflow E2E                                           |
| Dynamic Drill stress                   | Maximum-photo and long-chronology E2E                                         |
| No horizontal overflow/clipped context | Cross-module mobile audit at 320/390/768                                      |

Do not add fragile negative assertions for arbitrary text such as `All good` across an entire application. Prefer capability-specific component tests and the documented applicability decision.

### Acceptance criteria

- The checklist is completed for every registered report type.
- Every applicable high-risk behavior links to named evidence.
- Every intentional difference has a business reason and owner.
- The audit document is updated when a capability or submission contract changes.

---

## Delivery sequence and merge gates

### Change 1 — Header touch targets

Merge gate:

- focused header tests pass;
- 768/820/912/1024 visual cases pass;
- responsive metrics show only native labelled checkboxes below 44 px, not standalone header actions;
- no header wrapping or overflow;
- production build passes.

### Change 2 — Registry/audit contract

Merge gate:

- registry/config/audit keys match;
- removing one descriptor demonstrates a useful test failure;
- all nine current responsive cases still pass;
- route/permission behavior is unchanged.

### Change 3 — Real authenticated media E2E

Merge gate:

- ERCO and Drill upload/draft/review/submit/detail flows pass;
- backend media lifecycle/security suites pass;
- cleanup is verified;
- no production upload flag/default is weakened.

### Change 4 — Physical-device qualification

Release gate:

- iOS and Android evidence is complete;
- no unresolved P0/P1 defect;
- P2 exceptions have an owner, rationale, containment, and target release;
- the source audit and this plan are updated with closure evidence.

## Verification matrix

| Surface/state                 |        320 phone |        390 phone | 768 tablet | 1024 landscape/tablet | 1440 desktop | Keyboard | Real backend |
| ----------------------------- | ---------------: | ---------------: | ---------: | --------------------: | -----------: | -------: | -----------: |
| ERCO setup and stages         |         Required |         Required |   Required |              Required |     Required | Required |     Required |
| Drill five stages             |         Required |         Required |   Required |              Required |     Required | Required |     Required |
| Fitness setup/form            |         Required |         Required |   Required |              Required |     Required | Required |     Required |
| Review and confirmation       |         Required |         Required |   Required |              Required |     Required | Required |     Required |
| Photo grid/viewer             |         Required |         Required |   Required |              Required |     Required | Required |   ERCO/Drill |
| Record details                |         Required |         Required |   Required |              Required |     Required | Required |     Required |
| Shared header                 | N/A/mobile shell | N/A/mobile shell |   Required |              Required |     Required | Required |        Smoke |
| Error/loading/disabled states |         Required |         Required |   Required |              Required |     Required | Required |     Required |

Also test:

- light and dark themes if both remain supported;
- browser zoom/enlarged text;
- long labels and descriptions;
- empty optional descriptions;
- loading, upload busy, upload failed, draft failed, submit failed, version conflict, permission denied, and success states;
- reduced motion where animations are present.

## Proportional automated checks

Run focused checks for each change, then the broader gates because shared report/shell/media code has a wider blast radius.

```text
npx vitest run src/components/header --environment jsdom
npx vitest run src/components/report-workflow/__tests__ src/views/report --environment jsdom
npx playwright test tests/e2e/report-cross-module-mobile-audit.spec.js --config=playwright.config.mjs --workers=1
npx playwright test tests/e2e/reporting-workflow-smoke.spec.js --config=playwright.config.mjs --workers=1
npx playwright test tests/e2e/report-media-workflow-smoke.spec.js --config=playwright.config.mjs --workers=1
php artisan test tests/Feature/ErcoPayloadValidationTest.php tests/Feature/DrillPayloadValidationTest.php tests/Feature/FitnessTestPayloadValidationTest.php tests/Feature/DrillReportMediaLifecycleTest.php tests/Feature/ReportMediaHardeningTest.php tests/Feature/ReportApiWorkflowTest.php
```

Before closure:

1. Run ESLint on every touched frontend file.
2. Run the production Vite build.
3. Re-run the full report/component suite.
4. Re-run inspection tests when shared photo primitives change.
5. Capture fresh responsive JSON and screenshots.
6. Attach physical-device evidence.

## Ownership and evidence

| Role                    | Responsibility                                              | Closure evidence                                      |
| ----------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Reporting frontend      | Report behavior, gallery, registry gate, E2E selectors      | Unit/E2E results, screenshots, diff review            |
| Frontend platform/shell | Header target sizing and responsive stability               | Header tests and tablet measurements                  |
| Backend/report media    | Upload policy, authorization, lifecycle, test configuration | Laravel security/lifecycle results                    |
| QA/UAT                  | Physical devices, keyboard, camera, orientation, safe areas | Device matrix and recordings/screenshots              |
| Product/workflow owner  | Approves location and atomic submission semantics           | Signed applicability/intentional-difference checklist |

No action is closed using only a verbal confirmation. Closure evidence must include the relevant test result and, for responsive/device work, rendered evidence.

## Definition of done

This corrective action plan is complete only when:

- CA-05 through CA-09 meet their acceptance criteria;
- no unresolved P0/P1 defect remains;
- all visible shared-header actions meet the tablet target requirement;
- physical iOS and Android qualification is recorded;
- real authenticated ERCO and Drill media flows pass;
- CI fails when a registered report type is absent from the audit matrix;
- all 16 UAT concerns are classified for every registered report type;
- draft/final submission semantics and backend authorization remain unchanged;
- the source audit is updated with final closure evidence and any accepted residual risk.

## Residual-risk and exception rule

Any deferred item must record:

- severity and user impact;
- affected device/module/stage;
- reason for deferral;
- temporary containment;
- named owner;
- target release or review date;
- evidence that no security, data-loss, or duplicate-submission risk is being accepted silently.

Cosmetic preference alone is not sufficient to defer a control that blocks touch, keyboard, camera, or submission use.
