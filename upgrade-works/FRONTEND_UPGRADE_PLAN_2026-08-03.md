# VMECC Frontend Upgrade Plan

**Original document date:** 2026-08-03  
**Current revision date:** 2026-08-04  
**Plan version:** 2.0  
**Application:** `vmecc-frontend`  
**Document home:** `upgrade-works/`  
**Document status:** Active — reprioritized after Stage 1  
**Primary goal:** Improve frontend code quality, consistency, and maintainability by consolidating repeated implementations into well-scoped reusable components and patterns without changing existing business behavior.

## 1. Revision Decision

Revision 2 replaces the unexecuted post-Stage-1 roadmap from Revision 1.1. Git history preserves the original plan.

Stage 1 established a trustworthy local baseline through lint repair, confirmed correctness fixes, production-configuration hardening, dependency triage, and regression testing. That work remains valid. The owner has clarified that the next priority is application-level implementation quality: reuse existing components consistently, extract genuinely repeated patterns, reduce avoidable duplication, and make applicable modules look and behave coherently.

The following Revision 1.1 priorities are therefore deferred unless a concrete need makes them relevant:

- broad CI and hosting-process expansion
- blanket coverage or typing programmes
- observability-platform adoption
- performance work without a measured user-facing problem
- large state-management or storage migrations
- production deployment qualification before an actual release is requested

These topics are not rejected. They are removed from the immediate critical path so that the programme addresses the owner's primary concern.

## 2. Scope and Outcomes

### 2.1 In scope

- Inventory existing shared components, hooks, utilities, styles, and repeated module implementations.
- Identify patterns that have the same user purpose and substantially the same behavior.
- Improve existing shared components before creating competing replacements.
- Extract new shared components only when their reusable contract is clear.
- Consolidate spacing, typography, status presentation, actions, states, and responsive behavior in applicable modules.
- Migrate modules incrementally while preserving routes, permissions, API payloads, calculations, persistence, and workflow order.
- Remove superseded duplicate code after all intended consumers have migrated.
- Add focused tests around shared contracts and behavior-sensitive module integrations.
- Record legitimate domain-specific exceptions instead of forcing false uniformity.

### 2.2 Out of scope unless separately approved

- A wholesale visual redesign or new branding exercise
- New business features or workflow changes
- Backend, API, database, permission, payroll, report, or inspection-semantic changes
- Replacing CoreUI or introducing another UI framework
- A repository-wide rewrite, mass rename, formatting pass, or CSS reset
- React Router, state-library, form-library, or other major dependency migration
- Abstracting code solely to reduce line count
- Deploying to staging or production

### 2.3 Target outcomes

By the end of this plan:

- Repeated frontend patterns are catalogued with their consumers and differences.
- Shared components have clear responsibilities, predictable props, and documented variants.
- Applicable modules use the same component for the same user-facing purpose.
- Page structure, actions, filters, tables, status indicators, form feedback, modal behavior, and standard states are visibly coherent.
- Domain-specific behavior remains local when sharing would create excessive flags or hidden branching.
- Duplicate implementations removed by a migration are no longer imported or styled.
- Accessibility and responsive behavior are part of each shared contract.
- Existing application functionality remains unchanged unless a separate behavior change is explicitly approved.
- Validation effort is proportionate to the change rather than repeated mechanically.

## 3. Current Foundation

### 3.1 Completed Stage 1 work

| Work                                                            | Status                                        |
| --------------------------------------------------------------- | --------------------------------------------- |
| ESLint correctness and React/accessibility enforcement          | Completed locally                             |
| Confirmed runtime defect repairs and compatibility tests        | Completed locally                             |
| Production header, local asset, and API configuration hardening | Completed locally                             |
| GitHub-hosted automation                                        | Deferred by owner to avoid hosted cost        |
| Compatible dependency advisory patches                          | Completed locally                             |
| React Router RSC advisory disposition                           | Time-bounded exception; review due 2026-09-04 |
| Full regression baseline                                        | 315 test files / 1,728 tests passing          |
| Production build baseline                                       | Passing; existing size warnings recorded      |

