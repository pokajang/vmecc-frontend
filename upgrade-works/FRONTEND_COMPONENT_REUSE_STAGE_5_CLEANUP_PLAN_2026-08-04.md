# Frontend Component Reuse Stage 5 Cleanup Plan

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Planning revision:** `4056c45`  
**Parent plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Prior checkpoint:** `FRONTEND_COMPONENT_REUSE_STAGE_4_FORMS_DIALOGS_EXECUTION_2026-08-04.md`  
**Scope:** Stage 5 Days 37–39 — removal of proven superseded or dormant frontend implementations  
**Status:** Planned; cleanup source work has not started  
**Authorization boundary:** Local frontend cleanup only; no deployment, GitHub Actions, backend, API, route-definition, permission, persistence, dependency, product-feature addition, business validation, status, workflow, or broad redesign changes

## 1. Purpose

This plan removes only code whose absence from the runtime graph is proven before deletion. It covers obsolete components, tests, styles, exports, and dead hook fields left behind by earlier product and component-reuse decisions.

Cleanup is not measured by deletion volume. Compatibility facades, adapters, aliases, or components with any real consumer remain. A no-deletion result is acceptable for any candidate whose reference proof becomes ambiguous.

## 2. Required Outcomes

By the end of Day 39:

- every cleanup candidate has runtime, lazy-import, barrel, test, style, route/navigation, and documentation reference evidence
- only zero-runtime-use candidates are removed
- active PWA installation through the header, sidebar, provider, and responsive instruction dialog remains intact
- no route or product behavior is added to replace removed dormant UI
- compatibility facades and aliases with consumers remain and have documented removal conditions
- exports, tests, selectors, and dead state associated only with removed components are cleaned together
- focused regressions, full lint, production build, generated-output cleanup, and source-boundary checks pass
- the execution record and programme trackers identify deletions, retained adapters, rollback commits, and Day 40 readiness

## 3. Reference-Proof Standard

A candidate may be deleted only when all applicable checks are empty outside the candidate set:

1. exact symbol search across tracked source, tests, E2E, scripts, and configuration
2. exact path search across the repository
3. static `import` and `export from` search
4. dynamic `import()`, `require()`, route `lazy`, and string-path search
5. barrel export and re-export search
6. route, navigation, layout, and application-entry search
7. test and fixture search
8. selector search for candidate-owned classes
9. documentation review distinguishing historical evidence from executable references
10. post-deletion repeat of the same searches

Generated `build/`, dependencies, Git internals, and ignored `.codex-run/` evidence do not count as source consumers. Historical documentation references remain valid evidence of past decisions and are not rewritten merely to erase history.

## 4. Approved Removal Candidates

### 4.1 `AppBreadcrumb`

Current evidence:

- `src/components/AppBreadcrumb.js` defines the component
- `src/components/index.js` imports and exports it
- no production renderer, route, layout, lazy import, test, or dynamic reference exists
- Stage 4 explicitly retained it for Stage 5 zero-use reassessment rather than mounting it
- historical upgrade records describe that decision and remain unchanged

Approved cleanup:

- delete `src/components/AppBreadcrumb.js`
- remove its import and export from `src/components/index.js`

Removal does not change navigation because the component is not rendered. Routes remain untouched.

### 4.2 `DocsLink`

Current evidence:

- `src/components/DocsLink.js` defines the CoreUI template documentation link
- `src/components/index.js` imports and exports it
- no production renderer, route, layout, lazy import, or test exists
- its only non-source mention is historical component-catalogue documentation

Approved cleanup:

- delete `src/components/DocsLink.js`
- remove its import and export from `src/components/index.js`

No documentation link is removed from the running application because none is rendered.

### 4.3 Dormant `PwaInstallBanner`

Current evidence:

- `src/components/PwaInstallBanner.js` is not imported or rendered by production source
- its only code consumer is `PwaInstallBanner.test.jsx`
- `PwaInstallProvider` is mounted by `DefaultLayout`
- `AppHeader` and `AppSidebar` actively consume `showNavInstallItem` and `openInstallExperience`
- the provider's responsive installation-instructions dialog remains active
- `showBanner`, `dismissBanner`, dismissal storage, and `isMobileLike` state exist solely for the unmounted banner
- `.pwa-install-banner__text` and `.pwa-install-banner__dismiss` selectors exist solely for the unmounted component
- one E2E assertion checks that `.pwa-install-banner` is absent, which is obsolete once the component is deleted

