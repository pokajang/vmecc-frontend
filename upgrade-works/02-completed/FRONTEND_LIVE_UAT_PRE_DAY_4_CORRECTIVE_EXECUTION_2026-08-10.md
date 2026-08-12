# Frontend Live UAT - Pre-Day 4 Corrective Execution

**Date:** 2026-08-10  
**Plan:** `FRONTEND_LIVE_UAT_PRE_DAY_4_CORRECTIVE_PLAN_2026-08-10.md`  
**Frontend baseline:** `3b3400ed0ff54fa12b5da23235b41c8d860723a7`  
**Backend baseline:** `1770e9a503cb31d3f9abbd406c3c12775e9f6476`  
**Decision:** Local corrective implementation passed; approve commit/build deployment, then require focused live verification before Day 4 deep-record UAT.

## 1. Outcome

The bounded pre-Day 4 source corrections are implemented without changing business mutation payloads, backend permissions, environment configuration, or production rate limits.

- Ask AI Reports and Feedback Reports now share one responsive review-queue implementation while retaining module-specific content, API functions, test IDs, and legacy form element IDs.
- The six-state queue navigation reuses `ModuleNavTabs` with its mobile select presentation instead of a non-recomposing button group.
- Session bootstrap treats HTTP 429 as transient, preserves an existing authenticated identity, respects a bounded retry delay, and retains the established 401 behavior.
- The exact live 403 source was identified as `GET /api/settings/overtime-approval-rules`; Staff Profile was not the requesting source.
- Overtime policy hooks no longer request the settings endpoint for actors without `settings.manage`. They retain normalized safe defaults and continue to use server-provided workflow permissions.
- The editable Overtime Rules tab is hidden from unsupported roles; a direct unsupported `/rules` visit resolves to Overtime Records. Settings managers retain the editor.
- The generated live-UAT manifest now assigns Overtime Rules to System Administrator, requires `settings.manage`, and marks the route controlled/shell-only.
- Live-UAT diagnostics separately record rate limits, unexpected client errors, runtime errors, request failures, and overflow screenshots while allowing an intentional `/403` destination.

## 2. Scope corrections from investigation

The plan initially listed Staff Profile as a likely source of the optional forbidden read. A focused Contract Manager mobile diagnostic run (`VMECC-QA-20260810-175318-cm403s`) showed that every captured unexpected 403 targeted `/api/settings/overtime-approval-rules`. Some late responses were attributed to the next route after navigation, which made Staff Profile appear involved. Source inspection confirmed Staff Profile does not issue that request.

The correction therefore belongs to the reusable overtime workflow policy hooks and Overtime Rules route boundary. No speculative Staff Profile change was made.

## 3. Principal source changes

### Shared admin queue

- `src/views/admin/shared/AdminReviewQueuePage.js`
- `src/views/admin/AiHelperReports.js`
- `src/views/admin/FeedbackReports.js`
- `src/views/admin/__tests__/AiHelperReports.test.jsx`
- `src/views/admin/__tests__/FeedbackReports.test.jsx`

### Session recovery

- `src/App.js`
- `src/services/api/httpClient.js`
- `src/__tests__/App.session-recheck.test.jsx`

### Permission-aligned overtime policy

- `src/views/staff/OvertimeManagement.js`
- `src/views/staff/LeaveManagement.js`
- `src/views/staff/SalaryClaimsManagement.js`
- `src/views/staff/leave-management/hooks/useLeaveAdminWorkflow.js`
- `src/views/staff/salary-claims-management/hooks/useOvertimeAdminWorkflow.js`
- `src/views/staff/salary-claims-management/hooks/useSalaryClaimsActions.js`
- `src/views/staff/__tests__/OvertimeManagement.security.test.jsx`
- `src/views/staff/salary-claims-management/hooks/__tests__/useOvertimeAdminWorkflow.policy.test.jsx`

### UAT harness and schedule

- `playwright.live-uat.config.mjs`
- `tests/e2e/live-uat/live-uat-support.js`
- `tests/e2e/live-uat/authenticated-route-sweep.live.spec.js`
- `scripts/generate-live-uat-route-manifest.mjs`
- `tests/e2e/live-uat/route-manifest.json`
- `tests/e2e/live-uat/day3-route-schedule.json`
- `tests/e2e/live-uat-day3-contract.spec.js`
- generated route matrix and Day 3 schedule documentation

## 4. Compatibility protections

