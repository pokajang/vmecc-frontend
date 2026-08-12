# Frontend Live UAT Day 8 Accessibility, Responsive, and Consistency Plan

**Date:** 2026-08-11  
**Parent:** `FRONTEND_LIVE_UAT_DAYS_7_9_COMPLETION_PLAN_2026-08-11.md`  
**Entry decision:** Day 7 GO; controlled mutation completed with zero disposable residue  
**Status:** Executed; GO for Day 9  
**Execution record:** `FRONTEND_LIVE_UAT_DAY_8_ACCESSIBILITY_RESPONSIVE_EXECUTION_2026-08-11.md`  
**Execution target:** local frontend and backend on explicit loopback origins; production remains read-only and out of scope  
**Primary outcome:** prove that users can understand and operate the upgraded frontend across keyboard, responsive, theme, motion, and representative state boundaries, while correcting only evidence-backed inconsistencies through existing shared owners

## 1. Day 8 boundary

Day 8 is the human-interaction and presentation qualification gate between the completed business-outcome UAT and the Day 9 release gate. It must examine the application as a sequence of user tasks, not as an isolated screenshot collection.

Authorized work:

- inspect and exercise existing frontend routes, components, styles, and browser contracts;
- use the existing seeded UAT personas and non-sensitive local fixtures;
- add deterministic Playwright fixtures, semantic assertions, screenshots, and focused unit tests;
- make small frontend-only corrections for reproduced accessibility, responsive, state, or consistency defects;
- route corrections through an existing shared component or token when it already owns the repeated contract;
- extract a new shared presentation component only after the evidence and decision gate in this plan passes; and
- update durable upgrade records with an evidence-backed GO or HOLD verdict for Day 9.

Not authorized:

- production mutations, cPanel work, deployment, commit, push, or release tagging;
- `.env` edits, backend/schema/API/permission/workflow changes, or direct database patches;
- broad visual redesign, dependency upgrades, or introduction of another design system;
- changing valid domain language, validation, payloads, persistence, approvals, or record ownership for visual consistency;
- merging image, document, chat, avatar, receipt, and evidence lifecycles merely because they all render files;
- bulk approval or regeneration of screenshot baselines;
- claiming screen-reader certification from DOM automation alone; or
- removing the UAT users before the Day 9 qualification decision.

## 2. User lenses and jobs

| User lens                        | Representative Day 8 job                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Tactical Response Team submitter | Find an Inspection/report, complete or resume work, understand feedback, and reach the next action on mobile or desktop      |
| Incident Commander reviewer      | Scan metadata and evidence, distinguish state, open actions, and return to the originating record without losing context     |
| Administrator/manager            | Use dense lists, filters, tables, detail views, and destructive confirmations without clipped or ambiguous controls          |
| Goal-driven returner             | Resume a draft or revisit a record with the same orientation and action hierarchy                                            |
| Interrupted user                 | Understand loading, delayed, failed, retry, recovery, and saved states without guessing whether work was lost                |
| Mobile/touch user                | Complete the same job without horizontal scrolling, obscured content, tiny targets, or missing context                       |
| Keyboard-only user               | Reach, operate, dismiss, and return from every essential control in a logical sequence                                       |
| Assistive-technology user        | Receive meaningful structure, names, descriptions, validation, and state updates without relying on visual position or color |
| Unauthorized/unrelated user      | Receive a clear permission boundary without exposed actions or misleading empty states                                       |

Every journey must answer:

1. Where am I?
2. What is the primary action now?
3. What happened after I acted?
4. What can I do next or how can I recover?

## 3. Entry controls and evidence model

### Task 8.0 — Freeze the Day 7 boundary

1. Record frontend/backend `HEAD`, upstream refs, worktree status, and `build/version.json`.
2. Map all tracked and untracked paths to the Day 4–7 records; unexplained source changes force HOLD.
3. Confirm `.env*`, `../UAT/creds.md`, `.qa`, browser storage, cookies, screenshots, traces, uploads, logs, and database files remain ignored and unstaged.
4. Run `git diff --check` before Day 8 edits.
5. Re-run:
   - `test:e2e:live-uat-safety`;
   - `test:e2e:live-uat-day5-contract`; and
   - `test:e2e:live-uat-day6-media`.
