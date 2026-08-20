# Live Full-System Module and CRUD UAT Plan

**Date:** 2026-08-14  
**Status:** In progress; Stages 0–2 entry qualification and General Inspection CRUD lifecycle complete  
**Target:** `https://vmecc.amiosh.com` and `https://vmecc-api.amiosh.com/api`  
**Route inventory:** 105 canonical routes, 18 module families, 8 inspection types, and 3 reporting types  
**Primary objective:** Verify the deployed system module by module, view by view, and lifecycle by lifecycle through realistic Playwright journeys, while limiting every live mutation to records created specifically by the current UAT run.

## 1. Required outcome

The work is complete only when every in-scope module has one of these evidence-backed outcomes:

- **Passed:** the required views and lifecycle actions completed without functional, visual, permission, network, or recovery defects;
- **Failed:** a reproducible product defect was observed and recorded;
- **Permission-blocked:** the intended operational persona was unavailable or correctly denied;
- **Data-blocked:** a safe UAT-owned fixture or valid transition could not be prepared;
- **Side-effect-blocked:** the action could notify a real person, alter shared operational configuration, or create an irreversible production consequence that cannot be isolated;
- **Not applicable:** the module does not implement that lifecycle operation.

A route loading with HTTP 200 is not a CRUD or journey pass.

## 2. Production-safety contract

### 2.1 Mutation boundary

1. Keep the existing read-only live-UAT harness unchanged.
2. Create a separate controlled live-CRUD harness with an explicit production opt-in.
3. Give every created record a run marker in an appropriate user-visible field, for example `VMECC-QA-20260814-HHMMSS-abcdef`.
4. Register every ID returned from a successful UAT create request.
5. Allow update, workflow, archive, and delete calls only for IDs created by the same run.
6. Block and log mutations against pre-existing or foreign records.
7. Block cross-origin traffic and unapproved HTTP methods/endpoints.
8. Do not change production `.env`, feature flags, role rules, workflow settings, or shared reference data merely to make a test pass.
9. Never store credentials, cookies, CSRF tokens, photo binaries, or private response bodies in the repository or Playwright traces.
10. Run with trace and video disabled; retain sanitized screenshots, route metrics, mutation ledgers, and redacted diagnostics only.

### 2.2 Side-effect controls

- Use only dedicated UAT accounts and UAT-owned teams/records.
- Do not address messages, notifications, password resets, or emails to real users.
- Do not edit, retire, archive, reset, reject, approve, or delete existing operational records.
- Do not exercise destructive configuration changes on the live system.
- Where an operation is audit-retained and cannot be deleted, obtain an explicit cleanup/retention decision before execution and keep the UAT marker visible.
- If a workflow sends unavoidable external mail or affects payroll, roster publication, user access, or shared inspection catalog data, stop and classify it as side-effect-blocked unless a disposable target is proven.

### 2.3 Stop conditions

Stop the affected workstream immediately on:

- authentication or CSRF failure;
- unexpected `401`, `403`, `419`, `429`, or `5xx` responses;
- any attempted mutation against an unregistered record ID;
- evidence that a UAT action affected a real record or user;
- failed cleanup of a material or privileged record;
- data loss, permission escalation, or an irreversible workflow transition not covered by the approved matrix.

Rate limiting must be reconciled with a human-paced rerun. It must not be hidden or misreported as a UI pass.

## 3. Personas and account gate

Full verification requires the operational roles below; a SysAdmin-only pass is insufficient because it cannot prove role-specific visibility, approvals, or denials.

| Persona | Primary journeys |
|---|---|
| Unauthenticated visitor | Login, forgot/reset password entry, guarded-route redirects, 403/404/500 recovery |
| Tactical Response Team | Dashboard, Inspection, ERCO, Drill, Fitness Test, Leave, Overtime, Claims, profile |
| Incident Commander / Assistant | Report review, approve/reject/resubmit paths, actionable queues |
| Contract Manager | Teams, roster, staff views, applicable workflow review |
| Human Resource | Staff, leave administration, holidays, entitlements, overtime management |
| Finance | Salary, payroll claims, assignments, rates, payslip-related administration |
| System Administrator | Users, permissions, settings, reporting settings, audit, administrative queues |
| View-only/restricted user | Correct absence of create/edit/delete and correct permission messaging |

