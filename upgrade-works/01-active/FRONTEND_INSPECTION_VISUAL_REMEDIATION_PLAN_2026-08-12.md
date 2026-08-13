# Frontend Inspection Visual Remediation Plan

**Date:** 2026-08-12  
**Status:** Implemented locally; verified for frontend commit  
**Source audit:** [Inspection visual CRUD UI/UX audit execution and verdict](./FRONTEND_INSPECTION_VISUAL_CRUD_UIUX_AUDIT_EXECUTION_2026-08-12.md)  
**Baseline commit:** `dc4954de99b838510a094af90e48fe29e06dcfe7`  
**Scope:** Inspection module only

Execution evidence: [Inspection visual remediation execution and verdict](./FRONTEND_INSPECTION_VISUAL_REMEDIATION_EXECUTION_2026-08-12.md)

## 1. Decision to proceed

The controlled audit was successful and produced sufficient rendered evidence to plan corrective work:

- 9 controlled visual checks passed;
- 130 screenshots and 96 cross-type checkpoints were captured;
- all eight inspection types were represented;
- actual forms, state matrices, submitted details, media, responsive drawers, structured scopes, and the Fire Extinguisher catalogue were inspected;
- no captured page error or horizontal-overflow failure invalidated the baseline.

A full rerun is not required before planning. Authenticated live UAT remains blocked by stale UAT users, but that does not invalidate controlled findings. Live testing becomes a later verification gate after the server users are restored.

## 2. Objective

Resolve every verified visual gap without weakening existing inspection behavior, data integrity, permissions, accessibility, offline recovery, or shared cPanel deployment compatibility.

The completed experience should:

- never hide form content behind mobile actions;
- remain readable in supported themes;
- present one finding, its action, and its evidence as one understandable unit;
- explain exactly what will be reviewed or submitted;
- prioritize inspection results over secondary audit metadata;
- keep equipment and scope identity readable;
- use consistent scope navigation where the underlying jobs match;
- simplify Fire Extinguisher administration without hiding essential state;
- provide visual proof for the full CRUD and workflow lifecycle.

## 3. Non-negotiable behavior contracts

1. Do not alter payload shape, API endpoints, permission rules, record ownership, workflow transitions, or offline queue behavior merely to simplify the UI.
2. Do not change whether a field is required unless an existing domain rule and test explicitly require it.
3. Do not silently change partial-scope submission into full-catalogue completion. Clarify scope first; change validation only after the domain contract is proven.
4. Do not change HSE from direct submit to review, or vice versa, without locking the selected behavior in tests.
5. Keep device filenames hidden.
6. Preserve meaningful user photo captions and accessible alternative text.
7. Preserve photo viewer, download, edit, delete, review, approval, rejection, draft, conflict, and recovery behavior.
8. Retain keyboard focus rings, disclosure semantics, accessible names, and practical mobile touch targets.
9. Baseline evidence is immutable. New screenshots go to a new run ID.
10. One remediation wave must pass its exit gate before the next wave starts.

## 4. Finding-to-work mapping

| Finding       | Gap                                                 | Remediation stage |
| ------------- | --------------------------------------------------- | ----------------- |
| INS-VIS-01    | Sticky mobile tray obscures content                 | Stage 1           |
| INS-VIS-02    | Dark-mode text/surface contrast                     | Stage 2           |
| INS-VIS-03    | HSE observation split across disclosures            | Stage 3           |
| INS-VIS-04    | Review scope ambiguous beside unchecked items       | Stage 4           |
| INS-VIS-05    | HSE direct-submit continuity                        | Stage 4           |
| INS-VIS-06    | Nested evidence cards and repeated labels           | Stage 3           |
| INS-VIS-07    | Metadata precedes findings on mobile                | Stage 5           |
| INS-VIS-08    | Long equipment identities clipped                   | Stage 5           |
| INS-VIS-09    | Structured scope grammar differs                    | Stage 6           |
| INS-VIS-10    | Fire Extinguisher catalogue is too dense            | Stage 7           |
| INS-VIS-11    | Fire Extinguisher statuses/history are unclear      | Stage 7           |
| INS-VIS-12    | Report-level photos appear unrelated to no findings | Stage 3           |
| INS-VIS-13    | Excess blank space in short mobile forms            | Stage 1           |
| INS-VIS-14    | Malformed separators/ellipsis in inspection copy    | Stage 5           |
| Coverage gaps | Mutable CRUD/workflow visual states unproven        | Stage 8           |
| Live blocker  | UAT users rejected by production authentication     | Stage 9           |