6. Confirm the Day 7 regression for immediate post-upload description edits remains green.
7. Confirm only loopback frontend/API origins are configured for authenticated browser work.
8. Create an ignored run root named `VMECC-QA-YYYYMMDD-HHMMSS-xxxxxx`.

**Gate 8.0:** Day 5–7 contracts are green, the repository boundary is understood, secrets remain private, and no non-loopback mutation origin is available.

### Task 8.1 — Build deterministic state fixtures

Create or reuse non-sensitive fixtures for:

- sparse/empty content;
- normally populated content;
- long unbroken identifiers, long labels, multiline descriptions, and large counts;
- one-image, multi-image, missing-image, failed-image, and upload-in-progress states;
- loading, filtered-empty, recoverable error, forbidden, disabled, success, draft, submitted, rejected, and approved states;
- mobile drawer and desktop modal representations of the same task; and
- read-only versus editable/reviewer representations.

Fixture rules:

1. Prefer existing component/UX matrix routes and intercepted deterministic API responses for presentation-only states.
2. Use the local Day 7 harness only when a real authenticated route cannot represent the state safely.
3. Namespace and register any disposable records before navigation; cleanup and exact-count reconciliation remain mandatory.
4. Never weaken production CSS to stabilize screenshots. Emulate reduced motion in the browser context.
5. Freeze time only where date movement creates a false diff; do not conceal real loading or transition behavior.
6. Use real application copy and data shapes, not invented component-only markup, for final route verdicts.
7. Keep raw screenshots/traces under the ignored run root; durable Markdown records contain only sanitized summaries and selected redacted evidence references.

**Gate 8.1:** every mandatory state is reproducible, fixture behavior is distinguishable from product behavior, and cleanup cannot be skipped after failure.

## 4. Mandatory route and component matrix

### Tier A — Primary operational journeys

These surfaces require semantic, keyboard, responsive, and state checks:

| Family       | Required surfaces                                                                                                                           | Shared contracts under review                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Inspection   | landing/list, filters, setup, representative simple and equipment forms, review, records, detail drawer, evidence/gallery, workflow actions | module header, toolbar/search, responsive rows, detail metadata, evidence image, upload feedback, status/action components, drawer boundary |
| ERCO         | landing/setup, form, repeated sections, review, detail, photo editor/gallery, workflow actions                                              | report responsive shell, edit-state banner, field errors, report media, detail/workflow headers                                             |
| Fitness Test | landing/setup, personnel/repeated rows, review, detail, photo editor/gallery, workflow actions                                              | same shared report contracts while retaining fitness-domain tables and scoring                                                              |
| Drill        | mobile home/setup, staged form, repeated task/personnel rows, review, detail, photo editor/gallery, workflow actions                        | same shared report contracts while retaining drill chronology and stage ownership                                                           |

Inspection representation must include:

- General or HSE for simple finding/evidence presentation;
- Fire Extinguisher for continuation and nested resolution evidence;
- ER Auxiliary for defect versus additional-photo separation; and
- one of Hydraulic, High Angle, or SCBA for dense nested equipment rows and mobile editing.

### Tier B — Adjacent regression surfaces

Run representative checks where shared foundations or global styles can affect them:

- Messages attachment preview, cancellation, and lightbox;
- Leave list/detail, mixed attachments, states, and actions;
- Overtime list/detail, filters, states, and actions;
- salary-claim/payroll receipt or document presentation;
- Staff/User management dense tables, row actions, and confirmation dialogs;
- Profile/team/avatar presentation;
- AI Knowledge document upload/reader; and
- app shell, dashboard, mobile menu, notifications, account drawer, 403, 404, and 500 states.

Tier B is an isolation boundary. A difference is not a defect when the user job or lifecycle genuinely differs.

## 5. Accessibility execution