Before mutation begins, verify every supplied account through `/auth/session`, record only its role/permission summary, and confirm that no credential is written to disk. Missing personas become explicit coverage blockers; permissions must not be inferred from the current administrator account.

## 4. Standard journey contract for every module

Each module follows the same sequence where supported:

1. **Entry and orientation**
   - open from the expected navigation path;
   - verify page title, Back behavior, active navigation, role visibility, loading and empty states;
   - answer “Where am I, what can I do, and what happens next?”
2. **Browse and find**
   - Mine/All or equivalent scope;
   - search, filters, clear/reset, sort, pagination, persistent selection, no-results state;
   - sparse, dense, long-label, and narrow-width behavior.
3. **Create**
   - open create flow, validate required fields, correct errors, cancel safely, then create a namespaced UAT record;
   - verify one clear primary action, dirty-state protection, draft behavior, and confirmation.
4. **Read**
   - verify list/card/table representation, detail, disclosures/drawers, status, evidence, metadata hierarchy, action availability, and return-context preservation.
5. **Update**
   - edit only the current run’s record;
   - verify prefilled values, dirty close/Cancel behavior, validation, successful save, list/detail reconciliation, and stale-state refresh.
6. **Workflow transitions**
   - exercise only supported transitions such as draft, submit, review, reject, resubmit, approve, resolve, verify, archive, retire, or restore;
   - verify the correct role, confirmation, status history, next action, and read-only state after finalization.
7. **Delete or cleanup**
   - verify confirmation language and Cancel first;
   - delete/archive only the run-owned fixture when product semantics allow it;
   - verify disappearance or retained audit state and record cleanup outcome.
8. **Recovery and accessibility**
   - refresh/resume, Back navigation, session continuity, retryable errors, keyboard focus, Escape/focus return, 44px touch targets, reduced motion, light/dark mode, and no horizontal overflow.

## 5. Visual and workflow quality contract

Every journey is reconciled against the locked VMECC direction:

- compact, calm, content-led mobile UI;
- one boundary per hierarchy level with no unnecessary nested cards or horizontal rules;
- chrome-free Back and icon utilities;
- one obvious full-width mobile primary action, with secondary actions stacked below;
- consistent records shell from title through scope, search/filter, list/empty state, and pagination;
- rounded shared disclosures without a separate flat heading strip;
- findings, remarks, evidence, and relevant actions kept within one conceptual disclosure;
- inline rounded photos supporting portrait and landscape content;
- shared viewer with close, previous/next, keyboard behavior, focus return, and zoom/reset;
- meaningful caption shown once, no device filename, and no fixed photo-count cap;
- secondary report metadata progressively disclosed after primary task information;
- no user-facing implementation notices or unexpected AI actions;
- preserved permission, validation, dirty-state, loading, disabled, and destructive intent.

## 6. Execution stages

### Stage 0 — Release identity and harness qualification

- Fetch and record `version.json`, frontend headers, API health, and deployed build identity.
- Confirm the checked-out frontend/backend commits match the intended release.
- Run anonymous and authenticated session checks.
- Prove the mutation guard rejects foreign IDs, unknown origins, unsafe endpoints, malformed run IDs, and missing opt-in flags.
- Prove cleanup runs in `finally` after a forced test failure.
- Establish human-paced navigation to avoid artificial `429` results.
- Produce the authoritative route/persona/lifecycle schedule before CRUD execution.

**Gate:** No live CRUD until the guard, account matrix, fixture naming, cleanup behavior, and side-effect exclusions pass.

### Stage 1 — Public shell, authentication, dashboard, profile, and navigation

Modules/views:

- login and guarded-route redirect;
- forgot/reset password entry without sending mail to a real address;
- 403, 404, and 500 recovery pages;
- dashboard at mobile and desktop widths;
- desktop sidebar, mobile bottom navigation, mobile menu, alerts, Ask AI entry, and account navigation;
- profile and security read/update using only the UAT account and reversible values.

