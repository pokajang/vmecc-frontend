# Frontend Cross-Module Shared Component Audit

Date: 2026-08-06  
Status: Audit completed; approved corrective actions executed in `FRONTEND_CROSS_MODULE_SHARED_COMPONENT_CORRECTIVE_EXECUTION_2026-08-06.md`  
Scope: Inspection (all registered types), ERCO, Fitness Test, and Drill

## Executive verdict

The frontend is no longer suffering from a broad absence of shared components. The current `report-workflow` system already owns most of the correct cross-module UI contracts: workflow actions, summaries, responsive choices, roster grouping, mobile setup summaries and drawers, recent-record sections, repeatable text lists, photo sections, feedback, and record actions.

The next upgrade should therefore be a narrow consolidation pass, not another large genericization stage.

Three items are worth consolidating:

1. A canonical report responsive dialog shell for the repeated desktop-modal/mobile-drawer contract.
2. One report mobile breakpoint hook/query, replacing ERCO's duplicate implementation.
3. A shared edit-state banner that supports both a notice-only mode and an optional original/draft source switcher.

The recent Inspection managed-toolbar work is sound. Its contract preserves the old search labels, clear behavior, result counts, loading status, and read-only visibility while removing six copies of substantially identical markup. No source-level functional regression was identified in that extraction.

Whole forms, setup steps, personnel steps, chronology editors, analysis steps, mobile home screens, and context-summary data builders should **not** be merged. They share primitives, but their business behavior and user decisions differ enough that a higher-level shared component would move domain logic into the design system and increase regression risk.

## Audit method

This review applied two complementary lenses:

- Design-system lens: repeated visual structure, component ownership, responsive rules, semantic structure, accessibility, token/convention reuse, and whether an extraction has a stable prop contract.
- Journey lens: first-time entry, returning draft/edit entry, setup and selection, validation recovery, progression, review, mobile behavior, keyboard/focus behavior, loading/empty states, and irreversible actions.

The project uses CoreUI and its existing VMECC component conventions. Introducing shadcn/Radix/Tailwind as a competing system is not recommended. The appropriate interpretation of the shadcn design review is to improve the existing component system using the same boundary and accessibility discipline.

## Scope inventory

### Inspection types reviewed

The registered Inspection type system contains:

1. ER Aux Equipment Inspection
2. Fire Extinguisher Inspection
3. FRT / Fire Truck Daily Readiness Inspection, including its legacy alias
4. High Angle Equipment Inspection
5. Hydraulic Equipment Inspection
6. SCBA Inspection
7. HSE Inspection
8. General Inspection

### Report journeys reviewed

- ERCO: setup, responding team, details, chronology, post-incident analysis, editing, draft restore, AI/review dialogs, mobile home, and record workflow.
- Drill: setup, personnel, details, chronology, analysis, editing, draft restore, mobile home, and review hand-off.
- Fitness Test: period setup, personnel, results, sign-off, participant editing, report editing, mobile home, and review hand-off.

## Current shared system that should be retained

The following boundaries are already correct and should remain the foundation:

| Shared contract                                           | Current use/value                                                          | Verdict                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| `WorkflowStageActions`                                    | Inspection, ERCO, Drill, and Fitness stage navigation/save/status behavior | Retain; do not create another action-bar abstraction  |
| `WorkflowSummaryList`                                     | Inspection, ERCO, Drill, and Fitness context summaries                     | Retain presentation sharing; keep item builders local |
| `WorkflowRosterGroup`                                     | Drill and Fitness grouped personnel rosters                                | Retain; keep member-row semantics local               |
| `ResponsiveChoiceSelector`                                | ERCO, Drill, Fitness, and Inspection responsive choice UI                  | Retain as the canonical choice primitive              |
| `MobileSetupSummaryList` and selector drawer primitives   | Setup recap/edit behavior across the workflows                             | Retain                                                |
| Mobile workflow/type/recent-record sections               | All four mobile home experiences                                           | Retain section-level composition                      |
| `RepeatableTextList`                                      | Repeatable analysis text where the interaction is genuinely equivalent     | Retain                                                |
| `ReportPhotoSection`                                      | ERCO, Drill, Fitness, and Inspection extinguisher management evidence      | Retain                                                |
| `WorkflowInlineFeedback`                                  | Shared blocking/error/retry communication                                  | Retain and adopt only where behavior matches          |
| `RecordDetailActions`, `RowActions`, `ActionConfirmModal` | Record-level actions and confirmation                                      | Retain                                                |
| `TypeManagerModal` and `CreateActionButton`               | Managed type/location/category choices                                     | Retain                                                |