### Task 8.2 — Page structure, names, and relationships

For every Tier A route and the representative Tier B sample:

1. Confirm one understandable page-level heading and logical subordinate headings without relying on visual size alone.
2. Confirm navigation, main content, complementary/detail regions, dialogs, lists, tables, and forms expose appropriate semantics.
3. Confirm icon-only controls have stable accessible names; add tooltips only where the icon meaning is not universal.
4. Confirm visible field labels are programmatically associated with controls.
5. Confirm help text, validation messages, and async errors are associated through `aria-describedby`, `aria-errormessage`, or an equivalent supported relationship.
6. Confirm required/invalid/disabled/read-only state is exposed semantically and visually.
7. Confirm tables retain headers and row/action context after responsive recomposition.
8. Confirm status badges are understandable from text, not color alone.
9. Confirm images use description/context-based alternatives and never expose device filenames as accessible names, captions, titles, or nearby text.
10. Confirm decorative icons/images are ignored by assistive technology where appropriate.
11. Confirm loading, upload, save, success, error, and retry updates use a suitable status/live-region strategy without repeated noisy announcements.
12. Record automated DOM evidence as a contract check, not as proof of complete screen-reader compatibility.

### Task 8.3 — Keyboard and focus journeys

Execute Tab and Shift+Tab journeys, plus Enter/Space/Escape/arrow keys where the control contract requires them.

Verify:

1. No positive `tabindex` is used to repair visual order.
2. Focus order follows the visual/task sequence and does not enter hidden, inert, or obscured content.
3. Every essential pointer action has a keyboard path.
4. Focus indicators are visible against the actual surface in light and dark themes.
5. Opening a modal/drawer/gallery moves focus to an appropriate title, first field, or first meaningful control.
6. Dialog-like surfaces contain focus while open where their primitive promises a trap.
7. Escape closes only the topmost dismissible layer and does not discard unsaved work without the established warning.
8. Close/cancel/save returns focus to the invoking control, or to the nearest stable logical target if the invoker was removed.
9. Gallery previous/next, zoom/Fit, close, and thumbnail controls have meaningful names and predictable focus.
10. Filter drawers, menus, row actions, disclosures, and upload/removal controls expose expanded/selected/busy state where applicable.
11. Destructive actions require the existing confirmation contract and default focus does not encourage accidental confirmation.
12. Route changes and validation failures place or preserve focus so the next required action is discoverable.

Do not rewrite CoreUI/Radix-like primitive behavior locally. Correct the owning wrapper or consumer only when the reproduced contract fails.

### Task 8.4 — Contrast and non-visual cues

1. Run `npm run audit:contrast` and classify every result against the rendered state.
2. Check ordinary text, secondary metadata, placeholder/help text, links, disabled controls, focus rings, status badges, validation, and destructive actions in supported themes.
3. Confirm focus, selection, required state, success, warning, error, offline, and disabled meaning does not depend on color alone.
4. Confirm text remains legible over images, sticky surfaces, overlays, and disabled backgrounds.
5. Treat the repository audit as supporting evidence; manually inspect high-risk rendered combinations because static token scans cannot prove composited contrast.

**Accessibility gate:** no essential task is keyboard-blocked; focus entry/containment/return works; names, labels, errors, and status updates are understandable; and no Blocker/High accessibility defect remains.

## 6. Responsive execution

### Task 8.5 — Mandatory viewport matrix

Run the Tier A matrix at:

| Key                       | CSS viewport | Purpose                                                    |
| ------------------------- | ------------ | ---------------------------------------------------------- |
| narrow mobile             | 360×800      | constrained one-handed mobile journey                      |
| common mobile             | 390×844      | primary mobile baseline and existing UAT contract          |
| tablet portrait           | 768×1024     | mobile/desktop recomposition boundary                      |
| full-width detail maximum | 928×900      | Inspection detail drawer remains borderless/full-width     |
| desktop detail threshold  | 929×900      | Inspection detail drawer gains intentional desktop divider |
| desktop                   | 1440×900     | dense table, modal, detail, and side-panel composition     |

