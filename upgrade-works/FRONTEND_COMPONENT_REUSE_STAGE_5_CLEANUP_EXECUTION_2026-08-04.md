# Frontend Component Reuse Stage 5 Cleanup Execution

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Plan:** `FRONTEND_COMPONENT_REUSE_STAGE_5_CLEANUP_PLAN_2026-08-04.md`  
**Plan commit:** `3c0189e`  
**Scope:** Stage 5 Days 37–39  
**Status:** Passed locally; Day 40 ready  
**Deployment status:** Not performed and outside scope

## 1. Outcome

The approved reference-proof cleanup is complete. Three unmounted components and their exclusive residue were removed without replacing or changing runtime product behavior:

- unused CoreUI template `AppBreadcrumb`
- unused CoreUI template `DocsLink`
- dormant `PwaInstallBanner` presentation

The cleanup removed 312 lines and added 2 lines across the ten approved application/test files. The two additions are test-description/import formatting associated with removal; no new runtime feature was added.

Active PWA installation remains available through `AppHeader` and `AppSidebar`, backed by `PwaInstallProvider`. Compatibility facades, aliases, and shared components with consumers were retained.

## 2. Commit and Rollback Boundaries

| Commit    | Change                                                               | Independent rollback                                                                     |
| --------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `3c0189e` | Hardened Days 37–39 plan and tracker checkpoint                      | Retain as planning evidence                                                              |
| `5aae471` | Removed unused `AppBreadcrumb`, `DocsLink`, and their barrel entries | Revert if a hidden external barrel consumer is discovered                                |
| `cbe48bf` | Removed the dormant PWA banner surface and exclusive residue         | Revert if active installation behavior is found to depend on the removed banner contract |

No backend or data rollback is required. After an implementation revert, rerun the affected focused tests, full lint, and production build.

## 3. Day 37 — Reference Proof and Template Cleanup

The reference proof was repeated after committing the plan. Before removal:

- `AppBreadcrumb` appeared only in its defining file and `src/components/index.js`
- `DocsLink` appeared only in its defining file and `src/components/index.js`
- neither component had a renderer, route, navigation entry, layout consumer, lazy/dynamic import, direct test, or executable string-path consumer
- documentation mentions were historical evidence, not executable consumers

Implementation:

- deleted `src/components/AppBreadcrumb.js`
- deleted `src/components/DocsLink.js`
- removed only their two imports and two exports from `src/components/index.js`

Immediate Prettier, changed-file ESLint, exact reference search, whitespace check, and commit-boundary review passed. No route or navigation source changed.

## 4. Day 38 — Dormant PWA Banner Cleanup

### Pre-removal proof

`PwaInstallBanner` had no production importer or renderer. Its only code consumer was its direct test. Banner-specific provider fields and storage existed only for that unmounted component:

- `showBanner`
- `dismissBanner`
- `PWA_INSTALL_DISMISSED_KEY`
- `readDismissed`
- `writeDismissed`
- banner-only `dismissed` and `isMobileLike` state

The `.pwa-install-banner__text` and `.pwa-install-banner__dismiss` selectors were exclusive to the component. The E2E suite contained one negative assertion that the absent banner had count zero.

### Removal

- deleted `src/components/PwaInstallBanner.js`
- deleted `src/components/__tests__/PwaInstallBanner.test.jsx`
- removed only banner-specific state, helpers, and context fields from `usePwaInstallPrompt.js`
- removed banner setup/assertions from the hook suite while retaining native, platform-instruction, and installed-state tests
- removed the two exclusive base selectors and banner dismiss touch-target selector
- removed the obsolete negative E2E assertion

Post-removal exact searches across executable source, tests, styles, scripts, and configuration were empty for all removed symbols, paths, and selectors. Historical documentation was intentionally preserved.

### Protected behavior retained

The following runtime contract remains in source:

- `PwaInstallProvider` mounted by `DefaultLayout`
- `beforeinstallprompt` capture and native prompt execution
- `appinstalled` state transition
- standalone/fullscreen installed-state detection
- iOS, Android, and desktop instruction content
- responsive instruction modal/drawer
- `isInstalled`, `canNativeInstall`, and `platformVariant`
- `showNavInstallItem`, `openInstallExperience`, and `closeInstallExperience`
- header and sidebar install actions
- `isMobileLikeDevice` platform detection

## 5. Retained Components and Removal Conditions

