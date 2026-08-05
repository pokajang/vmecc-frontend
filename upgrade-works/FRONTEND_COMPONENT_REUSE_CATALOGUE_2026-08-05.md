# VMECC Frontend Component Reuse Catalogue

**Date:** 2026-08-05  
**Application:** `vmecc-frontend`  
**Repository checkpoint:** `9db2a97`  
**Implementation checkpoint:** `a6bbadf`  
**Validation checkpoint:** `c2b5ff5`  
**Programme plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Day 42 plan:** `FRONTEND_COMPONENT_REUSE_STAGE_5_COMPLETION_PLAN_2026-08-05.md`  
**Status:** Final repository-derived shared-component catalogue

## 1. Purpose

This catalogue is the practical reference for selecting, extending, testing, and maintaining reusable frontend components in VMECC. It reflects the current repository after the component-reuse programme, not the earlier candidate inventory.

It catalogues production components under `src/components/`, the programme-approved feature-local shared shell, and active compatibility surfaces. Page-only JSX fragments remain in their domains unless they implement an explicit shared contract.

## 2. Final Inventory Summary

| Inventory item                                                      | Current result |
| ------------------------------------------------------------------- | -------------: |
| Production JS/JSX modules under `src/components/`                   |            124 |
| PascalCase component files                                          |            106 |
| Non-component support modules                                       |             15 |
| Barrel `index.js` files                                             |              3 |
| Component files with zero resolved production importer              |              0 |
| Approved feature-local shared components outside `src/components/`  |              1 |
| Active confirmation compatibility facades outside `src/components/` |              1 |

### 2.1 Component groups

| Path group                        | Component files | Primary ownership                             |
| --------------------------------- | --------------: | --------------------------------------------- |
| `src/components/`                 |              40 | application shell and cross-domain primitives |
| `src/components/ai-helper/`       |              11 | AI Helper feature composition                 |
| `src/components/header/`          |               6 | header overlays and feedback interaction      |
| `src/components/messages/`        |               3 | messaging feature presentation                |
| `src/components/onboarding/`      |               1 | onboarding journey presentation               |
| `src/components/report-workflow/` |              22 | report/inspection workflow presentation       |
| `src/components/staff/`           |               3 | Staff feature composition                     |
| `src/components/table-filters/`   |               3 | `TableFilters` internal presentation          |
| `src/components/users/`           |              12 | User-management feature composition           |
| `src/components/workflow/`        |               5 | cross-domain workflow presentation            |
| **Total**                         |         **106** |                                               |

### 2.2 Excluded support modules

The 15 lowercase modules are hooks, contracts, utilities, constants, or resolvers rather than component definitions:

```text
src/components/ai-helper/constants.js
src/components/ai-helper/pageContextContract.js
src/components/ai-helper/remarkAiCitations.js
src/components/ai-helper/routeContext.js
src/components/ai-helper/uiState.js
src/components/ai-helper/useAiHelperChat.js
src/components/ai-helper/useAiHelperContext.js
src/components/ai-helper/useAiHelperHistory.js
src/components/ai-helper/useAiHelperKnowledge.js
src/components/ai-helper/useAiHelperNotice.js
src/components/ai-helper/useVisibleKnowledgeModules.js
src/components/auditHistory.js
src/components/messages/messageUtils.js
src/components/report-workflow/recordActionResolver.js
src/components/table-filters/useTableFilters.js
```

The three barrels are:

```text
src/components/index.js
src/components/header/index.js
src/components/report-workflow/mobile-home/index.js
```

## 3. Inventory Method and Count Meaning

The inventory used `rg --files` over current `.js`/`.jsx` source, excluded tests and test/spec files, separated lowercase support modules and `index.js` barrels, and resolved production imports through:

- `src/...` aliases
- relative imports
- extensionless `.js`/`.jsx` paths
- directory `index.js` paths
- named imports from the three component barrels
- static and literal dynamic imports

“Production importers” below means unique non-test source files that directly import the component after named-barrel expansion. Internal component-to-component imports count because they are real runtime consumers. Re-export facades are described separately because a re-export is not a normal import edge. “Direct test importers” is not total coverage: zero means there is no test file directly importing that component, not that no consumer test covers it.

Reproduction baseline:

```text
rg --files src/components
rg -l --glob "src/**" --glob "!src/**/__tests__/**" --glob "!src/**/*.test.*" --glob "!src/**/*.spec.*" <canonical import or symbol>
```

