# Stage 6 Form Sections and Validation Presentation Plan

Date: 2026-08-06  
Stage: 6, Days 53–55  
Status: Executed; Days 53–55 passed locally  
Parent: `FRONTEND_MODULE_CONSISTENCY_AND_REUSE_PLAN_2026-08-05.md`

## Objective

Reduce repeated form-section and validation markup only where the presentation, accessibility, and
interaction contracts genuinely match. Keep form state, schemas, business rules, field ownership,
submission, focus decisions, and domain-specific wording in their current modules.

The preferred result is additional adoption or bounded promotion of an existing primitive. A new
shared component is permitted only when the inventory proves a stable contract across at least two
production consumers and the resulting API is smaller than the duplicated markup.

## Scope

Inventory and disposition:

- section titles, descriptions, heading levels, actions, spacing, and responsive grouping;
- labels, required/optional indicators, help text, and label/control association;
- inline field-error containers and their visual treatment;
- `aria-invalid`, `aria-describedby`, generated or explicit error IDs, `role`, and live-region use;
- grouped-control validation and repeated-row error identity;
- form-level validation summaries, alerts, and submission-lock messages;
- disabled, read-only, saving, and loading presentation;
- first-error focus and focus recovery after validation or modal dismissal;
- light/dark tokens, narrow widths, long labels, and long error messages.

Primary inventory areas are Inspection; ERCO, Drill, and Fitness Test reports; Leave; Payroll and
salary claims; Team forms; user/staff administration; and reusable components under
`src/components`.

## Explicit exclusions

Do not create or centralize:

- a schema-driven form renderer or dynamic domain-form engine;
- validation schemas, required-field decisions, cross-field rules, calculations, or error wording;
- form state, dirty/edit state, mutation state, API error interpretation, or submission handling;
- first-invalid-field selection or module-specific focus order;
- authorization, workflow stage rules, record lifecycle, or action visibility;
- a universal label/control component that merely wraps CoreUI inputs;
- a section component with domain-name switches, layout-mode switches, or many boolean variants;
- one error treatment for field errors, server alerts, destructive confirmations, offline failures,
  and workflow blockers when their urgency and recovery semantics differ.

Authentication pages, HTTP error pages, Dashboard sections, read-only detail/summary layouts, and
loading/empty/recovery states belong to other specialist surfaces or later Stage 6 days.

## Repository baseline

The initial scan established these existing owners:

- `InspectionSection`, `InspectionSectionHeading`, and `InspectionInset` already own a coherent,
  feature-local Inspection section contract.
- `InspectionFieldError`, currently re-exported as `FormFieldError`, owns Inspection field-error
  identity, styling, and optional polite announcement.
- `WorkflowSetupField` owns a report-workflow edit-versus-summary interaction, including Edit and
  Reset actions; it is not an ordinary field wrapper.
- `MobileWorkflowSection` and related report mobile-home components own navigation/disclosure
  composition rather than generic form framing.
- ERCO, Drill, and Fitness Test contain repeated manual `invalid-feedback d-block` error containers
  with a mix of explicit IDs, described-by relationships, and alert semantics.
- Report validation focus selection remains in `src/views/report/utils.js` and must remain consumer
  behavior.

These observations seed the inventory; they do not pre-approve a migration.

## Day 53 — Complete inventory and disposition

### 1. Build an evidence matrix

For every credible repeated family, record:

| Evidence field      | Required detail                                                                     |
| ------------------- | ----------------------------------------------------------------------------------- |
| Consumer            | Production file and exact rendered surface                                          |
| Structure           | Heading/label/control/help/error/action markup and order                            |
| State owner         | Local hook, reducer, form object, or workflow owner                                 |
| Error source        | Local validation, server response, workflow blocker, or destructive warning         |
| Accessibility       | Label association, invalid state, described-by target, announcement, focus behavior |
| Responsive behavior | Narrow/wide layout, wrapping, repeated-row or modal behavior                        |
| Styling owner       | CoreUI/Bootstrap, shared SCSS, report workflow, Inspection, or feature-local rules  |
| Test evidence       | Existing unit/component/E2E coverage and missing characterization                   |
| Disposition         | Existing adopter, candidate, specialist, false match, or deferred                   |