Use 320×700 as a targeted stress probe for shared controls, long content, and any failure seen at 360 px. A 320 px finding blocks only when it represents the supported layout contract or exposes an intrinsic-width/shared-component defect.

For each mandatory viewport:

1. Assert document horizontal overflow is no greater than 1 px.
2. Report the exact overflowing child, bounding box, and owning component when the assertion fails.
3. Verify the primary action remains visible and does not collide with navigation, sticky actions, browser-safe areas, or keyboards.
4. Verify long identifiers, labels, badges, descriptions, timestamps, and button text wrap without hiding meaning.
5. Verify images preserve aspect ratio, remain within the content column, and do not regain image-only card-on-card nesting.
6. Verify Inspection Details has no left divider through 928 px and retains the intentional 1 px desktop separation from 929 px.
7. Verify tables transform through their established responsive collection/scroll contract without detached headers or unreachable row actions.
8. Verify filters and actions recompose in a predictable order and preserve active-filter visibility.
9. Verify mobile drawers and desktop modals offer task parity, even when presentation differs.
10. Verify touch targets for primary, destructive, close, menu, gallery, upload, and row actions are at least 44×44 CSS px where practical; document justified compact-table exceptions.
11. Verify fixed/sticky headers and footers do not cover validation, last rows, gallery controls, or confirmation actions.
12. Capture screenshots only after fonts, images, data, and animations settle; record all intentional dynamic masks.

### Task 8.6 — Orientation and content stress

1. Run the highest-risk mobile form, drawer, gallery, and table at 844×390 landscape.
2. Recheck overflow and action visibility with long-content fixtures.
3. Verify opening/closing overlays after a viewport change does not leave stale body locks, misplaced focus, or desktop/mobile duplicate controls.
4. Verify browser text enlargement/reflow through the narrow-width contract without clipped labels or controls; do not use CSS scaling as a substitute for a real layout check.
5. Re-run the exact 928/929 divider contract after any shared drawer/style correction.

**Responsive gate:** mandatory routes have no unexplained overflow, obscured primary action, broken breakpoint transition, inaccessible control, distorted evidence, or mobile/desktop task mismatch.

## 7. Theme, motion, and state execution

### Task 8.7 — Theme and reduced-motion contracts

1. Identify the application’s actually supported theme modes from source and rendered controls; do not invent unsupported modes.
2. Run primary Tier A surfaces and overlays in each supported mode.
3. Verify semantic tokens rather than isolated hard-coded colors own surfaces, borders, text, focus, and status presentation.
4. Emulate `prefers-reduced-motion: reduce` in Playwright.
5. Verify drawers, dialogs, menus, galleries, loaders, and route transitions remain understandable without animation.
6. Confirm no control becomes delayed, unreachable, or permanently hidden when motion is reduced.
7. Check for flash-of-wrong-theme only where navigation/reload makes it observable.

### Task 8.8 — State and recovery contracts

For Inspection, the three report families, and representative adjacent modules, verify:

- initial loading and background refresh;
- empty and filtered-empty distinction;
- recoverable request error with a meaningful retry;
- permission/forbidden state distinct from missing data;
- disabled versus submitting/busy action;
- draft/saved/success feedback;
- validation summary/field feedback and focus recovery;
- missing/broken image fallback without filename leakage;
- upload progress, retry, cancel, and removal feedback where supported;
- offline/queued/recovered state where supported; and
- stale request/navigation behavior where already protected.

Each state must communicate what happened, whether data is safe, and what the user can do next.

## 8. Cross-module consistency and reuse decision

### Task 8.9 — Compare equivalent user jobs

Build a reconciliation table for Inspection, ERCO, Fitness Test, Drill, and relevant adjacent modules covering:

1. page orientation, title, status, and primary action;
2. list/search/filter presentation and clear/reset behavior;
3. record metadata and long-value wrapping;
4. evidence display, gallery navigation, description editing, upload state, and filename privacy;
5. validation and field errors;
6. loading, empty, error, retry, forbidden, and missing-record states;
7. edit/draft/submitted/rejected/approved state presentation;
8. destructive confirmation and workflow actions;
9. mobile drawer versus desktop modal action order; and
10. return navigation, focus restoration, and preservation of list/filter context.

Assign one disposition to every observed difference:

- **Shared owner correction:** the existing shared component/token already owns the contract and is inconsistent or bypassed.
- **Consumer alignment:** the shared contract is correct; one consumer supplies incorrect markup, props, copy, or classes.
- **Intentional domain difference:** the user job, lifecycle, information density, or permission contract differs and remains locally owned.
- **New candidate:** at least two independent implementations perform the same user job with the same semantics and lifecycle, and no existing owner can support them cleanly.
- **Deferred:** valid evidence exists, but safe correction exceeds Day 8; record severity, affected users, owner, trigger, and containment.

### Task 8.10 — Shared-component extraction gate

A new shared component may be implemented only if all are true:

1. Rendered and source evidence identifies repeated behavior, not superficial visual similarity.
2. The same semantic role, keyboard contract, responsive behavior, error/state model, and lifecycle apply.
3. An existing shared component, token, variant, or composition cannot solve it without distortion.
4. The API can remain presentation-focused and does not absorb domain validation, persistence, permissions, or workflow transitions.
5. Untouched-source characterization tests exist for every first-batch consumer.
6. The migration is independently reversible and limited to a small consumer batch.
7. The affected Day 7 business journey can be rerun after the change.

Reject extraction when it requires boolean-prop proliferation, consumer-specific branches, payload awareness, or lifecycle callbacks unrelated to presentation.

## 9. Corrective implementation protocol

### Task 8.11 — Fix in bounded slices

Prioritize findings by user harm:

- **Blocker:** prevents completion, loses data, exposes unauthorized action/data, or creates a serious accessibility barrier;
- **High:** likely wrong action, abandonment, persistent uncertainty, or primary responsive failure;
- **Medium:** avoidable friction or repeated inconsistency with a clear existing owner; and
- **Low:** polish or wording that does not obstruct the task.

For each accepted correction:

1. Record route, role, state, viewport/theme, reproduction, expected behavior, actual evidence, severity, and owner.
2. Add a failing regression/characterization test first where practicable.
3. Change the smallest owning source boundary.
4. Preserve API methods, payload fields, validation, permissions, workflow transitions, storage metadata, and navigation outcomes.
5. Run formatting and focused lint/tests.
6. Rerun the affected browser case at both narrow and wide boundaries.
7. Rerun the related Day 7 mutation path when focus, actions, form state, media, or navigation changed.
8. Rerun Day 5 inventory and Day 6 media contracts after any evidence/media change.
9. Inspect screenshot changes individually and explain intentional differences.
10. Revert only the bounded corrective slice if its behavior cannot be qualified; never reset unrelated user work.

Do not postpone a reproduced Blocker/High defect merely to finish the matrix. Fix and requalify it before continuing.

## 10. Planned automated evidence

Reuse before adding new suites:

- `inspection-device-accessibility.spec.js` for control naming, keyboard order, target sizing, and overflow;
- `inspection-detail-drawer-layout.spec.js` for the 928/929 divider contract;
- `inspection-mobile-status-drawer-layout.spec.js` and `inspection-high-angle-mobile-drawer.spec.js` for mobile drawer fit and staged editing;
- `inspection-mobile-parity-visual.spec.js` and continuation suites for cross-type mobile parity;
- `detail-summary-component.spec.js`, `form-field-error-component.spec.js`, and state-presentation suites for shared semantics;
- `drill-upgrade-ui-smoke.spec.js` and report workflow/media suites for report responsiveness;
- `dashboard-ui-visual.spec.js` for app-shell overlays and responsive navigation;
- Day 5/6 contracts for media inventory, filename privacy, gallery semantics, and framing; and
- focused Vitest owners for every corrected component/consumer.

