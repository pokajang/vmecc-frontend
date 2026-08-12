# Stage 6 Detail and Summary Presentation Execution

Date: 2026-08-06  
Stage: 6, Days 56–58  
Status: Passed locally  
Plan: `FRONTEND_MODULE_CONSISTENCY_STAGE_6_DETAIL_SUMMARY_PLAN_2026-08-06.md`

## Outcome

The two duplicated Leave metadata loops now use the existing
`ResponsiveKeyValueList`. The applicant and staff views retain their original fields, order,
formatters, fallbacks, badges, evidence links, approval gates, actions, and history. The shared
primitive did not need an API or style change.

This was deliberately an adoption pass, not a new universal detail system. Financial, Inspection,
workflow-status, form, and domain-summary families remain with their existing specialist owners.

## Inventory and disposition

The production-source inventory established this baseline before migration:

| Family or signal                  |                                   Production evidence | Decision                                                              |
| --------------------------------- | ----------------------------------------------------: | --------------------------------------------------------------------- |
| `ResponsiveKeyValueList`          | 3 files / 6 symbol references; 2 production consumers | Reuse unchanged in the two matching Leave views                       |
| `DetailField`                     |                        6 files / 87 symbol references | Retain specialist field/layout ownership                              |
| Inspection `DetailValueBlock`     |                               7 files / 22 references | Retain Inspection equipment/status contract                           |
| `ResponsiveFinancialBreakdown`    |                                4 files / 8 references | Retain financial semantics and calculations                           |
| Native definition lists           |                               5 files / 5 occurrences | Review case by case; no proven duplicate selected                     |
| Exact manual flex label/value row |                             15 files / 23 occurrences | Only the two matching Leave metadata loops selected                   |
| Broad label/value literals        |                                41 files / 169 matches | Search lead only; mostly false positives or domain-owned compositions |

After migration, `ResponsiveKeyValueList` has four production consumers: Overtime detail, Salary
Claim detail, applicant Leave detail, and staff Leave detail. The remaining exact manual flex row in
each pilot file is the intentionally separate Approval Gates status row. It was not part of the
metadata loop and was not moved into the primitive.

## Characterized contract

Before changing production markup, tests captured these requirements:

- label order differs only by the applicant-only Workflow Scope and Applicant Role rows;
- a numeric zero remains visible rather than becoming the missing-value fallback;
- existing missing-value, schedule, date, roster-impact, and identifier formatting stays in the
  consumer;
- status badges and the emphasized next-action text remain React-node values;
- evidence remains a keyboard-reachable new-tab link with the same generated URL;
- long reasons and unbroken roster values wrap without horizontal page overflow;
- staff roster-capture context remains visible;
- applicant Edit, Cancel, and Delete actions remain available under the existing gates;
- the missing-record state and Back action remain unchanged; and
- Approval Gates and audit history remain outside the shared metadata definition list.

The direct primitive characterization also confirms ordered `dl`/`dt`/`dd` semantics, compact and
class forwarding, zero preservation, null fallback, long-value wrapping, and embedded links.

## Implementation boundary

Only these production consumers changed:

- `src/views/leave/components/LeaveDetailSection.js`
- `src/views/staff/leave-management/components/LeaveDetailSection.js`

Each file imports `ResponsiveKeyValueList` and passes its existing item array to it. Item creation,
domain formatting, links, badges, action permissions, Approval Gates, history, navigation, API
calls, and persistence remain owned by the same view. No route, dependency, shared stylesheet,
backend, cPanel, or deployment behavior changed.

Added regression coverage:

- `src/components/workflow/__tests__/ResponsiveKeyValueList.test.jsx`
- `src/views/leave/components/__tests__/LeaveDetailSection.test.jsx`
- `tests/e2e/detail-summary-component.spec.js`

## Test-first and failure attribution

The primitive characterization passed before migration: 1 file / 2 tests. The first Leave test run
identified a test-harness omission because `BackButton` requires router context; wrapping both
subjects in `MemoryRouter` fixed the harness without touching production. The corrected
pre-migration characterization then produced the intended red state: 2 tests failed because the
manual rows used `div` elements instead of `dt`/`dd`, while the two missing-record cases passed.

The first browser harness loaded a second transformed React Router instance and therefore could not
satisfy `BackButton`'s router context. The harness was corrected to resolve the same transformed
router module used by `BackButton`. The first narrow run then measured 12 px of overflow because the
isolated harness omitted the real module's fluid-container boundary; adding that actual boundary
removed the artificial gutter overflow. Neither failure was an application-source regression.

Final browser execution passed both real-source cases in 1.7 seconds.

## Validation evidence

| Gate                                             | Result                                                                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Direct primitive and Leave regression tests      | 2 files / 6 tests passed                                                                                                               |
| Broader affected Leave/workflow tests            | 10 files / 38 tests passed                                                                                                             |
| Real-source Playwright, 320 × 700 and 1440 × 900 | 2/2 passed                                                                                                                             |
| Browser semantics and behavior                   | Ordered terms, zero, long content, staff timestamp, link target/URL, keyboard focus, no page errors, and no horizontal overflow passed |
| Targeted ESLint                                  | Passed                                                                                                                                 |
| Targeted Prettier                                | Passed                                                                                                                                 |
| Production build                                 | 6,495 modules transformed; passed in 11.27 seconds                                                                                     |
| E2E module mapping audit                         | 50/50 modules mapped                                                                                                                   |
| `git diff --check`                               | Passed                                                                                                                                 |
| Ownership search                                 | Both metadata loops removed; one intentional Approval Gates flex row remains per view                                                  |
| Temporary artifacts                              | Listener stopped; temporary environment file and isolated build removed; no matching task-owned Playwright directory remained          |

The full Vitest suite was not repeated because the shared primitive was unchanged and the bounded
change had direct, consumer, broader affected, browser, build, lint, mapping, and diff coverage. The
complete local checkpoint remains scheduled for Day 61.

The production build retained only known non-blocking warnings: its isolated output directory was
outside the project root, `WorkflowNotifications` has mixed static/dynamic imports, and some chunks
exceed 500 kB.

## Behavior-preservation verdict

Days 56–58 pass locally. No evidence indicates a functional regression in either Leave detail
journey. The migration improves semantic label/value markup and consolidates matching presentation
without moving domain decisions or widening the primitive.

Residual risk is limited to authenticated backend-integrated journeys not exercised by this
controlled component harness. That risk is bounded by unchanged data/action logic, direct consumer
tests, real production-source rendering, and the Day 61 full checkpoint. Staging and production
qualification remain separate release work.

## Rollback

Either consumer can be rolled back independently: remove its `ResponsiveKeyValueList` import and
restore the original mapped manual row wrapper around the unchanged item array. Do not roll back
formatters, links, badges, actions, Approval Gates, history, or the shared primitive.

## Next boundary

Days 59–60 will inventory loading, empty, no-results, error, and recovery presentation. It must
separate full-page, collection, form, drawer, and inline semantics before approving any shared
candidate. Day 61 remains the cumulative audit, catalogue update, complete local validation, and
handover checkpoint.
