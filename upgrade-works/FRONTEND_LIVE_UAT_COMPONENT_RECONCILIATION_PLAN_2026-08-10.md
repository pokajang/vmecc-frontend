# Frontend Live UAT and Component Reconciliation Plan

**Date:** 2026-08-10  
**Status:** In progress; Days 1-2 complete, Day 3 harness complete and live traversal credential-blocked  
**Scope:** Full frontend route inventory, production read-only Playwright UAT, controlled workflow testing, UI/UX consistency reconciliation, and evidence-led shared-component consolidation  
**Primary goal:** Make equivalent tasks look and behave consistently by reusing shared components where the underlying user purpose and interaction contract are genuinely the same.

## 1. Outcomes

This stage will produce:

1. A traceable inventory of every public and authenticated frontend view, including role, route, state, viewport, and UAT result.
2. Read-only Playwright evidence from the deployed application at `https://vmecc.amiosh.com` without altering production business data.
3. Controlled-environment tests for create, edit, submit, approve, reject, upload, recovery, and destructive-confirmation paths that cannot safely run against production.
4. A cross-module pattern matrix showing which UI elements are truly equivalent, which should remain module-specific, and why.
5. Corrective work for the three reported issues:
   - no unintended left border on the mobile Inspection Details surface;
   - no decorative card/container wrapped around an individual image;
   - no device-generated image filename displayed to users anywhere in the application.
6. Small, reviewable shared-component migrations with compatibility tests and rollback points.
7. A final reconciliation report proving route coverage, visual consistency, accessibility, functional parity, and remaining exceptions.

## 2. Non-negotiable product rules

### 2.1 Preserve behavior and data contracts

- Refactoring must not change API payloads, workflow transitions, permissions, validation rules, attachment IDs, filenames stored by the API, download behavior, audit history, or persisted draft schemas unless a separately documented defect requires it.
- Existing records and old payload shapes must remain renderable.
- A visual defect must be corrected at the narrowest shared source that owns the pattern. It must not be hidden with unrelated global CSS.
- Every extraction must have at least two verified consumers with the same user purpose. Similar appearance alone is not enough.

### 2.2 Image presentation contract

- An individual uploaded image must not be presented inside an additional visible card, border, tinted panel, or ornamental container.
- A layout wrapper may remain only when required for grid placement, focus handling, actions, or semantic grouping; it must be visually neutral.
- Images keep their natural aspect ratio, never overflow their content column, and use `object-fit: contain` unless the existing task explicitly requires a crop.
- Captions and user-entered descriptions remain visible as plain supporting text beneath the image.
- Edit actions such as replace, remove, download, or add caption remain available where the workflow requires them, but they must not recreate card-on-card presentation.

### 2.3 Image filename privacy and noise contract

- Device-generated filenames such as `IMG_20260810_...jpg` and `inspection-camera-....jpg` must not be rendered as visible image labels, captions, headings, tooltips, or toast details.
- Image filenames remain in internal models and API payloads where required for upload, MIME/type validation, deduplication, download naming, backward compatibility, and diagnostics.
- A filename must not be used as image alternative text. Alternative text should come from the user description or contextual copy such as `Inspection evidence photo 1`.
- Generic UI labels such as `Photo 1`, `Evidence photo`, or a user-authored description replace filenames when a visible identifier is necessary.
- Non-image attachments are outside this presentation prohibition. A PDF or document filename may remain visible when it helps the user identify or download the document.
- Error messages identify the failed image by position or context rather than exposing its device filename, unless an expert diagnostic view explicitly requires it.

### 2.4 Mobile detail-surface contract

- At narrow viewports, Inspection Details and equivalent detail drawers/sheets must have no unintended left or right border.
- The detail surface must fit the viewport, avoid horizontal scrolling, preserve close/back controls, and respect safe-area insets.
- Desktop side-panel separation may retain an intentional divider. Mobile removal must be breakpoint-scoped and tested so desktop behavior is unchanged.

## 3. Safety boundaries for live UAT

Production UAT is read-only by default.

