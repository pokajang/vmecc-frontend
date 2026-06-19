# Mobile UI/UX Responsiveness Audit

Date: 2026-06-12

Archived: 2026-06-15

Closure note: This is now a historical audit. The P0/P1 remediation and simplification work identified here was completed through the UI/UX polish and simplification passes. The final UI/UX closure status is archived beside this file in `UIUX_POLISH_WORKS.md`. Production/server release gates remain outside this audit and are tracked in the workspace-level `PENDING_WORKS.md` and `DEPLOYMENT.md`.

Scope: `vmecc-frontend` mobile responsiveness, ERP mobile task usability, touch ergonomics, accessibility, dense surfaces, and tablet breakpoint behavior.

No product code was changed during this audit. `UIUX_POLISH_WORKS.md` was not updated.

## Executive Verdict

The app is no longer merely desktop-responsive. It now has a credible mobile foundation: phone bottom navigation, `md`-aligned shell spacing, mobile record cards across many workflow modules, cleaner page headers, route-backed navigation semantics, shared filter drawers, and a dedicated mobile roster day list.

The product is still not fully mobile-optimized as an ERP. Employee self-service is close to mobile-ready, but manager/admin throughput remains the main gap. Dense review, approval, payroll, settings, assignment, and message workflows still ask phone users to interpret desktop-shaped information or complete too many steps without mobile-first prioritization.

Original audit readiness: **72/100**

Post-remediation status: **closed for the current UI/UX release scope**. The broad design-system ideas, external visual-regression harness, and production UX observations are post-release enhancements, not active blockers in this audit.

Original audit summary, superseded by completed remediation:

- Employee self-service needed targeted hardening.
- Manager operations needed faster repeated review/approval patterns.
- Admin/settings needed role-focused alternatives or documented desktop-first exceptions.
- Payroll and dense detail views needed the strongest mobile simplification.

## Evidence Used

- Static audit of layout primitives, route shells, mobile records, tables, drawers, messages, payroll, roster, settings, and dashboard components.
- Focused browser checks at:
  - `320x568`
  - `390x844`
  - `768x1024`
  - `1024x768`
- Representative checked routes:
  - `/dashboard`
  - `/messages`
  - `/leave/new`
  - `/overtime/new`
  - `/payroll/claims/new/expense`
  - `/payroll/payslips`
  - `/staff/leave-management/leaves`
  - `/staff/leave-management/set-leaves`
  - `/staff/salary-claims/salary`
  - `/staff/set-salary/assignment/new`
  - `/roster/schedule`
  - `/settings/role-permissions`
  - `/settings/dashboard-visibility`
  - `/report/drill/new`
- Visual review of failure screenshots for representative phone routes.
- Broad local audit attempt covered additional routes but timed out on the local stack, so final conclusions are based on focused successful checks plus static component inspection.

## Reverification Notes

A second pass was run against the assessment to separate measured browser findings from source-level risks.

- The sampled phone routes had no document-level horizontal overflow: `scrollWidth` stayed equal to viewport width at `320px` and `390px`.
- The strongest measured dense-table findings are `/payroll/payslips`, `/dashboard`, and `/staff/set-salary/assignment/new`.
- Settings matrices are still source-level desktop-first risks, but the focused phone run did not prove them as visible broken phone tables in the sampled state. They should remain documented exceptions or receive dedicated single-role/single-widget mobile editors.
- Breakpoint inconsistency is confirmed in source: Messages uses `max-width: 991.98px` and `flex-lg-row`, while the app shell uses the `md` phone boundary.
- Notification drawer `lg` behavior is confirmed in global SCSS.
- Touch target risk is confirmed in source: `TableFilters` uses a `34px` mobile filter trigger and `RowActions` defaults to a `34px` hit area.
- A source search found no remaining `role="tablist"` or `role="presentation"` strings under `src`; route-backed fake tab semantics should not remain in the current P2 backlog unless new instances are introduced.

## Remediation Status

Updated: 2026-06-12