- List calls remain `{ status, per_page: 50 }`.
- Detail calls still receive the selected report ID.
- Update payloads remain `{ status, admin_note }`.
- AI-only response, chat, and context sections remain AI-owned.
- Feedback-only reporter IP, user-agent, and message sections remain feedback-owned.
- Existing `ai-report-*` and `feedback-report-*` form IDs are preserved explicitly.
- No workflow create/update/approve/reject endpoint was changed.
- No role or backend permission was broadened.
- No `.env`, credential, UAT business record, or backend source file was changed.

## 5. Verification evidence

### Passed

- Full repository ESLint: passed in 47 seconds.
- Focused Vitest: 5 files, 19 tests passed.
- Playwright live-UAT safety contract: 4/4 passed.
- Playwright Day 3 route contract: 4/4 passed after schedule reconciliation.
- Live-UAT route coverage: 105/105 routes, 8/8 inspection subtypes, 3/3 report subtypes.
- Day 3 schedule audit: 105/105 routes, 8/8 inspection types, 3/3 report types.
- Production build: 6,496 modules transformed; build completed in 12.08 seconds.
- Changed-source formatting and lint: passed.
- `git diff --check` excluding pre-existing generated build churn: passed.

The build retains the existing advisory about mixed static/dynamic `WorkflowNotifications` imports and chunks above 500 kB. These are warnings, not new build failures, and remain outside this corrective checkpoint.

### Full-suite runner limitation

The unrestricted `npx vitest run` corpus did not return buffered output within the six-minute command ceiling and was terminated by the runner. It did not report a test assertion failure. The same behavior caused the earlier combined gate to exceed five minutes. Focused affected suites passed, but this timeout must not be recorded as a full-suite pass.

### Live verification still required

The corrected source is not yet the bundle served by the live site. Re-running production live UAT now would test the previous deployment and cannot verify these fixes. After commit, push, and deployment, run the focused read-only matrix:

1. System Administrator: Ask AI Reports and Feedback Reports, mobile and desktop; verify all six statuses and document overflow within one pixel.
2. Contract Manager: Overtime Records and Staff Profile, mobile and desktop; verify no request to `/api/settings/overtime-approval-rules` and no unexpected 403.
3. Human Resource: Overtime Records and Staff Profile, mobile and desktop; apply the same 403 check.
4. System Administrator: Overtime Rules shell; verify the settings read succeeds and the editor remains available.
5. Confirm no credentialed traces or secret-bearing artifacts were produced.

## 6. Verdict and next gate

**GO for source commit and frontend deployment.**  
**CONDITIONAL GO for Day 4:** begin Day 4 only after the focused post-deployment live checks above pass.

If mobile overflow or the forbidden settings request remains after deployment, stop Day 4, capture the route-specific sanitized diagnostic, and correct only that failed boundary. Do not compensate by widening permissions or changing rate-limit/environment settings.

## 7. Post-implementation audit and corrections

A second source, journey, accessibility, responsive, and test-contract audit was completed against the original implementations and every plan exit gate. No business-function regression was found. Four hardening gaps were corrected:

1. **Retry-After standards support:** the HTTP client initially normalized numeric delay values only. It now supports both delta-seconds and standard HTTP-date values, rejects expired/invalid values, and retains payload fallback behavior.
2. **Retry cancellation:** a successful manual session recovery now cancels its pending automatic timer, preventing an unnecessary third session call after recovery.
3. **Permission diagnostic precision:** an intentional `/403` destination now suppresses only its associated 403/Forbidden diagnostics. Unrelated 404 responses and JavaScript console errors on the same route still fail UAT.
4. **Failure evidence retention:** a runtime screenshot captured immediately before a stop condition is retained in the failed ledger entry instead of being lost by the catch path.

The audit also filled the planned coverage gaps:

- shared queue loading, empty, list-error/retry, detail-error, save-error, permission, mobile selector, and unchanged request-parameter tests;
- separate overtime-policy access tests for both overtime and leave workflow hooks;
- HTTP-date Retry-After and manual-recovery timer tests;
- controlled real-application browser tests for both admin queues at `390x844` and `1440x900`.

### Audit verification

- Expanded affected Vitest gate: 7 files / 32 tests passed.
- Controlled rendered-browser queue gate: 2/2 passed with no document overflow and GET/OPTIONS-only traffic.
- Live-UAT safety contract: 5/5 passed.
- Day 3 schedule contract: 4/4 passed.
- Full repository ESLint: passed.
- Route and schedule audits: 105/105 routes, 8/8 inspection types, and 3/3 report types passed.
- Production build: 6,496 modules transformed in 10.90 seconds.
- Diff whitespace check excluding pre-existing generated build churn: passed.

**Post-audit verdict:** no unresolved Blocker, High, or Medium corrective defect remains in local source. The deployment and focused post-deployment live checks remain the only Day 4 entry gate.