Stage 1 is a foundation, not the template for the amount of ceremony required for every component refactor.

### 3.2 Existing reuse candidates

The repository already contains shared building blocks that must be assessed before anything new is introduced. Initial candidates include:

- Structure and navigation: `ModulePageHeader`, `ModuleNavTabs`, `RouteNavTabs`, `BackButton`, `AppBreadcrumb`
- Data display: `TableFilters`, `TableLoader`, `DataTableFooter`, `SortableTableHeader`, `GroupedTableHeader`, `ResponsiveRecordCollection`
- Actions and feedback: `CreateActionButton`, `FormActionGroup`, `ButtonLoader`, `ActionConfirmModal`
- Status and workflow: `RecordStateBadge`, `WorkflowStatusSummary`, `WorkflowDetailHeader`, `ResponsiveWorkflowActionDialog`
- Responsive detail presentation: `ResponsiveKeyValueList`, `ResponsiveFinancialBreakdown`
- Shared status definitions: `statusPresentation.js` and domain-specific status helpers

This list is a discovery starting point, not an instruction to use every component everywhere.

## 4. Reuse and Consistency Principles

1. **Reuse before creation.** Search for an existing component, hook, utility, or style contract before adding another.
2. **Semantics before appearance.** Components should be shared because they serve the same purpose and behavior, not merely because they look similar today.
3. **Prefer composition.** Build small focused parts that can be composed; avoid one universal component with many unrelated modes.
4. **Keep domain rules local.** Calculations, permissions, status transitions, validation rules, and API mapping stay in their domain unless the rule is truly common.
5. **Preserve behavior.** Refactoring must not silently change labels, routes, workflow order, request shapes, error handling, focus behavior, or responsive availability.
6. **Use explicit variants.** A small named variant is acceptable when the semantic difference is stable. Boolean-prop combinations that create hidden component modes are not.
7. **Migrate before deleting.** Keep the existing implementation until intended consumers pass their migration checks.
8. **Consistency includes states.** Loading, empty, error, disabled, read-only, permission-denied, and success behavior matter as much as the normal state.
9. **Accessibility is contractual.** Labels, keyboard operation, focus, dialog semantics, status meaning, and touch targets belong in the shared component contract.
10. **Responsive behavior is contractual.** A shared component must define what remains visible and actionable on supported viewport sizes.
11. **Do not chase arbitrary metrics.** Fewer files or lines are not success if the resulting API is harder to understand or change.
12. **Leave good duplication alone.** Two implementations may remain separate when their behavior, ownership, or expected evolution differs materially.

## 5. Component Boundaries

Use four layers to decide ownership:

| Layer             | Responsibility                                 | Examples                                                          |
| ----------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Foundation        | Design tokens and low-level presentation rules | spacing, typography, colors, radii, focus, control sizing         |
| Shared primitives | Small stable application-wide behaviors        | loaders, state badges, action groups, confirmation shell          |
| Shared composites | Repeatable page or workflow patterns           | page header, filters, responsive record collection, detail header |
| Domain components | Business-specific rendering and interaction    | salary claim calculations, inspection steps, leave transitions    |

A component should move upward only when its lower-level consumers share a stable contract.

### 5.1 Extraction threshold

Promote a pattern to shared ownership when at least one condition is met:

- three or more implementations have the same purpose and materially equivalent behavior
- two high-use implementations clearly need the same contract and are likely to remain aligned
- an existing shared component already represents the pattern but consumers have diverged unnecessarily
- a correctness, accessibility, or responsive fix should be enforced once for all applicable consumers

Do not extract when:

- similarity is only visual
- the proposed API needs many consumer-specific flags, render branches, or exceptions
- business rules would move into a generic UI component
- only one stable consumer exists and no imminent second consumer is identified
- the abstraction makes the call site harder to understand than the local implementation

### 5.2 Shared-component contract

Before broad migration, define:

- intended purpose and supported consumers
- required and optional props
- named variants and their semantics
- normal, loading, empty, error, disabled, read-only, and permission states as applicable
- keyboard, focus, accessible-name, and announcement behavior
- mobile and desktop behavior
- extension points and deliberately unsupported customization
- focused tests and migration examples

### 5.3 Placement and naming

- Put a component in `src/components/` only when it has a stable cross-domain purpose.
- Keep reusable components that belong to one business area inside that domain's component or shared directory.
- Prefer names that describe user purpose, such as `ActionConfirmModal` or `ModulePageHeader`; avoid vague containers such as `CommonComponent`, `ReusableForm`, or `GenericWrapper`.
- Do not create a barrel export solely for a migration. Follow an existing export convention and check for circular dependencies before introducing one.
- Keep presentation components independent of API clients, global stores, permission decisions, and domain calculations.

## 6. Right-Sized Validation

Validation follows risk. It is not necessary to run every available check after every small presentational edit.

| Change type                                                  | Required during development                                                        | Required at batch checkpoint                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Documentation or inventory only                              | Link/path and diff check                                                           | None beyond document review                                                      |
| Token or presentational primitive                            | Lint for changed files; focused component tests                                    | Affected module tests; production build when CSS/build output changes materially |
| Shared interactive component                                 | Focused component tests including keyboard/state behavior; affected consumer tests | Full lint and full unit suite after the migration batch                          |
| Module migration with no intended behavior change            | Existing tests for that module and shared component                                | Full suite at the end of the pattern family or stage                             |
| Hook, state, API, permission, routing, or persistence change | Characterization and affected integration tests                                    | Full lint, audits, unit suite, and production build                              |
| Release candidate                                            | Stage-level validation plus the separate release checklist                         | Deployment approval is outside this plan                                         |

Additional rules:

- Run the smallest test set that can detect a mistake while iterating.
- Run the complete unit suite once per meaningful migration batch, not after each consumer file.
- Run the production build when exports, lazy imports, CSS entry points, asset behavior, or a stage checkpoint changes.
- Existing unrelated warnings do not block a refactor unless the change worsens them.
- Do not weaken or delete tests merely to make a migration pass.
- A visual difference is acceptable only when it is the documented consistency correction and does not alter workflow meaning.

## 7. Working Method

Each pattern family follows the same lean sequence:

1. Inventory implementations and consumers.
2. Compare purpose, behavior, states, accessibility, responsive behavior, and domain differences.
3. Choose one of four dispositions: reuse as-is, improve existing shared component, extract a new shared component, or keep domain-specific.
4. Capture current behavior with focused tests when coverage is insufficient.
5. Define the smallest stable shared contract.
6. Migrate one representative consumer.
7. Review the result before expanding to the next consumer.
8. Migrate the remaining approved consumers in a bounded batch.
9. Remove superseded imports, styles, wrappers, and dead code.
10. Run the batch-level validation and record the outcome.

One pattern family should normally be isolated from unrelated refactors. A module may be touched by several batches over time; it does not need a big-bang rewrite.

Shared-component editing safeguards:

- Capture the complete import/consumer list before changing an existing shared component.
- Preserve existing default behavior until every current consumer has been reviewed.
- Prefer adding a clearly named compatible variant, migrating consumers, and then simplifying over silently changing a default for all consumers.
- Keep event timing, callback arguments, disabled/loading behavior, HTML semantics, and focus behavior stable unless the approved contract says otherwise.
- Scope styles to the component or an existing semantic class; avoid new broad selectors that can leak into unrelated modules.
- After migration, search again for old imports, duplicate class names, and direct implementations before deleting anything.

## 8. Day-Staged Implementation Plan

Day numbers are sequencing guides, not mandatory calendar deadlines. Work may pause for product changes or unresolved behavioral differences.

# Stage 1 — Foundation Already Completed

## Days 1–5 — Correctness and Local Confidence

Status: **completed locally**, except hosted GitHub automation was explicitly deferred.