High-consumer and zero-consumer results were checked for definition, test, documentation, barrel, and same-name false matches.

## 4. Full Shared-Component Registry

### 4.1 Cross-domain root components

Canonical prefix: `src/components/`.

| Component file                  |     Production importers | Direct test importers |
| ------------------------------- | -----------------------: | --------------------: |
| `ActionConfirmModal.js`         | 1 + compatibility facade |                     1 |
| `AppContent.js`                 |                        1 |                     0 |
| `AppFooter.js`                  |                        1 |                     0 |
| `AppHeader.js`                  |                        1 |                     0 |
| `ApprovalGates.js`              |                       14 |                     0 |
| `AppSidebar.js`                 |                        1 |                     0 |
| `AppSidebarNav.js`              |                        1 |                     1 |
| `AppUpdateBanner.js`            |                        1 |                     1 |
| `AuditHistoryPanel.js`          |                        6 |                     0 |
| `BackButton.js`                 |                       13 |                     1 |
| `BulkSelectionActionBar.js`     |                        4 |                     1 |
| `ButtonLoader.js`               |                       30 |                     0 |
| `CreateActionButton.js`         |                       50 |                     1 |
| `DataTableFooter.js`            |                       22 |                     1 |
| `EditControls.js`               |                       15 |                     0 |
| `ErrorBoundary.js`              |                        3 |                     0 |
| `FormActionGroup.js`            |                       15 |                     1 |
| `GroupedTableHeader.js`         |                        8 |                     1 |
| `IconOptionCard.js`             |                        3 |                     0 |
| `IconOptionGrid.js`             |                        8 |                     1 |
| `InlineFeedbackMessage.js`      |                        4 |                     0 |
| `MaintenanceGraceBanner.js`     |                        1 |                     0 |
| `MobileBottomDrawer.js`         |                       47 |                     1 |
| `MobileModuleBackAction.js`     |                        2 |                     1 |
| `MobileRecordList.js`           |                       12 |                     1 |
| `ModuleNavTabs.js`              |                        3 |                     1 |
| `ModulePageHeader.js`           |                       22 |                     1 |
| `NotificationDrawer.js`         |                        1 |                     1 |
| `PageState.js`                  |                        8 |                     0 |
| `RecordCard.js`                 |                        1 |                     1 |
| `RecordStateBadge.js`           |                        3 |                     0 |
| `ResponsiveRecordCollection.js` |                       16 |                     2 |
| `RouteNavTabs.js`               |                        8 |                     1 |
| `RowActionCell.js`              |                       14 |                     1 |
| `RowActions.js`                 |                       29 |                     2 |
| `SortableTableHeader.js`        |                        2 |                     0 |
| `TableFilters.js`               |                       18 |                     1 |
| `TableLoader.js`                |                       35 |                     0 |
| `TablePeriodSelect.js`          |                        5 |                     0 |
| `WorkflowStatusSummary.js`      |                        8 |                     1 |

Use these cross-domain components only when the user purpose and interaction contract match. App-shell components with one importer are structural owners, not zero-use candidates.

### 4.2 AI Helper components

Canonical prefix: `src/components/ai-helper/`. These components compose the AI Helper experience and should not absorb unrelated module data or workflow rules.

| Component file            | Production importers | Direct test importers |
| ------------------------- | -------------------: | --------------------: |
| `AiHelperHeader.js`       |                    1 |                     1 |
| `AiHelperPanel.js`        |                    1 |                     1 |
| `AiResponseContent.js`    |                    1 |                     1 |
| `ChatView.js`             |                    1 |                     0 |
| `HistoryView.js`          |                    1 |                     1 |
| `KnowledgeListView.js`    |                    1 |                     1 |
| `KnowledgeReaderModal.js` |                    1 |                     1 |
| `KnowledgeView.js`        |                    1 |                     0 |
| `MessageBubble.js`        |                    1 |                     1 |
| `PdfKnowledgeForm.js`     |                    1 |                     0 |
| `ReportModal.js`          |                    1 |                     0 |

### 4.3 Header components

Canonical prefix: `src/components/header/`. Ownership is limited to header dropdowns, mobile overlay composition, and feedback presentation.

| Component file            | Production importers | Direct test importers |
| ------------------------- | -------------------: | --------------------: |
| `AppHeaderDropdown.js`    |                    1 |                     1 |
| `FeedbackReportModal.js`  |                    1 |                     1 |
| `MobileNavSheet.js`       |                    1 |                     1 |
| `MobileOverlayItem.js`    |                    1 |                     0 |
| `MobileOverlaySection.js` |                    2 |                     0 |
| `MobileOverlayShell.js`   |                    2 |                     0 |