### 2. Count actual adoption

Count production consumers, excluding tests, stories, visual QA matrices, and generated output, for:

- `InspectionSection`, `InspectionSectionHeading`, and `InspectionInset`;
- `InspectionFieldError` and its `FormFieldError` compatibility re-export;
- `WorkflowSetupField` and report setup-summary adapters;
- manual `invalid-feedback`, `is-invalid`, `aria-invalid`, and `aria-describedby` compositions;
- form-level danger alerts and validation summaries;
- repeated required/optional label text and field guidance.

### 3. Separate superficially similar families

Classify field errors separately from:

- request/server alerts;
- destructive confirmation warnings;
- workflow readiness blockers;
- offline/synchronization failures;
- upload/file validation;
- grouped or repeated-row errors;
- summary/toast notification;
- read-only status or compliance messaging.

### Day 53 deliverable

An execution-record inventory matrix with a disposition for every credible family. No production
code changes are allowed on Day 53.

## Day 54 — Characterization and pilot approval

### Preliminary pilot pool

The strongest initial candidate is the manual inline field-error container used by:

- ERCO incident title and setup date/time fields;
- Fitness Test assessor groups;
- Drill details, ERP reference rows, and summary fields.

Select the smallest pair whose contracts match exactly. The preliminary preference is one ERCO
field and one Fitness Test field because they exercise both a directly labelled control and a
grouped-control described-by relationship. Drill remains the fallback or third characterization
consumer, not an automatic migration target.

### Required characterization

Before touching production code, tests must prove the selected consumers retain:

1. the current error text and visibility condition;
2. a stable error element ID;
3. the control or group `aria-describedby` reference only while the error exists;
4. the current `invalid`/`aria-invalid` state;
5. the intended announcement behavior without duplicate announcements;
6. label/control association and accessible name;
7. repeated-row ID uniqueness where applicable;
8. disabled/read-only and loading behavior;
9. submission lock and first-error focus behavior owned by the consumer; and
10. error removal after valid input without changing callback order.

At least one test must fail for the intended presentation gap or duplication boundary before an
implementation proceeds. A selector-only failure is not sufficient evidence of a user-visible or
ownership improvement.

### Contract approval gate

Approve a shared field-error presentation contract only if it can remain limited to content,
optional ID, announcement policy, and styling/class forwarding. Reject it if it needs to know field
names, validation rules, form state, submit attempts, focus targets, report type, or workflow stage.

If the existing Inspection primitive is promoted, preserve an Inspection adapter or exact
compatibility contract so the broad Inspection consumer set does not become part of the pilot
rollback. Do not mass-migrate Inspection and Reports in one batch.

### No-code outcome

If announcement semantics, styling ownership, or described-by behavior do not match, record the
manual families as intentional and finish Days 53–55 without production changes.

## Day 55 — Bounded implementation

Subject to the Day 54 gate:

1. introduce or promote only the approved presentation primitive;
2. keep generated/explicit ID choice observable and deterministic;
3. migrate no more than the approved pilot pair in the first batch;
4. preserve all error messages, validation predicates, control props, and described-by wiring in
   their consumers;
5. preserve report first-error focus, submission lock, loading, and callback order;
6. retain Inspection section/error adapters and feature-owned SCSS unless separately proven safe;
7. remove duplicated markup only from migrated consumers;
8. search for stale imports/classes without deleting still-used compatibility surfaces; and
9. record exact rollback files and deferred adopters.

Do not extend the batch merely because additional consumers look easy after the pilot passes.

## Candidate matrix

