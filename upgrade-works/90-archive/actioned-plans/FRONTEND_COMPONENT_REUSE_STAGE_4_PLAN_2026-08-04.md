# Frontend Component Reuse Stage 4 Plan

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Starting revision:** `ab293a9`  
**Parent plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Scope:** Stage 4 Days 21–24 — structure and navigation only  
**Status:** Days 21–24 completed and passed locally; see the execution record  
**Authorization boundary:** Local, behavior-preserving frontend work only; no deployment, backend, API, route-definition, permission, persistence, dependency, or workflow changes

## 1. Purpose

This plan covers the first Stage 4 pattern-family batch: page headers, breadcrumbs, module navigation, route navigation, and back-navigation presentation.

The goal is to reuse the existing shared components where consumers have the same purpose and behavior. The goal is not to redesign navigation, add breadcrumbs, rewrite routes, or make every header visually identical regardless of context.

A documented decision that the current implementation is already appropriately shared is a successful outcome. Source changes are permitted only where the Days 21–22 evidence proves a bounded duplicate.

## 2. Required Outcomes

By the end of Day 24:

- every apparent structure/navigation bypass reviewed in this batch has an evidence-backed disposition
- existing shared component contracts and their behavioral boundaries are recorded
- at most one bounded representative migration is performed unless two consumers are proven to be the same implementation
- route destinations, navigation state, replace behavior, guards, permissions, active matching, and workflow order remain unchanged
- desktop and mobile access remain available
- no domain-specific navigation rule is moved into a shared presentation component
- focused validation passes for every changed component and consumer
- the execution outcome, deferrals, rollback boundary, and next authorized work are recorded

## 3. Frozen Scope

### 3.1 In scope

- `src/components/ModulePageHeader.js`
- `src/components/ModuleNavTabs.js`
- `src/components/RouteNavTabs.js`
- `src/components/BackButton.js`
- `src/components/AppBreadcrumb.js`
- their existing focused tests
- representative consumers proven equivalent during Days 21–22
- component-scoped style changes only when needed to preserve or standardize an approved shared presentation
- a Stage 4 execution record under `upgrade-works/`

### 3.2 Explicitly out of scope

- `src/routes.js` or any route table
- route names, paths, parameters, query strings, hashes, redirects, or lazy-loading structure
- authentication, authorization, role, module-activation, or permission filtering
- unsaved-change, draft, declaration, submission, or workflow guards
- API calls, payloads, data fetching, persistence, calculations, or backend code
- global application-shell navigation, sidebar behavior, or mobile overlay architecture
- mounting `AppBreadcrumb` merely because it currently has no renderer
- converting Dashboard's sticky identity/period header into `ModulePageHeader`
- converting Fitness workflow progress into page navigation tabs
- converting Inspection side-panel history navigation into a page back button
- converting authentication, maintenance, 403, 404, or 500 pages into normal module pages
- deleting compatibility exports or dormant components during Days 21–24
- dependency, framework, CoreUI, React Router, GitHub Actions, build configuration, or deployment work
- repository-wide formatting, import canonicalization, naming cleanup, or unrelated dead-code removal

## 4. Existing Shared Contracts

### 4.1 `ModulePageHeader`

Current stable responsibility:

- one semantic page-level `h1`
- title, desktop subtitle, optional concise mobile subtitle, and action slot
- responsive wrapping for long titles and multiple actions
- no route, permission, loading, or workflow ownership

Do not add domain titles, permission checks, back-navigation decisions, sticky Dashboard behavior, or workflow progress to this component.

### 4.2 `ModuleNavTabs`

Current stable responsibility:

- presentation for caller-owned navigation items
- active and disabled states
- `aria-current="page"` without false tab-widget roles
- mobile horizontal-scroll or labeled-select variants
- caller-owned click behavior

Do not add route inspection, permission filtering, persistence, or workflow transitions to this component.