### 4.4 Messaging and onboarding

Canonical prefixes: `src/components/messages/` and `src/components/onboarding/`. These are feature-owned components, not general chat/form primitives.

| Component path                                 | Production importers | Direct test importers |
| ---------------------------------------------- | -------------------: | --------------------: |
| `messages/ChatList.js`                         |                    1 |                     1 |
| `messages/ChatThread.js`                       |                    1 |                     0 |
| `messages/NewChatModal.js`                     |                    1 |                     0 |
| `onboarding/TrtProfileCompletionOnboarding.js` |                    1 |                     1 |

### 4.5 Report-workflow components

Canonical prefix: `src/components/report-workflow/`. These components share report/inspection workflow presentation; record mutations, permissions, type rules, and workflow transitions remain in their consumers.

| Component path                              | Production importers | Direct test importers |
| ------------------------------------------- | -------------------: | --------------------: |
| `MobileChoiceList.js`                       |                    5 |                     1 |
| `mobile-home/MobileRecentRecordsSection.js` |                    4 |                     0 |
| `MobileSetupSelectorDrawer.js`              |                    2 |                     0 |
| `MobileSetupSummaryList.js`                 |                    4 |                     1 |
| `MobileSetupSummaryRow.js`                  |                    2 |                     1 |
| `mobile-home/MobileTypeSelectionSection.js` |                    5 |                     0 |
| `mobile-home/MobileWorkflowDraftCard.js`    |                    4 |                     0 |
| `mobile-home/MobileWorkflowSection.js`      |                    2 |                     0 |
| `PhotoEditorGallery.js`                     |                    2 |                     1 |
| `RecordDetailActions.js`                    |                    2 |                     1 |
| `RecordScopeSegmentedControl.js`            |                    3 |                     0 |
| `RepeatableTextList.js`                     |                    1 |                     1 |
| `ReportPhotoGallery.js`                     |                    2 |                     1 |
| `ReportViewComponents.js`                   |                   12 |                     1 |
| `RespondingTeamSummary.js`                  |                    2 |                     0 |
| `ResponsiveChoiceSelector.js`               |                    6 |                     1 |
| `TypeManagerModal.js`                       |                   10 |                     1 |
| `WorkflowInlineFeedback.js`                 |                    3 |                     1 |
| `WorkflowRosterGroup.js`                    |                    2 |                     1 |
| `WorkflowSetupField.js`                     |                    1 |                     1 |
| `WorkflowStageActions.js`                   |                    5 |                     1 |
| `WorkflowSummaryList.js`                    |                    4 |                     1 |

The `mobile-home/index.js` barrel is active. Its named imports were expanded to the four mobile-home component files when counting consumers.

### 4.6 Staff and table-filter components

| Component path                        | Production importers | Direct test importers |
| ------------------------------------- | -------------------: | --------------------: |
| `staff/StaffActionModals.js`          |                    2 |                     1 |
| `staff/StaffMessageModal.js`          |                    1 |                     0 |
| `staff/StaffSelect.js`                |                    3 |                     0 |
| `table-filters/ActiveFilterChips.js`  |                    1 |                     0 |
| `table-filters/FilterControls.js`     |                    1 |                     0 |
| `table-filters/MobileFilterDrawer.js` |                    1 |                     0 |

The three table-filter components are internal pieces of the active `TableFilters` contract. A single importer is correct ownership, not evidence for deletion.

### 4.7 User-management components

Canonical prefix: `src/components/users/`. Role, scope, permission, validation, persistence, and user lifecycle logic remain consumer-owned.

| Component file               | Production importers | Direct test importers |
| ---------------------------- | -------------------: | --------------------: |
| `LoginRecordsPanel.js`       |                    1 |                     0 |
| `RoleAssignmentAddButton.js` |                    2 |                     1 |
| `UserActionModals.js`        |                    1 |                     1 |
| `UserAuditPanel.js`          |                    1 |                     1 |
| `UserBulkActionsBar.js`      |                    1 |                     0 |
| `UserConfirmModal.js`        |                    4 |                     0 |
| `UserFormModal.js`           |                    1 |                     0 |
| `UserListTable.js`           |                    1 |                     0 |
| `UserRoleModal.js`           |                    3 |                     1 |
| `UserRowActions.js`          |                    2 |                     0 |
| `UserSessionsPanel.js`       |                    1 |                     1 |
| `UserSummaryCard.js`         |                    1 |                     0 |