- Completed the first P0 hardening pass for touched shared mobile surfaces.
- Messages now uses the `md` phone boundary instead of `lg`, and the list/thread split uses `flex-md-row`.
- Notification drawer phone bottom-sheet behavior now activates only below `md`; `md` and wider keeps the right-side drawer.
- Mobile nav sheet, notification drawer, and shared table-filter drawer now use a shared focus-trap/return-focus hook.
- Shared phone action targets were raised for the touched controls: `RowActions` defaults to `44px`, `TableFilters` mobile trigger is `44px`, and coarse-pointer SCSS hardens drawer/action controls.
- Sticky mobile action spacing now uses `dvh`-aware sizing and a larger spacer for wrapped action rows.
- Payroll Payslips now has a phone-only card layout with expandable stacked detail sections while preserving the desktop table from `md` upward.
- Closed after the audit: dashboard mobile ordering, salary claim read-only/detail stacked summaries, leave assignment phone summaries, settings role-focused editors, manager quick filters backed by current state, and wider shared sticky-action hardening. Future physical-device observations should be logged as production QA findings.

## Expert Findings Summary

### What Is Working Well

- The app shell mostly follows the right breakpoint model: below `md` behaves like phone, while `md` and wider behaves more like tablet/desktop.
- Bottom navigation is phone-only and spacing has mostly been aligned with it.
- Fixed mobile form actions are now scoped to phone widths and have spacer support through `FormActionGroup`.
- Leave, Overtime, Payroll Claims, Reports, Inspection, Operations/Admin records, and Roster have moved substantially away from raw desktop tables on phones.
- `ModulePageHeader`, `ModuleNavTabs`, `MobileRecordList`, and `TableFilters` give the UI a much stronger shared responsive foundation.
- The roster schedule now has the right mobile strategy: a day list instead of a squeezed monthly matrix.
- Route-backed navigation semantics have improved across many modules, with active links using page-current semantics instead of fake tab semantics.

### Historical Mobile Risks And Closure

- Messages and notification drawer behavior were aligned to the below-`md` phone boundary.
- Mobile nav, notification drawer, and shared filter drawer received shared focus trap and return-focus handling.
- Touched shared phone controls were raised to the 44px coarse-pointer baseline.
- Payroll Payslips and salary read-only/detail surfaces received phone-oriented cards or stacked summaries where applicable.
- Leave assignments received phone summaries; settings matrices gained role-focused editors while retaining advanced table views.
- Dashboard mobile priority was improved with an action queue and global period control.
- Manager record cards and bulk bars were simplified through shared record, workflow, and bulk primitives.

## Original Mobile Readiness Score By Area

This score table is preserved as historical audit evidence. It does not represent the final post-remediation closure state.

| Area | Original Score | Original Verdict |
| --- | ---: | --- |
| Self-Service | 82/100 | Mostly mobile-ready, with keyboard-open and short-height checks recommended at audit time. |
| Manager Operations | 67/100 | Responsive shell was good, but repeated review/approve/filter/bulk workflows needed faster mobile patterns. |
| Admin/Settings | 56/100 | Page shell had improved, with matrices needing role-focused alternatives or explicit desktop-first treatment. |
| Dashboard | 62/100 | Responsive and stable, but action queue priority was not yet leading. |
| Messages | 60/100 | Mobile layout existed, but breakpoint, focus, drawer, and composer behavior needed hardening. |
| Payroll | 58/100 | Claims records had improved, while payslips and salary detail/read-only tables still needed mobile alternatives. |
| Roster | 76/100 | Dedicated mobile day list was the right direction, with edit and action validation still recommended. |

## Historical P0 Findings - Closed

### 1. Enforce Breakpoint Consistency

Decision to standardize: **below `md` is phone; `md` and wider is tablet/desktop**.

Current state:

- App header and bottom nav mostly follow `md`.
- Wrapper bottom padding and sticky mobile action bars mostly follow `md`.
- Messages still use `lg` behavior through `max-width: 991.98px` and `flex-lg-row`.
- Notification drawer switches below `lg`.

Original required work, now closed or reclassified:

- Decide whether Messages intentionally needs tablet-as-phone behavior. If not, align it to `md`.
- Align notification drawer width/position behavior with the same phone/tablet boundary unless there is a documented product reason.
- Add regression checks for phone, portrait tablet, landscape tablet, and desktop.