### 4.3 `RouteNavTabs`

Current stable responsibility:

- compose `ModuleNavTabs`
- exact, prefix, string, array, object, or caller-function active matching
- optional caller-supplied current path and navigate function
- disabled reason, replace mode, navigation state, and async `onBeforeNavigate` guard
- prevention of navigation for disabled, missing-target, already-active, or guard-rejected items

Do not weaken or bypass these behaviors to simplify a consumer migration.

### 4.4 `BackButton`

Current stable responsibility:

- a labeled back control using the common arrow presentation
- fixed `to` navigation or caller-owned `onClick`
- caller-owned label, size, icon size, class, style, and normal CoreUI button props

The component currently does not own browser-history fallback, route state, replace mode, unsaved-change confirmation, or workflow decisions. Those behaviors must stay in callers unless a separately approved generic contract is proven.

### 4.5 `AppBreadcrumb`

Current stable responsibility:

- derive route-name breadcrumbs from the central route catalogue
- render Home and matched path segments

The current scan finds the component exported through `src/components/index.js` but no production renderer. Do not mount it as a cleanup action because that would introduce new navigation UI and product behavior. Confirm its status and defer any deletion to Stage 5 after application-shell ownership is reviewed.

## 5. Preliminary Evidence

The 2026-08-04 pre-plan scan found:

| Pattern                     | Current evidence                                                                                                                                                                                | Preliminary disposition                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Page header                 | `ModulePageHeader` is imported by 22 view files; existing direct consumers cover Admin, Audit, Inspection, Leave, Overtime, Payroll, Profile, Reports, Roster, Settings, Staff, Team, and Users | Strong adoption; find only true bypasses                     |
| Route tabs                  | Eight view/component consumers import `RouteNavTabs`; the component already composes `ModuleNavTabs`                                                                                            | Preserve composition; no replacement                         |
| Direct module tabs          | Inspection and Reports use `ModuleNavTabs` for caller-controlled navigation                                                                                                                     | Retain where route navigation is not the correct contract    |
| Local CoreUI nav primitives | No production view-level `CNav`/`CNavLink` use was found without `ModuleNavTabs` or `RouteNavTabs`                                                                                              | No broad tab migration currently justified                   |
| Back navigation             | Thirteen production files import `BackButton`                                                                                                                                                   | Strong adoption; review only four manual arrow-left outliers |
| Breadcrumb                  | `AppBreadcrumb` is exported but has no production renderer                                                                                                                                      | Do not mount; classify for later cleanup                     |

These counts are a planning snapshot, not permanent metrics. Day 21 must regenerate and record the exact file lists before a decision.

## 6. Preliminary Candidate Matrix

| Candidate                                    | Evidence                                                                                            | Risk                                         | Day 21–22 question                                                                                                | Default position                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Reports mobile compact Back action           | Manual outlined mobile Back button using `inspection-header-back-btn inspection-compact-action-btn` | Medium; uses caller-owned guarded navigation | Is its markup, visibility, semantics, timing, and handler contract identical to Inspection's compact Back action? | Characterize; do not migrate yet             |
| Inspection module mobile compact Back action | Same label, icon size, responsive classes, and action styling as Reports                            | Medium; belongs to Inspection section state  | Can the identical presentation be shared while both handlers remain local?                                        | Strongest pilot pair                         |
| Fire extinguisher detail Back action         | Manual outlined button; carries `replace: true` and route state                                     | Medium–high                                  | Can caller-owned `onClick` preserve exact replace/state behavior without changing presentation?                   | Retain unless exact parity is proven         |
| Inspection side-panel history Back           | Icon-only control inside an off-canvas header                                                       | High false-abstraction risk                  | Is it page navigation? Current evidence says no                                                                   | Keep domain-specific                         |
| Dashboard header                             | Sticky identity and period control                                                                  | High false-abstraction risk                  | Is it a normal module title? Current audit says no                                                                | Keep domain-specific                         |
| User/Staff profile hidden `h1`               | Semantic identity heading combined with detail actions and existing `BackButton`                    | Medium false-abstraction risk                | Would `ModulePageHeader` improve reuse without changing visual hierarchy?                                         | Keep detail-specific unless evidence changes |
| Messages header                              | Embedded card/thread header with unread count and mobile mode                                       | High false-abstraction risk                  | Is it a page header? Current evidence says no                                                                     | Keep feature-specific                        |
| Inspection UX matrix header                  | Internal evidence/capture toolbar                                                                   | Low user impact but specialized              | Does it need normal module structure?                                                                             | Review; likely retain                        |
| Error/auth/maintenance headings              | Standalone application-state screens                                                                | High false-abstraction risk                  | Are these module pages? No                                                                                        | Exclude                                      |
| `AppBreadcrumb`                              | Exported but not rendered                                                                           | Product-change risk                          | Is a breadcrumb required by an approved product decision?                                                         | Do not mount                                 |