CRUD focus: safe profile update/revert; session continuity; logout/login; restricted-route behavior.

### Stage 2 — Inspection, all eight types

Run the complete lifecycle separately for:

1. General Inspection;
2. Health Safety Environment;
3. Fire Extinguisher;
4. Fire Truck Daily Readiness;
5. Hydraulic Rescue Tools;
6. High Angle Rescue Equipment;
7. Emergency Response Auxiliary Equipment;
8. SCBA.

Views/states per type:

- Conduct Inspection landing and type selection;
- empty, partial, invalid, complete, and resumed setup;
- untouched, good, defective/not-good, N/A, remarks, and evidence states;
- one, many, portrait, landscape, long-caption, duplicate-caption, and filename photo cases;
- location/scope selection and next-location continuation;
- draft/leave/resume and dirty-close recovery;
- review, confirmation, submitted detail, collapsed/expanded findings, report information, viewer/zoom;
- edit/update, reviewer transitions where supported, More Actions, return to records, and cleanup.

Fire Extinguisher additionally covers a newly created UAT-only asset: catalog list, create, detail, edit, current-inspection reset, issue/history presentation, lifecycle action, and cleanup. Existing extinguisher assets remain read-only.

### Stage 3 — ERCO, Drill, and Fitness Test

For each reporting type, verify:

- coherent records page, Mine/All scope, search, filter, empty/no-result, pagination;
- setup/type/period selection with no premature Save Draft action;
- stage-by-stage form progression and Back behavior;
- secondary Save Draft and primary Continue hierarchy once substantive work begins;
- leave/resume and restored-draft messaging;
- validation and correction;
- chronology/results/participants/analysis/signoff as applicable;
- photo create/edit/remove, uncapped multi-photo handling, review/detail visibility, captions, viewer, and cleanup;
- review, submit, detail, edit, workflow transition, More Actions, and delete/archive if supported;
- explicit absence of “Check Report with AI” and internal persistence notices.

Cross-report parity is judged at equivalent workflow stages; legitimate domain fields remain distinct.

### Stage 4 — Teams, roster, and staff directory

Modules/views:

- team list/detail, member composition, filters and role restrictions;
- roster overview, schedule, and shift settings;
- staff details, profile detail, and shift settings.

CRUD focus:

- create/update/delete only a UAT-owned team or disposable scheduling fixture where cleanup is proven;
- add/remove only UAT users;
- draft schedule behavior without publishing to operational staff;
- verify read-only and unauthorized personas.

Publishing, notification, or shared shift-setting changes are side-effect-blocked unless isolated fixtures and rollback are proven.

### Stage 5 — Employee self-service

Modules:

- Leave: records, create, detail, edit/cancel where supported;
- Overtime: records, create, detail, edit/cancel where supported;
- Payroll: overview, claims, expense claim, salary claim, claim detail, payslips.

Lifecycle focus:

- create namespaced requests/claims with harmless dates and small non-payable test values;
- validate attachments using non-sensitive generated evidence;
- submit, view history, edit/resubmit/cancel only when supported;
- verify that actions and statuses reconcile between list and detail;
- clean up or retain with an explicit audit-record marker according to backend semantics.

No real payment, payroll export, or external reimbursement action is permitted.

### Stage 6 — Leave, overtime, salary, and claims administration

Modules/views:

- leave records, entitlements, holidays, rules, and record detail;
- overtime records, rules, and detail;
- salary/claim records, salary assignments, company/legal data, OT rates, salaries, workflow rules, and detail routes.

CRUD/workflow focus:

- review and act only on Stage 5 UAT-owned requests;
- verify approve/reject/resubmit paths with the correct persona and history;
- create/edit/delete only disposable assignments or settings explicitly proven isolated;
- treat global rules, salary values, legal information, holiday calendars, and rates as read-only unless a reversible sandboxed target exists.

### Stage 7 — Messages and notifications

- message thread list, open thread, long content, empty state, unread/read state, responsive layout, and recovery;
- leave/workflow notification lists, navigation to source record, permission handling, and stale/missing target behavior.