The completed records in `upgrade-works/` remain the evidence for this stage. The former Days 6–7 release-readiness expansion is superseded by Revision 2 and moved to the release-only checklist in Section 11.

### Stage 1 carry-forward rules

- Preserve the corrected lint and test baseline.
- Continue the React Router exception check until resolved or formally renewed.
- Do not reopen deployment work unless an actual release is being prepared.
- Treat existing compatibility tests as protection for component migrations.

---

# Stage 2 — Days 6–10: Reuse and Consistency Audit

## Day 6 — Component and Usage Inventory

### Work

- Catalogue components under `src/components/` and meaningful shared areas under `src/views/**/shared/`.
- Record import counts and representative consumers.
- Identify components with overlapping names or responsibilities.
- Identify components that exist but are bypassed by local copies.
- Do not modify application behavior during inventory.

### Deliverable

Create `upgrade-works/FRONTEND_COMPONENT_REUSE_AUDIT_2026-08-04.md` with a component catalogue and evidence-based candidate list.

## Day 7 — Repeated Pattern Matrix

### Work

- Map repeated patterns across modules.
- Compare their semantics, states, responsive behavior, accessibility, and styling.
- Rank each pattern by reuse value, migration risk, and number of consumers.
- Record a disposition for apparent duplication that should remain separate.

The matrix must record: pattern purpose, current implementations, consumer modules, behavioral differences, state differences, responsive/accessibility differences, proposed owner, disposition, migration risk, affected tests, and removal candidates.

### Priority pattern families

1. Page headers, breadcrumbs, tabs, and back navigation
2. Primary, secondary, destructive, and create actions
3. Tables, sorting, filters, pagination, loaders, and mobile record collections
4. Status badges, workflow summaries, and state presentation
5. Loading, empty, error, disabled, read-only, and permission states
6. Confirmation dialogs, action dialogs, and modal shells
7. Form layout, labels, validation messages, submit/discard controls, and field spacing
8. Responsive detail and key-value presentation

## Day 8 — Foundation and Style-Source Audit

### Work

- Identify existing SCSS variables, semantic classes, and hardcoded values used by the priority patterns.
- Locate conflicting spacing, typography, color, radius, and control-size definitions.
- Decide which existing source should become canonical.
- Avoid a wholesale CSS rewrite or token system replacement.

## Day 9 — Shared Contract Decisions

### Work

- Select the first two or three high-confidence pattern families.
- Define their intended contracts and consumers.
- Identify adapters needed for incremental migration.
- Define focused test coverage and rollback boundaries.

## Day 10 — Audit Review and Implementation Backlog

### Work

- Review the catalogue for false abstractions and missing consumers.
- Convert approved candidates into ordered migration batches.
- Estimate risk using low, medium, or high—not speculative hour precision.
- Choose two representative pilot modules: one straightforward and one with responsive or workflow complexity.

### Stage 2 exit criteria

- Existing shared components and their usage are catalogued.
- Priority duplication is supported by concrete file/consumer evidence.
- Every candidate has a disposition and rationale.
- Initial component contracts do not contain domain-specific business logic.
- Pilot modules and targeted regression tests are identified.
- No application source was changed merely to complete the audit.

---

# Stage 3 — Days 11–20: Shared Foundations and Pilot Migrations

## Days 11–13 — Improve Existing Shared Components

Status: **completed locally on 2026-08-04**. The canonical confirmation foundation and Staff canary passed the bounded gate. See the [Stage 3 execution record](./FRONTEND_COMPONENT_REUSE_STAGE_3_EXECUTION_2026-08-04.md).

### Work

- Start with existing components that already approximate the approved contracts.
- Normalize prop names, variants, standard states, accessibility, and responsive behavior only where needed.
- Preserve compatibility through wrappers or deprecated aliases when a direct cutover would create a large risky diff.
- Add focused tests for the shared contract.

## Days 14–16 — Pilot Module One

Status: **completed locally on 2026-08-04**. `HolidaysTab` passed its responsive-collection migration gate with behavior characterization and an independently reversible commit.

