# Stage 6 Detail and Summary Presentation Plan

Date: 2026-08-06  
Stage: 6, Days 56–58  
Status: Executed; Days 56–58 passed locally  
Parent: `FRONTEND_MODULE_CONSISTENCY_AND_REUSE_PLAN_2026-08-05.md`

## Objective

Consolidate repeated read-only label/value and summary presentation where structure, responsive
behavior, missing-value handling, and assistive semantics match. Reuse existing primitives before
adding another one, and keep formatting, confidentiality, calculations, links, actions, and domain
interpretation in their consumers.

## Scope

Inventory and disposition:

- label/value grids, metadata cards, definition lists, compact summaries, and financial breakdowns;
- long labels and values, unbroken identifiers, multiline text, and missing values;
- React-node values such as badges, links, buttons, approval gates, and status indicators;
- mobile stacking, desktop alignment, order, wrapping, and overflow;
- `dl`/`dt`/`dd`, headings, accessible names, and keyboard-reachable embedded actions;
- style ownership and light/dark token behavior.

Primary inventory areas are shared workflow/report components; Leave and Overtime; salary claims;
Inspection detail/review; ERCO, Drill, and Fitness summaries; user/staff/team detail; confirmation
dialogs; and administrative metadata.

## Exclusions

Do not centralize:

- date, duration, currency, status, roster-impact, or domain-specific empty-value formatting;
- confidential-field visibility, masking, authorization, or download permission;
- calculations, compliance interpretation, approval history, or workflow ownership;
- editable fields, form state, validation, submission, or navigation;
- arbitrary card, modal, drawer, or page shells merely because they contain label/value rows;
- a universal detail renderer with module switches, field-name logic, or formatting callbacks;
- status badges, approval gates, financial breakdowns, and ordinary text under one polymorphic row
  contract when their interaction or semantics differ.

Dashboard metrics, table rows, loading/empty/error states, and form setup summaries remain separate
families.

## Repository baseline

The initial production scan, excluding tests and visual QA routes, found:

| Family                             |                                                      Evidence |
| ---------------------------------- | ------------------------------------------------------------: |
| `ResponsiveKeyValueList`           |       3 files / 6 symbol references; two production consumers |
| `DetailField`                      |                                6 files / 87 symbol references |
| Inspection `DetailValueBlock`      |                                7 files / 22 symbol references |
| `ResponsiveFinancialBreakdown`     |                                 4 files / 8 symbol references |
| Definition-list markup             |                                         5 files / 5 instances |
| Manual justify-between detail rows |                                       15 files / 23 instances |
| Broad label/value object literals  | 41 files / 169 matches; most are false matches or domain data |

These counts seed the inventory and must not be treated as automatic migration targets.

## Day 56 — Complete inventory and dispositions

For each credible family, record:

| Evidence field      | Required detail                                                              |
| ------------------- | ---------------------------------------------------------------------------- |
| Consumer            | Production file and rendered surface                                         |
| Semantics           | Metadata, detail, summary, metric, financial, status, or confirmation        |
| Source order        | Existing label/value order and conditional rows                              |
| Value ownership     | Consumer formatting, fallback, link/action, badge, or calculated meaning     |
| Responsive behavior | Mobile stack, desktop columns/alignment, wrapping, and overflow              |
| Accessibility       | Heading and `dl`/`dt`/`dd` structure; embedded action name and order         |
| Styling owner       | Shared workflow, report, Inspection, Bootstrap/CoreUI, or feature-local SCSS |
| Tests               | Existing behavior coverage and missing characterization                      |
| Disposition         | Existing adopter, candidate, specialist, false match, or deferred            |

Explicitly distinguish ordinary metadata from approval/status histories, financial values, form
labels, actionable downloads, compact setup summaries, and table/card scanning surfaces. No
production changes are allowed until this matrix and pilot decision are complete.

## Day 57 — Characterization and pilot gate

### Preliminary pilot

Migrate the two manual Leave detail lists to the existing `ResponsiveKeyValueList`:

1. applicant Leave detail: `src/views/leave/components/LeaveDetailSection.js`;
2. staff Leave Management detail:
   `src/views/staff/leave-management/components/LeaveDetailSection.js`.

The primitive already has two proven production adopters: Overtime detail and Salary Claim detail.
The Leave views use the same ordered read-only label/value contract but currently reproduce manual
flex rows.

### Required characterization

Before migration, prove for each Leave consumer:

1. exact field order and conditional row presence;
2. `0` values remain visible and missing values retain the consumer-provided fallback;
3. long roster-impact and reason text wrap without horizontal overflow;
4. status badges and bold next-action content remain React-node values;
5. the Evidence link retains URL, accessible name, new-tab behavior, and keyboard reachability;
6. applicant-only workflow scope/applicant role and action buttons remain intact;
7. staff-only captured roster timestamp and detail test anchor remain intact;
8. Approval Gates remain a separate row after ordinary metadata;
9. label/value semantics become `dt`/`dd` without changing visible order; and
10. missing-record behavior and Back navigation remain unchanged.