### 4.8 Cross-domain workflow components

Canonical prefix: `src/components/workflow/`. These components own responsive workflow presentation, never domain status transitions or authorization.

| Component file                      | Production importers | Direct test importers |
| ----------------------------------- | -------------------: | --------------------: |
| `ResponsiveFinancialBreakdown.js`   |                    3 |                     1 |
| `ResponsiveKeyValueList.js`         |                    2 |                     0 |
| `ResponsiveWorkflowActionDialog.js` |                    7 |                     0 |
| `WorkflowDetailActions.js`          |                    3 |                     0 |
| `WorkflowDetailHeader.js`           |                    4 |                     1 |

## 5. Programme Adoption Matrix

| Family                        | Canonical source                                                          | Current production adoption                                                                                       | Shared ownership                                                                                        | Consumer ownership                                            | Direct regression evidence                                                     | Disposition                             |
| ----------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------- |
| Action confirmation           | `src/components/ActionConfirmModal.js`                                    | Staff canary plus 31 consumers through the facade                                                                 | responsive modal/drawer, action order, cancellation lock, safe dismissal                                | copy, consequence, labels/colors, callbacks, loading decision | canonical, facade, and Staff modal suites                                      | Active canonical contract               |
| Confirmation facade           | `src/views/shared/ActionConfirmModal.js`                                  | 31 production imports across Leave, Overtime, Inspection, Reports, ERCO, and Staff salary claims                  | one-line re-export only                                                                                 | all domain behavior remains downstream                        | facade suite plus consumer suites                                              | Active compatibility adapter            |
| Specialized user confirmation | `src/components/users/UserConfirmModal.js`                                | `ChatThread`, `UserActionModals`, `UserManagement`, `UserProfile`                                                 | portal/backdrop and custom z-index/style/body hooks                                                     | user/message actions and domain callbacks                     | active consumer suites                                                         | Intentional retained variant            |
| Responsive record collection  | `src/components/ResponsiveRecordCollection.js`                            | 16 production importers, including Holidays, Overtime, Custom Shifts, records, audit, sessions, and salary claims | loading/empty/populated composition; mobile/desktop/footer placement                                    | queries, filtering, rows/cards, actions, pagination state     | collection suite plus Holidays, Overtime, Work Shift and other consumer suites | Active cross-domain contract            |
| Mobile record list            | `src/components/MobileRecordList.js`                                      | 12 resolved production importers, including `ResponsiveRecordCollection`                                          | mobile section/card/list rendering and intrinsic-width containment                                      | record shape construction, status/action semantics            | `ResponsiveRecordCollection` and record-card/list consumer suites              | Active primitive                        |
| Standard states               | `PageState`, `TableLoader`, `InlineFeedbackMessage`                       | 8, 35, and 4 resolved production importers respectively                                                           | presentation of empty/loading/inline feedback                                                           | state detection, retry, request lifecycle, domain message     | exercised directly or through collection/page consumer suites                  | Active selective contracts              |
| Compact mobile Back           | `src/components/MobileModuleBackAction.js`                                | Reports and Inspection                                                                                            | icon, label default, button type, compact mobile-only hierarchy                                         | destination, visibility condition, handler                    | component, Reports route, and Inspection header suites                         | Active exact-pair extraction            |
| Role-assignment Add           | `src/components/users/RoleAssignmentAddButton.js`                         | Create Staff and Manage User Roles                                                                                | icon, outline hierarchy, form-safe type, disabled forwarding                                            | role/scope rules, validation, assignment state, persistence   | component and both consumer suites                                             | Active feature-local contract           |
| ERCO responsive action shell  | `src/views/report/erco/erco-form-components/ErcoResponsiveActionModal.js` | `ChronologyStartModeModal` and `PreMobModeModal`                                                                  | mobile drawer/desktop modal shell, layout, dismissal                                                    | title/body/actions/callbacks and chronology state transitions | `ErcoResponsiveModals.test.jsx`                                                | Active feature-local shared shell       |
| Mobile drawer styling         | `src/scss/components/_mobile-bottom-drawer.scss`                          | `MobileBottomDrawer` and its 47 resolved production importers                                                     | general drawer dimensions, header/body/footer, confirm z-index, touch target, reduced viewport behavior | domain-specific drawer selectors remain feature-owned         | drawer/component/consumer suites and Day 40 responsive evidence                | Active shared style owner               |
| PWA installation              | `src/hooks/usePwaInstallPrompt.js`                                        | App Header, App Sidebar, Default Layout                                                                           | install event/provider, nav affordance, install instructions modal/drawer                               | shell placement                                               | hook tests and retained PWA tests                                              | Active behavior; dormant banner removed |