The architecture is strongest where the shared component owns layout, semantics, and interaction mechanics while the feature owns validation, persistence, permissions, terminology, and domain state.

## Audit of the recent Inspection toolbar extraction

### What changed

`ManagedCheckToolbar` now provides a single contract for:

- Search input and accessible label
- Optional disabled state while initial data loads
- Optional clear-search action and its accessible label
- Optional next-incomplete, expand-all, and collapse-all actions
- Search result count
- Optional idle/loading status
- Read-only suppression

It is used by:

- ER Aux
- Fire Extinguisher
- FRT Daily
- High Angle
- Hydraulic
- SCBA

### Preservation verdict

The refactor preserves each former toolbar's user-visible behavior through props:

- Domain-specific placeholder text is unchanged.
- Domain-specific `aria-label` text is unchanged.
- Clear remains conditional on a non-empty search.
- Counts still show only while searching.
- Fire Extinguisher retains its initial disabled state and `Refreshing units...` status.
- Toolbars remain absent in read-only modes according to their existing callers.
- Search/filter state and filtering algorithms remain feature-owned; only markup moved.

### Why HSE and General are not omissions

HSE and General do not currently expose the same managed catalog/list journey. Adding the toolbar merely to achieve visual uniformity would introduce controls without an equivalent user task. They should adopt it only if they later gain the same searchable row contract.

### Residual risk

Risk is low. The main regression surface is prop wiring rather than changed domain logic. The new unit tests cover input changes, clear actions, counts, labels, disabled state, idle status, and the affected inspection implementations.

## Ranked consolidation candidates

### Candidate 1 — Canonical responsive report dialog

Priority: High  
Confidence: High  
Primary user benefit: consistent mobile/desktop editing, predictable close behavior, and consistent action placement

Repeated implementations:

- ERCO `ErcoResponsiveActionModal`
- ERCO chronology row modal
- ERCO summary generation modal
- ERCO AI review modal
- Fitness participant modal

These all implement the same structural contract:

- CoreUI centered modal on desktop
- `MobileBottomDrawer` at the report mobile breakpoint
- Shared title/body/footer arrangement
- Cancel/save or equivalent actions
- Scrollable content where required
- Close handling, sometimes disabled during work

Recommended contract:

```text
ResponsiveReportDialog
  visible
  title
  children/body
  footer/actions
  onClose
  closeDisabled?
  initialFocusRef? or onOpened?
  scrollable?
  desktopFullscreen?
  bodyClassName?
  footerClassName?
  ariaLabel?
```

Implementation note: either add this to `src/components/report-workflow`, or carefully generalize the existing global `ResponsiveWorkflowActionDialog`. Do not silently reuse its current `575.98px` breakpoint; report workflows consistently use `767.98px`. Preserve the Fitness and chronology 120 ms focus behavior and the AI dialog's close-disabled behavior.

Do not include domain fields, validation, titles, button labels, or save logic in the shared shell.

### Candidate 2 — One report mobile breakpoint hook and query

Priority: High  
Confidence: Very high  
Primary benefit: eliminates breakpoint drift and duplicated browser-listener code

ERCO's local `useIsMobile.js` and the shared `useReportIsMobile.js` both use `767.98px` and implement essentially the same `matchMedia`/resize contract. ERCO should import:

- `useReportIsMobile`
- `REPORT_MOBILE_QUERY`

The ERCO aliases can be temporarily re-exported for a small migration if that makes review safer, then removed after all consumers and tests migrate.

This is a consolidation of infrastructure, not a visual redesign. It should not change which viewport renders a drawer.

### Candidate 3 — Shared report edit-state banner

Priority: High-medium  
Confidence: High for presentation; medium for migration due form hydration state

ERCO and Drill repeat the same user task and UI:

- Identify the record currently being edited.
- Explain that the submitted/original record is unchanged until update confirmation.
- Let the user load original values.
- Let the user load a saved edit draft when available.
- Show the active source through button treatment.

Fitness uses the same edit notice but does not currently expose source switching.

Recommended presentation-only contract:

```text
WorkflowEditStateBanner
  displayId
  message or updateLabel
  sourceMode?                 // original | draft
  hasDraftSource?
  onLoadOriginal?
  onLoadDraft?
  originalLabel?
  draftLabel?
```

When source callbacks are absent, render a notice-only banner for Fitness. All seed loading, form hydration, confirmation resets, chronology preservation, and dirty-state behavior must remain in ERCO/Drill.

### Candidate 4 — Thin stage-action wrapper cleanup