Also directly characterize `ResponsiveKeyValueList` for null fallback, numeric zero, long values,
React-node values, caller classes, and compact mode.

### Approval conditions

Proceed only if both Leave lists can pass their existing ordered `items` arrays directly to the
primitive. Reject the migration if the primitive would need Leave-specific props, formatters,
conditional-field logic, approval-gate knowledge, or action handling.

## Day 58 — Bounded migration

If approved:

1. import the existing `ResponsiveKeyValueList` in both Leave detail consumers;
2. replace only each mapped manual metadata loop;
3. leave each items array, conditional values, links, badges, and formatting expressions local;
4. leave the Approval Gates row outside the list;
5. leave applicant actions, staff wrappers, history, Back behavior, and missing-record handling
   untouched;
6. do not change `ResponsiveKeyValueList` unless characterization proves a general defect;
7. search for stale manual-loop markup only in the migrated pair; and
8. record other manual detail rows as deferred or specialist rather than extending the batch.

## Candidate matrix

| Family                                   | Preliminary disposition                               | Reason                                                                        |
| ---------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| Applicant and staff Leave metadata lists | Approved for characterization                         | Same ordered read-only row contract and duplicated manual presentation        |
| `ResponsiveKeyValueList`                 | Reuse unchanged unless a general defect is reproduced | Existing semantic and responsive owner with Overtime and Claim adopters       |
| Report `DetailField`                     | Retain                                                | Grid-based report/review composition and column sizing differ                 |
| Inspection `DetailValueBlock`            | Retain feature-locally                                | Equipment/status detail and Inspection styling contract                       |
| `ResponsiveFinancialBreakdown`           | Retain                                                | Amount alignment, totals, and financial emphasis are specialist semantics     |
| Approval Gates/history                   | Retain separately                                     | Timeline and workflow meaning are not ordinary metadata values                |
| Confirmation-modal summaries             | Defer                                                 | Compact pre-submit review and consequences differ from full detail pages      |
| Fitness result definition lists          | Retain                                                | Participant metrics and assessment semantics form a coherent specialist block |
| Fire Extinguisher drawer metadata        | Retain                                                | Drawer-specific location hierarchy and editable/read-only switching           |
| Dashboard/table/card summaries           | False match                                           | Scanning, selection, navigation, or metrics differ from detail semantics      |

## Validation matrix

### Before implementation

- direct primitive characterization;
- both Leave consumer tests against untouched source;
- an expected semantic-structure failure proving the manual `div` rows are not definition-list
  markup.

### After implementation

- primitive and both Leave consumer suites;
- Leave and staff Leave Management affected suites;
- scoped ESLint and Prettier;
- semantic searches for the old manual loop in the pilot pair;
- exact diff review for items, order, fallbacks, links, badges, actions, and Approval Gates;
- `git diff --check`.

### Browser/build checkpoint

- controlled real-source Playwright at 320 px and desktop width;
- long unbroken and multiline values, absent values, Evidence link keyboard focus, and order;
- no horizontal overflow or browser exceptions;
- isolated production build;
- E2E module mapping audit; and
- guarded removal of the temporary server, environment mode, build, logs, screenshots, and traces.

The complete Vitest suite is reserved for Day 61 unless this batch changes the existing broad
primitive, shared styles, domain formatting, or consumers beyond the approved pair.

## Acceptance gate

Days 56–58 pass only when:

- every credible detail/summary family has a disposition;
- both Leave consumers use the existing primitive without a Leave-specific API;
- visible fields, order, formatting, fallbacks, links, badges, gates, and actions are preserved;
- semantic label/value structure, long content, absent values, and embedded-action keyboard behavior
  pass;
- narrow/mobile and desktop browser checks pass without overflow;
- no domain meaning, calculation, confidentiality, permission, or navigation moves;
- focused tests, lint, formatting, build, E2E mapping, and diff checks pass;
- cleanup is verified; and
- execution notes record deferrals, residual risk, and rollback.

## Stop conditions

Stop or record a no-code outcome if either view requires different row interaction/order, migration
changes a fallback/formatter/link/badge, Approval Gates must move into the list, the primitive needs
domain switches, long content or embedded actions regress, keys become unstable, or safe completion
requires broad CSS or unrelated consumer churn.

## Rollback

Rollback each Leave consumer independently by restoring its original mapped manual row loop and
removing its `ResponsiveKeyValueList` import. Do not revert item construction, formatting,
Approval Gates, action buttons, history, or characterization that records pre-existing behavior.

No data, API, route, dependency, cPanel, GitHub Actions, or deployment change is included.

## Planned durable output

After execution, create:

`FRONTEND_MODULE_CONSISTENCY_STAGE_6_DETAIL_SUMMARY_EXECUTION_2026-08-06.md`

It must record final inventory counts, dispositions, characterization, exact consumers, validation,
behavior-preservation verdict, deferred candidates, cleanup proof, residual risks, and rollback.
