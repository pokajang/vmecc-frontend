# Frontend Component Reuse Pattern Matrix

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Baseline revision:** `3962e29`  
**Parent plan:** `FRONTEND_COMPONENT_REUSE_EXECUTION_PLAN_2026-08-04.md`  
**Stage:** Stage 2 Day 7  
**Status:** Day 7 analysis complete; Day 8 style-source audit pending  
**Change boundary:** Documentation and read-only source analysis only; no application source changed

## 1. Purpose and Method

This matrix compares the candidate pattern families identified by the Day 6 audit. It assigns a bounded disposition to each apparent duplication before application code is changed.

Evidence was collected from static imports, render sites, component source, focused tests, route and export searches, and relevant SCSS selectors. Import counts are distinct production source files, not runtime render counts. A zero-import result is a removal candidate only after the final pre-deletion search defined below.

Disposition terms:

- **Reuse as-is:** adopt an existing contract without adding props.
- **Improve existing:** make a small generic improvement to the established shared component.
- **Extract shared shell:** share presentation while keeping controllers and business rules local.
- **Keep domain-specific:** similarity is insufficient for a safe shared contract.
- **Remove after verification:** no production path was found; delete only in a separate tested cleanup.
- **Product decision required:** code is dormant, but mounting or removing it changes intended product behavior.
- **Defer:** valid candidate, but not part of the first implementation batch.

## 2. Decision Summary

| Priority | Pattern purpose | Current evidence | Proposed owner | Disposition | Reuse value | Risk | Day 8–10 action |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | Plain action confirmation | `ActionConfirmModal`: 31 production importers / 49 render instances; `UserConfirmModal`: 5 importers / 20 instances | `src/components/ActionConfirmModal.js` | Improve existing and relocate through compatibility paths | High | Medium | Audit generic modal/drawer styles, then approve canonical contract |
| 2 | Responsive record collection | 13 production consumers already use the shared component; five live manual compositions repeat the same shell | `src/components/ResponsiveRecordCollection.js` | Reuse as-is for four consumers; consider one generic loading-message improvement for one consumer | High | Medium | Confirm style sources and select one low-risk and one complex pilot |
| 3 | Page/collection loading and empty states | `PageState` is the foundation; `TableLoader` has 38 production importers; manual collection empties remain | `PageState` through `ResponsiveRecordCollection` | Reuse existing components; no new state component or compact variant | Medium–high | Low–medium | Define which migration visuals intentionally become the standard state |
| 4 | Dormant component cleanup | Five production components have no production importer; one Dashboard default export is unused | Existing domain/shared owners | Four safe-removal candidates, one helper split, one product decision | Medium | Low, except PWA decision | Keep cleanup separate from component migrations |
| 5 | Attachment preview presentation | Two implementations serve four production importers and share modal/drawer presentation but not controllers | Domain-owned controllers; possible attachment-specific shell later | Defer shared-shell extraction | Medium | Medium | Revisit after confirmation/collection pilots |
| 6 | Create-action semantics | `CreateActionButton` has 51 production importers; remaining plus icons are mostly inline add controls or informational | Existing `CreateActionButton` plus local inline controls | Reuse as-is; no forced migrations identified | Low incremental | Low | No Stage 3 batch |
| 7 | Status presentation semantics | Shared workflow/payroll color maps already exist; record, leave, team, and workflow statuses differ in meaning | Shared semantic maps plus domain components | Keep domain-specific presentation; no universal badge | Medium | Medium–high if merged | No Stage 3 batch |
| 8 | Compatibility import façades | Inspection contains many explicit re-exports and duplicate basenames | Existing canonical modules | Defer to a separate import-cleanup batch | Low–medium | Low per file, broad overall | Do not mix into UI migrations |

## 3. Pattern 1 — Confirmation Shell

### 3.1 Purpose and consumers

Both implementations ask the user to confirm or cancel a plain action. They are not form controllers and do not own business decisions.