### 2. Harden Sticky Mobile Action Bars

Current state:

- The 320px Leave form check showed the sticky row and bottom nav can coexist.
- `FormActionGroup` has spacer support and phone-only fixed action behavior.
- Long forms still need keyboard-open and short-height verification.

Original required work, now closed or reclassified:

- Verify Leave, Overtime, Payroll Claim, Salary Assignment, Inspection, ERCO, Drill, and Fitness forms at short heights.
- Test with validation errors visible at the final field.
- Test attachment upload sections above fixed actions.
- Confirm submit/draft loading states do not cover final messages.
- Use dynamic viewport units and safe-area-aware spacing where needed.

### 3. Fix Mobile Accessibility Blockers

Current state:

- `MobileNavSheet` has basic focus and return-focus behavior, but not a full focus trap.
- `NotificationDrawer` behaves like a dialog but lacks robust focus trapping and return-focus management.
- `TableFilters` mobile drawer needs focus trap and return-focus verification.
- Several action controls are below 44px.

Original required work, now closed or reclassified:

- Add a shared focus trap/return-focus pattern for mobile sheets, drawers, and offcanvas panels.
- Ensure Escape and backdrop close restore focus to the invoking control.
- Enforce 44px minimum touch targets on coarse-pointer devices for icon buttons, row actions, filter trigger, notification controls, and card actions.
- Replace or harden custom `role="button"` card regions where a native button or link can be used without nesting actions.

### 4. Classify And Remediate Dense Mobile Tables

Current state:

- `/payroll/payslips` remains table-shaped on phone and is not mobile-efficient.
- Salary claim read-only/detail views still rely on dense tables.
- Leave assignment and settings matrices remain complex. Treat settings as desktop-first exception candidates unless a role-focused or single-widget mobile editor becomes the default phone path.

Original required work, now closed or reclassified:

- Convert payslips to mobile cards with expandable details.
- Convert salary claim read-only/detail tables to stacked detail rows on phones.
- Convert leave assignments to employee/balance cards or a single-employee mobile editor.
- Keep permission/dashboard visibility matrices desktop-first only if a role-focused mobile editor is the default phone path.

## Historical P1 Findings - Closed

### 1. Improve Manager Mobile Throughput

Mobile cards should prioritize decision data over table parity.

Recommended card hierarchy:

1. Record identity and owner.
2. Human-readable status or next action.
3. Period/date.
4. Primary metric: days, hours, amount, payable, count, or severity.
5. One compact action menu or clearly separated row actions.

Add mobile quick-filter presets:

- `Needs my action`
- `Drafts`
- `Returned`
- `This month`
- `My team`
- `Unpaid`

Add review-flow accelerators:

- Next/previous record from detail view.
- Sticky approve/reject action area in detail views.
- Preserve disabled reasons as text, not only disabled button state.

### 2. Reorder Mobile Dashboard Around Work

Current state:

- Dashboard is responsive but long.
- Action Queue is present, but mobile users encounter personal/summary panels first.

Recommended mobile order:

1. Action Queue / Needs My Action.
2. Personal operational KPIs.
3. Time-sensitive alerts.
4. Analytics and charts.
5. Secondary module panels.

Desktop can remain richer and denser.

### 3. Harden Messages For Mobile Workflows

Original required work, now closed or reclassified:

- Resolve `lg` versus `md` behavior.
- Verify thread list, thread detail, composer, attachment actions, and keyboard-open states.
- Ensure notification/message drawers trap focus and restore focus.
- Ensure the composer remains reachable at 320px and when the keyboard reduces height.

### 4. Add Dense Table Alternatives

Prioritize:

- Payroll payslips.
- Salary claim read-only/detail tables.
- Leave assignments.
- Simple admin utility tables.
- Audit/detail panels where the mobile card exists but detail remains dense.

Use stacked detail rows instead of cards when the content is read-only and hierarchical.

## Historical P2 Findings - Closed