### 5.1 Responsive collection consumers

The current 16 production consumers are:

```text
src/components/users/UserAuditPanel.js
src/components/users/UserSessionsPanel.js
src/views/admin/AiHelperKnowledge.js
src/views/audit/AuditLogs.js
src/views/inspection/records/AllExtinguishersSection.js
src/views/inspection/records/InspectionRecordsSection.js
src/views/leave/components/LeaveRecordsSection.js
src/views/overtime/components/OvertimeRecordsSection.js
src/views/report/components/ReportRecordsSection.js
src/views/settings/components/WorkShift.js
src/views/staff/leave-management/components/HolidaysTab.js
src/views/staff/leave-management/components/OvertimeRecordsTab.js
src/views/staff/salary-claims-management/components/ClaimRecordsTab.js
src/views/staff/salary-claims-management/components/SalaryRecordsTab.js
src/views/staff/StaffDetails.js
src/views/users/user-management/components/UserManagementTableSection.js
```

## 6. Compatibility Adapters and Removal Conditions

### 6.1 Confirmation facade

`src/views/shared/ActionConfirmModal.js` is a one-line re-export of the canonical `src/components/ActionConfirmModal.js`. It is not a duplicate implementation.

- **Current consumers:** 31 production importers.
- **Keep while:** any production import references `src/views/shared/ActionConfirmModal`.
- **Remove only when:** a separately reviewed migration moves all 31 imports to the canonical path, the facade and representative consumer suites pass, and a production-only import search returns zero.
- **Do not:** delete it as “dead duplication” or mix its migration into unrelated UI work.

### 6.2 Specialized user confirmation

`src/components/users/UserConfirmModal.js` remains used by four production consumers and supports portal/backdrop layering, custom z-index, merged style/class behavior, and body/header test hooks beyond the canonical confirmation contract.

- **Current consumers:** `ChatThread`, `UserActionModals`, `UserManagement`, and `UserProfile`.
- **Keep while:** any consumer requires those specialized layering or hook capabilities.
- **Remove only when:** consumers no longer need the capabilities or a separately approved canonical contract supports them without consumer-specific branching.
- **Do not:** add portal/z-index props to the canonical modal solely to eliminate this filename.

## 7. Intentional Exceptions

| Exception group                     | Why it remains separate                                                                                                                | Revisit only when                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Attachment previews                 | local selection, persisted media, evidence review, camera/gallery, and deletion workflows have different sources and recovery behavior | two or more consumers share the same data lifecycle and action contract                  |
| Status/workflow presentation        | status labels, allowed transitions, approvals, declarations, and financial meaning differ by domain                                    | semantics and transition rules align, not merely badge appearance                        |
| Custom headers                      | task hierarchy, tabs, counts, selectors, and navigation ownership differ                                                               | the same header inputs and responsive hierarchy repeat without domain branching          |
| Loaders/spinners                    | button, table, section, upload, and long-running workflow feedback have different context                                              | the user-facing loading purpose and lock behavior are equivalent                         |
| Back/navigation controls            | `BackButton`, browser/history actions, module Back, detail close, and step navigation have different destinations and placement        | destination semantics and responsive placement match the compact Reports/Inspection pair |
| Forms/dialogs                       | validation, submitted values, destructive consequences, focus entry, and workflow sequences differ                                     | only the outer presentation repeats and all domain behavior can remain local             |
| Feature internals with one importer | internal composition components keep large feature owners readable                                                                     | they become unused or the same contract gains an independent second consumer             |

Single-import structural and feature-internal components are not presumed dead. The import graph found zero PascalCase component file without a production importer.

## 8. Removed Surfaces

The following zero-runtime-use surfaces were removed in Stage 5:

- `src/components/AppBreadcrumb.js`
- `src/components/DocsLink.js`
- `src/components/PwaInstallBanner.js`
- the banner's direct test, exclusive provider fields/storage helpers, barrel entries, and exclusive styles/selectors

A current application/test/public/package search for `AppBreadcrumb`, `DocsLink`, or `PwaInstallBanner` returns zero matches.