| Retained surface                             |                               Evidence at checkpoint | Removal condition                                                                                     |
| -------------------------------------------- | ---------------------------------------------------: | ----------------------------------------------------------------------------------------------------- |
| shared-path `ActionConfirmModal` facade      |                   31 production consumers plus tests | Migrate every old-path importer and pass confirmation regressions before zero-reference proof         |
| `UserConfirmModal`                           |                               4 production consumers | Preserve its user-specific styling/behavior through an approved migration, then prove zero references |
| Inspection aliases from `MobileBottomDrawer` |                            Broad selector/drawer use | Audit every affected drawer and compiled selector before removal                                      |
| `MobileSetupSummaryList`                     |                    4 production consumers plus tests | Migrate or remove every report/inspection setup consumer first                                        |
| `BackButton`                                 |            13 production consumers plus source/tests | Retain while active consumers remain                                                                  |
| `MobileModuleBackAction`                     |    2 approved production consumers plus source/tests | Retain as active Stage 4 shared presentation                                                          |
| `ResponsiveRecordCollection`                 |            16 production consumers plus source/tests | Retain as an active shared collection primitive                                                       |
| `RoleAssignmentAddButton`                    |              2 production consumers plus source/test | Retain as active feature-local shared presentation                                                    |
| `ErcoResponsiveActionModal`                  | 2 production consumers plus source/integration tests | Retain as active feature-local shared presentation                                                    |
| PWA provider/install entries                 |              layout, header, sidebar, and hook tests | Separate product decision and migration required                                                      |

The post-cleanup search also confirmed these definitions and consumers remain. No retained surface was opportunistically changed.

## 6. Day 39 Validation Evidence

### Focused regressions

Command:

```text
npx vitest run \
  src/hooks/__tests__/usePwaInstallPrompt.test.jsx \
  src/components/__tests__/AppSidebarNav.test.jsx \
  src/components/header/__tests__/AppHeaderDropdown.test.jsx \
  --reporter=dot
```

Result: **3 files / 9 tests passed** in 3.87 seconds. Three non-failing jsdom pseudo-element notices remained; these were also present in the untouched baseline.

The retained coverage verifies native prompt acceptance, iOS/Android/desktop instructions, nav visibility before/after installation, sidebar navigation behavior, and header dropdown behavior.

### Static quality and affected audits

| Check                      | Result                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| changed-file Prettier      | Passed; files already formatted                                                                 |
| changed-file ESLint        | Passed                                                                                          |
| `npm run lint`             | Passed in 41.5 seconds                                                                          |
| `npm run audit:contrast`   | Passed                                                                                          |
| `npm run audit:typography` | Passed: 176 semantic, 62 direct font-size declarations, and 774 tracked legacy small references |
| `git diff --check`         | Passed                                                                                          |

### Production build

`npm run build` passed:

- Vite `7.3.6`
- 6,493 modules transformed
- completed in 10.46 seconds

The existing Workflow Notifications mixed static/dynamic import advisory and chunk-size advisories remained non-failing. No new compile, import, or Sass failure appeared.

### Guarded generated-output cleanup

After the successful build:

1. tracked `build/` changes were inspected and restored
2. untracked cleanup was previewed with `git clean -nd -- build`
3. every previewed path was resolved and verified to be inside the repository `build/` directory
4. only those validated paths were removed with `git clean -fd -- build`
5. `git status --short -- build` and the whole worktree were clean

## 7. Boundary Audit

The implementation diff from plan commit `3c0189e` through `cbe48bf` contains exactly the ten files approved by the plan:

```text
D src/components/AppBreadcrumb.js
D src/components/DocsLink.js
D src/components/PwaInstallBanner.js
D src/components/__tests__/PwaInstallBanner.test.jsx
M src/components/index.js
M src/hooks/__tests__/usePwaInstallPrompt.test.jsx
M src/hooks/usePwaInstallPrompt.js
M src/scss/components/_touch-targets.scss
M src/scss/foundation/_base.scss
M tests/e2e/uiux-post-p1-polish.spec.js
```

No package/lockfile, route, API/service, permission, persistence, workflow, GitHub Actions, backend, or generated build file entered the implementation diff. No deployment or external state change occurred.

## 8. Residual Risk and Confidence

Confidence is based on reproducible references and gates, not deletion volume:

- all removed runtime components were already unmounted
- candidate-exclusive residue was proven before and after removal
- active PWA entry points and provider fields remain directly referenced
- surviving PWA behavior passed focused tests
- full import/lint resolution and the production compiler passed
- the implementation stayed within the pre-approved ten-file boundary

Residual risk is limited mainly to a consumer outside this repository importing the internal `src/components` barrel. No such supported external-package contract is declared in this application repository. If one is later identified, `5aae471` is the isolated rollback point.

## 9. Next Step

Proceed to Day 40 with a separate consistency-review plan. Review representative migrated modules at supported desktop/mobile sizes and fix only evidence-backed inconsistencies through the correct shared or domain-local owner. Day 41 remains the final full code-quality checkpoint, followed by the Day 42 completion record.