- Make `DataTableFooter` wrap predictably at 320px without cramped count/action collisions.
- Harden long mobile nav labels with truncation or two-line constraints.
- Use stable dynamic viewport units for offcanvas and drawer heights.
- Standardize workflow status and next-action wording.
- Add visible focus rings for custom interactive surfaces.
- Ensure disabled action reasons are programmatically available.
- Remove color-only meaning from status chips and workflow gates.
- Keep route-backed navigation semantic checks in regression coverage; no remaining `role="tablist"` / `role="presentation"` strings were found under `src` during reverification.

## Route-By-Route Viewport Audit Matrix

| Route | Phone Result | Tablet Result | Verdict | Next Action |
| --- | --- | --- | --- | --- |
| `/dashboard` | No obvious horizontal overflow; page is long and analytics-heavy before action work. | Desktop/tablet shell mostly applies. | Responsive but not mobile-prioritized. | Move action queue first on phones and tighten mobile panel density. |
| `/messages` | Mobile list/thread layout exists. | Uses `lg` behavior, so tablets may receive phone-like layout. | Functional but breakpoint-risky. | Align or document breakpoint; audit composer and drawer focus. |
| `/leave/new` | 320px form layout is usable; sticky action row appears aligned with bottom nav. | Desktop/tablet behavior preserved. | Close to ready. | Add keyboard-open, validation-error, and short-height regression checks. |
| `/overtime/new` | Expected to follow the same stable form pattern. | Desktop/tablet behavior preserved. | Close to ready. | Validate attachments, final fields, validation messages, and sticky actions. |
| `/payroll/claims/new/expense` | Form is phone-usable but dense areas need keyboard and attachment checks. | Desktop/tablet behavior preserved. | Mostly ready. | Validate final fields, salary/expense variants, and error states. |
| `/payroll/payslips` | Dense table remains contained but not mobile-efficient. | Table is appropriate on larger screens. | Mobile-hostile. | Add phone cards or stacked payslip summaries. |
| `/staff/leave-management/leaves` | Mobile records exist and are usable. | Desktop table remains appropriate. | Good foundation. | Add quick filters and stronger next-action decision data. |
| `/staff/leave-management/set-leaves` | Assignment/matrix style remains difficult on phone. | Tablet/desktop table is appropriate. | Needs mobile alternative or explicit exception. | Add employee balance cards or a single-employee mobile editor. |
| `/staff/salary-claims/salary` | Mobile records are improved, but detail/payroll data remains dense. | Desktop table is appropriate. | Partially ready. | Add stacked detail treatment for salary and payable values. |
| `/staff/set-salary/assignment/new` | Complex form/table flow needs short-height and sticky-action checks. | Better suited to tablet/desktop. | Risk area. | Harden mobile action spacing and consider a guided mobile flow. |
| `/roster/schedule` | Dedicated day list is the right mobile model. | Desktop matrix remains available. | Good direction. | Validate edit selects, conflicts, publish/save/cancel at 320px. |
| `/settings/role-permissions` | Focused phone run did not expose a visible broken table, but source still supports a full matrix view. | Matrix can remain for tablet/desktop. | Desktop-first exception candidate. | Make role-focused editor the preferred phone path; document matrix exception. |
| `/settings/dashboard-visibility` | Focused phone run did not prove a visible broken table, but source still renders a full role-by-section matrix when data is present. | Tablet/desktop acceptable. | Desktop-first exception candidate. | Add a single-role/single-widget mobile editor or document exception. |
| `/report/drill/new` | Long but stacked; option grids appear usable. | Desktop/tablet preserved. | Mostly ready. | Validate sticky actions, drafts, attachments, and keyboard-open behavior. |
| `/inspection/new` | Expected to follow improved report/form shell. | Desktop/tablet preserved. | Mostly ready. | Validate final fields and action bar collision. |
| `/report/erco/new` | Expected to follow improved report/form shell. | Desktop/tablet preserved. | Mostly ready. | Validate long fields, attachments, and sticky actions. |
| `/report/fitness-test/new` | Expected to follow improved report/form shell. | Desktop/tablet preserved. | Mostly ready. | Validate option cards, validation messages, and sticky actions. |

## Industry-Standard Deviations