Priority: Low  
Confidence: Medium  
Primary benefit: less indirection, not a meaningful UX gain

ERCO, Drill, and Fitness have small wrappers around `WorkflowStageActions`. The correct shared component already exists. A later cleanup may standardize direct adoption or retain named wrappers as feature adapters. Do **not** create a new component above `WorkflowStageActions`.

This should be done only when touching those forms for another reason; it is not worth an isolated refactor stage.

## Similar-looking areas that should not be merged

### Whole workflow forms or step controllers

Inspection is a catalog/offline/conflict-capable inspection orchestrator. ERCO has staged confirmation and a rich incident chronology. Drill has exercise-specific setup and analysis. Fitness has participant age/shift/result/sign-off rules. A shared form controller would become a configuration language containing feature business logic.

Verdict: keep local.

### Setup steps

ERCO and Drill both display managed choices, summaries, and add/manage actions, but they differ in:

- single versus multiple selection
- progression/collapse rules
- environment versus weather semantics
- type/category/location manager behavior
- required versus optional fields
- mobile drawer progression

They already share the correct leaf primitives. A generic setup-step component would have a large callback/config surface and obscure the actual user journey.

Verdict: keep setup composition local. Do not extract the repeated heading-plus-add-button row by itself; it is too small to justify another abstraction unless its behavior grows.

### Personnel steps

ERCO selects responding teams and hydrates team/shift data. Drill assigns exercise roles and supports manual/external people. Fitness applies participant and test-result semantics. `WorkflowRosterGroup` and `ResponsiveChoiceSelector` are the safe shared layers.

Verdict: keep personnel steps and rows local.

### Chronology

Drill uses a simpler chronology list. ERCO includes presets, pre-mobilisation/demobilisation behavior, undo/reset/start-time behavior, richer row editing, and save-and-add-next flows.

Verdict: retain the specialized ERCO chronology and the simpler Drill chronology primitive. Do not force either into the other's model.

### Post-analysis

Drill uses repeatable free-text lists. ERCO uses managed selectable analysis items, cards/pills, accordions, and type management. They correctly share photo handling and only the text/list primitives that genuinely match.

Verdict: keep the whole steps local.

### Mobile home screens

All four already compose shared home sections. Their outer wrappers are small and encode real differences: Inspection queue/sync state, ERCO/Drill managed types, and Fitness's simpler entry model.

Verdict: do not create a generic `WorkflowMobileHome` orchestrator.

### Context summary builders

All modules correctly use `WorkflowSummaryList`, but the fields, display conditions, and terminology are domain-owned.

Verdict: share rendering, not the item builders.

### Fitness stage progress header

Fitness currently has the only equivalent four-step progress header in this scope. Similarity to ordinary headings is not repetition.

Verdict: retain locally until another workflow adopts the same navigation semantics.

### Validation summaries

ERCO has a linked validation summary that can focus invalid fields. Inspection reports readiness and row-level validation through different interaction patterns. Drill and Fitness mainly use inline alerts/feedback.

Verdict: do not extract a generic validation summary until a second module implements the same linked focus/recovery behavior. A future UX improvement may deliberately add that behavior, but that is a product change, not a code deduplication task.

## UI/UX findings

### Medium — Responsive dialog behavior is fragmented

Affected users: mobile users, keyboard users, and users closing long-running AI/generation actions.

Evidence: five report dialogs independently choose modal versus drawer and independently implement footer wrapping, scrolling, focus timing, and close behavior.

Impact: future fixes can land in one dialog but not the others; breakpoint or close-lock drift can create inconsistent recovery behavior.

Remediation: implement Candidate 1 with characterization tests before migrating consumers one at a time.

### Medium — Duplicate mobile query can drift silently

Affected users: tablet and narrow-screen users.

Evidence: ERCO and shared report hooks currently match, but are separate implementations and exported query constants.

Impact: a future breakpoint change could make ERCO disagree with Drill/Fitness and global action/manager dialogs.

Remediation: implement Candidate 2 and assert both sides of the `767.98px` boundary.

### Low-medium — Edit-mode guidance is inconsistent

Affected users: returning users editing a submitted report or resuming an edit draft.

Evidence: ERCO and Drill provide original/draft switching with slightly different copy; Fitness shows only a notice.

Impact: the meaning of “editing,” when the original changes, and whether a saved draft exists can feel module-specific even though the mental model is shared.

Remediation: implement Candidate 3 while preserving each feature's actual source-switch capability.

### Low — Stage progression is visually less consistent in Fitness

Affected users: users moving between report modules.

Evidence: Fitness has a dedicated progress header; ERCO and Drill rely more heavily on active section content and action bars.