### Work

- Migrate the straightforward pilot module to the approved shared patterns.
- Keep data fetching, permissions, routes, API calls, and business rules unchanged.
- Remove local duplicates only after the migrated module tests pass.
- Review whether the component API became simpler or accumulated consumer-specific conditions.

## Days 17–19 — Pilot Module Two

Status: **completed locally on 2026-08-04**. `OvertimeRecordsTab` passed pre-migration characterization, responsive-collection migration, focused regression, and boundary review without a new workflow-specific shared prop.

### Work

- Migrate the responsive or workflow-oriented pilot module.
- Validate mobile/desktop availability, keyboard interaction, modal focus, and all standard states relevant to that module.
- Reassess the shared contract if the second consumer exposes a real semantic difference.
- Split or keep a domain component when a generic contract would become misleading.

## Day 20 — Pilot Checkpoint

Status: **completed locally on 2026-08-04**. Full lint, 318 files / 1,753 tests, applicable repository audits, production build, generated-output cleanup, import searches, and the complete Stage 3 diff review passed. See the [Stage 3 execution record](./FRONTEND_COMPONENT_REUSE_STAGE_3_EXECUTION_2026-08-04.md).

### Work

- Run full lint, the complete unit suite, relevant audits, and the production build.
- Compare module behavior before and after migration.
- Record accepted visual consistency changes and any remaining exceptions.
- Decide which pattern families are ready for wider rollout.

### Stage 3 exit criteria

- At least two representative modules use the approved shared patterns.
- Shared components have focused tests and clear contracts.
- Pilot migrations have no confirmed business-function regression.
- No shared component has become a multi-domain controller.
- Superseded pilot code and styles are removed or have an explicit temporary adapter.
- Full checkpoint validation passes.

---

# Stage 4 — Days 21–36: Pattern-Family Rollout

Roll out by pattern family, not by rewriting entire modules. The audit determines the exact order.

## Days 21–24 — Structure and Navigation

- Consolidate applicable page headers, breadcrumbs, tabs, and back-navigation patterns.
- Keep route definitions, destination rules, permission filtering, and unsaved-change guards unchanged.
- Verify long titles, action wrapping, mobile navigation, and hidden/disabled states.

**Status (2026-08-04): Completed locally.** Existing header and tab adoption was retained, intentional exceptions were documented, and the duplicate Reports/Inspection compact mobile Back presentation was extracted without moving route or handler behavior. Full lint, 321 test files / 1,762 tests, and the production build passed. Evidence: `FRONTEND_COMPONENT_REUSE_STAGE_4_EXECUTION_2026-08-04.md`.

## Days 25–28 — Data Lists and Standard States

- Consolidate applicable filters, sorting headers, loaders, pagination, responsive record collections, and empty/error states.
- Preserve query semantics, default filters, row actions, privacy restrictions, and mobile-accessible actions.
- Do not force specialized report, payroll, or inspection grids into a generic table when their interaction model differs.

## Days 29–32 — Actions, Status, and Workflow Presentation

- Consolidate applicable action groups, create buttons, button loading states, state badges, and workflow summaries.
- Use centralized semantic status presentation where the same status means the same thing.
- Keep domain-specific status definitions separate when labels, colors, permissions, or transitions differ.

## Days 33–36 — Forms and Dialogs

- Consolidate applicable form layout, validation feedback, submit/discard actions, confirmation dialogs, and modal shells.
- Preserve validation rules, submitted values, confirmation wording with legal/business meaning, and destructive-action safeguards.
- Verify focus entry, focus return, Escape behavior, loading locks, double-submit prevention, and mobile layout.

### Stage 4 exit criteria

- Approved consumers use the shared pattern for the same purpose.
- Migrated modules expose coherent normal and non-happy-path states.
- Local duplicates are removed when no longer needed.
- Exceptions are documented with semantic reasons, not preference alone.
- Each pattern-family batch passes its targeted tests.
- Full lint, unit suite, and production build pass at the stage checkpoint.

---