Create/send is allowed only between dedicated UAT accounts and must use the run marker. Do not contact real users. Delete/cleanup must be verified where supported; otherwise record retained UAT messages explicitly.

### Stage 8 — Administration and configuration

Modules/views:

- users and user detail;
- role permissions;
- module, dashboard, inspection workflow, and reporting settings;
- reporting-settings module detail;
- Ask AI knowledge, report queues, feedback queues, and audit log.

Default mode is read-only. Safe CRUD is limited to a disposable UAT user if creation, role assignment, deactivation, and deletion can be completed without touching real access. Global configuration mutations remain blocked unless the user separately authorizes exact values and rollback.

### Stage 9 — Cross-module reconciliation and cleanup

- Re-run the complete route schedule at 390 mobile and 1440 desktop.
- Run focused 320 mobile, 768 tablet, dark mode, keyboard-only, and reduced-motion checks on every shared shell and critical workflow.
- Compare records pages, Back behavior, drawers, disclosures, action hierarchy, pagination, evidence, confirmation, empty/error/loading states, and metadata presentation across modules.
- Reconcile browser console errors, uncaught exceptions, failed requests, `4xx/5xx`, overflow, clipped controls, focus loss, and inaccessible names.
- Execute cleanup for all run-owned records and attachments.
- Query by the exact run marker and prove either zero residue or an approved list of audit-retained records.
- Re-run core read-only smoke after cleanup to prove the system remains operational.

## 7. Evidence model

Store ignored local evidence under `.qa/<run-id>/`, never under tracked source directories.

Required artifacts:

- `release.json`: deployed build, date, origins, and sanitized role summary;
- `route-ledger.json`: route, persona, viewport, theme, final path, status, timing, and outcome;
- `crud-ledger.json`: created IDs, allowed transitions, final status, and cleanup result;
- `network-guard.json`: allowed/blocked mutation summary with redacted URLs;
- `diagnostics.json`: console, page, request, rate-limit, and server errors;
- screenshots named by module, journey step, persona, viewport, theme, and state;
- per-module findings register with severity and verified/inferred/blocked status;
- final reconciliation report and residual-data ledger.

Do not capture passwords, cookies, CSRF tokens, private file URLs, personal data, or full sensitive API payloads.

## 8. Finding and remediation protocol

1. Record the observed user impact and exact journey step.
2. Reproduce once at the same viewport and once at the sibling viewport.
3. Distinguish product defect, permission behavior, missing test data, throttling, and harness failure.
4. Trace confirmed UI defects to the shared component/data contract.
5. Do not patch production during the evidence pass.
6. Consolidate findings after each stage, then implement the smallest shared remediation locally.
7. Run focused local verification and redeploy through `DEPLOYMENT.md` only after an explicit commit/deploy request.
8. Re-run only the affected live journeys plus the shared-consumer regression matrix.

## 9. Completion criteria

The final verdict may be **ready** only when:

- every canonical route has a recorded outcome;
- every applicable module has Create, Read, Update, lifecycle, and Delete/cleanup evidence or a justified blocked/N/A status;
- all eight inspection types and all three reporting types have complete lifecycle evidence;
- intended operational personas—not only SysAdmin—have passed their positive and negative permission journeys;
- no Blocker or High finding remains open;
- Medium findings have an accepted disposition;
- there are no unexplained console/page errors, failed requests, `5xx`, horizontal overflow, or unsafe mutation attempts;
- all UAT-owned data is cleaned up or explicitly approved for temporary retention;
- the post-cleanup smoke pass succeeds;
- release/build identity and frontend/backend deployment traceability are recorded.

## 10. Planned deliverables

1. Updated route/persona/lifecycle matrix.
2. Controlled live-CRUD Playwright harness and safety-contract checks.
3. Stage-by-stage execution ledgers and screenshots.
4. Consolidated module findings register.
5. Cleanup/residual-data report.
6. Final live full-system UAT verdict with explicit coverage gaps.

## 11. Immediate next step

Map and execute the first marker-owned General Inspection lifecycle: create only after the marker is proven present in a user-visible report field, verify read/update/delete cleanup through the returned run-owned ID, then apply the same controlled evidence standard to the remaining inspection types.