- Some action targets remain below the common 44px mobile touch target minimum.
- Some dialog-like mobile surfaces do not yet have robust focus trap and return-focus behavior.
- Several dense tables remain the primary mobile representation instead of card or stacked-detail alternatives.
- Dashboard mobile ordering does not yet prioritize urgent ERP tasks before analytics.
- Breakpoint behavior is not fully consistent across shell, messages, and notification surfaces.
- Sticky action bars have improved but still need keyboard-open and short-height regression proof.
- Some custom card open regions use `role="button"` instead of native interactive elements; these need continued scrutiny to avoid nested-interactive and keyboard issues.

## Concrete Desktop ERP To Mobile ERP Optimization Proposals

### Phone Task Shell

Define a phone shell contract:

- `md` is the tablet/desktop boundary.
- Bottom nav only below `md`.
- Sidebar/header controls are not focusable when hidden.
- Drawers use dynamic viewport units.
- All drawer/sheet surfaces trap focus and restore focus.
- Coarse pointer controls use at least 44px hit areas.

### Manager Mobile Queue

Create a mobile-first manager queue that appears before dashboard analytics:

- Pending approvals.
- Returned items.
- Drafts requiring completion.
- Unpaid payroll items.
- Items assigned to my team.

This should be a workflow surface, not only a dashboard widget.

### Decision Card Pattern

Use a consistent mobile card grammar for approval/review records:

- Title: record ID or employee.
- Primary state: next action or status.
- Supporting line: type/category and period.
- Metric: days, hours, amount, severity, or count.
- Actions: one action menu or separated row actions outside the open region.

### Stacked Detail Pattern

For read-only dense payroll and report details, use stacked rows:

- Label on the left/top.
- Value on the right/bottom.
- Group related values into sections.
- Avoid horizontal scroll except for explicitly desktop-first matrices.

### Matrix Exceptions

Do not squeeze matrices into phone cards blindly. Use:

- Role-focused editors.
- Single-employee editors.
- Single-widget visibility editors.
- Desktop-first matrix views where batch comparison is the core task.

### Keyboard-Safe Action Bar

Standardize fixed mobile action behavior:

- Use dynamic viewport units.
- Reserve bottom space with a form-level spacer.
- Include safe-area inset.
- Verify against keyboard-open states and short screens.
- Keep final field errors visible above the action row.

### Touch Target Token

Introduce one shared token or class for mobile hit areas:

- Minimum `44px` width and height on coarse pointers.
- Preserve compact desktop controls where appropriate.
- Apply to row actions, icon buttons, filter triggers, notification buttons, drawer close buttons, and card actions.

### Viewport QA Harness

Add a tracked smoke/audit harness later, not as part of this audit:

- Viewport list: `320x568`, `360x640`, `375x667`, `390x844`, `430x932`, `768x1024`, `1024x768`, desktop.
- Check horizontal overflow.
- Check touch targets.
- Check visible fixed action collisions.
- Check drawer focus behavior.
- Capture screenshots only on failure.

## Explicit Desktop-First Exceptions

These surfaces should not be forced into generic mobile cards without a specific alternate interaction model:

- Full role permission matrix.
- Full dashboard visibility matrix.
- Desktop roster monthly matrix.
- Payroll statutory/contribution audit tables.
- Bulk leave assignment matrix.
- Complex print/PDF preview layouts.

Required condition for each exception:

- The route must still load on phone without layout breakage.
- A simplified mobile path should exist for common single-record or single-role work.
- The desktop-first status should be documented in the UI/UX backlog.

## Original Next Step - Completed And Archived

The original next implementation pass was a P0 hardening pass before more visual polish. It has since been completed or reclassified:

1. Align Messages and notification drawer breakpoint behavior with the `md` phone boundary or document the exception.
2. Add focus trap and focus restoration to mobile nav, notification drawer, and filter drawer.
3. Enforce 44px coarse-pointer hit targets for shared icon/action controls.
4. Run keyboard-open and short-height sticky-action checks on the main create/edit forms.
5. Start the first dense-surface conversion with Payroll Payslips, because the original audit identified it as a high-value self-service/admin payroll surface needing a phone alternative.