## 7. Day 21 — Inventory and Behavior Classification

### Task 21.1 — Reconfirm the starting boundary

Before source changes:

1. Confirm `HEAD` is at or descended from `ab293a9`.
2. Record `git status --short` and stop if unrelated edits overlap candidate files.
3. Confirm no build output or temporary evidence is staged.
4. Re-read the Stage 3 residual risks so compatibility adapters are not accidentally removed.

### Task 21.2 — Regenerate usage evidence

Record production-only file lists for:

- direct imports and render sites of all five components in Section 3.1
- `CNav`, `CNavItem`, and `CNavLink` use outside shared navigation
- `h1` and `vmecc-page-title` use outside `ModulePageHeader`
- `ArrowLeft`, `cilArrowLeft`, and equivalent back controls outside `BackButton`
- route-aware navigation implemented with local buttons or selects
- local CSS classes that duplicate shared header, navigation, or back presentation

Exclude tests from production counts but record existing direct and integration tests separately.

### Task 21.3 — Build the decision matrix

For every outlier, record:

- file and rendered context
- user purpose
- desktop and mobile presentation
- semantic heading/navigation behavior
- current route destination and navigation options
- active matching rules
- disabled/hidden conditions
- permission filtering
- guard or confirmation behavior
- test coverage
- disposition: reuse as-is, improve existing, retain domain-specific, or defer/remove later

### Day 21 gate

Day 21 passes when the file lists and dispositions are complete enough that no candidate is selected merely by filename, icon, or visual resemblance. Documentation-only Day 21 work requires link, path, formatting, and diff checks; it does not require the full unit suite or production build.

**Result:** Passed on 2026-08-04. The inventory confirmed strong existing header/tab adoption and selected only the exact Reports/Inspection compact mobile Back pair.

## 8. Day 22 — Contract Review and Pilot Approval

### Task 22.1 — Audit shared contract tests

Re-read the assertions in `src/components/__tests__/uiDebtPrimitives.test.jsx` and affected consumer suites. At minimum, verify coverage for:

- page heading level and responsive subtitle behavior
- action wrapping and caller content
- absence of false tab roles
- `aria-current` on active navigation
- disabled item semantics and disabled reason
- scroll and select mobile variants
- exact, prefix, array, custom, and route-state navigation behavior used by selected consumers
- async navigation guard allow/deny behavior
- back-button label, click behavior, destination behavior, type, and accessible name

Add missing characterization against the untouched implementation before production edits.

### Task 22.2 — Decide whether a shared change is necessary

Allowed outcomes:

1. **Reuse as-is:** migrate a consumer without changing the shared contract.
2. **Improve existing:** add one generic, evidence-backed capability required by at least two equivalent consumers.
3. **Retain domain-specific:** record why the semantics differ.
4. **No source change:** close Days 21–24 as an adoption audit when no beneficial migration exists.

