# VMECC Frontend Component Reuse Audit

**Date:** 2026-08-04  
**Plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Baseline revision:** `2425780`  
**Scope:** Stage 2 Day 6 component and usage inventory  
**Status:** Completed — documentation and read-only source analysis only  
**Application source changed:** No

## 1. Outcome

The frontend already has a substantial reusable-component foundation. The main quality gap is inconsistent adoption and overlapping shells at the edges, not an absence of shared components.

The strongest current reuse includes:

- standard create actions and button loading
- loading states
- page headers
- filter controls, table footers, row actions, and responsive record collections
- shared report/inspection workflow building blocks
- responsive mobile drawers
- navigation tabs and workflow action layouts

The safest next step is not to create another component library. Day 7 should compare a small set of high-evidence overlaps and assign one of four dispositions: reuse as-is, improve an existing component, extract a bounded shared shell, or keep domain-specific.

## 2. Method and Limits

The audit used repository source inspection and a local import-graph scan across JavaScript and JSX files.

Measured evidence:

- production files under `src/components/`
- production files under `src/views/**/shared/`
- incoming production and test imports resolved from relative and `src/` aliases
- cross-directory consumers of nested component groups
- duplicate production basenames
- direct CoreUI and shared-component usage by pattern family
- zero-production-import component candidates
- representative source comparisons for apparent overlaps

Usage counts in this record mean distinct incoming production source files. They may include a re-export file and do not equal runtime render counts. Dynamic values, non-standard module resolution, or components reached outside static imports could be missed. A zero-import result is therefore a removal candidate requiring a final repository search, not automatic deletion permission.

Text searches such as “No records found” are discovery signals only. The same wording can represent a collection empty state, validation message, toast, helper text, or domain result; these must not be consolidated blindly.

## 3. Inventory Summary

| Inventory area | Result |
| --- | ---: |
| Production files under `src/components/` | 124 |
| Top-level `src/components/` files | 43 |
| Nested component-group files | 81 |
| Component files with at least one incoming production import | 123 |
| Component files with no incoming production import | 1 |
| Production files under `src/views/**/shared/` | 5 |
| Duplicate production basenames across `src/` | 50 groups |

The 50 duplicate-basename groups are not 50 confirmed duplication defects. Many Inspection entries are compatibility façades or domain-type counterparts.

### 3.1 Top-level catalogue

| Responsibility | Existing top-level files |
| --- | --- |
| Application shell | `AppContent`, `AppFooter`, `AppHeader`, `AppSidebar`, `AppSidebarNav`, `AppBreadcrumb`, `ErrorBoundary` |
| Page and navigation structure | `ModulePageHeader`, `ModuleNavTabs`, `RouteNavTabs`, `BackButton`, `DocsLink` |
| Data collections | `TableFilters`, `TablePeriodSelect`, `TableLoader`, `DataTableFooter`, `SortableTableHeader`, `GroupedTableHeader`, `ResponsiveRecordCollection`, `MobileRecordList`, `RecordCard` |
| Row and bulk actions | `RowActions`, `RowActionCell`, `BulkSelectionActionBar` |
| General actions | `CreateActionButton`, `ButtonLoader`, `FormActionGroup`, `EditControls` |
| States and feedback | `PageState`, `InlineFeedbackMessage`, `RecordStateBadge`, `WorkflowStatusSummary`, `ApprovalGates` |
| Responsive/mobile surfaces | `MobileBottomDrawer`, `MobileRecordList`, `ResponsiveRecordCollection` |
| Selection controls | `IconOptionCard`, `IconOptionGrid` |
| Audit/history | `AuditHistoryPanel`, `auditHistory` |
| Banners/drawers | `AppUpdateBanner`, `MaintenanceGraceBanner`, `NotificationDrawer`, `PwaInstallBanner` |
| Export surface | `index.js` |

### 3.2 Nested component groups

| Group | Production files | External production importers | Externally used files | Assessment |
| --- | ---: | ---: | ---: | --- |
| `report-workflow/` | 24 | 49 | 20 | Strong cross-domain reuse across report and inspection workflows |
| `ai-helper/` | 22 | 8 | 4 | Mostly cohesive internal feature system with a small public surface |
| `users/` | 11 | 5 | 11 | Domain-named group also used by staff and messages; boundary deserves review |
| `header/` | 7 | 4 | 6 | Cohesive application-header subsystem |
| `workflow/` | 5 | 14 | 5 | Strong shared workflow/detail primitives |
| `messages/` | 4 | 1 | 3 | Feature-local component group |
| `table-filters/` | 4 | 1 | 4 | Internal decomposition behind `TableFilters` |
| `staff/` | 3 | 5 | 2 | Staff selection/action components with cross-feature consumers |
| `onboarding/` | 1 | 1 | 1 | Feature-specific component |