- Permit navigation, authentication, GET/HEAD/OPTIONS requests, filtering, sorting, pagination, opening/closing details, image preview, tab changes, and downloads that do not change server state.
- Allowlist only the authentication requests needed to establish and verify a session.
- Intercept and fail the live test if the browser attempts an unapproved POST, PUT, PATCH, or DELETE request.
- Do not create inspections, reports, users, messages, leave, overtime, claims, assignments, teams, roster entries, workflow actions, settings changes, or acknowledgement/read-state mutations in production.
- Run mutation journeys only against the controlled local frontend/backend and disposable test data already used by the existing E2E harness.
- Credentials are supplied through environment variables and must never be written to tests, Markdown, screenshots, traces, or Git.
- Live screenshots and traces may contain operational data. Store them under the ignored QA artifact directory, minimize captured data, and do not commit them.
- If a route is unavailable because the selected role lacks permission or production has no representative record, record it as `permission-blocked` or `data-blocked`; do not manufacture production data.
- Stop the live run on authentication instability, unexpected mutation traffic, repeated 5xx responses, or evidence of a production incident.

## 4. Coverage model

### 4.1 User lenses and roles

The route matrix will use the smallest set of authorized accounts that collectively exposes all views:

- Public/unauthenticated user.
- Tactical Response Team submitter.
- Incident Commander or Assistant Incident Commander reviewer.
- Contract Manager or Client Contract Manager.
- Human Resource.
- Finance.
- System administrator.

Every result must name the role actually used. A route passing for SysAdmin does not prove that its intended operational role can use it.

### 4.2 Viewport profiles

- Narrow mobile: 360 x 800.
- Representative mobile: 390 x 844.
- Tablet/compact workspace: 768 x 1024.
- Desktop: 1440 x 900.

The complete route sweep runs on representative mobile and desktop. High-risk responsive surfaces also run at 360 px and tablet width.

### 4.3 Route families

The generated inventory must reconcile `src/routes.js`, `_nav.js`, feature flags/module activation, redirects, and dynamic record routes. At minimum it covers:

1. Public/authentication: login, registration where enabled, forgot/reset password, forbidden, maintenance, and error states.
2. Dashboard and application shell: sidebar, mobile bottom navigation, global header, update/maintenance notices, notification access, and session recovery.
3. Profile and security.
4. Administration: users, user details, audit logs, AI helper reports, feedback reports, AI knowledge, settings, role permissions, dashboard visibility, and module activation.
5. Payroll self-service: overview, claims list, new expense/salary claim, claim detail, and payslips.
6. Staff payroll administration: claim records/detail, salary records, salary assignments, overtime rates, workflow rules, and company information.
7. Leave self-service and management: list, new request, detail, entitlements, holidays, overtime records, workflow rules, and record details.
8. Overtime self-service and management: list, new request, detail, records, workflow rules, and record details.
9. Inspection: home/list, new inspection, review, detail, edit where permitted, All Extinguishers, extinguisher detail, reporting settings, and all implemented types:
   - General Inspection;
   - HSE Inspection;
   - Fire Extinguisher Inspection;
   - Hydraulic Rescue Equipment Inspection;
   - High Angle Rescue Equipment Inspection;
   - ER Auxiliary Equipment Inspection;
   - SCBA Inspection;
   - Fire Truck Daily Readiness Inspection.
10. Reports: ERCO, Fitness Test, and Drill list/new/detail/review flows.
11. Roster: overview, schedule, and shift settings.
12. Teams and staff: staff details/profile, team details, and team view.
13. Messages and workflow notifications.
14. Canonical redirects and legacy aliases, verified for destination and state preservation rather than treated as separate visual pages.

### 4.4 State coverage

For each applicable shared pattern, test:

- populated, sparse, and empty data;
- loading and slow response;
- recoverable API error and retry;
- validation error;
- permission denied/hidden action;
- long identifiers, names, remarks, filenames, and translated-length-like text;
- one image and multiple images;
- missing/broken image with usable fallback;
- keyboard-only interaction and visible focus;
- narrow-screen overflow, wrapping, sticky actions, drawer focus, Escape dismissal, and focus return;
- light and dark mode where supported;
- reduced-motion preference.

## 5. Finding and reconciliation method

### 5.1 Evidence captured per view

Each route/state entry records:

- canonical route and resolved URL;
- role and permission outcome;
- viewport and theme;
- page heading and primary action;
- loading/empty/error behavior;
- console errors and warnings;
- failed requests and unexpected status codes;
- horizontal overflow and clipped/sticky content measurements;
- keyboard/focus observations;
- screenshot path and, for failures, Playwright trace path;
- finding severity: Blocker, High, Medium, or Low;
- verified behavior versus inference.

### 5.2 Shared-component candidate scoring

Every repeated pattern is scored against six questions:

1. Does it support the same user job?
2. Does it accept substantially the same data shape?
3. Does it expose the same actions and state transitions?
4. Does it need the same responsive recomposition?
5. Does it require the same accessibility behavior?
6. Can differences be expressed as a small, explicit variant rather than conditional sprawl?

Decision rules:

- **Extract now:** same semantic contract and repeated in at least two module families, or repeated three or more times in one complex family.
- **Standardize through an existing component:** a suitable shared primitive already exists and consumers only differ through accidental markup/style duplication.
- **Align tokens only:** the task differs but spacing, typography, status, or responsive behavior should match.
- **Keep local:** business behavior, information hierarchy, or permissions materially differ.
- **Reject abstraction:** the proposed API would need module-name switches, numerous booleans, or expose internal workflow details.

### 5.3 Candidate families to reconcile

- Page headers, back navigation, titles, metadata, and primary action placement.
- Detail pages, desktop side panels, mobile drawers/sheets, close behavior, and detail metadata grids.
- Status badges and workflow state presentation.
- Filter/search toolbars, mobile filter drawers, clear/reset behavior, result counts, and filtered-empty states.
- Tables that recompose to mobile record cards.
- Empty, loading, permission, error, retry, success, and recovery states.
- Form sections, labels, helper text, validation summaries, and field-level errors.
- Sticky/mobile action rows and destructive confirmations.
- Image upload, upload queue, preview, editor, gallery, description/caption, remove, and download behavior.
- Audit history/timeline presentation.
- Workflow detail headers, action groups, and approval/rejection feedback.

## 6. Day-stage execution plan

### Day 1 - Baseline, deployment identity, and route manifest

1. Confirm the live `version.json` build ID matches the intended deployment before recording any visual evidence.
2. Capture frontend commit, build ID, test account roles, browser version, and execution timestamp.
3. Generate the canonical route/view manifest from routes, navigation, feature flags, and report/inspection registries.
4. Resolve dynamic routes using existing read-only records per role.
5. Label each entry `testable`, `permission-blocked`, `data-blocked`, `redirect-only`, or `feature-disabled`.
6. Add a coverage-contract test so newly introduced routes cannot silently disappear from the UAT manifest.
7. Establish the artifact naming convention and ensure secrets and live evidence remain ignored by Git.

**Gate:** No route family is omitted without an explicit reason and owner.

### Day 2 - Production-safe Playwright harness

1. Add a dedicated live-UAT configuration rather than weakening the controlled localhost safety checks.
2. Require explicit environment gates for live host, API host, read-only mode, and role credentials.
3. Add request interception that allowlists authentication and safe methods, failing on unexpected mutations.
4. Add reusable helpers for session bootstrap, role switching, route readiness, incidental dialog dismissal, console/network collection, overflow measurement, screenshot capture, and redaction-safe artifact metadata.
5. Add a coverage ledger writer with deterministic pass/fail/blocked statuses.
6. Prove the guard by intentionally attempting a mocked mutation and confirming the harness blocks it.

**Gate:** The live suite cannot alter production data even if a test accidentally clicks a mutating control.

### Day 3 - Full live route sweep

1. Visit every testable route with its intended role at 390 x 844 and 1440 x 900.
2. Verify orientation: page title, current navigation state, primary task, and next action.
3. Exercise safe interactions: tabs, search, filters, sort, pagination, expand/collapse, previews, drawers, detail opening, back navigation, and route refresh.
4. Record console errors, failed requests, missing assets, stale chunks, unexpected redirects, permission inconsistencies, and layout overflow.
5. Verify direct navigation and refresh for nested routes on cPanel hosting.
6. Run targeted 360 px and 768 px checks on all dense tables, detail surfaces, form shells, and action bars.

**Gate:** Every inventory item has evidence or a precise blocked reason; a global pass count alone is insufficient.

