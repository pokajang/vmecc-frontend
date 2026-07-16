# ERCO, Drill, and Fitness Test UAT and Mobile Audit

Date: 2026-07-16  
Scope: the non-inspection report forms registered by `src/views/report/formRegistry.js` (`erco`, `drill`, and `fitness-test`) and the shared report workflow components they use.

Detailed corrective action plan: `docs/REPORT_CROSS_MODULE_CORRECTIVE_ACTION_PLAN_2026-07-16.md`

Remediation implementation report: `docs/REPORT_CROSS_MODULE_CORRECTIVE_ACTION_IMPLEMENTATION_2026-07-16.md`

Remediation update: CA-05, CA-07, CA-08, and CA-09 are closed. CA-06 remains open only for physical iOS/Android evidence; browser automation and the executable device checklist are complete.

## Executive summary

The 16 inspection UAT concerns were traced through every currently registered non-inspection report form, their shared review/detail UI, frontend record factories, API validation, managed-media lifecycle, and approval workflow.

Two cross-module defects and two mobile hardening opportunities were confirmed and fixed:

1. ERCO and Drill photos in review and record details were static cropped tiles. They now open in a full-resolution, full-width viewer, retain submitted order, expose previous/next controls, and show the saved description.
2. ERCO and Drill route stages and the two Fitness Test stages had no explicit viewport reset. Every stage change now starts at the top of the report.
3. The ERCO mobile setup could insert 275 px of empty space before its actions at 390 px. Viewport-height stretching was removed; the measured gap is now 58 px and the remaining viewport space follows the actions instead of splitting related controls.
4. Mobile report actions, setup inputs, back/add/edit controls, and tablet report controls were hardened to use usable touch heights. Long mobile context values now wrap instead of being silently truncated.

No submission blocker, hard-coded one-location summary, `No Zone` leakage, default `finding` caption, false issue icon, duplicate remarks/evidence pattern, or `All good` helper was found in ERCO, Drill, or Fitness Test.

These report forms are event-level records, not repeated equipment-scope inspections. Incomplete work is intentionally accepted as a draft, while a final submission must contain the required event/test data. The inspection rule that permits submitting one completed location must not be copied to these atomic report types.

## Audit method

- Enumerated the runtime form registry and audited all registered report implementations.
- Traced setup, stage navigation, review, confirmation, record details, edit, reject, and approval paths.
- Traced location, chronology, analysis, photo URL, media ID, and photo-description values from form state through the frontend record factories and Laravel validation/persistence.
- Ran real-backend browser workflows with seeded tactical, reviewer, approver, and unrelated-user personas.
- Rendered each setup page at 320 x 568, 390 x 844, 844 x 390, 768 x 1024, 820 x 1180, 912 x 1368, 1024 x 768, and 1440 x 1000.
- Measured document overflow, clipped critical text, action layout, whitespace before actions, and touch-target dimensions.
- Visually reviewed full-page captures for every module and viewport.
- Kept the established React/CoreUI/Sass stack; the shadcn design skill was used as an audit rubric, not as a reason to introduce a second component system.

## Results against the 16 UAT concerns