| Implementation | Production importers | Render instances | Representative domains |
| --- | ---: | ---: | --- |
| `src/views/shared/ActionConfirmModal.js` | 31 | 49 | Inspection, Leave, Overtime, Reports, payroll/staff |
| `src/components/users/UserConfirmModal.js` | 5 | 20 | Users, Staff, Messages |

Representative protection exists in:

- `src/views/shared/__tests__/ActionConfirmModal.test.jsx`
- `src/views/users/__tests__/UserProfile.delete.test.jsx`
- `src/views/users/user-management/components/__tests__/UserManagementRowActionsModal.test.jsx`
- route/runtime tests that mock the old `src/views/shared/ActionConfirmModal` import path

### 3.2 Contract comparison

| Concern | `ActionConfirmModal` | `UserConfirmModal` | Decision |
| --- | --- | --- | --- |
| Defaults | “Confirm action”; message string; primary confirm | “Confirm”; null message; primary confirm | Preserve `ActionConfirmModal` defaults; User callers supply titles/messages |
| Message | String or React node wrapped in a body `<div>` on mobile | String or React node rendered directly | Canonical contract supports React nodes; do not interpret content |
| Buttons | Cancel then confirm; independent disabled flags | Same | Canonical behavior |
| Desktop | Centered CoreUI modal | Same | Canonical behavior |
| Mobile | Optional drawer, default enabled; custom media query supported | Drawer always used at the fixed phone query | Preserve `mobileDrawer` and `mobileDrawerQuery`; defaults cover User callers |
| Close protection | Cancel-disabled prevents `onClose` | Same | Canonical behavior and required test |
| Test hooks | `testId` on root modal/drawer | `testId` on desktop header; optional `bodyTestId` | Standardize root/body hooks; compatibility must preserve any relied-on identifier value |
| Custom modal styling | None | `zIndex`, `style`, `className`, portal/backdrop logic | No production caller uses these props; do not promote them into the canonical API |
| Focus/keyboard | CoreUI modal plus `MobileBottomDrawer` | Same base components; custom body scroll effect only for unused z-index path | Rely on shared primitives and add regression coverage for close/focus behavior |

### 3.3 Styling and ownership

Both mobile variants use generic `MobileBottomDrawer`, but their content carries `inspection-mobile-detail-drawer-body` and `inspection-equipment-detail-drawer-body`. The effective `1.35rem` gap comes from `src/scss/features/inspection/core/_setup-drawers.scss`. The confirm drawer z-index and generic footer rule are also stored in that Inspection feature file.

This is an ownership defect: cross-domain components depend on Inspection-named selectors. Day 8 must identify the smallest generic class and source location that preserve the current computed spacing, footer margin, breakpoint, drawer height, and z-index.

### 3.4 Domain rules that remain local

- confirmation title and wording
- destructive versus positive color choice
- permission and eligibility decisions
- API call, state transition, and success/error handling
- rich preview or declaration content assembled by the consumer

### 3.5 Disposition and safeguards

Disposition: **improve existing and relocate through compatibility paths**.

Provisional implementation direction for Day 9 review:

1. Put the canonical general implementation at `src/components/ActionConfirmModal.js`.
2. Keep `src/views/shared/ActionConfirmModal.js` as a compatibility re-export during migration.
3. Convert `UserConfirmModal` to a temporary thin wrapper, then migrate its five importers individually.
4. Do not add z-index, portal, arbitrary `style`, or arbitrary `className` support without a real production consumer.
5. Exclude rich workflow dialogs, form modals, Team deletion presentation, and attachment previews.

Removal condition: delete `UserConfirmModal` only when its five importers have moved, old-path searches are empty, and user/staff/message confirmation tests pass. The `src/views/shared` re-export can remain longer to avoid broad import churn.