### Day 4 - Inspection and report deep UAT

1. Reproduce the supplied Inspection Details example using an existing submitted General/HSE record on mobile.
2. Use computed styles and bounding boxes to identify the exact element creating the left border; test the drawer/offcanvas root, nested detail groups, and backdrop separately.
3. Inspect details, review, and read-only media for all eight implemented inspection types.
4. Cover inspection list, detail, review, edit shell, All Extinguishers, extinguisher history/detail, and workflow settings.
5. Cover ERCO, Fitness Test, and Drill list, new-form shell, review, and detail views.
6. Compare the same concepts side by side: report metadata, statuses, findings/check rows, evidence, remarks, action bars, reviewer feedback, and history.
7. Capture one-photo, multi-photo, long-description, and missing-photo states.

**Gate:** Inspection/report differences are classified as domain-required or accidental; no visual similarity is assumed to prove component equivalence.

### Day 5 - Repo-wide image and filename audit

1. Build a render-site inventory for every `<img>`, image preview/gallery/editor, authenticated image, attachment preview, avatar/photo uploader, chat image, leave evidence, overtime evidence, payroll receipt, inspection evidence, and report evidence.
2. Trace visible filename output separately from internal filename usage.
3. Classify each attachment as image, non-image document, avatar/logo, generated export, or unknown/broken media.
4. Define one shared image-presentation contract and extend existing report-workflow media primitives where they already own the behavior.
5. Remove visible per-image card styling and filename labels from the shared source first, then migrate remaining local renderers.
6. Preserve user captions/descriptions, accessible context, upload/remove actions, file validation, API payloads, and download names.
7. Add static and rendered tests preventing future image filename leakage and decorative photo-card regressions.

**Gate:** Searches may still find filename fields used internally, but no user-facing image surface displays a device filename.

### Day 6 - Corrective implementation and shared-component consolidation

Implement in small slices, each independently testable and reversible:

1. **Mobile detail border:** introduce or correct the shared narrow-viewport detail-surface variant; preserve the desktop divider.
2. **Shared media presentation:** consolidate neutral image preview/gallery display, semantic captions/descriptions, fallback state, and optional editor actions.
3. **Inspection/report consumers:** migrate Inspection, ERCO, Fitness Test, and Drill only after parity tests describe their current functional contracts.
4. **Other image consumers:** migrate messages, leave, overtime, payroll, staff/team, and administration only where the shared contract fits.
5. **Additional high-confidence patterns:** implement only candidates marked `Extract now` or `Standardize through an existing component` in the reconciliation matrix.
6. Keep module adapters close to their domains; do not push business-specific normalization into presentation primitives.

**Gate per slice:** focused component tests, affected journey tests, desktop/mobile screenshots, and no API/payload snapshot change.

### Day 7 - Controlled mutation and regression UAT

Run against the controlled local environment with disposable records:

1. Create, draft-save, recover, edit, review, submit, approve/reject, and reopen where supported.
2. Upload images from gallery and camera-style inputs; add descriptions; remove/retry uploads; verify queue, preview, detail, and download behavior.
3. Cover offline/recovery behavior already supported by inspection flows.
4. Verify all inspection types and ERCO/Fitness Test/Drill end to end.
5. Verify representative image workflows in messages, leave, overtime, payroll, profile/team, and administrative knowledge upload where applicable.
6. Confirm mutation cleanup succeeds and no test record remains outside the disposable namespace.

**Gate:** The same business outcomes and API contracts pass before and after the refactor.

### Day 8 - Accessibility, responsive, and consistency reconciliation

1. Keyboard-test navigation, drawers, dialogs, photo actions, filters, and workflow actions.
2. Verify focus trap, Escape dismissal, focus return, accessible names, landmark/heading order, and visible focus.
3. Verify 360, 390, 768, and 1440 px layouts for overflow, clipping, sticky-action overlap, and readable content density.
4. Check light/dark tokens and reduced motion.
5. Compare all modules against the shared-component matrix and record intentional exceptions.
6. Run screenshot comparison only after deterministic data and animations are stabilized; inspect diffs rather than blindly updating baselines.

**Gate:** Every difference is either corrected or documented as intentional with a domain reason.

### Day 9 - Full quality gates and final live verification