| # | Inspection concern translated to report forms | ERCO | Drill | Fitness Test | Result and action |
|---|---|---|---|---|---|
| 1 | N/A answers incorrectly create an issue indicator | N/A | N/A | N/A | Report cards use workflow status, not equipment-answer status. No issue-icon derivation or N/A leak exists. |
| 2 | Uploaded/report-level photo does not fill the drawer | Applicable | Applicable | N/A | Form previews already use the available width. Shared review/detail photos could not open full-width; confirmed and fixed with the full-resolution viewer. |
| 3 | Location is forced into `Zone > Area > Location` or displays `No Zone` | Multi-location | Scalar location | Scalar location | Pass. ERCO normalizes selected locations as `Zone 1 \| Workshop`; Drill/Fitness retain their direct location label. Shared views render the stored label without inventing a zone. |
| 4 | Photo view is narrow or out of form/hierarchy order | Applicable | Applicable | N/A | Submitted photo array order was already preserved and all report photos belong to post-analysis. Full-width ordered viewing was missing and is now fixed. There is no equipment-photo/report-photo hierarchy in these event-level forms. |
| 5 | Cancel action appears above the edited input | No equivalent item remark | No equivalent item remark | No equivalent item remark | No reproduction. Report row editors use modal content followed by footer actions; there is no above-field inline cancel pattern. |
| 6 | Duplicate optional-remark and evidence patterns | No duplicate | No duplicate | N/A | Pass. Narrative analysis and photo descriptions have separate purposes; no competing optional-remark/report-evidence controls were found. |
| 7 | Save/continue helper differs and the next stage keeps the old scroll position | Staged route | Five staged routes | Setup/form stages | Save Draft + Continue is shared and consistent. Missing viewport reset was systemic across all three and is fixed. |
| 8 | Review/confirmation falsely summarizes one location | Multiple labels supported | One event location | One test location | Pass. ERCO review and confirmation use the complete joined selection; Drill/Fitness show their actual scalar location. No hard-coded count of one exists. |
| 9 | Partial equipment-scope completion cannot submit | N/A | N/A | N/A | Intentional contract. Each report is one atomic event/exercise/test. Incomplete payloads can be drafts; final records must satisfy their required fields. |
| 10 | Last scope still shows Save Draft instead of Review | Pass | Pass | Pass | Real-backend E2E reaches review and completes approval for all three modules. The final report action changes to Review/Submit according to the form. |
| 11 | Record details flatten equipment parent groups | N/A | N/A | N/A | These forms have no repeated equipment parent group. Team, details, chronology, and analysis remain separate sections in review and record details. |
| 12 | Finding-photo drawer is narrow, lacks Add Photo, or defaults description to `finding` | Applicable photo section | Applicable photo section | N/A | Capture and Upload remain available in the editable photo section. New descriptions initialize as an empty string. Read-only review/detail now opens full-width. |
| 13 | Description is lost by backend or photos lose finding hierarchy | Pass | Pass | N/A | Frontend factories trim and preserve descriptions; API/media lifecycle tests confirm persistence. Photos remain nested under post-incident/post-exercise analysis. Full-size URL use is now explicit in the viewer. |
| 14 | Added findings prevent submission | No finding collection | No finding collection | No finding collection | No reproduction. Analogous dynamic chronology/analysis rows validate and submit; Drill stress coverage includes 25 chronology entries and the maximum 10 photos. |
| 15 | `All good` appears for a single criterion | N/A | N/A | N/A | No `All good` helper exists in report modules. |
| 16 | Next-scope helper or partial submission is inconsistent | Stage navigation only | Stage navigation only | Stage navigation only | Report stage navigation is present where a form has stages and now resets scroll. Repeated-scope partial submission is not applicable to atomic reports. |

## Data and hierarchy findings

### Locations

- ERCO accepts multiple selected location labels and serializes them in selection order with ` | ` separators.
- Drill and Fitness Test accept one direct location because each record represents one exercise/test event.
- Review, confirmation, details, PDF/API payloads, and backend round trips use the same stored location; no generic zone fallback is inserted.

Edge cases covered:

- multiple ERCO labels;
- scalar Drill and Fitness labels;
- missing final required location rejected by final validation;
- incomplete location accepted in a draft;
- edit/update retains record identity and uses optimistic versioning.

### Photos and descriptions

- ERCO and Drill photos live under `postIncidentAnalysis.photos`; Fitness Test has no photo field.
- Upload order is preserved through review and record details.
- Managed media IDs, full URLs, thumbnail URLs, checksums/leases, and descriptions are serialized without creating a parallel root photo list.
- The grid uses thumbnails for efficient browsing; the viewer requests the full URL.
- The viewer is keyboard-focusable, has a named dialog, exposes explicit Previous/Next buttons, reports `n of total`, and uses a contained image so portrait and landscape evidence remain visible.
- Empty photo descriptions remain empty; there is no automatic `finding` value.
- Malformed, duplicate, cross-module, wrong-owner, over-limit, and oversized media are rejected by backend policy and transaction handling.

### Submission semantics

- Draft endpoints accept incomplete progress for ERCO, Drill, and Fitness Test.
- Final endpoints enforce the fields required by that report type.
- Submission keys prevent duplicate records on replay.
- Updates preserve record identity and enforce the current server version.
- Reviewer/approver transitions work; rejection requires remarks; an unrelated user remains unauthorized.