## 5. Product decisions and recommended defaults

### 5.1 HSE submission

**Recommended default:** Use the same review step as the other inspection types. The HSE review should show the observation type, description, immediate action, and photos as one unit before confirmation.

Implementation may proceed only after confirming that `submissionMode: 'direct'` is not an intentional operational requirement. If direct submission must remain:

- rename the action to `Review and submit`;
- open a concise confirmation summary rather than immediately persisting;
- state that submission is final for the current workflow state;
- allow cancellation back to the populated form;
- do not introduce a visually different confirmation model when the existing review component can serve the same purpose.

### 5.2 Partial-scope review

**Recommended default:** Preserve current eligibility rules and clarify the exact submission scope.

Examples:

- `Review 1 checked item in Smoke Bay`
- `Review completed checks in Back Plates`
- supporting line: `8 items remain not checked and will not be included.`

If existing validation proves every visible catalogue item must be checked, keep `Continue to Review` disabled and focus the first required item. Do not infer this requirement from appearance alone.

### 5.3 Mobile detail hierarchy

**Recommended default:** Show a compact operational summary, then findings, evidence, workflow actions, and finally expandable audit metadata.

The first mobile viewport should answer:

- inspection type and location;
- current status and next action;
- whether issues were found;
- the first finding or `No findings recorded`.

### 5.4 Fire Extinguisher catalogue defaults

Keep visible by default:

- total assets;
- due/overdue monthly inspections;
- open issues;
- lifecycle exceptions;
- search;
- one primary status filter and location filter.

Move duplicates, barcode/locator exceptions, inspector, certification, and secondary location dimensions into **More filters**, while showing active-filter chips after selection.

## 6. Stage 0 - Baseline protection and focused confirmation

### Tasks

1. Record the source commit, current build ID, browser versions, and existing evidence run IDs.
2. Copy the 13 verified findings and coverage blockers into the new execution ledger.
3. Run a focused actual-route dark-mode capture for representative ER Aux, Fire Extinguisher, FRT, General, and SCBA forms.
4. Determine whether INS-VIS-02 is a production surface defect or is partly caused by hard-coded light backgrounds in `InspectionUxMatrixPage.jsx`.
5. Capture sticky-action overlap with:
   - the last textarea focused;
   - the software-keyboard viewport reduced where emulation permits;
   - one primary action;
   - primary plus secondary action;
   - visible sync-error feedback.
6. Record current submission semantics for HSE and partial structured scopes through existing unit and integration tests.
7. Scan inspection source and rendered text for malformed encoding such as `Â·` and `â€¦`.

### Files and evidence owners

- `src/views/inspection/visual/InspectionUxMatrixPage.jsx`
- `tests/e2e/inspection-cross-type-controlled.spec.js`
- `tests/e2e/inspection-visual-qaqc.spec.js`
- `src/views/inspection/__tests__/InspectionFormBodySections.mobile.test.jsx`
- `.qa/<NEW_RUN_ID>/inspection-visual-remediation/`

### Exit gate

- Dark-mode defects are classified as actual-route, fixture-only, or both.
- Sticky overlap is reproducible with geometry evidence.
- HSE and partial-scope behavior is documented before code changes.
- No production mutation occurred.

## 7. Stage 1 - Mobile action safety and short-form spacing

Addresses INS-VIS-01 and INS-VIS-13.

### Tasks

1. Establish one measured mobile action-tray height contract covering:
   - status line;
   - feedback/error block;
   - one button;
   - stacked multiple buttons;
   - bottom navigation;
   - `env(safe-area-inset-bottom)`.
2. Replace the current undersized inspection form spacer with a reservation matching the largest visible tray state.
3. Ensure the last focusable field can scroll completely above the tray and bottom navigation.
4. Recalculate the reservation when feedback or a secondary action appears or disappears.
5. Keep the full-width primary action and stack secondary actions beneath it.
6. Remove unnecessary minimum-height or spacer rules that create large blank regions once the correct reservation exists.
7. Verify the review action tray uses the same safety contract without changing its action order.