1. Run clean install/audit as appropriate, lint, static audits, unit/component tests, E2E coverage contract, full controlled Playwright suites, PWA test, and production build.
2. Re-run the production read-only route sweep after deployment of the corrective build.
3. Recheck the three reported issues using the same records and viewports used for baseline evidence.
4. Compare before/after screenshots and computed measurements.
5. Confirm live build ID, nested-route refresh, API origin, console cleanliness, and no unexpected mutations.
6. Publish the execution report, coverage ledger, finding disposition, shared-component consumer map, intentional exceptions, and rollback reference.

**Final gate:** No Blocker or High finding remains open; all Medium findings are fixed or explicitly accepted; functional and permission behavior remains equivalent.

## 7. Required automated assertions for the reported issues

### 7.1 Mobile Inspection Details border

- Open Inspection Details at 360 and 390 px.
- Assert the detail surface has no unintended inline border at the mobile breakpoint.
- Assert its content bounding box stays within the viewport and `scrollWidth <= clientWidth` within a small rounding tolerance.
- Assert header, close control, body, and action area remain visible and usable.
- Assert desktop retains its intentional side-panel separation.

### 7.2 Image presentation

- Assert an evidence image is not inside an ancestor carrying the application's card, bordered-evidence, or tinted inset presentation classes.
- Assert the image remains responsive and uncropped.
- Assert description/caption and relevant actions remain available.
- Assert multiple images form a usable grid/list without each image becoming a nested card.

### 7.3 Device filename suppression

- Seed image objects with unmistakable sentinel names such as `DEVICE_PRIVATE_IMG_987654.jpg`.
- Assert sentinel filenames are absent from visible text, titles, tooltips, toasts, and accessible names.
- Assert the internal upload request and stored model still contain the filename when required.
- Assert document filenames remain available for non-image attachment identification and download.
- Run the sentinel assertion across Inspection, ERCO, Fitness Test, Drill, messages, leave, overtime, payroll, and every other image-rendering consumer found by the inventory.

## 8. Validation command set

Exact scripts may be added during Day 2, but the final gate must include the existing project checks and the new suites:

```bash
npm ci
npm audit --audit-level=high
npm run lint
npm run audit:contrast
npm run audit:typography
npm run audit:production-config
npm run test:e2e:coverage-contract
npx vitest run
npm run test:e2e:smoke:full
npm run test:e2e:inspection:smoke
npm run test:e2e:pwa-update
npm run build
```

The live suite must use an explicit command and opt-in environment gate, for example:

```bash
VMECC_LIVE_UAT=1 VMECC_LIVE_UAT_READ_ONLY=1 npm run test:e2e:live-uat
```

Credentials and secrets are environment values and are intentionally omitted from this plan.

## 9. Deliverables

1. `FRONTEND_LIVE_UAT_ROUTE_MATRIX_2026-08-10.md` or generated JSON/Markdown equivalent.
2. `FRONTEND_UI_PATTERN_RECONCILIATION_MATRIX_2026-08-10.md`.
3. New production-safe live Playwright configuration and route-sweep specs.
4. Focused tests for border removal, neutral image presentation, and filename suppression.
5. Shared media/detail component updates and a consumer map listing every migrated module.
6. `FRONTEND_LIVE_UAT_COMPONENT_RECONCILIATION_EXECUTION_2026-08-10.md` with evidence, commands, counts, findings, fixes, exceptions, and final verdict.

## 10. Definition of done

This stage is complete only when:

- every route/view is passed, intentionally redirected, feature-disabled, permission-blocked, or data-blocked with evidence;
- production live UAT is proven read-only;
- all eight implemented inspection types and all three report modules have desktop and mobile evidence;
- the mobile Inspection Details border defect is absent and protected by regression tests;
- images have no decorative nested card treatment across the repository unless a documented functional exception requires a framed editor workspace;
- device image filenames are absent from user-facing UI while attachment functionality and API contracts remain intact;
- shared-component candidates are implemented only where semantic equivalence is proven;
- all affected unit, component, Playwright, accessibility, static audit, and production build checks pass;
- no Blocker or High issue remains unresolved;
- the execution report identifies intentional exceptions, deferred Medium/Low items, the final build ID, and a rollback commit.