Add a focused Day 8 Playwright suite/config only for uncovered cross-module contracts. Do not create one monolithic suite or add an accessibility dependency by default. A dependency proposal must identify a gap the existing DOM, keyboard, contrast, and browser assertions cannot cover and remains a Day 9 dependency-review item.

## 11. Validation ladder

Run gates in this order so failures remain attributable:

1. safety/origin and fixture contracts;
2. existing Day 5 media inventory contract;
3. existing Day 6 media browser contract;
4. Day 7 immediate-description regression;
5. focused semantic/keyboard contracts;
6. focused responsive/breakpoint contracts;
7. theme, reduced-motion, and state contracts;
8. Tier A cross-module journey matrix;
9. representative Tier B isolation checks;
10. focused Vitest for changed owners/consumers;
11. complete Inspection tests if Inspection source changed;
12. complete affected report/collateral test groups;
13. full ESLint;
14. changed-file Prettier check;
15. repository `git diff --check`; and
16. final safety, Day 5, and Day 6 contract reruns.

The complete repository Vitest suite and production build remain mandatory Day 9 release gates. Run them during Day 8 only when a broad shared foundation changes or focused ownership cannot bound regression risk.

## 12. Stop conditions

Stop and issue HOLD when:

- a test would mutate a non-loopback origin;
- a credential, cookie, token, real attachment, or personal record enters evidence or Git;
- a required fixture cannot be distinguished from product behavior;
- cleanup leaves a namespaced record or active manual-cleanup ledger;
- a Blocker/High accessibility or responsive defect remains;
- a correction changes domain validation, permissions, API payloads, persistence, or workflow behavior;
- screenshot differences cannot be explained from source and intended behavior;
- the 928/929 detail boundary, filename privacy, or image framing contract regresses;
- a shared extraction needs consumer-specific lifecycle branches; or
- the local infrastructure cannot provide reliable evidence.

Infrastructure blocks must be reported as blocked/inconclusive, never converted into an application pass or fail.

## 13. Day 8 closeout and deliverables

Create `FRONTEND_LIVE_UAT_DAY_8_ACCESSIBILITY_RESPONSIVE_EXECUTION_2026-08-11.md` containing:

1. run identity, local origins, Git/build identity, and scope;
2. route/role/state/viewport/theme matrix with pass/fail/inconclusive counts;
3. keyboard/focus/semantics results;
4. responsive overflow, breakpoint, target-size, and screenshot results;
5. theme, reduced-motion, contrast, and state results;
6. cross-module consistency/reuse disposition table;
7. findings ranked by user harm with before/after evidence;
8. exact source and test changes;
9. regression rerun results;
10. cleanup and secret-boundary reconciliation;
11. deferred items with owner, severity, containment, and Day 9 impact; and
12. GO/HOLD verdict for Day 9.

Update:

- this plan’s status;
- the Days 7–9 parent plan;
- `upgrade-works/README.md`; and
- the active risk/exception record if a retained issue affects release qualification.

## 14. Exit verdict

Issue **GO for Day 9** only when:

- no Blocker/High accessibility, responsive, state, or consistency defect remains;
- Tier A primary jobs are keyboard-operable at required responsive boundaries;
- focus, names, validation, async feedback, destructive confirmation, and image alternatives meet the documented contracts;
- mandatory viewports have no unexplained overflow, obscured actions, broken divider transition, or task-parity loss;
- supported themes and reduced motion preserve understanding and operation;
- Day 5 filename/inventory, Day 6 media, and affected Day 7 business contracts remain green;
- every cross-module difference has an evidence-backed disposition;
- every screenshot difference is individually explained;
- no namespaced data, active cleanup ledger, secret, or untracked sensitive evidence remains; and
- all Day 8 corrections are bounded, formatted, linted, test-backed, and documented.

Otherwise issue **HOLD**, name the precise blocker, preserve sanitized evidence, and write a bounded corrective plan before Day 9. Day 8 GO qualifies the worktree for the Day 9 release audit; it does not itself authorize commit, push, build replacement, cPanel deployment, or production mutation.