### Likely implementation owners

- `src/views/inspection/form/components/InspectionFormActions.js`
- `src/components/report-workflow/WorkflowStageActions.js`
- `src/components/FormActionGroup.js`
- `src/scss/components/mobile-nav/_action-row.scss`
- `src/scss/features/inspection/core/_modals-and-detail.scss`
- `src/scss/features/inspection/core/_equipment-cards.scss`
- `src/scss/features/inspection/_mobile-polish.scss`

Prefer a shared CSS custom property or measured wrapper contract over type-specific padding overrides.

### Regression tests

- Unit/component: one action, two actions, feedback expanded, feedback dismissed.
- Playwright at 320x700, 360x800, 390x844, and 430x932.
- Focus the final textarea/input and assert its bounding box is above the action tray.
- Assert the tray is above the bottom navigation and does not cover the final content block.
- Run all eight actual forms because the shared action shell affects every type.

### Acceptance criteria

- No form field, card, caption, validation message, or continuation text is hidden behind the tray.
- Primary and secondary actions remain reachable one-handed.
- No new excessive blank space remains after short forms.
- Keyboard and focus behavior remains stable.

## 8. Stage 2 - Theme and contrast hardening

Addresses INS-VIS-02.

### Tasks

1. Fix the UX matrix itself where it uses hard-coded light gradients, backgrounds, borders, and fallback colors.
2. On actual inspection routes, replace hard-coded light surfaces with CoreUI/design tokens where confirmed:
   - form previews;
   - selected-scope summaries;
   - item-card headers;
   - evidence/image fallback surfaces;
   - accordion active states;
   - sticky action tray;
   - status and metadata text.
3. Provide explicit dark-theme overrides only when semantic tokens do not produce sufficient contrast.
4. Check success, warning, danger, muted, placeholder, and disabled text, not only buttons.
5. Keep status meaning consistent without relying on color alone.

### Likely implementation owners

- `src/views/inspection/visual/InspectionUxMatrixPage.jsx`
- `src/scss/features/inspection/core/_equipment-cards.scss`
- `src/scss/features/inspection/core/_check-cards.scss`
- `src/scss/features/inspection/core/_modals-and-detail.scss`
- `src/scss/features/inspection/core/_media-controls.scss`
- `src/scss/features/inspection/core/_patterns.scss`
- `src/scss/features/inspection/_review.scss`

### Regression tests

- Extend `scripts/audit-text-contrast.mjs` inputs or the inspection visual spec to sample text/background pairs.
- Capture actual light/dark routes, not only matrix shells.
- Test normal, active, focused, disabled, success, warning, and danger states.

### Acceptance criteria

- All meaningful text meets the project contrast threshold in light and dark modes.
- Matrix evidence accurately represents the production theme.
- No pale fixture surface produces a false product finding.

## 9. Stage 3 - One finding, one action, one evidence hierarchy

Addresses INS-VIS-03, INS-VIS-06, and INS-VIS-12.

### 9.1 Consolidate HSE detail

1. Replace sibling HSE observation and follow-up items with one observation item per selected HSE outcome.
2. Put inside that disclosure:
   - observation type and Finding badge;
   - description;
   - immediate corrective action when present;
   - photo count only when useful in the collapsed header;
   - photos and meaningful captions.
3. If unsafe act and unsafe condition are both selected while action/photos are shared at report level:
   - use one `HSE Observation` disclosure containing both outcome subsections and one shared action/evidence block; or
   - otherwise state the shared ownership explicitly.
4. Never duplicate the same shared photo under both outcomes.

### 9.2 Flatten shared detail evidence

1. Refactor `DetailEvidenceBlock` presentation from a bordered/tinted card into a semantic evidence section with spacing only.
2. Retain an optional visual boundary only for independent evidence groups that would otherwise be confused.
3. Remove generic headings such as `HSE evidence` when the parent disclosure already supplies evidence context.
4. Render images directly with natural aspect ratio and no decorative image card.
5. Keep a minimal failure/loading surface because those states need a boundary.
6. Show a caption once, beneath its photo, only if it is meaningful.
7. Suppress captions that normalize to:
   - device filename;
   - observation type only;
   - generic context already visible immediately above;
   - empty/whitespace.