| Family                             | Preliminary disposition                                           | Reason                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Manual report inline field errors  | Characterize for a bounded shared presentation pilot              | Repeated structure and accessibility wiring across ERCO, Fitness, and Drill                |
| Inspection `FormFieldError`        | Retain; consider compatibility-backed promotion only              | Broad proven adoption, generated IDs, announcement policy, and Inspection styling          |
| Inspection section primitives      | Retain feature-locally                                            | Coherent form-section contract already shared throughout Inspection                        |
| `WorkflowSetupField`               | Retain report-workflow ownership                                  | Edit/summary state, value display, and Edit/Reset actions exceed generic form framing      |
| Report mobile workflow sections    | Specialist                                                        | Navigation, disclosure, progress, and responsive workflow semantics                        |
| CoreUI label/input grouping        | Retain direct composition                                         | Library primitives already provide the stable control contract                             |
| Required/optional wording          | Keep in consumers                                                 | Requirement meaning is domain validation, not presentation ownership                       |
| Form-level danger alerts           | Defer to Days 59–60 unless exact field-validation semantics match | Server/recovery states differ from inline field errors                                     |
| Validation summaries and toasts    | Keep domain-owned                                                 | They aggregate business rules and determine user recovery                                  |
| First-error focus utilities        | Keep domain-owned                                                 | Focus order follows each form's workflow and validation priorities                         |
| Photo/upload validation            | Specialist                                                        | File constraints, previews, retries, and evidence rules are not ordinary text-field errors |
| Repeated inspection equipment rows | Retain feature-locally                                            | Row identity, evidence, status, and conditional remarks are domain-specific                |

## Validation matrix

### Before implementation

- focused characterization for each approved pilot consumer;
- direct primitive contract tests if a shared primitive is approved;
- untouched-source checks for current screen-reader relationships and focus behavior.

### After each consumer

- direct primitive and migrated-consumer tests;
- changed-file ESLint and Prettier;
- semantic search for legacy markup and duplicate IDs;
- `git diff --check`;
- exact diff review for validation predicates, messages, callbacks, and control props.

### Family checkpoint

- all affected ERCO/Fitness/Drill or Inspection suites;
- keyboard test for label/control navigation and action reachability;
- controlled Playwright journey at 320 px and desktop width that triggers, announces, resolves, and
  resubmits the pilot error;
- production build because runtime composition/imports change;
- guarded cleanup of temporary environment files, servers, builds, screenshots, traces, and logs.

Run the complete Vitest suite only if the shared implementation changes a broad existing primitive,
an adapter contract, shared styles, or more consumers than the approved pilot pair. Otherwise retain
the proportional focused gate and defer the complete suite to the Stage 6 checkpoint.

## Acceptance gate

Days 53–55 pass only when:

- every credible section/validation family has a documented disposition;
- the chosen contract has at least two matching production consumers;
- characterization precedes implementation;
- no schema, state, business validation, message ownership, submission, or focus decision moves;
- accessible names, described-by relationships, invalid state, announcements, and unique IDs pass;
- narrow/mobile and desktop error/recovery journeys pass;
- migrated consumers contain less duplicated presentation markup;
- no competing universal form or section system is introduced;
- lint, formatting, applicable tests, production build, and diff checks pass; and
- the execution record documents exclusions, deferred adopters, residual risks, and rollback.

## Stop conditions

Stop the migration and record a no-code or partial disposition if:

- the pair differs in announcement urgency or error lifecycle;
- a shared component would own validation, state, focus, or submission;
- explicit and generated IDs cannot preserve existing described-by relationships;
- repeated-row consumers risk duplicate IDs;
- the API grows report-, field-, or workflow-specific switches;
- section consolidation changes heading hierarchy or responsive order;
- an existing test exposes behavior that the proposed contract cannot preserve;
- the focused fix requires broad CSS or consumer churn; or
- a failing gate cannot be attributed to the bounded batch.

## Rollback strategy

Keep the implementation independently reversible:

1. revert pilot consumer imports and restore their original inline markup;
2. remove the new/promoted primitive only when no production consumer remains;
3. retain any Inspection compatibility adapter until its complete importer set is intentionally
   migrated and separately validated;
4. do not roll back validation logic, form state, or tests that merely characterize pre-existing
   behavior; and
5. remove only verified task-owned temporary artifacts.

No database, API, route, dependency, cPanel, GitHub Actions, or production deployment change is
included.

## Planned durable output

After execution, create:

`FRONTEND_MODULE_CONSISTENCY_STAGE_6_FORM_SECTIONS_VALIDATION_EXECUTION_2026-08-06.md`

It must contain the final inventory counts, candidate dispositions, before/after characterization,
exact migrated consumers, validation evidence, behavior-preservation verdict, deferred candidates,
residual risks, cleanup proof, and rollback boundary.