Rollback boundary: canonical component plus compatibility paths in one commit; each consumer migration in a later commit. Restore the wrapper or the affected consumer first if a regression appears.

## 4. Pattern 2 — Responsive Record Collection

### 4.1 Existing contract

`ResponsiveRecordCollection` already owns the repeated collection state sequence:

1. loading through `TableLoader`
2. empty through `PageState` or a caller-provided element
3. optional pre-list children
4. mobile sections through `MobileRecordList`
5. caller-owned desktop rendering
6. caller-owned footer

It intentionally does not own filtering, queries, sorting, selection, grouping, tables, pagination calculations, row actions, workflow modals, or domain data.

Accessibility and responsive boundaries remain compositional:

- loading is announced through `PageState` with `role="status"` and `aria-live="polite"`
- desktop table semantics remain with each consumer
- mobile actions remain with each `RecordCard` item
- the shared component switches presentation; it must not remove actions from either view

### 4.2 Manual consumer matrix

| Consumer | Current differences | Fit | Disposition | Risk and tests |
| --- | --- | --- | --- | --- |
| `HolidaysTab.js` | Standard loader, simple filtered-empty message, grouped mobile sections, grouped desktop rows, footer | Exact existing contract | Reuse as-is | Low; direct `HolidaysTab.test.jsx`, but add explicit loading/empty/mobile preservation assertions |
| `OvertimeRecordsTab.js` | Bulk selection bar, month/user groups, pagination, workflow modal after footer | Fits by passing the bulk bar as `children` and leaving the modal outside the collection | Reuse as-is | Medium; direct tests cover grouping, status, pagination, bulk action, keyboard opening |
| `LeaveRecordsSection.js` | Optional review-mode bulk bar, grouping, workflow modal after footer | Fits by keeping domain/modal logic outside and passing only display nodes | Reuse as-is | Medium; direct bulk and keyboard tests exist |
| `AssignmentsTab.js` | Desktop-only matrix/list switcher and two desktop table variants | Fits by composing the switcher and tables inside `renderDesktop` | Reuse as-is | Medium; direct tests protect mobile cards, desktop table, detail and edit actions |
| `SalarySettingsTab.js` | Load error/retry alert, custom loading text, filter-sensitive empty action, audit history below the list | Error/history remain outside; custom empty can be a `PageState` element; current shared loader cannot receive its message | Improve existing only if a generic `loadingMessage` prop is approved; otherwise keep manual | Medium; no direct tab test, so characterization is required before migration |
| `RecordsTab.js` | Desktop-only legacy table; no production importer | Migration has no value | Remove after verification | Low; delete separately with final import/export/route search |

### 4.3 Contract limits

Do not add props for:

- workflow actions or permission logic
- group selection or bulk approval
- matrix/list switching
- table columns, row rendering, or domain grouping
- load-error fetching or retry state
- attachment/privacy rules

A generic `loadingMessage` is the only currently evidenced extension. Day 9 may reject it and leave `SalarySettingsTab` manual if the added prop does not improve the contract.

### 4.4 Pilot ranking for Day 10

- Lowest-risk adoption candidate: `HolidaysTab`.
- Strongest responsive/workflow candidate: `OvertimeRecordsTab` or `LeaveRecordsSection`.
- Do not choose `SalarySettingsTab` as an initial pilot because it lacks a direct test and has custom error, loading, empty-action, and history behavior.
- Do not use `RecordsTab` as a pilot; it is a cleanup candidate.

Rollback boundary: one consumer migration per commit. A failed consumer returns to its manual composition without reverting the shared component or other consumers.

## 5. Pattern 3 — Page and Collection States

### 5.1 Current foundation

| Component | Responsibility | Current evidence |
| --- | --- | --- |
| `PageState` | Loading, empty, and error presentation with title/message/action support | 8 production incoming files; used by app/session, page errors, lists, and shared collection primitives |
| `TableLoader` | Standard collection/table loading state | 38 production importers; composes `PageState` |
| `ResponsiveRecordCollection` | Loading/empty precedence for responsive collections | 13 production consumers; composes both foundations |