8. Do not suppress a deliberate user description merely because it contains the finding type among other useful words.

### 9.3 Clarify report-level evidence

1. Rename General Inspection `General photos` to `Location evidence` or `Report evidence`.
2. When there are no findings, add concise copy explaining that the photo documents the inspected area rather than an issue.
3. Keep finding-specific and report-level evidence visually separate by semantic heading, not nested cards.

### Likely implementation owners

- `src/views/inspection/types/hse/detail.js`
- `src/views/inspection/types/hse/definition.js`
- `src/views/inspection/records/InspectionDetailReadOnly.js`
- `src/views/inspection/records/InspectionDetailFindingsSection.js`
- `src/views/inspection/form/components/InspectionDisplayShared.js`
- `src/components/report-workflow/ReportViewComponents.js`
- detail adapters under `src/views/inspection/types/*/detail.js`
- `src/scss/features/inspection/core/_media-controls.scss`
- `src/scss/features/inspection/core/_modals-and-detail.scss`
- `src/scss/features/inspection/core/_patterns.scss`

### Regression tests

- HSE unsafe act only, unsafe condition only, and both selected.
- No action/no photo, action only, one photo, multiple photos, broken photo.
- Empty caption, meaningful caption, redundant type caption, and device filename.
- ER Aux/FRT dual evidence groups.
- Hydraulic/SCBA per-field plus general evidence.
- General Inspection with no findings and report-level photos.
- Viewer open/close, alt name, keyboard focus return, and no filename leakage.

### Acceptance criteria

- One HSE event can be understood by opening one disclosure.
- No image is wrapped in decorative card-on-card chrome.
- Each visible label and caption adds distinct information.
- Evidence remains attached to the correct finding or report context.

## 10. Stage 4 - Review and submission clarity

Addresses INS-VIS-04 and INS-VIS-05.

### 10.1 Scope-aware review action

1. Add a presentation-only review-scope summary derived from existing readiness/progress data.
2. Show the number and named scope being reviewed where incomplete catalogue rows remain visible.
3. State what excluded unchecked rows mean.
4. Keep the existing enabled/disabled decision until the domain validation contract says otherwise.
5. When progression is disabled, show one actionable reason and focus the first required item.
6. Ensure action labels remain short enough at 320px; place detailed scope in supporting text if necessary.

### 10.2 HSE review behavior

1. Confirm the product decision from Section 5.1.
2. Preferred path: change HSE to the common review presentation while retaining its existing payload and backend submission path.
3. Verify Back to edit preserves selection, description, action, photos, location, and scroll/focus context.
4. If direct submit remains, add a common confirmation summary and explicit consequence rather than a bare immediate submit action.

### Likely implementation owners

- `src/views/inspection/form/components/InspectionFormActions.js`
- `src/views/inspection/form/components/InspectionFormBodySections.js`
- `src/views/inspection/types/continuationHelpers.js`
- per-type progress selectors/helpers
- `src/views/inspection/types/hse/definition.js`
- `src/views/inspection/app/inspectionModuleUiFlow.js`
- `src/views/inspection/app/InspectionModuleSections.js`
- `src/views/inspection/records/InspectionReviewSection.js`

### Regression tests

- Each structured type with zero, one, some, and all visible items checked.
- Current scope complete while other scopes remain.
- HSE review/confirmation, Back to edit, and final submit.
- Missing required HSE description/photo.
- Draft sync failed while review is otherwise eligible.
- 320px action label and supporting text wrapping.

### Acceptance criteria

- Users can state exactly what the review action includes.
- Existing valid partial submissions remain valid unless a proven rule says otherwise.
- HSE no longer surprises users with a materially different irreversible action.

## 11. Stage 5 - Findings-first detail and readable identities

Addresses INS-VIS-07, INS-VIS-08, and INS-VIS-14.

### 11.1 Detail hierarchy