Impact: mild learnability inconsistency, not a task blocker.

Remediation: no component extraction now. First decide whether all staged reports should expose a progress model; only then design a shared progress component.

## Strengths observed

- Mobile home composition is already consistent without erasing module identity.
- Shared action bars preserve stage-specific labels and readiness behavior.
- Summary semantics are centralized while data remains feature-owned.
- Responsive choice controls are reused across genuinely equivalent selection tasks.
- Photo handling is shared across report modules and Inspection where the evidence workflow matches.
- Personnel grouping is shared without forcing ERCO, Drill, and Fitness into one data model.
- The recent Inspection toolbar extraction is narrow, prop-driven, and supported by characterization tests.
- The codebase generally avoids the most dangerous form of reuse: moving persistence and validation into visual components.

## Recommended implementation order

### Day 1 — Characterize and unify mobile infrastructure

1. Add boundary tests at `767.98px` for the shared report mobile hook/query.
2. Migrate ERCO consumers from `useIsMobile`/`ERCO_MOBILE_QUERY`.
3. Keep a temporary compatibility re-export only if needed for a smaller diff.
4. Run ERCO, Drill, and Fitness component suites.

### Day 2 — Responsive report dialog shell

1. Characterize existing desktop/modal and mobile/drawer rendering.
2. Implement the shared shell without domain content.
3. Migrate `ErcoResponsiveActionModal` consumers first.
4. Migrate chronology, summary generation, AI review, and Fitness participant dialogs one at a time.
5. Verify focus, close-disabled state, footer wrapping, Escape/close behavior, scroll, and both breakpoint sides after every migration.

### Day 3 — Edit-state banner

1. Characterize ERCO and Drill original/draft source behavior.
2. Implement the presentation-only banner.
3. Migrate Drill, then ERCO, then Fitness notice-only mode.
4. Verify no callback or form seed logic moved into the component.
5. Verify load-original, unavailable draft, available draft, dirty-state, update copy, and keyboard focus.

### Day 4 — Regression and documentation closeout

1. Run the requested module Vitest partition.
2. Run controlled Playwright Inspection and Drill journeys.
3. Run controlled ERCO/Fitness browser journeys when equivalent stub-only specs are available.
4. Run lint, build, and `git diff --check`.
5. Update the shared-component catalogue and execution notes.

## Required safety gates

Every extraction must meet all of these conditions:

- Existing user-visible labels and accessible names remain stable unless a deliberate UX change is separately approved.
- Mobile breakpoint remains `767.98px` for report workflow dialogs.
- No persistence, validation, permissions, seed hydration, or domain transformation moves into a shared presentation component.
- Focus behavior is explicitly tested for dialogs that currently auto-focus.
- Busy/close-disabled behavior is explicitly tested for generation/AI dialogs.
- Original/draft switching remains feature-owned and is tested before and after migration.
- Each consumer is migrated and verified separately; do not perform a one-shot rewrite of all forms.
- The full requested module unit partition and controlled browser suites pass before the stage is closed.

## Verification evidence for this audit

- `git diff --check`: passed.
- Requested module unit partition: 121 test files passed, 1,008 tests passed.
- Scoped ESLint across Inspection, ERCO, Fitness Test, Drill, and `report-workflow`: passed with no output.
- Controlled Playwright safety, Drill, and Inspection run: 15 tests passed in 33.6 seconds.
  - 2 controlled-API safety contract tests
  - 12 Drill journeys covering mobile widths, landscape, desktop, long chronology/max photos, file-picker return, restored drafts, and managed categories
  - 1 Inspection visual matrix journey covering its representative type/state/viewport cases, overflow, labels, duplicate IDs, and typography
- The existing ERCO/Drill/Fitness end-to-end workflow smoke was not run because it creates real report records through the local API. This audit intentionally used stub-only browser paths and did not mutate application data.

### Test-infrastructure mishap found and fixed

The new controlled API guard originally registered `**/api/**` for every browser resource. That pattern also matched Vite JavaScript modules under `/src/services/api/`, blocked them as if they were unexpected API traffic, and produced a blank page before the application could render.

The guard now applies its fail-closed origin check only to browser API transports (`fetch` and XHR). Scripts, stylesheets, and images fall through normally. A regression test asserts this distinction. After the fix, the full controlled 15-test run passed.

## Final decision

Proceed with the three narrow candidates in the recommended order. Do not start another broad “make all forms shared” pass. The codebase has reached the point where quality will improve more from enforcing a few stable interaction contracts than from maximizing component count or reducing every repeated JSX fragment.