A shared API change is rejected when it introduces terms such as Inspection, Report, payroll, permission, draft, workflow stage, history panel, or a particular route.

### Task 22.3 — Select the maximum authorized batch

The default maximum is the exact duplicated compact mobile Back presentation in:

- `src/views/inspection/app/InspectionModuleHeaderActions.js`
- `src/views/report/Reports.js`

Both handlers, guard timing, visibility calculations, and parent state must remain local. Do not include the fire-extinguisher detail page or side panel in the same source commit.

If the pair is not behaviorally identical after characterization, perform no migration and record the difference.

### Day 22 gate

Source work may begin only when:

- the selected consumers have identical user purpose and presentation
- handler timing and callback arguments are characterized
- mobile visibility and desktop absence are characterized
- route, permission, guard, and state ownership remain in callers
- the intended shared contract contains no domain term
- the rollback can restore only the selected consumers

**Result:** Passed on 2026-08-04. `BackButton` was deliberately left unchanged; a smaller event-forwarding mobile presentation contract was approved for exactly two consumers.

## 9. Day 23 — Characterization and Bounded Implementation

### Task 23.1 — Establish the pre-change baseline

Run the shared primitive suite and the direct suites for every selected consumer. For the preliminary pilot pair, likely anchors are:

```text
src/components/__tests__/uiDebtPrimitives.test.jsx
src/views/report/__tests__/Reports.detailRoute.test.jsx
src/views/inspection/__tests__/InspectionModule.routes.test.jsx
```

Test filenames are not proof. Add assertions before implementation when they do not protect:

- exact Back label and accessible name
- mobile-only visibility classes
- icon presence without duplicate accessible text
- click callback count and timing
- guarded navigation behavior in Reports
- Inspection section-back behavior
- non-rendering when the Back action is unavailable
- coexistence and ordering with the primary create/conduct action

The expanded characterization must pass against the untouched source.

### Task 23.2 — Implement only the approved presentation reuse

Implementation rules:

- prefer an existing `BackButton` capability when it can preserve exact presentation and semantics
- otherwise extract the smallest generic presentation component justified by both consumers
- keep route navigation and state transitions in caller callbacks
- preserve existing classes until an approved style-source decision replaces them
- preserve button type, color, variant, size, icon size, label, responsive classes, action order, and test identifiers
- do not change shared defaults used by existing consumers
- do not modify the parent page header, tab set, route catalogue, or guard implementation

### Task 23.3 — Immediate migration audit

After implementation:

- run changed-file ESLint and formatting checks
- run shared and direct consumer tests
- compare the source diff with the approved file list
- search for the exact duplicate only in the selected consumers
- confirm desktop and mobile action availability remains unchanged
- inspect callback arguments and navigation options
- revert the pilot if parity requires workflow-specific shared flags

### Day 23 gate

Day 23 passes only when the source diff is smaller and clearer than the duplicate it replaces, all behavior-sensitive tests pass, and no new domain controller has been created.

**Result:** Passed on 2026-08-04. Characterization revision `3672584` preceded implementation revision `ae5cfe2`; handlers and navigation ownership remained local.

## 10. Day 24 — Pattern-Family Checkpoint

### Task 24.1 — Proportional validation

Always run:

- changed-file ESLint
- changed-file Prettier check
- shared primitive tests
- every affected consumer's direct tests
- relevant route/guard integration tests
- import, render-site, duplicate-markup, and obsolete-style searches
- `git diff --check`
- full diff review from `ab293a9`

Run full repository ESLint and the complete unit suite when:

- a shared interactive component contract or default changed
- more consumers were affected than the approved pilot
- route-aware behavior was touched
- focused tests reveal previously undocumented coupling

Run the production build only when shared CSS, an export entry point, build-sensitive lazy imports, or other compiled application structure changed. A consumer-only JSX substitution with no style/export change does not automatically require another full build after the passing Stage 3 checkpoint.