1. Replace the duplicated detail hero and full metadata-first layout with a compact operational summary.
2. Show status, type, location, issue count, and next action before findings.
3. Move `Inspection Findings` ahead of full Report Metadata on mobile and in meaningful DOM order.
4. Place complete audit metadata and workflow actors in a collapsed `Report details` disclosure.
5. Suppress empty optional metadata rows rather than showing `--` when the absence is not operationally useful.
6. Keep the report identifier copyable and available without repeating it.
7. Preserve desktop action placement and mobile drawer boundaries.

### 11.2 Identity wrapping

1. Allow two-line wrapping for primary equipment/asset names and locators.
2. Prefer stable short IDs before verbose generated labels.
3. Place subordinate serial, type, barcode, and location metadata on a separate line.
4. Do not use horizontal scrolling or title-only tooltips as the sole access to identity.
5. Let search placeholder text truncate harmlessly, but never truncate actual selected/result identity beyond recognition.

### 11.3 Encoding cleanup

1. Replace malformed visible separators and ellipses with UTF-8 source text or simple ASCII where safer.
2. Add an inspection-source scan preventing common mojibake sequences.
3. Verify rendered history headings, summaries, and truncation labels.

### Likely implementation owners

- `src/views/inspection/records/InspectionDetailSection.js`
- `src/views/inspection/records/InspectionDetailFindingsSection.js`
- `src/views/inspection/records/AllExtinguishersSection.js`
- inspection equipment card components
- `src/scss/features/inspection/core/_equipment-cards.scss`
- `src/scss/features/inspection/core/_modals-and-detail.scss`
- `src/scss/features/inspection/_mobile-polish.scss`

### Regression tests

- All eight detail types at 320, 390, 768, and 1440 widths.
- Sparse metadata, long metadata, workflow history, and next-action role.
- Long equipment, ID, location, barcode, and translated-like strings.
- Assert findings precede audit metadata in DOM/read order.
- Assert no malformed encoding is rendered or present in inspection source.

### Acceptance criteria

- The first mobile viewport contains the result or first finding.
- Report ID and timestamps are not redundantly presented.
- Long identities remain distinguishable without horizontal overflow.
- Inspection text contains no mojibake.

## 12. Stage 6 - Structured scope consistency

Addresses INS-VIS-09 and the FRT next-action ambiguity.

### Tasks

1. Use `InspectionScopeNavigator` as the presentation contract for FRT compartments, High Angle kits/compartments, and SCBA groups/locations.
2. Standardize:
   - selector position;
   - selected-scope summary;
   - checked/total and issue indicators;
   - Next designation;
   - edit/reset action location;
   - empty and no-selection messages;
   - desktop and mobile behavior.
3. Put the no-selection prompt and next action before a long list of scope cards.
4. Prioritize current, next incomplete, and issue scopes; allow completed scopes to collapse or move below them.
5. Give FRT an explicit aggregate review path when completion rules permit it; otherwise state why another compartment must be selected.
6. Preserve selected scope, entered values, and focus when navigating between scopes.

### Likely implementation owners

- `src/views/inspection/form/components/InspectionScopeNavigator.js`
- `src/views/inspection/form/components/InspectionLocationOptionPicker.js`
- `src/views/inspection/form/components/InspectionFormBodySections.js`
- `src/views/inspection/form/components/HighAngleInspectionChecks.js`
- `src/views/inspection/form/components/ScbaInspectionChecks.js`
- FRT helpers under `src/views/inspection/types/frt-daily/`
- `src/scss/features/inspection/core/_selectors.scss`
- `src/scss/features/inspection/core/_patterns.scss`

### Regression tests

- No scope, one scope, many scopes, long scope names.
- Current complete, current with issue, next incomplete, all complete.
- Mobile selector, desktop list, keyboard selection, focus transfer.
- FRT, High Angle, and SCBA side-by-side screenshots.

### Acceptance criteria

- Equivalent scope states use the same visual grammar.
- The next action is visible before users scan a long completed list.
- Type-specific language remains meaningful without changing the shared interaction.

## 13. Stage 7 - Fire Extinguisher catalogue and asset-detail simplification

Addresses INS-VIS-10 and INS-VIS-11.

### 13.1 Catalogue