### 3.3 Shared view areas

Only five production files currently live under `src/views/**/shared/`:

- `src/views/shared/ActionConfirmModal.js`
- `src/views/report/shared/emergency-report/ReportPhotoSection.js`
- `src/views/staff/shared/workflowContracts.js`
- `src/views/staff/shared/workflowDeclarations.js`
- `src/views/staff/shared/workflowDomain.js`

`ActionConfirmModal` is cross-domain UI and is the clearest placement mismatch. The staff shared files are domain contracts rather than candidates for global UI ownership.

## 4. Highest-Use Shared Building Blocks

| Component/module | Incoming production files | Observed role |
| --- | ---: | --- |
| `CreateActionButton` | 51 | Standard create/add action presentation |
| `MobileBottomDrawer` | 48 | Shared mobile overlay shell |
| `TableLoader` | 38 | Standard loading state via `PageState` |
| `ButtonLoader` | 30 | In-button progress feedback |
| `RowActions` | 29 | Row action menu/presentation |
| `ModulePageHeader` | 23 | Standard page title, subtitle, and action area |
| `DataTableFooter` | 22 | Record counts and page-size/footer behavior |
| `TableFilters` | 18 | Search, period, structured filters, active summary, and mobile drawer |
| `FormActionGroup` | 15 | Responsive form/workflow action layout |
| `MobileRecordList` | 15 | Standard mobile record rendering |
| `EditControls` | 15 | Reusable edit/save/cancel controls |
| `RowActionCell` | 14 | Consistent desktop row action cell |
| `ApprovalGates` | 14 | Approval history/gate presentation |
| `ResponsiveRecordCollection` | 13 | Loading/empty/mobile/desktop/footer collection shell |
| `BackButton` | 13 | Standard back-navigation control |
| `RouteNavTabs` | 9 | Route-aware tabs composed over `ModuleNavTabs` |
| `WorkflowStatusSummary` | 9 | Workflow status presentation |
| `PageState` | 8 | Loading, empty, and error state foundation |

These counts confirm that changes to the highest-use components have broad impact and should preserve defaults until all current consumers are reviewed.

## 5. Findings

### F1 — Reuse already works well in several pattern families

Evidence:

- `report-workflow/` has 49 external production importers across 20 of its files.
- `workflow/` has 14 external production importers across all five files.
- `CreateActionButton`, `TableLoader`, `ModulePageHeader`, `DataTableFooter`, and `TableFilters` are widely consumed.
- `RouteNavTabs` correctly composes `ModuleNavTabs` instead of duplicating tab rendering.
- `TableLoader` correctly composes `PageState` instead of implementing another loading shell.

Disposition: preserve these composition patterns and use them as the reference model. Do not redesign their APIs without a concrete consumer problem.

### F2 — Responsive collection composition is inconsistently adopted

Across production view files:

- 36 files use CoreUI table components.
- 9 combine the full `TableFilters` + `ResponsiveRecordCollection` + `DataTableFooter` stack.
- 27 table files do not use `ResponsiveRecordCollection`.
- 6 table files use filters or a footer without `ResponsiveRecordCollection`; five manually compose `MobileRecordList` plus a desktop table, while the sixth is the zero-import legacy `RecordsTab` candidate.

The full stack is already used in Audit Logs, AI Knowledge, applicant Leave and Overtime records, report records, inspection extinguisher records, Staff Details, and salary/claim record tabs.

Several staff administration tabs manually combine `MobileRecordList`, a desktop-only table, filters, footer, loading, and empty-state branches. This is a credible adoption opportunity, but not every table should use `ResponsiveRecordCollection`. Settings matrices, nested summary tables, editable grids, and specialized inspection tables may have different interaction contracts.

Disposition: Day 7 should compare the six manual record-list shells first. Do not perform a repository-wide table migration.

### F3 — Confirmation shells overlap and generic ownership is unclear

Evidence:

- `src/views/shared/ActionConfirmModal.js` has 31 production importers across leave, overtime, payroll/staff, reports, and inspection.
- `src/components/users/UserConfirmModal.js` has 5 production importers, including Messages and Staff—not only Users.
- Both implement the same CoreUI modal/mobile-drawer confirmation shell, cancel/confirm actions, disabled handling, and responsive breakpoint.
- `UserConfirmModal` additionally supports stacked-modal z-index/portal behavior and custom styling/test hooks.
- The cross-domain `ActionConfirmModal` lives under `src/views/shared/` rather than the component layer.
- Both confirmation shells contain Inspection-specific drawer body classes despite being used across domains.

Disposition: high-evidence consolidation candidate with medium interaction risk. Day 7 should define one shared confirmation-shell contract, determine whether stacked-modal support is a bounded variant, and remove domain-specific CSS coupling through a compatibility migration. Rich forms and workflow dialogs must remain separate.

### F4 — Standard page states exist, but empty/error presentation remains fragmented

Evidence:

- `PageState` provides loading, error, and empty presentation.
- `TableLoader` delegates to `PageState` and has 38 incoming production files.
- `ResponsiveRecordCollection` delegates loading and empty states to the same foundation.
- Direct `PageState` JSX appears in application suspense/error handling, report/admin lists, and mobile workflow records.
- Searches found 21 production files containing “No … found” and 30 containing “No … available,” but many are domain messages rather than page/collection states.
- Dashboard has its own compact `DashboardEmptyState`, which serves an embedded metric-card context rather than a full page state.

Disposition: review collection/page-level states only. Preserve compact inline, validation, toast, modal-detail, and dashboard-card messages when their context differs. Consider a compact named variant only if multiple equivalent embedded states emerge.

### F5 — Five components have no production importer

Static import evidence identified:

| Candidate | Test imports | Observation |
| --- | ---: | --- |
| `src/components/PwaInstallBanner.js` | 1 | Fully implemented and tested, but not mounted in production |
| `src/views/overtime/components/GroupedHeaderLabels.js` | 1 | Test-only production component candidate |
| `src/views/payroll/components/ClaimTypeSwitch.js` | 0 | Uses shared `IconOptionGrid`, but has no production consumer |
| `src/views/staff/leave-management/components/RecordDetailCard.js` | 0 | Appears superseded by current detail implementations |
| `src/views/staff/leave-management/components/RecordsTab.js` | 0 | Appears superseded by `LeaveRecordsSection` and current tab composition |

In addition, `DashboardHeader.js` exports a default component that is not rendered; `Dashboard.js` imports only `PERIOD_OPTIONS` and `resolvePeriodLabel` from the file and renders a newer dashboard-specific header inline.

Disposition: confirm with a final import/export and route search during Day 7. Then either integrate intentionally, split still-used helpers, or remove the unused component and its obsolete tests/styles. Do not mount `PwaInstallBanner` merely to eliminate a zero-use finding; that is a product behavior decision.

### F6 — Duplicate basenames are often compatibility façades, not duplicate implementations

Examples:

- `src/views/inspection/TypeManagerModal.js` re-exports the UI-layer modal.
- `src/views/inspection/ui/TypeManagerModal.js` and the ERCO counterpart re-export `src/components/report-workflow/TypeManagerModal.js`.
- `src/views/inspection/InspectionForm.js` re-exports the current form implementation.
- multiple Inspection API, storage, state, and record files re-export their newer domain paths.

Disposition: treat these as migration adapters. They may be removable after all consumers use canonical imports, but deleting them is not component extraction and should not be mixed into UI consistency work without a bounded cleanup batch.

### F7 — Attachment previews share a shell but not the same domain behavior

Two `AttachmentPreviewModal` implementations serve four production importers. Both implement:

- CoreUI desktop modal and `MobileBottomDrawer`
- attachment title/body/footer structure
- image/PDF preview
- loading/unavailable states
- open/download/close actions

They differ materially in payload extraction, API fetching, object URL cleanup, zoom behavior, fallback data URLs, download behavior, and attachment metadata.

Both also use Inspection-specific drawer body classes.

Disposition: candidate for a shared responsive preview shell or shared attachment display primitives, not for merging data-loading controllers into one generic modal.

### F8 — Status presentation should share semantics selectively

Evidence:

- 65 production files use CoreUI badges.
- `RecordStateBadge` intentionally supports only draft, published, and queued record states.
- Leave has a domain `StatusBadge` backed by its own status color map.
- Team has a `StatusPill` with on-duty/next/unscheduled semantics.
- Workflow summaries and approval gates already own separate business semantics.