## Mobile and tablet UI/UX audit

### Render matrix

| Viewport | ERCO | Drill | Fitness Test |
|---|---:|---:|---:|
| 320 × 568 | Pass | Pass | Pass |
| 390 × 844 | Pass | Pass | Pass |
| 768 × 1024 | Pass | Pass | Pass |

All nine render cases completed with zero horizontal document overflow and no clipped critical report-context value.

At 320 and 390 px:

- Back, inline add/edit/reset controls, inputs, Save Draft, and Continue use the mobile touch height.
- ERCO and Fitness Test had no undersized report controls after hardening.
- Drill's only measured sub-44 elements were native 16 px checkboxes; their associated visible labels provide the activation text and must remain associated during future refactors.
- Single-action groups span the complete two-column action area instead of appearing in an unexplained right-hand half.
- Long context values wrap with `overflow-wrap:anywhere` rather than being ellipsized.
- There is no horizontal page overflow at the narrowest supported viewport.

At 768 px, report module navigation, stage links, setup inputs, summary icon buttons, and form actions are hardened for tablet use. The application header remains shared-shell UI and contains 24–37 px icon controls at this breakpoint; that is an open P2 shell-level touch-target debt outside the report form boundary.

The fixed bottom navigation appears in full-page stitched screenshots part-way through long pages because Chromium keeps fixed elements fixed while stitching. This is a capture artifact; content can scroll beneath and past the navigation. Actual-device validation is still recommended for virtual keyboards, browser safe areas, and camera return.

Screenshots and the JSON measurement attachment are produced by:

`tests/e2e/report-cross-module-mobile-audit.spec.js`

The latest local captures are under:

`.playwright-output/report-cross-module-mobile-a7c4d-very-registered-report-form/`

## Implemented changes

- Added `ReportPhotoGallery`, including full-resolution modal viewing, ordered navigation, descriptions, responsive full-width mobile cards, and visible focus treatment.
- Extended `ReportPhotoImage` with an explicit full-size source mode while retaining thumbnail fallback behavior elsewhere.
- Replaced duplicate review/detail photo grids with the shared gallery.
- Added `resetReportViewport` and invoked it for ERCO routes, Drill routes, and Fitness Test setup/form changes.
- Removed mobile viewport-stretching that produced excessive whitespace before report actions.
- Hardened mobile/tablet report touch targets, form controls, single-action justification, photo layout, and wrapping of long context values.
- Added durable Playwright coverage for all module/viewport combinations and unit/API assertions for viewport reset, gallery behavior, full-size URLs, sequence, and photo-description persistence.

## Verification evidence

- Report/component unit suite: 30 files, 109 tests passed.
- Inspection unit suite after the shared image change: 83 files, 814 tests passed.
- Backend ERCO/Drill/Fitness payload, media lifecycle, and workflow suite: 32 tests and 226 assertions passed, including the added description round-trip assertion.
- Real-backend report browser workflow: 3 tests passed, covering settings coherence, complete ERCO/Drill/Fitness review and approval, reject, and unrelated-user authorization.
- Drill responsive/stress E2E baseline: 8 tests passed across 320, 360, 390, 430, landscape, desktop, maximum photos/long chronology, and camera return.
- Cross-module mobile audit: 1 Playwright test covering 9 module/viewport cases passed.
- Targeted ESLint: passed.
- Production Vite build: passed. Existing chunk-size and mixed static/dynamic import warnings remain; neither was introduced by this audit.

## Remaining risks and follow-up

1. P2 — increase shared application-header touch targets at the 768 px tablet breakpoint. This belongs to shell/navigation ownership, not an individual report module.
2. P2 — run one physical iOS Safari and one physical Android Chrome pass for camera permission, image orientation, virtual-keyboard resize, safe-area padding, and return-from-camera state.
3. P3 — add a browser case with real uploaded ERCO and Drill media to exercise the full viewer against authenticated media URLs. Unit and backend lifecycle coverage already validate the source selection and persistence independently.
4. P3 — keep the form registry as the audit source of truth. Any new non-inspection report type must be added to the responsive matrix and explicitly classify all 16 concerns as applicable, intentional, or not applicable.

No P0 or P1 blocker remains in the audited report forms.