1. Replace the large summary-pill field with a compact KPI row using non-interactive styling unless a metric intentionally filters.
2. Keep search and core filters visible; move secondary filters into the established mobile/desktop filter disclosure.
3. Show active filters as removable chips and one clear `Clear filters` action.
4. Prioritize responsive table columns:
   - locator/identity;
   - location;
   - lifecycle;
   - monthly compliance;
   - open issues;
   - actions.
5. Move secondary criteria, remarks, report count, and inspector/date to the detail view or optional column set.
6. Ensure summary metrics and filters cannot be mistaken for each other.

### 13.2 Asset detail

1. Group status into clearly named dimensions:
   - `Asset lifecycle`: Active, Out of service, Retired;
   - `Monthly inspection`: Due, Overdue, Completed, Not scheduled;
   - `Latest result`: Good, Issues found, Not inspected.
2. Add concise explanatory copy for apparently conflicting states.
3. Keep one compact Latest Inspection summary.
4. Do not immediately repeat that latest record as the first history card; label or collapse it if retained for chronological completeness.
5. Preserve history, issue, photo, lifecycle, export, and management actions.
6. Verify page, side-panel, modal, and bottom-drawer transitions preserve asset identity and return context.

### Likely implementation owners

- `src/views/inspection/records/AllExtinguishersSection.js`
- `src/views/inspection/records/FireExtinguisherDetailPage.js`
- Fire Extinguisher issue/lifecycle components under `src/views/inspection/records/`
- `src/scss/features/inspection/_review.scss`
- `src/scss/features/inspection/core/_shared.scss`
- shared table/filter components only when their existing consumers remain compatible.

### Regression tests

- Empty, one-row, and dense catalogue.
- 320, 390, 768, 1024, and 1440 widths.
- No filters, one active filter, multiple filters, and no results.
- Active/out-of-service/retired and due/overdue/completed combinations.
- No history, one history record, long history, issue evidence, and missing images.
- Role-hidden actions and full manager actions.

### Acceptance criteria

- Search and primary filters are visually dominant over secondary analytics.
- Tablet and desktop do not require users to decode a 20-column table.
- Lifecycle, compliance, and inspection result cannot be mistaken for the same status.
- Latest inspection information is not needlessly duplicated.

## 14. Stage 8 - Controlled full CRUD and workflow visual proof

Closes the audit coverage gaps rather than changing production behavior.

### Harness tasks

1. Create isolated controlled personas for inspector, reviewer, approver, administrator, issue manager, verifier, and read-only user.
2. Add deterministic write-capable stubs or a disposable controlled database for:
   - draft create/update/delete;
   - submission;
   - edit/update and stale conflict;
   - review, approve, reject, correction, and resubmission;
   - offline queue, retry, and conflict;
   - report delete and failure recovery;
   - Fire Extinguisher catalogue create/batch/edit/lifecycle;
   - issue assign/start/resolve/verify/reopen/cancel.
3. Give every mutation a run-owned ID and cleanup ledger entry.
4. Capture before, dialog/drawer, busy, success, failure, and returned-context states.
5. Keep this harness loopback-only and reject any non-controlled origin.

### Required visual lifecycle

```text
Create -> save draft -> leave -> resume -> validate -> review -> submit
-> read detail -> edit/update -> review -> approve/reject
-> rejected correction/resubmit -> download -> eligible delete
```

For extinguisher administration:

```text
Create one/batch -> view -> edit -> out of service -> return -> retire -> restore
```

For managed issues:

```text
Assign -> start -> resolve with evidence -> independent verify -> close -> reopen/cancel
```

### Acceptance criteria

- Every mutable state has rendered evidence, not only API assertions.
- Permissions and next actions match each persona.
- Failure preserves entered content and offers recovery.
- Cleanup ledger reconciles every created artifact.

## 15. Stage 9 - Live read-only reconciliation and release traceability

### Prerequisite

Restore the existing UAT users through the backend seeder without changing `.env`:

```bash
cd ~/vmecc-backend
composer dump-autoload --optimize --no-dev
php artisan optimize:clear
php artisan db:seed --class=LiveUatUsersSeeder --force
php artisan config:cache
```

The user performs these server commands manually. The frontend remediation must not attempt to mutate production users.

### Tasks