PWA installation was not removed. The following remain active:

- `src/hooks/usePwaInstallPrompt.js`
- App Header and App Sidebar install affordances
- provider placement in `src/layout/DefaultLayout.js`
- `beforeinstallprompt` and `appinstalled` handling
- install instruction modal/mobile drawer
- `public/manifest.json`
- application icons under `public/icons/`
- service-worker generation from `src/service-worker/service-worker.template.js` through `vite.config.mjs`

## 9. Reuse-First Contributor Guide

### 9.1 Selection sequence

1. Define the user task, state transitions, and recovery behavior.
2. Search this catalogue and current imports before creating a component.
3. Reuse an existing component when purpose and interaction semantics match.
4. Pass presentation data and callbacks; keep routes, APIs, permissions, validation, calculations, persistence, status meaning, and workflow transitions local.
5. Extend a shared API only when every active consumer can inherit the behavior coherently.
6. Prefer a feature-local shared component for exact duplication inside one domain.
7. Keep implementations separate when data shape, validation, permission, workflow, navigation, status meaning, or recovery differs.
8. Characterize the untouched behavior before migrating an under-tested interaction.
9. Validate every active consumer of a changed shared source.
10. Update this catalogue when a reusable surface, compatibility path, or removal condition changes.

### 9.2 Placement

- Put genuinely cross-domain presentation in `src/components/`.
- Put domain-specific reuse in the narrowest feature directory shared by its consumers.
- Keep support hooks/utilities lowercase and separate from the component count.
- Prefer direct canonical imports for new code. Do not introduce new imports through a compatibility facade.
- Do not create a barrel merely to shorten one import.

### 9.3 Contract design

- Prefer a small stable prop contract over many consumer-named booleans.
- Avoid variants that encode route, role, module, or status decisions.
- Use children/render props for bounded presentation composition, not to hide domain workflows inside a generic shell.
- Make action buttons form-safe with an effective `type="button"` unless submission is intentional.
- Preserve loading and repeated-submit locks.
- For responsive collections, keep mobile cards and desktop rows semantically equivalent and in the same meaningful order.
- For overlays, protect accessible naming, Escape/explicit dismissal, loading locks, action order, and trigger-focus restoration.
- Preserve established coarse-pointer touch targets and visible focus indicators.

### 9.4 Style ownership

- Put general component styles in a component-owned SCSS partial.
- Keep feature-specific selectors in the feature owner.
- Inspect every selector consumer before moving or deleting shared SCSS.
- Do not make a generic component depend on inspection/report/user class names unless the class is an explicitly retained compatibility input.
- Avoid global specificity fixes for a local visual mismatch.

### 9.5 Validation

- Add focused characterization before a risky extraction.
- Run changed-file Prettier and ESLint.
- Run the shared component's tests and every directly affected consumer suite.
- Use a production build when source/style/import boundaries changed.
- Reserve the complete repository suite for cross-cutting or stage checkpoints.
- Keep browser tests read-only unless persistent mutation is explicitly authorized and isolated.

## 10. Maintenance Register

| Item                                 | Current status                   | Next condition/action                                                                  |
| ------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------- |
| Confirmation facade migration        | Deferred; 31 active consumers    | Plan as a standalone import migration with facade and representative consumer coverage |
| Specialized `UserConfirmModal`       | Retained; four active consumers  | Reassess only when layering requirements converge                                      |
| Large shared/view files              | Separate maintainability concern | Use a measured, module-specific plan; do not split solely by line count                |
| Mixed `WorkflowNotifications` import | Existing build advisory          | Address under a performance/chunking plan                                              |
| Bundles over 500 kB                  | Existing build advisory          | Measure user impact before code-splitting changes                                      |
| Authenticated E2E                    | Fixture-blocked locally          | Run only with approved backend/database identities and isolated data                   |
| GitHub-hosted validation             | Disabled by owner cost decision  | Reopen when the owner chooses hosted CI or release governance requires it              |
| Shared cPanel release                | Not performed                    | Use a separate staging/deployment/rollback qualification plan                          |

## 11. Catalogue Update Rule

Update this document when:

- a shared or feature-local reusable component is added or removed
- a compatibility facade gains or loses consumers
- a retained exception becomes a shared contract
- a shared component's semantic ownership changes
- a component moves between canonical paths
- a removal condition is satisfied

Do not update consumer counts from memory. Re-run production-only import resolution and label the checkpoint used.