Approved cleanup:

- delete `src/components/PwaInstallBanner.js`
- delete `src/components/__tests__/PwaInstallBanner.test.jsx`
- remove `showBanner`, `dismissBanner`, dismissal storage helpers/key, and banner-only `isMobileLike` state from `usePwaInstallPrompt.js`
- update the hook suite to test the retained nav/provider installation contract only
- remove the two banner-only base selectors
- remove the banner-dismiss selector from the coarse-pointer touch-target group
- remove the obsolete E2E negative banner assertion

The following must remain unchanged:

- `PwaInstallProvider`
- native `beforeinstallprompt` handling
- `appinstalled` handling
- installed-state detection
- iOS, Android, and desktop instruction content
- responsive modal/drawer instruction presentation
- `showNavInstallItem`
- `openInstallExperience`
- header/sidebar install actions

## 5. Retained Components and Adapters

| Candidate                                                     |                                                 Current evidence | Decision | Removal condition                                                                                                |
| ------------------------------------------------------------- | ---------------------------------------------------------------: | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/views/shared/ActionConfirmModal.js` compatibility facade |                31 production files plus 2 tests use the old path | Retain   | Migrate every importer to the canonical path, pass confirmation regressions, then prove zero old-path references |
| `UserConfirmModal`                                            |                                           4 production importers | Retain   | Migrate z-index/custom-style and user-specific consumers without losing behavior, then prove zero references     |
| Inspection aliases emitted by `MobileBottomDrawer`            | Alias source/selectors span 4 files and support broad drawer use | Retain   | Audit every affected drawer and compiled selector before alias removal                                           |
| `MobileSetupSummaryList`                                      |                         4 production consumers plus direct tests | Retain   | Remove only after all report/inspection setup consumers migrate or disappear                                     |
| `BackButton`                                                  |                   13 consuming production files plus source/test | Retain   | No cleanup condition currently met                                                                               |
| `MobileModuleBackAction`                                      |                 2 approved production consumers plus source/test | Retain   | Active Stage 4 shared presentation                                                                               |
| `ResponsiveRecordCollection`                                  |                        16 production consumers plus source/tests | Retain   | Active shared collection primitive                                                                               |
| `RoleAssignmentAddButton`                                     |                          2 production consumers plus source/test | Retain   | Active feature-local shared presentation                                                                         |
| `ErcoResponsiveActionModal`                                   |             2 production consumers plus source/integration tests | Retain   | Active feature-local shared presentation                                                                         |
| Active PWA provider and install entry                         |                          Layout, header, sidebar, and hook tests | Retain   | Product decision and separate migration required                                                                 |

## 6. Explicitly Out of Scope

- migrating the 31 old-path confirmation importers
- removing `UserConfirmModal`
- removing Inspection compatibility classes from `MobileBottomDrawer`
- changing PWA installation availability, copy, prompt timing, header/sidebar placement, or modal/drawer behavior
- deleting historical upgrade or archived UI/UX documentation
- changing routes, navigation, permissions, APIs, validation, workflows, or stored data
- dependency or lockfile changes, including removal of `prop-types`
- deleting components merely because they have few consumers
- broad unused-code tooling adoption or repository-wide dead-code removal
- renaming, reformatting, or restructuring unrelated files
- Day 40 visual consistency corrections
- Day 41 final full checkpoint or Day 42 final catalogue/handover
- deployment, GitHub Actions, shared-cPanel configuration, or release qualification

## 7. Approved File Boundary

The maximum application and test boundary is:

```text
src/components/AppBreadcrumb.js                                      delete
src/components/DocsLink.js                                           delete
src/components/index.js                                              modify
src/components/PwaInstallBanner.js                                   delete
src/components/__tests__/PwaInstallBanner.test.jsx                   delete
src/hooks/usePwaInstallPrompt.js                                     modify
src/hooks/__tests__/usePwaInstallPrompt.test.jsx                     modify
src/scss/foundation/_base.scss                                       modify
src/scss/components/_touch-targets.scss                              modify
tests/e2e/uiux-post-p1-polish.spec.js                                modify
```

Durable records under `upgrade-works/` are separately allowed. Any other application, style, test, script, or configuration file requires stopping and amending the plan before work proceeds.

## 8. Planning Baseline

The complete Stage 4 checkpoint passed immediately before this cleanup plan: full lint, 324 files / 1,779 tests, all applicable audits, and production build.

The focused PWA baseline also passed on untouched cleanup source:

```text
npx vitest run \
  src/components/__tests__/PwaInstallBanner.test.jsx \
  src/hooks/__tests__/usePwaInstallPrompt.test.jsx \
  src/components/__tests__/AppSidebarNav.test.jsx \
  src/components/header/__tests__/AppHeaderDropdown.test.jsx \
  --reporter=dot