Disposition: do not create one universal status component. Day 7 should identify statuses that truly share meaning and centralize tokens/presentation for those semantics. Domain transitions, labels, and colors should remain domain-owned when meanings differ.

### F9 — Create-action adoption is strong; remaining plus icons require semantic review

`CreateActionButton` has 51 incoming production files. Thirteen production files use a plus-style icon without importing it. Those cases include page creation, modal creation, adding repeatable rows, adding personnel, location selection, and approval rules.

Disposition: review only page-level and section-level create actions for adoption. Inline “add another row/item” controls may correctly use a different action pattern.

### F10 — Custom headers are not automatically bypasses

`ModulePageHeader` is broadly adopted. The three view component filenames containing “Header” serve different purposes:

- `DashboardHeader` is an unused prior default component, while the current Dashboard uses a specialized sticky identity/period header.
- `UserManagementHeader` is an action composite already passed into `ModulePageHeader`.
- `FitnessStageHeader` is workflow progress navigation, not a page title.

Disposition: retain the current Dashboard's domain-specific header unless a future visual decision changes it. Clean the unused old component/helper placement separately. Do not force workflow-progress or action composites into `ModulePageHeader`.

### F11 — Inline spinners are mostly context-specific

Only nine production files use `CSpinner` without `TableLoader`. Their contexts include modal work, AI generation, camera/scanner work, settings mutation, and embedded panels.

Disposition: do not replace inline operation spinners with a page/table loader. Review only inconsistent labeling and accessibility behavior.

### F12 — Large shared files are a separate maintainability concern

The largest production files under `src/components/` include onboarding (731 lines), `AppHeader` (501), AI constants/chat/hooks (409–478), Messages thread (411), and user session/login panels (395–410).

Disposition: do not mix size refactoring into the first reuse batches. Revisit only when Day 7 identifies duplicated responsibilities or a pilot migration requires a clearer boundary.

## 6. Day 7 Candidate Backlog

| Candidate | Evidence strength | Reuse value | Migration risk | Day 7 question |
| --- | --- | --- | --- | --- |
| Confirmation modal shell | High | High | Medium | Can `ActionConfirmModal` become the canonical cross-domain shell with bounded stacked-modal support? |
| Responsive record collection shell | High | High | Medium | Which of the six manual record-list shells match the existing contract without adding domain flags? |
| Page/collection states | High | Medium–high | Low–medium | Which direct empty/error blocks are equivalent to `PageState`, and which are intentionally compact/domain-specific? |
| Unused component cleanup | High | Medium | Low | Are the five zero-import components and old Dashboard header truly superseded or intentionally dormant? |
| Attachment preview shell | Medium–high | Medium | Medium | Can responsive presentation be shared while loading/download controllers remain local? |
| Create-action adoption | Medium | Medium | Low | Which remaining plus-icon controls are page/section creation versus inline additions? |
| Status presentation | Medium | Medium | Medium–high | Which statuses have identical semantics, and which must remain domain-owned? |
| Compatibility façade cleanup | High | Low–medium | Low per file, broad import churn | Which re-exports have zero remaining canonicalization value? |

Recommended Day 7 review order:

1. Confirmation shell
2. Responsive record collection shell
3. Page/collection states
4. Zero-import component confirmation
5. Attachment preview shell
6. Create-action and status semantics
7. Compatibility façades as a separate cleanup candidate

## 7. Explicit Non-Candidates

Do not consolidate these solely on current evidence:

- all CoreUI badges into `RecordStateBadge`
- all CoreUI modals into `ActionConfirmModal`
- all tables into one data-table component
- inline operation spinners into `TableLoader`
- Dashboard's sticky period header into the standard page header
- Fitness workflow progress into navigation tabs or a page header
- the team deletion workflow into a plain confirmation modal; it has required acknowledgements and error handling
- attachment loading, download, and object-URL lifecycle logic into a presentation-only shell
- report, inspection, leave, overtime, payroll, and team domain status rules

## 8. Day 6 Acceptance Result

- Components under `src/components/` and meaningful view-shared areas were catalogued.
- Incoming import counts and representative consumers were recorded.
- Overlapping names and responsibilities were identified.
- Existing shared components with probable local bypasses were identified without assuming all differences are defects.
- Compatibility re-exports and domain-specific patterns were separated from genuine consolidation candidates.
- No application, style, test, dependency, configuration, build, or generated artifact source changed.

Day 6 is complete. Day 7 should produce the detailed repeated-pattern matrix and disposition decisions before any component implementation begins.
