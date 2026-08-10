# Frontend Live UAT - Day 3 Execution Plan

**Date:** 2026-08-10  
**Parent plan:** `FRONTEND_LIVE_UAT_COMPONENT_RECONCILIATION_PLAN_2026-08-10.md`  
**Prerequisites:** Day 1 route manifest and Day 2 read-only harness  
**Stage:** Authenticated live route sweep  
**Status:** Harness implemented; authenticated live execution blocked by missing role credentials  
**Production mode:** Read-only

## 1. Objective

Traverse every applicable frontend view with its intended operational persona on mobile and desktop, record truthful route/state evidence, and produce the first live cross-module consistency inventory.

Day 3 is route and orientation coverage. It does not submit forms, upload media, change workflow state, acknowledge notifications, send messages, or alter settings. Mutation journeys remain reserved for the controlled environment.

## 2. Completion outcomes

Day 3 must produce:

1. A credential readiness verdict for all required personas without exposing credential values.
2. A deterministic schedule assigning every manifest route to at least one intended persona.
3. Read-only fixture discovery for dynamic routes where production contains suitable records.
4. Mobile and desktop traversal results for every scheduled route.
5. Explicit `data-blocked`, `permission-blocked`, `feature-disabled`, `redirect-verified`, or `controlled-only` results where a route cannot be passed.
6. Console, page-error, failed-request, 5xx, overflow, heading, primary-action, and navigation-orientation evidence.
7. A first-pass cross-module consistency findings list for later deep UAT and component reconciliation.
8. An execution report that never converts missing credentials, permissions, or data into a pass.

## 3. Required persona gate

Full execution requires credential pairs for:

- Tactical Response Team (`trt`);
- Incident Commander (`incidentCommander`);
- Contract Manager (`contractManager`);
- Human Resource (`humanResource`);
- Finance (`finance`);
- System Administrator (`sysadmin`).

The credential preflight:

- checks variable presence only;
- reports missing variable names only;
- never prints values;
- exits non-zero when a required persona is unavailable;
- runs before authenticated Playwright browser activity.

No persona may fall back to a local smoke account or another role. SysAdmin coverage does not replace intended-role coverage.

## 4. Route scheduling rules

### 4.1 Canonical source

The schedule is derived from `tests/e2e/live-uat/route-manifest.json`. Handwritten route lists may add state probes but may not remove canonical routes.

### 4.2 Persona selection

Each manifest persona label maps to one executable credential key. Routes with multiple intended personas receive:

- one primary operational persona for basic view coverage;
- a secondary persona only when permission, available actions, or visible context is meaningfully different.

Generic `authenticated-user` routes use TRT for the baseline unless the route's task belongs to another role.

### 4.3 Route status handling

- `testable`: visit and evaluate.
- `redirect-only`: verify the resolved path and preserved route context.
- `data-blocked`: attempt safe fixture discovery; visit when resolved, otherwise retain `data-blocked`.
- `controlled-only`: open the route shell only when doing so is a GET-only operation; do not interact with mutating controls.
- `permission-blocked`: confirm the intended denial or hidden navigation with the relevant role.
- `feature-disabled`: verify the disabled state and blocking explanation.

### 4.4 Dynamic route policy

Actual production IDs are stored only in the run's local fixture file. The committed manifest and ledgers retain parameterized route patterns and fixture aliases.

Fixture discovery uses allowlisted GET requests or safe list-view links. It must not create a record to make a detail route testable.

## 5. Task sequence

### Task 3.1 - Implement credential preflight

1. Add a reusable credential-audit script based on the Day 2 persona contract.
2. Support an explicit required-persona list while defaulting the full Day 3 command to all six roles.
3. Validate email/password pairs together.
4. Report available and missing persona keys plus missing variable names, never values.
5. Return non-zero when full authenticated coverage is unavailable.

**Gate:** The current environment must be reported blocked before any authenticated production browser request if credentials are absent.

### Task 3.2 - Build and validate the route schedule

1. Map all 105 manifest routes to a primary persona.
2. Expand generic report routes into ERCO, Fitness Test, and Drill states.
3. Add state probes for all eight inspection types.
4. Preserve redirect contracts and expected destinations.
5. Associate every dynamic route with its fixture alias.
6. Carry module family, mutation risk, expected heading, pattern tags, and viewport requirements into the schedule.
7. Add a schedule contract that fails for omitted routes, unknown personas, duplicate schedule keys, invalid statuses, or uncontrolled mutating routes.

**Gate:** 105/105 canonical routes, 8/8 inspection types, and 3/3 report types are scheduled.

### Task 3.3 - Implement read-only fixture discovery

Create allowlisted adapters for the aliases needed by:

- managed user;
- submitted inspection;
- active fire extinguisher;
- submitted ERCO/Fitness Test/Drill report;
- leave record;
- overtime record;
- payroll claim;
- salary assignment;
- staff member;
- team;
- reporting module and new-section route parameters.

Adapters must:

- issue only GET requests;
- use the persona that legitimately sees the list;
- choose the first stable representative matching the required state;
- avoid records marked test-sensitive or unsuitable where detectable;
- store only the resolved route in the local fixture artifact;
- return a structured `data-blocked` reason instead of guessing an ID.

### Task 3.4 - Implement authenticated session proof

For each provided persona:

1. Start a fresh context.
2. Authenticate through the visible login form.
3. Verify departure from `/login` and application-shell readiness.
4. Verify no role/password value appears in logs or artifacts.
5. Verify the read-only guard recorded no disallowed request.
6. Clear cookies locally at the end of the persona run.

**Gate:** A persona is usable only after its own session proof passes.

### Task 3.5 - Implement the static route sweep

For every resolved static route on both projects:

1. Navigate by direct canonical URL.
2. Wait for the application to settle.
3. Record final path and redirect behavior.
4. Confirm the user did not unexpectedly return to login.
5. Capture visible heading/landmark and likely primary action.
6. Check document horizontal overflow.
7. Detect clipped fixed/sticky regions and controls outside the viewport.
8. Record console errors, page errors, unexpected failed requests, and 5xx responses.
9. Record permission or feature-disabled states explicitly.
10. Use representative screenshots and failure screenshots rather than capturing every sensitive page.

The sweep continues after an individual route failure so one defect does not erase later coverage, then fails overall if any unaccepted failure exists.

### Task 3.6 - Execute safe route interactions

Only interactions known to be read-only are allowed:

- tab changes;
- filter/search entry and local clearing;
- sorting and pagination;
- expand/collapse;
- opening and closing details, drawers, and media previews;
- back navigation;
- direct nested-route refresh;
- theme/view preference changes only if they remain browser-local.

Do not click:

- submit/save/update/delete;
- approve/reject/reopen;
- acknowledge/mark read;
- send message;
- upload/download where the endpoint's safety is uncertain;
- logout;
- Google sign-in;
- any control with an unclear effect.

### Task 3.7 - Capture first-pass consistency evidence

For each route, capture compact structural observations for:

- page header and primary action;
- detail surface/drawer;
- metadata summary;
- workflow status/actions;
- search/filter controls;
- table/mobile record-list behavior;
- empty/loading/error state;
- image/gallery presentation;
- sticky mobile actions.

Candidate similarity must be recorded as evidence, not immediately converted into a shared component recommendation.

### Task 3.8 - Reconcile route results

The final ledger must account for every scheduled row with one allowed result. Reconcile:

- routes visited;
- redirects verified;
- controlled-only shells observed;
- permission blocks;
- missing data;
- disabled modules;
- actual failures.

The summary must show both route-pattern coverage and expanded inspection/report state coverage.

### Task 3.9 - Execute quality gates

Run:

```bash
npm run lint
npm run test:e2e:coverage-contract
npm run audit:live-uat-route-coverage
npm run audit:live-uat-day3-schedule
npm run test:e2e:live-uat-safety
npm run test:e2e:live-uat-day3-contract
npm run audit:live-uat-credentials
npm run test:e2e:live-uat-day3
git diff --check
```

The final two authenticated commands are expected to refuse execution when credentials are missing. Such refusal proves the guard but does not count as completed live coverage.

## 6. Finding format

Every observed UI/UX issue must include:

- severity: Blocker, High, Medium, or Low;
- persona;
- route and journey step;
- viewport;
- verified evidence;
- user impact;
- likely owning component/style;
- concrete remediation;
- potential shared-component relationship;
- whether the conclusion is verified or inferred.

Start the final findings report with observed strengths, then the highest-harm issues.

## 7. Stop conditions

Stop the authenticated sweep when:

- credential preflight fails;
- login behavior is unstable;
- any non-authentication mutation is attempted;
- repeated 5xx responses indicate a production incident;
- the live build changes during the run;
- a route exposes unexpectedly sensitive data in an artifact;
- rate limiting or abnormal production load appears.

## 8. Definition of done

Day 3 is fully complete only when:

- all six persona sessions pass;
- every canonical route has a final result at mobile and desktop scope as scheduled;
- all dynamic fixtures are resolved or honestly data-blocked;
- all eight inspection types and all three report types have scheduled state evidence;
- no unapproved mutation occurs;
- route results and artifacts contain no secrets;
- all coverage, safety, schedule, lint, syntax, and diff gates pass;
- the execution report provides a defensible Day 4 readiness verdict.

If credentials are absent, implementation may complete but live Day 3 remains blocked. The report must separate those two facts.