```

Result: 4 files / 13 tests passed. Three existing non-failing jsdom pseudo-element notices were emitted.

## 9. Day 37 — Final Reference Proof and Simple Template Cleanup

### Task 37.1 — Reconfirm boundary

1. Confirm `HEAD` is at or descended from the plan commit.
2. Record `git status --short`; stop on overlapping source edits.
3. Confirm generated output and `.codex-run/` evidence are not staged.

### Task 37.2 — Repeat zero-use proof

Repeat exact symbol/path, import/export, dynamic import, route/navigation/layout, test, selector, and documentation searches for all three approved candidate groups. If any new external code reference appears, remove that candidate from the batch.

### Task 37.3 — Remove template artifacts

Delete `AppBreadcrumb.js` and `DocsLink.js`; remove only their imports and exports from `src/components/index.js`.

Immediately:

- run Prettier and ESLint on `src/components/index.js`
- repeat exact symbol and path searches
- run full ESLint import resolution if a local check cannot prove barrel safety
- inspect the commit diff for only two deletions and four barrel lines

### Day 37 gate

Day 37 passes when both template components have no code reference, the barrel remains valid, full lint or equivalent import resolution passes, and no route/navigation behavior changed.

## 10. Day 38 — Dormant PWA Banner Cleanup

### Task 38.1 — Preserve the active contract

Before editing, record the provider fields used by `AppHeader` and `AppSidebar`, native prompt behavior, installed-state behavior, and responsive instruction dialog tests.

### Task 38.2 — Remove the dormant branch

Apply only the changes in Section 4.3. Remove banner-only state and helpers without altering the active provider fields or installation dialog.

The retained hook value must continue to expose:

- `isInstalled`
- `canNativeInstall`
- `platformVariant`
- `showNavInstallItem`
- `openInstallExperience`
- `closeInstallExperience`

### Task 38.3 — Test cleanup behavior

Update `usePwaInstallPrompt.test.jsx` by removing banner/dismissal storage setup and assertions while retaining tests for:

- native prompt acceptance
- iOS instructions
- Android instructions
- desktop instructions
- nav item visibility before and after installation

Delete only the standalone banner suite. Run the retained hook, sidebar navigation, and header dropdown suites.

### Task 38.4 — Style and E2E residue

Remove only candidate-owned selectors and the obsolete negative banner assertion. Search again for `pwa-install-banner`, `showBanner`, `dismissBanner`, and `PWA_INSTALL_DISMISSED_KEY`; every code/style/test result must be empty.

### Day 38 gate

Day 38 passes when the dormant banner surface is absent, the active PWA install experience remains tested, candidate selectors and dead hook fields are gone, and the diff contains no unrelated PWA or UI change.

## 11. Day 39 — Cleanup Checkpoint

### Task 39.1 — Quality and focused regressions

Run:

1. changed-file Prettier
2. changed-file ESLint
3. full `npm run lint` to detect any missed import/export reference
4. retained PWA hook, sidebar-navigation, and header-dropdown tests
5. any stylesheet audit directly affected by selector removal

The removed banner suite cannot be counted as a passing final suite. Record final focused totals from the retained test files only.

### Task 39.2 — Production build

Run `npm run build`. Existing mixed-import and large-chunk advisories may remain, but any new compilation or Sass error fails the batch.

### Task 39.3 — Guarded build cleanup

1. Inspect `git status --short -- build`.
2. Restore tracked build output with `git restore --worktree -- build`.
3. Preview untracked output with `git clean -nd -- build`.
4. Resolve every preview path and verify it is inside the resolved repository `build/` directory.
5. Remove only those validated paths with `git clean -fd -- build`.
6. Confirm build status is clean.

### Task 39.4 — Boundary and residue audit

- `git diff --check` from the plan commit
- exact changed-file comparison with Section 7
- forbidden diff for package, lockfile, route, API/service, permission, persistence, workflow, GitHub Actions, and generated build files
- post-deletion exact reference search
- confirm retained facades/aliases still have their recorded consumers
- confirm historical documentation was not rewritten to conceal past state

### Task 39.5 — Durable execution record

Create:

```text
upgrade-works/FRONTEND_COMPONENT_REUSE_STAGE_5_CLEANUP_EXECUTION_2026-08-04.md
```

Record reference proof, deletions, retained adapters and removal conditions, exact validation, build cleanup, rollback commits, and Day 40 readiness.

### Day 39 gate

Days 37–39 pass only when:

- every deletion has a reproducible zero-runtime-use proof
- active PWA installation remains available and tested
- removed symbols, paths, selectors, exports, tests, and dead fields leave no executable residue
- retained facades and aliases remain intact
- full lint, focused tests, affected audits, and production build pass
- generated output and worktree are clean
- execution records and trackers agree

## 12. Stop and Revert Conditions

Stop before deletion or revert the relevant commit when:

- a candidate gains any runtime, lazy, barrel, route, navigation, layout, or test consumer outside the approved deletion set
- a barrel export is consumed through a namespace or computed property that exact symbol search cannot resolve
- `AppBreadcrumb` or `DocsLink` is part of an external package surface
- removing the PWA banner fields affects header/sidebar visibility, native prompting, instruction copy, or responsive dialog behavior
- a candidate-owned selector is also used by another component
- a failing test or build error cannot be attributed and repaired within the approved boundary
- a route, API, permission, workflow, dependency, or unrelated style enters the diff
- additional dead code is discovered that requires expanding the approved file set

When stopped, retain or restore that candidate, document the reference, and continue only with independently proven candidates.

## 13. Commit and Rollback Boundaries

Preferred commits:

1. Days 37–39 cleanup plan
2. remove unused CoreUI template components and barrel exports
3. remove dormant PWA banner surface while retaining active install behavior
4. cleanup checkpoint and execution record

Rollback:

- revert the PWA cleanup commit independently if install behavior regresses
- revert the template cleanup commit independently if a hidden barrel consumer is discovered
- retain the plan and execution evidence
- rerun the affected focused suites, lint, and build after rollback

No backend or stored-data rollback is required.

## 14. Mishap Prevention Controls

- Delete files only through reviewed explicit patches.
- Do not run a repository-wide clean or unused-code autofix.
- Repeat reference searches immediately before and after each deletion commit.
- Keep template cleanup and PWA cleanup independently reversible.
- Do not remove active PWA hook/provider fields because their names resemble dead banner fields.
- Do not remove `isMobileLikeDevice`; it remains part of platform detection.
- Do not remove historical documentation references.
- Do not remove Inspection compatibility selectors or confirmation facades opportunistically.
- Do not change UI copy, route placement, breakpoint, or install prompt timing.
- Use guarded Vite output cleanup only after a successful build.
- Preserve unrelated user changes and stop on overlap.

## 15. Definition of Done

Days 37–39 are complete when:

- approved zero-use components and their exclusive residue are removed
- active consumers and adapters are retained with explicit removal conditions
- active PWA behavior is unchanged and tested
- full lint, focused regressions, affected audits, and production build pass
- no prohibited or generated file enters the committed diff
- deletion commits are independently reversible
- the execution record, master plan, and directory index are current

## 16. Next Boundary

After the Day 39 gate passes, Day 40 may begin a representative consistency review at supported desktop and mobile sizes. Day 40 corrections require their own evidence and must not reopen deleted dormant features without a product decision.
