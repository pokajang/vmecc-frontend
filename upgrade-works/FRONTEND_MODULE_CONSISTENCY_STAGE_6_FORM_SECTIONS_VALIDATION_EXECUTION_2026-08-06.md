# Stage 6 Form Sections and Validation Presentation Execution

Date: 2026-08-06  
Stage: 6, Days 53–55  
Status: Passed locally  
Parent: `FRONTEND_MODULE_CONSISTENCY_AND_REUSE_PLAN_2026-08-05.md`  
Working plan: `FRONTEND_MODULE_CONSISTENCY_STAGE_6_FORM_SECTIONS_VALIDATION_PLAN_2026-08-06.md`

## Outcome

The inventory retained the established Inspection and report-workflow section systems and approved
one smaller shared contract: the repeated Bootstrap/CoreUI inline field-error container. The pilot
migrated the Report and Salary workflow action dialogs to a new root-level `FormFieldError` while
leaving all validation and interaction ownership in those consumers.

Characterization also proved that the installed CoreUI `invalid` prop adds visual invalid styling
but does not emit `aria-invalid`. Both pilot remarks inputs now set that state explicitly when their
existing local rejection error is present. No form rule, message, submit lock, callback, focus rule,
permission, workflow transition, or API behavior moved.

## Day 53 inventory

Production counts excluded tests, visual QA routes, and generated output.

| Family                                 |                Baseline evidence | Final disposition                                                              |
| -------------------------------------- | -------------------------------: | ------------------------------------------------------------------------------ |
| Inspection `FormFieldError` references | 21 files / 102 symbol references | Retained feature-locally; no broad adapter or style migration                  |
| Manual `invalid-feedback d-block`      |          11 files / 20 instances | Four pilot instances migrated; 16 manual instances remain intentionally scoped |
| `aria-invalid`                         |          10 files / 17 instances | Consumer-owned; two explicit pilot relationships added                         |
| `aria-describedby`                     |          22 files / 26 instances | Consumer-owned and unchanged in the pilot                                      |
| Danger alerts                          |          54 files / 63 instances | Deferred to Days 59–60 or retained as request/recovery specialists             |
| `WorkflowSetupField`                   |           2 files / 4 references | Retained as report edit-versus-summary interaction                             |
| Inspection section primitives          |  Small feature-local adopter set | Retained; heading and Inspection layout contract do not generalize safely      |

The final source search includes the shared component's own `invalid-feedback d-block` class, so the
post-migration raw total is 17 instances in 10 files: 16 remaining manual instances plus the one
canonical definition.

## Candidate decisions

| Candidate                                           | Decision          | Evidence                                                                                                        |
| --------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| ERCO incident title + Fitness assessor              | Deferred          | Direct-control versus grouped-control ownership and non-alert versus alert semantics differ                     |
| Report + Salary workflow errors                     | Migrated pilot    | Identical error class, local explicit IDs where required, non-announcing semantics, and existing consumer tests |
| Drill inline errors                                 | Deferred adopter  | Credible future adopter, but repeated-row and field-specific behavior were outside the first batch              |
| Inspection error primitive                          | Retained          | Generated IDs, polite announcement policy, Inspection styling, and broad adoption differ from the pilot         |
| Workflow action modal shells                        | Retained          | Already have separate canonical responsive shells and domain-specific content                                   |
| Required/optional labels                            | Retained locally  | Requirement meaning remains domain validation                                                                   |
| Validation summaries, toasts, and first-error focus | Retained locally  | They aggregate business rules and recovery order                                                                |
| Server, destructive, upload, and offline errors     | Retained/deferred | Urgency and recovery semantics do not match inline field validation                                             |

## Characterization and failure attribution

Before implementation, the two pilot consumer suites produced the expected 2 failures and 8
passes. Both failures showed that `aria-describedby` and existing error markup were present while
`aria-invalid` was absent from the rendered input. This was attributed to the installed CoreUI
implementation rather than a validation-rule failure.

The new primitive test initially failed at import resolution because `FormFieldError` did not yet
exist. This provided a second explicit test-first boundary.

Characterization also exposed test leakage in the Salary modal suite: earlier renders were not
cleaned between tests, leaving duplicate IDs in the document. Adding standard Testing Library
cleanup corrected test isolation only; it did not alter production behavior.

## Implementation

### Shared primitive

`src/components/FormFieldError.js`:

- renders nothing without content;
- owns only `invalid-feedback d-block` presentation;
- forwards `id`, `role`, classes, and ordinary element attributes;
- does not generate IDs, announce by default, inspect form state, or focus controls.

### Pilot consumers

- `ReportWorkflowActionModal` uses it for rejection remarks and declaration errors.
- `SalaryWorkflowActionModal` uses it for rejection remarks and declaration errors.
- both remarks inputs explicitly expose `aria-invalid` only while `rejectError` is truthy;
- both retain their existing stable error IDs and `aria-describedby` expressions.

The four manual containers were removed from the two consumers. Their text, predicates, branches,
helper text, field order, buttons, enablement, and callbacks remain unchanged.

## Validation evidence

| Gate                                 | Result                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Pre-change consumer characterization | Expected 2 failed / 8 passed; only missing explicit `aria-invalid`                     |
| Pre-change primitive boundary        | Expected import-resolution failure before the component existed                        |
| Focused post-change tests            | 3 files / 13 tests passed                                                              |
| Affected family checkpoint           | 7 files / 29 tests passed                                                              |
| Controlled real-source Playwright    | 2/2 passed: 320 px mobile drawer and 1440 px desktop modal                             |
| Browser recovery                     | Error IDs, described-by and invalid state appeared and cleared without page exceptions |
| E2E module mapping                   | Passed; all 50/50 catalog modules remain mapped                                        |
| Scoped ESLint                        | Passed                                                                                 |
| Targeted Prettier                    | Passed                                                                                 |
| Isolated production build            | 6,495 modules; passed in 10.58 seconds                                                 |
| Diff integrity                       | `git diff --check` passed                                                              |
| Cleanup                              | Controlled server, environment file, logs, and isolated build removed                  |

The build retained the existing non-blocking warnings for an output directory outside the project,
the mixed static/dynamic `WorkflowNotifications` import, and chunks larger than 500 kB. The bounded
change introduced none of those warnings.

The complete Vitest suite was not repeated because this batch adds a leaf presentation component
with two consumers and does not change an existing broad primitive, shared style, validation rule,
or runtime service. The complete suite remains a Day 61 cumulative checkpoint.

## Behavior-preservation verdict

Days 53–55 pass locally. The runtime delta is limited to shared rendering of four equivalent error
containers plus an explicit accessibility state already implied by the existing errors. Routes,
permissions, API payloads, workflow transitions, validation text, submission gating, callback order,
focus policy, and responsive shell selection remain unchanged.

## Rollback

Rollback is independently bounded:

1. restore the four original `div.invalid-feedback.d-block` containers in the Report and Salary
   workflow dialogs;
2. remove their `FormFieldError` imports;
3. remove the two explicit `aria-invalid` attributes if the accessibility correction itself must be
   reverted;
4. delete `src/components/FormFieldError.js` and its direct test after confirming no adopter remains;
5. remove the pilot characterization and browser test only if the entire batch is intentionally
   abandoned.

No data, API, dependency, route, cPanel, GitHub Actions, or deployment rollback is required.

## Next boundary

Proceed to Stage 6 Days 56–58: inventory read-only detail and summary presentation, distinguish
domain formatting from stable label/value layout, characterize one matching pilot, and migrate only
if the evidence supports a bounded presentation contract.