Do not run hosted GitHub Actions. Do not deploy.

### Task 24.2 — Generated-build safety

If a build is required:

1. Run `npm run build`.
2. Inspect `git status --short -- build`.
3. Restore tracked output with `git restore --worktree -- build`.
4. Preview untracked removal with `git clean -nd -- build`.
5. Confirm every previewed path is under the repository's `build/` directory.
6. Remove only those generated files with `git clean -fd -- build`.
7. Confirm no build diff remains.

Never delete or replace the entire repository, workspace root, or an unresolved path.

### Task 24.3 — Record the result

Create or update:

```text
upgrade-works/02-completed/FRONTEND_COMPONENT_REUSE_STAGE_4_EXECUTION_2026-08-04.md
```

Record:

- starting and ending revisions
- final decision matrix
- characterization added
- selected migration or documented no-change result
- exact production files changed
- focused and proportional validation results
- remaining consumers and intentional exceptions
- rollback commits
- whether Days 25–28 may begin

### Day 24 gate

The Days 21–24 batch passes when:

- all structure/navigation outliers have dispositions
- any migration preserves route, state, guard, permission, semantic, responsive, and accessibility behavior
- no forced abstraction entered the shared layer
- no obsolete code is deleted without a proven zero-use condition
- all required validation passes
- generated output is clean
- the execution record is complete

**Result:** Passed on 2026-08-04. Full lint, 321 test files / 1,762 tests, and the 6,493-module production build passed. See `FRONTEND_COMPONENT_REUSE_STAGE_4_EXECUTION_2026-08-04.md`.

## 11. Stop Conditions

Stop and restore the previous consumer composition when:

- a shared component needs a domain-specific flag or route name
- active matching changes for an existing URL
- navigation loses or gains `replace`, state, query, hash, or history behavior
- a permission-filtered item becomes visible, hidden, enabled, or disabled differently
- an unsaved-change or async guard runs at a different time
- a desktop action disappears from mobile or a mobile action appears unexpectedly on desktop
- focus, keyboard, semantic heading, accessible-name, or disabled behavior regresses
- standardizing the presentation removes a user capability
- the candidate requires route, state, API, permission, persistence, or workflow changes
- the diff expands into unrelated modules, styles, dependencies, or formatting
- a dirty-worktree overlap cannot be isolated safely

Passing tests do not override these stop conditions.

## 12. Commit and Rollback Boundaries

Preferred commit sequence:

1. Stage 4 plan and inventory decision record
2. pre-migration characterization, when new coverage is required
3. one shared contract adjustment, only if approved
4. selected consumer migration
5. Days 21–24 execution record

Do not combine route changes, broad import rewrites, dead-code deletion, style cleanup, and consumer migration.

Rollback order:

1. Revert the consumer migration first.
2. Retain a compatible shared improvement while another consumer uses it.
3. Revert the shared change only after its consumers are restored.
4. Tests and documentation may be reverted independently when they have no runtime effect.

## 13. Preliminary Validation Commands

Use focused commands while the exact pilot is being decided:

```powershell
npx eslint <changed JavaScript/JSX files>
npx prettier --check <changed files>
npx vitest run src/components/__tests__/uiDebtPrimitives.test.jsx
npx vitest run src/views/report/__tests__/Reports.detailRoute.test.jsx src/views/inspection/__tests__/InspectionModule.routes.test.jsx
git diff --check
git status --short
```

Add direct tests for `BackButton` if its contract changes; do not rely only on consumer mocks.

Run broader checks only under the conditions in Section 10.1.

## 14. Next Boundary

After the Days 21–24 gate passes, the next planned family is Stage 4 Days 25–28: data lists and standard states.

That later batch must reassess remaining direct `MobileRecordList`, `TableLoader`, filter, footer, and empty/error-state implementations individually. The successful Holidays and Overtime pilots do not authorize a repository-wide table conversion.