1. Rebuild after the final source commit so `build/version.json` identifies that commit rather than its parent.
2. Commit and deploy the matching generated build.
3. Confirm `/version.json` matches the released commit/build.
4. Run the guarded authenticated live inspection suite with TRT and System Administrator personas.
5. Verify all eight entries, existing submitted details, HSE hierarchy, responsive states, filters, overlays, and accessibility.
6. Confirm mutation ledgers remain empty.
7. Mark mutation-only stages controlled-verified, not live-verified.

### Acceptance criteria

- Authentication succeeds for required UAT personas.
- Live read-only inspection checks pass on mobile and desktop.
- No production mutation occurs.
- Build ID, commit, deployment record, and screenshots are traceable to one release.

## 16. Test and quality gates per wave

Run proportionately after each wave:

1. `git diff --check`
2. Targeted inspection unit/component tests for changed surfaces.
3. Targeted controlled Playwright screenshots and geometry assertions.
4. Cross-type controlled Playwright after any shared inspection change.
5. Media suite after evidence/image changes.
6. Accessibility/responsive suite after layout, overlay, or action changes.
7. `npm run lint`
8. Full Vitest suite before release consolidation.
9. Production build and `.htaccess` checks before commit/push.
10. Live read-only UAT only after deployment and credential restoration.

No wave passes merely because tests are green. Its before/after screenshots must also demonstrate the intended simplification.

## 17. Mishap prevention and rollback

- Keep each wave in a separate commit or clearly separable commit group.
- Do not combine behavior changes with unrelated styling cleanup.
- Add tests before changing HSE submission or partial-scope eligibility.
- Preserve old adapters until every type using a shared evidence/scope change passes.
- Do not delete historical photo descriptions from stored records; suppress only redundant presentation.
- Do not migrate backend data for visual hierarchy changes.
- Revert by wave, not by resetting the repository.
- If a shared change breaks one inspection type, restore the shared baseline and implement an explicit type adapter rather than adding scattered CSS overrides.
- Record any intentional exception in the execution memo.

## 18. Deliverables

Each wave must produce:

- implementation changes;
- targeted unit tests;
- Playwright regression coverage;
- before/after mobile and desktop evidence;
- affected-type matrix;
- verification results;
- execution note with deviations and remaining risks.

The completed programme must produce:

- all 14 finding outcomes;
- controlled full CRUD/workflow visual ledger;
- live-versus-controlled verification ledger;
- updated contact sheets;
- reconciled cleanup ledger;
- final release-readiness verdict.

## 19. Definition of done

The remediation is complete only when:

- all finding IDs are fixed, deliberately retained with justification, or disproved by actual-route evidence;
- no mobile task content is obscured by fixed/sticky actions;
- supported dark-mode inspection routes are readable;
- HSE finding, action, and evidence read as one observation;
- evidence images have no unnecessary nested card treatment or duplicate visible labels;
- review/submit scope is explicit;
- mobile details surface findings before secondary metadata;
- long identities wrap without overflow;
- FRT, High Angle, and SCBA use a consistent scope-navigation grammar;
- Fire Extinguisher catalogue and asset status hierarchy are simplified;
- inspection source and rendered text contain no malformed encoding;
- all eight types pass the controlled regression matrix;
- the full controlled CRUD/workflow lifecycle has visual evidence;
- live authenticated read-only reconciliation passes without production mutation;
- the production build identifies the released commit;
- lint, full tests, build, and deployment checks pass.

## 20. Planned execution order

1. Stage 0 - focused confirmation and baseline lock.
2. Stage 1 - mobile action safety and spacing.
3. Stage 2 - theme and contrast.
4. Stage 3 - HSE and shared evidence hierarchy.
5. Stage 4 - review and submission clarity.
6. Stage 5 - detail hierarchy, identity wrapping, and encoding.
7. Stage 6 - structured scope consistency.
8. Stage 7 - Fire Extinguisher catalogue and asset detail.
9. Stage 8 - full controlled CRUD/workflow visual proof.
10. Stage 9 - rebuild, deploy, and guarded live reconciliation.

This order fixes safety and comprehension first, then simplifies shared presentation, then closes administrative and lifecycle proof gaps.
