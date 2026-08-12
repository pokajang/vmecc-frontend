# Stage 6 Page Headers and Action Bars Execution

Date: 2026-08-06  
Stage: 6, Days 50–52  
Status: Passed locally  
Parent: `FRONTEND_MODULE_CONSISTENCY_AND_REUSE_PLAN_2026-08-05.md`  
Working plan: `FRONTEND_MODULE_CONSISTENCY_STAGE_6_PAGE_HEADERS_ACTION_BARS_PLAN_2026-08-06.md`

## Outcome

The evidence gate found that the frontend already has the correct shared page-header families. No
new component and no consumer migration were justified. One reproducible presentation gap remained:
an unbroken dynamic page title could resist wrapping inside the canonical `ModulePageHeader`.

The correction adds Bootstrap's general `text-break` utility to the existing level-one heading.
Reports, Team Detail, and the other consumers retain their JSX, routes, permissions, callbacks,
action order, disabled states, and feature-owned responsive rules.

## Inventory and dispositions

Production-source counts excluded tests and stories.

| Family                   |     Production adoption | Final disposition                                                                 |
| ------------------------ | ----------------------: | --------------------------------------------------------------------------------- |
| `ModulePageHeader`       | 22 files / 23 instances | Retained as the canonical module-page contract; long-title wrapping hardened      |
| `WorkflowDetailHeader`   |   4 files / 4 instances | Retained as a distinct Back/title/status/detail contract                          |
| `MobileModuleBackAction` |   2 files / 2 instances | Retained; the exact Reports/Inspection mobile composition is already consolidated |
| `WorkflowStageActions`   |   5 files / 6 instances | Retained outside page headers; it owns workflow progression                       |
| `WorkflowDetailActions`  |   3 files / 4 instances | Retained outside page headers; it owns workflow lifecycle actions                 |
| `RecordDetailActions`    |   2 files / 2 instances | Retained outside page headers; record permissions and lifecycle semantics differ  |

Manual top-level headings were also reviewed. User and Staff Profile retain visually hidden
accessible headings; Dashboard, Messages, registration/authentication, HTTP error/maintenance
pages, and the Inspection UX matrix remain specialist surfaces. The Fire Extinguisher asset-detail
heading remains local because its nested heading level, lifecycle badge, catalog return state, and
replacement navigation do not match an ordinary module page.

## Characterization and implementation

Reports and Team Detail were the pilot pair because each passes a dynamic title and actions through
`ModulePageHeader`. A direct test first asserted:

- one level-one heading;
- a long unbroken title has a wrapping contract;
- the title remains before actions in document order;
- a disabled consumer action remains disabled; and
- the existing action wrapper remains present.

Before the production correction, the direct suite produced the expected single failure: 1 failed
and 23 passed because the heading did not have `text-break`. After adding that class, the suite
passed 24/24. No new prop or feature-specific branch was added.

## Validation evidence

| Gate                      | Result                                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Test-first reproduction   | Expected 1 failed / 23 passed before the correction                                                                         |
| Shared primitive suite    | 24/24 passed after the correction                                                                                           |
| Header consumer suites    | 4 files / 41 tests passed (`uiDebtPrimitives`, Reports detail route, Team member options, Inspection module-header actions) |
| Scoped ESLint             | Passed                                                                                                                      |
| Isolated production build | Passed in 11.24 seconds                                                                                                     |
| Controlled Playwright     | 12/12 Drill responsive and restoration journeys passed in 21.7 seconds                                                      |
| Generated-output boundary | Temporary build, environment file, logs, and server are removed after verification                                          |
| Diff integrity            | `git diff --check` passed                                                                                                   |

The build retained existing non-blocking warnings about the external temporary output directory,
the mixed static/dynamic `WorkflowNotifications` import, and chunks over 500 kB. None was introduced
by this one-class presentation correction.

## Behavior-preservation verdict

Days 50–52 pass locally. The change affects only how an unusually long, unbroken title may wrap.
It does not alter action visibility, authorization, enablement, navigation, event handling, data,
heading order, or responsive ownership. The browser run also confirmed no regression in the
representative narrow/mobile, landscape, desktop, long-content, restoration, and file-picker-return
journeys.

## Rollback

Rollback is independently bounded: remove `text-break` from the heading in `ModulePageHeader` and
remove the matching long-title characterization. No consumer rollback or data migration is needed.

## Next boundary

Proceed to Stage 6 Days 53–55: inventory form sections and validation presentation, separate shared
presentation from form/domain semantics, characterize an approved pilot, and migrate only if the
evidence demonstrates a stable reusable contract.