`PageState` provides an alert role for errors and a polite live status for loading. Empty state has no forced live announcement, which is appropriate for initial rendering.

### 5.2 Equivalent and non-equivalent states

Equivalent candidates:

- the simple filtered-empty messages in `HolidaysTab`, `OvertimeRecordsTab`, `LeaveRecordsSection`, and `AssignmentsTab`
- the filter-sensitive Salary assignment empty state, expressed as a caller-created `PageState` when its “Clear filters” action must remain
- the manual loading branches replaced as part of an approved responsive-collection migration

Keep local:

- dashboard metric-card empty states
- chat and contact-list embedded empties
- audit-history empties
- modal-detail missing-record messages
- validation, toast, camera, scanner, and inline-operation feedback
- domain messages whose context is not a page or record collection

### 5.3 Disposition

Disposition: **reuse existing components; do not create another state component or a compact variant**.

The first collection migrations should pass simple empty text to `ResponsiveRecordCollection`, intentionally adopting the existing `PageState` visual. Custom action-bearing empties should pass a complete `PageState` element. Any such visual change must be listed in the pilot record as an approved consistency correction.

Removal condition: remove a manual loading/empty branch only within the same tested consumer migration that replaces it.

## 6. Pattern 4 — Zero-Production-Import Components

The final repository-wide name/import/export/route search found no production path beyond the items stated below.

| Candidate | Evidence and replacement | Disposition | Removal condition |
| --- | --- | --- | --- |
| `src/components/PwaInstallBanner.js` | Test-only component; dedicated hook and styles remain; mounting changes product behavior | Product decision required; retain dormant | Owner decides whether and where the install prompt should appear, or explicitly approves removal of component/test/styles while retaining or removing the hook separately |
| `src/views/overtime/components/GroupedHeaderLabels.js` | Test-only; production uses `src/components/GroupedTableHeader.js`, which supplies the same labels with broader shared behavior | Remove after verification | Confirm shared label tests cover pluralization, avatar/no-avatar, stable initials, and test hooks; then delete old file and obsolete test |
| `src/views/payroll/components/ClaimTypeSwitch.js` | No test/import; superseded by `claim-form/ClaimTypeSelection.js`, which includes Exceptional Claim, locking, period selection, and actions | Remove after verification | Re-run name/import search and targeted claim-type tests |
| `src/views/staff/leave-management/components/RecordDetailCard.js` | No import; superseded by `LeaveDetailSection.js` and current derived workflow/history data | Remove after verification | Re-run import/route search and targeted Leave Management detail tests |
| `src/views/staff/leave-management/components/RecordsTab.js` | No import; superseded by current `LeaveRecordsSection` composition | Remove after verification | Re-run import/route search and targeted Leave Management record tests |
| default export in `src/views/dashboard/components/DashboardHeader.js` | `Dashboard.js` imports only `PERIOD_OPTIONS` and `resolvePeriodLabel`; current header is a newer inline responsive implementation | Helper split required | Move helpers to a clearly named helper module, update the one import, test Dashboard period behavior, then delete unused component/hook code |

Cleanup must be a separate commit after Stage 2 decisions. Do not combine these deletions with confirmation or responsive-list source edits.

## 7. Pattern 5 — Attachment Preview Shell

Two `AttachmentPreviewModal` implementations serve four production importers:

- payroll claim-form preview: caller-owned URL/loading/zoom controller, image zoom, new-tab action
- staff salary/claims preview: component-owned API fetch, object-URL lifecycle, MIME/file fallback, metadata, and download action

Both use CoreUI desktop modal, `MobileBottomDrawer`, title/body/footer presentation, image/PDF rendering, loading/unavailable states, and Inspection-named drawer-body classes.