# Stage 5 — Days 37–42: Cleanup, Measurement, and Handover

## Days 37–39 — Remove Superseded Implementations

### Work

- Remove unused duplicate components, styles, exports, wrappers, and imports created obsolete by the migrations.
- Confirm candidates are unreferenced before deletion.
- Retain adapters that still have consumers and give each one a removal condition.
- Avoid unrelated formatting or naming cleanup.

## Day 40 — Consistency Review

### Work

- Review representative migrated modules at supported desktop and mobile sizes.
- Compare headers, spacing, actions, filters, tables/cards, statuses, states, forms, and dialogs.
- Correct inconsistencies through the shared source when all consumers should change.
- Correct a domain consumer locally when the difference is intentional.

## Day 41 — Final Code-Quality Checkpoint

### Work

- Run full lint, unit tests, applicable audits, and production build.
- Review the final diff for behavior changes, dead code, broadened component APIs, and CSS leakage.
- Confirm no major dependency or business-logic change entered the programme accidentally.

## Day 42 — Completion Record

### Work

- Publish the final component catalogue and adoption matrix.
- Record completed migrations, retained exceptions, deferred candidates, adapters, and remaining duplication.
- Provide concise guidance for adding or selecting components in future feature work.
- Prepare a release-impact summary without performing deployment qualification unless a release is requested.

### Stage 5 exit criteria

- The component catalogue reflects the final repository state.
- Reuse improvements are traceable to concrete consumers.
- Removed duplication is confirmed unreferenced.
- Retained variants have documented semantic justification.
- Migrated workflows retain functional compatibility.
- Final local validation passes.
- Future contributors have a clear reuse-first decision path.

## 9. Prioritization Method

Score candidates using simple evidence rather than an arbitrary weighted formula:

| Factor                     | Low                            | Medium                            | High                                          |
| -------------------------- | ------------------------------ | --------------------------------- | --------------------------------------------- |
| Repetition                 | One or two local cases         | Three related cases               | Many modules or frequent reimplementation     |
| User-visible inconsistency | Minor or rarely seen           | Noticeable in a workflow          | Common, confusing, or accessibility-impacting |
| Contract clarity           | Consumers differ substantially | Shared core with bounded variants | Same purpose and behavior                     |
| Migration risk             | Presentation only              | Interactive but well tested       | Business-critical, stateful, or weakly tested |

Prioritize high repetition, high contract clarity, and meaningful visible inconsistency. Pilot medium-risk consumers before high-risk consumers. Defer unclear contracts.

## 10. Documentation and Change Control

Durable records belong in `upgrade-works/`. Avoid creating a new document for every small component edit.

Required records:

- the active plan: this file
- component reuse audit and catalogue
- one execution record per completed stage or substantial migration batch
- final adoption and exception summary
- release checklist only when a release is requested

Implementation controls:

- Keep one primary pattern family per commit where practical.
- Preserve unrelated user changes in a dirty worktree.
- Do not mix a behavior change into a refactor without identifying it explicitly.
- Do not install a new UI, CSS, state, form, or testing dependency without a separate decision.
- Record any temporary compatibility wrapper with its consumers and removal condition.
- Update the catalogue when a new shared component is introduced or an old one is retired.

## 11. Release and cPanel Checklist — Deferred Until Needed

The following checks are intentionally not part of daily component work. Run them only when preparing an actual staging or production release:

- confirm whether the app is hosted at the domain root or a subdirectory
- generate one complete build from the approved revision and lockfile
- upload only the build artifact, including the hidden `.htaccess`
- confirm cPanel/Apache permits required rewrite and header directives
- verify deep-link refresh, HTTPS redirect, API connectivity, response headers, and service-worker scope on the deployed origin
- avoid mixing old and new `index.html`, `service-worker.js`, `version.json`, and hashed assets
- retain the previous complete artifact and verify the rollback method
- perform production-data or destructive workflow checks only with separately approved procedures

This checklist protects a release without allowing hosting concerns to dominate code-quality implementation.

