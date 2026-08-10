# Cross-Module Shared Component Corrective Execution

Date: 2026-08-06  
Scope: Inspection, ERCO, Drill, Fitness Test, and their shared report workflow surfaces  
Source audit: `FRONTEND_CROSS_MODULE_SHARED_COMPONENT_AUDIT_2026-08-06.md`  
Status: Completed locally

## Outcome

The three approved corrective actions were implemented without moving validation, persistence,
permissions, form hydration, or domain transformations into shared components.

The implementation now has:

1. one authoritative report mobile breakpoint implementation;
2. one canonical responsive report dialog shell for the equivalent report modal/drawer journeys;
3. one presentation-only edit-state banner for ERCO, Drill, and Fitness Test;
4. retained feature ownership for all data, callbacks, and workflow rules.

## Corrective action 1 — Report mobile contract

- Added the authoritative hook and constants at `src/hooks/useReportIsMobile.js`.
- Converted `src/views/report/hooks/useReportIsMobile.js` into a compatibility re-export.
- Migrated every ERCO consumer from its local hook/query names to the shared report contract.
- Deleted ERCO's duplicate `erco-form-components/useIsMobile.js` implementation.

The breakpoint remains `767.98px`. `matchMedia`, resize listening, legacy listener fallback, and
inner-width fallback remain unchanged. Shared components do not import from `src/views`.

## Corrective action 2 — Responsive report dialog

Added `src/components/report-workflow/ResponsiveReportDialog.js`, which owns modal/drawer
recomposition, the report breakpoint, title/body/footer placement, scrolling, close locking, mobile
class hooks, and accessible naming.

Migrated consumers:

- ERCO chronology initialization
- ERCO PreMob mode choice
- ERCO chronology row editor
- ERCO summary generation
- ERCO AI review
- Fitness participant editor
- Shared report review/approve/reject workflow action modal

The old feature-local `ErcoResponsiveActionModal.js` was deleted after its consumers moved.

Preserved behavior includes ERCO fullscreen/scroll classes, chronology drawer body classes, button
types/colors/order, summary and AI close locks, AI accessible naming, chronology and Fitness input
focus, viewport-change refocus, and the workflow confirmation drawer class.

Intentionally retained responsive surfaces:

- Fitness result-row editing remains a mobile-only drawer.
- Report detail actions remain mobile-only drawers.
- Generic chronology retains its desktop inline editor and mobile row drawer because that is a
  different interaction model.

## Corrective action 3 — Edit-state banner

Added `src/components/report-workflow/WorkflowEditStateBanner.js`, which owns alert presentation,
record display ID emphasis, optional original/draft buttons, active-source hierarchy, disabled draft
state, and responsive action wrapping.

Migrated consumers:

- Drill: existing original/draft `loadSeed` callbacks.
- ERCO: existing chronology-preserving hydration and confirmation resets.
- Fitness Test: notice-only mode.

The component does not receive or mutate report seeds. Source refs, hydration, chronology
preservation, confirmation state, dirty state, draft availability, and persistence remain local.

## Findings caught during execution

### Footer alignment mismatch

The first focused run found that the new drawer footer omitted ERCO's existing
`align-items-center` class. Two characterization tests failed. The class was restored, after which
the focused suite passed.

### Shared-layer import boundary

The first implementation would have made a shared component import the hook from `src/views`.
Because report-workflow explicitly forbids that dependency direction, the authoritative hook moved
to `src/hooks`; the old view path now only re-exports it.

### Additional canonical adopter

The post-migration search found `ReportWorkflowActionModal`, used after ERCO, Drill, and Fitness
submissions. It matched the same contract and was migrated while retaining workflow validation.

## Validation evidence

| Gate                                                  | Result                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| Initial focused characterization                      | 7 files / 53 tests passed after restoring footer alignment |
| Post-boundary focused suite                           | 5 files / 26 tests passed                                  |
| Requested modules plus report-workflow unit partition | 139 files / 1,049 tests passed                             |
| Scoped ESLint                                         | Passed with no findings                                    |
| Controlled Playwright                                 | 15/15 passed in 33.5 seconds                               |
| Production build                                      | Passed in 11.52 seconds                                    |
| Diff whitespace check                                 | Passed at closeout                                         |

The controlled browser set covered loopback API safety, Drill at 320–430px, landscape, desktop,
all five Drill stages, long chronology, maximum photos, file-picker return, custom categories,
restored drafts, and the representative Inspection visual matrix.

The build retained the existing chunk-size and mixed static/dynamic import warnings. No new build
failure was introduced.

The database-writing ERCO/Drill/Fitness workflow smoke was not run. This pass used the 1,049-test
partition and stub-only browser suites and did not create application records.

## Rollback boundary

If a later regression is attributed to this pass, roll back in reverse order:

1. restore the three feature-local edit banners;
2. restore an affected dialog consumer's former branches one consumer at a time;
3. restore report hook imports while retaining `767.98px`;
4. rerun that consumer's characterization tests before broader rollback.

Do not roll back the earlier Inspection toolbar work or controlled API guard correction unless
evidence identifies them independently.

## Final disposition

The corrective stage is complete. Whole forms, setup steps, personnel steps, chronology models,
analysis steps, mobile home orchestrators, summary builders, and validation systems remain
intentionally feature-owned.