Disposition: **defer shared-shell extraction** until the first two pilots are complete. A later contract may share an attachment-specific responsive presentation shell accepting title, body, and actions. It must not absorb API fetching, object-URL cleanup, zoom state, download fallback, payload extraction, or privacy lifecycle.

Risk is medium because the staff implementation has privacy-sensitive cleanup coverage in `AttachmentPreviewModal.privacy.test.jsx`, while payroll behavior is covered indirectly through readonly/form tests. Roll back per implementation if a future shell changes closed-state retention, URL cleanup, or action availability.

## 8. Pattern 6 — Create Actions

`CreateActionButton` already has 51 production importers. A fresh plus-icon review found remaining uses for:

- adding repeatable objectives, references, personnel, chronology rows, approval rules, staff assignments, custom teams, extinguishers, or locations
- an informational plus icon within salary supplement text

These are inline editing or domain controls, not page-level or section-level creation navigation. They correctly use local buttons and should not be migrated merely for icon consistency.

Disposition: **reuse `CreateActionButton` as-is for page/section creation; retain local inline add controls**. No Stage 3 batch is justified.

## 9. Pattern 7 — Status Presentation

The repository already centralizes truly shared workflow colors in `src/constants/statusPresentation.js`:

- Leave and Overtime re-export `WORKFLOW_STATUS_COLOR`.
- Payroll and salary/claims use the broader `PAYROLL_STATUS_COLOR`.
- `RecordStateBadge` represents draft/published/queued record lifecycle with icons.
- Leave `StatusBadge` presents workflow status through the shared map.
- Team `StatusPill` represents on-duty/next/unscheduled roster meaning.

Disposition: **keep presentation components domain-specific while preserving the shared semantic maps**. Do not convert arbitrary CoreUI badges to `RecordStateBadge` and do not create a universal status component. A future status change should begin at the existing semantic map only when the same label has the same meaning across domains.

## 10. Pattern 8 — Compatibility Façades

Inspection contains many direct re-exports, indexes, and older import paths. Their duplicate basenames do not prove duplicated runtime implementations. They protect incremental module moves and may still be consumed by tests, lazy routes, or neighboring modules.

Disposition: **defer to a separate compatibility-import cleanup**. For each candidate, canonicalize consumers first, run route and module tests, and delete the façade only when exact old-path imports are zero. Do not include façade cleanup in UI consistency commits.

## 11. Day 7 Decision Backlog

### Proceed to Day 8

Audit style sources for only these families:

1. confirmation modal/drawer shell
2. responsive record collection and its footer/mobile visibility rules
3. `PageState`/`TableLoader` loading and empty presentation

The Day 8 output should be added to this file. It must identify canonical existing selectors, generic replacements for Inspection-owned cross-domain classes, breakpoint ownership, z-index behavior, and leakage risks. It must not become a general CSS redesign.

### Carry to Day 9

- exact canonical confirmation props and compatibility mapping
- whether `ResponsiveRecordCollection` receives a generic `loadingMessage` prop
- which simple empty messages intentionally adopt `PageState`
- exact test requirements for both contracts

### Carry to Day 10

- select the straightforward pilot from the confirmation/User consumers or `HolidaysTab`
- select the responsive/workflow pilot from `OvertimeRecordsTab` or `LeaveRecordsSection`
- approve the zero-import cleanup as its own later batch

## 12. Day 7 Completion Check

- All eight candidate families have an evidence-backed disposition.
- All six responsive-list candidates were classified individually.
- Zero-import candidates have explicit decision or removal conditions.
- No proposed shared contract contains API, permission, calculation, persistence, or workflow logic.
- Known accessibility, responsive, styling, test, compatibility, and rollback boundaries are recorded.
- No application source, test, stylesheet, dependency, build output, or configuration file changed.

Day 7 is complete. Stage 2 remains active because the Day 8 style-source audit, Day 9 contract approval, and Day 10 pilot gate are still pending.