## 12. Rollback for Component Migrations

Preferred rollback unit: the focused pattern-family or consumer-migration commit.

Before removing an old implementation:

1. Confirm all intended imports have migrated.
2. Confirm focused shared-component tests pass.
3. Confirm affected module tests pass.
4. Confirm no required domain behavior moved into the shared layer.

If a regression is found:

- revert the affected consumer migration or pattern-family commit
- restore the previous local implementation when other consumers must retain the new shared version
- do not roll back unrelated completed pattern families
- re-run the focused tests for the shared component and affected module
- check for stored-data impact only if the change unexpectedly touched state or persistence

## 13. Definition of Done

A component-reuse work item is complete when:

- the repeated pattern and intended consumers are identified
- the chosen shared or domain-specific disposition is justified
- the component contract is smaller and clearer than the duplicated implementations it replaces
- applicable standard, responsive, and accessibility states are handled
- business logic, routing, permissions, API contracts, and persistence remain unchanged unless separately approved
- focused component and affected-module tests pass
- superseded code is removed or tracked behind a temporary adapter
- the diff contains no unrelated dependency, generated artifact, formatting, or feature changes
- the component catalogue or migration record is updated
- the validation level matches Section 6

## 14. Programme Measures

Report outcomes without turning metrics into targets that encourage poor abstractions:

- number of repeated pattern families reviewed
- number of existing shared components reused or improved
- number of new shared components introduced, with consumer count
- number of consumer implementations migrated
- number of duplicate components/styles removed
- number of temporary adapters and their remaining consumers
- number of deliberate domain-specific exceptions
- migrated modules with consistent loading, empty, error, disabled, and responsive states
- focused and full regression results
- confirmed functional regressions introduced and corrected

Lines of code, component count, and generic-code percentage may be reported as context but are not success criteria.

## 15. Stop and Reassess Conditions

Pause a migration batch when:

- the shared API requires growing consumer-specific flags or branches
- two consumers reveal materially different semantics
- tests expose an undocumented business behavior
- the refactor would change an API payload, calculation, permission, route, persistence format, or workflow order
- a responsive or accessibility correction would remove an existing user capability
- completing the migration requires a major dependency or framework change
- the working diff becomes too broad to attribute regressions confidently

When paused, keep or restore the domain implementation, document the reason, and split any separately valuable behavior change into its own decision.

## 16. Stage Record

| Stage                                   | Status                                | Evidence                                                                                                                                                         | Decision                                                                     |
| --------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Stage 1 — foundation                    | Locally completed; hosted CI deferred | Existing Stage 1 records in `upgrade-works/`                                                                                                                     | Preserve as baseline                                                         |
| Stage 2 — reuse audit                   | Completed through Day 10              | `FRONTEND_COMPONENT_REUSE_AUDIT_2026-08-04.md`; `FRONTEND_COMPONENT_REUSE_EXECUTION_PLAN_2026-08-04.md`; `FRONTEND_COMPONENT_REUSE_PATTERN_MATRIX_2026-08-04.md` | Three contracts approved; Staff canary and Holidays/Overtime pilots selected |
| Stage 3 — shared foundations and pilots | Completed locally through Day 20      | `FRONTEND_COMPONENT_REUSE_STAGE_3_EXECUTION_2026-08-04.md`                                                                                                       | Preserve passing foundation and pilot boundaries                             |
| Stage 4 — pattern rollout               | Days 21–24 completed; Days 25–28 next | `FRONTEND_COMPONENT_REUSE_STAGE_4_PLAN_2026-08-04.md`; `FRONTEND_COMPONENT_REUSE_STAGE_4_EXECUTION_2026-08-04.md`                                                | Begin data-list and standard-state inventory                                 |
| Stage 5 — cleanup and handover          | Not started                           | Final adoption summary required                                                                                                                                  | Pending rollout                                                              |

Revision 2 authorizes local frontend audit and behavior-preserving component consolidation. It does not authorize deployment, backend changes, production-data access, or silent business-workflow changes.
