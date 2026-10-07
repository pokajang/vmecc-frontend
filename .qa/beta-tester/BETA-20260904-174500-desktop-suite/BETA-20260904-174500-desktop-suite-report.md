# Beta Acceptance Report

VERDICT: NOT GOOD TO GO
SCOPE: Site-wide desktop UI/UX and visual-design audit, with emphasis on search/filter experiences
REASON CODES: PRODUCT FAILURE, COVERAGE BLOCKER
CONFIDENCE: Medium

Build/version: `ec84c998` with a pre-existing dirty worktree
Environment: controlled local frontend `http://localhost:3000`, API `http://localhost:8000/api`
Run ID: `BETA-20260904-174500-desktop-suite`
Executed: 2026-09-04, Asia/Kuala_Lumpur
Browser session: headed Chrome/Chromium, one sequential worker, 100 ms deliberate pacing in the catalog runner
Roles: 10/10 declared smoke personas
Critical coverage: 5/9 passed; 4 blocked or incomplete

## Release recommendation

Do not sign off the full desktop suite yet. The application shell, role routes, shared workflow forms, reporting records, detail summaries, actions, validation, recovery, and dark/light compositions are broadly coherent. However, the shared desktop filter layout materially collapses search fields at common laptop widths, and the requested full-suite search/state denominator is incomplete because several live captures remained in loading states and two focused harnesses could not execute after one corrected retry.

## 1. Scope and charter

- Catalog denominator: 51 modules, 38 concrete entry routes.
- Viewports: 1024×768, 1366×768, 1440×900, and 1920×1080.
- Search denominator: 23 candidate routes; 19 exposed a search field in the tested top-level state.
- Implementation inventory: 18 active `TableFilters` consumers plus 11 local search implementations with mixed domain purposes.
- Roles: System Administrator, Contract Manager, Human Resource, Finance, Admin, Incident Commander, Assistant Incident Commander, Tactical Response Team, Client Contract Manager, and Representative.
- Themes: light route denominator; representative light/dark application workflows through existing state-aware suites.
- Mutations: none. Navigation and filter input were read-only; no records were created, changed, approved, or deleted.
- Product source and existing tests remained read-only. Only QA artifacts were created.

## 2. Executive results

- 152 catalog route/viewport shell checks completed with no whole-page horizontal overflow, login redirect, uncaught page exception, console error, or HTTP 500 response.
- 29 role-route checks completed for all 10 personas with no unexpected login redirect.
- 223 settled-shell screenshots were captured by the corrected catalog runner.
- The state-aware Playwright bundle passed 23/26 cases. Passing coverage included desktop reporting records, FRT desktop search, employee application/record parity, dashboard, admin review, shared buttons, desktop details, validation, missing-record recovery, and related responsive controls.
- Reporting-record desktop fixtures demonstrate coherent table, status, action, pagination, and filter structures at 1440px.
- The first custom run was invalid because it captured `Restoring session...`; it was preserved and replaced with one corrected settled-shell run.

## 3. Coverage summary

| Area | Result | Evidence |
| --- | --- | --- |
| Catalog route shells at four desktop widths | Passed | 152 checks |
| Declared persona routes | Passed | 29 checks, 10 personas |
| Whole-page overflow and fatal browser/network errors | Passed | Zero observed |
| Reporting desktop record structures | Passed | Four reporting/inspection routes |
| Leave, Overtime, Salary and Claim desktop workflows | Passed | Existing state-aware parity suite |
| Search geometry across shared record filters | Failed | Search fields collapse at 1024/1366 |
| Settled populated/empty/error states on all catalog routes | Blocked | Several broad-run captures remained in loading state |
| High Angle desktop search journey | Blocked | Repeated Vite preamble harness failure |
| Offline Manrope/service-worker check | Blocked | Repeated service-worker readiness timeout |
| Actual 125% and 200% browser zoom sweep | Blocked | Not completed with defensible browser-level zoom evidence |

## 4. Defect register

### DESK-FILTER-001 — Search input collapses at constrained desktop widths

Severity: Medium. Release-blocking for this desktop consistency charter.

Affected examples at 1024px:

- User Management: 18px search width.
- Leave and Staff Leave Management: 80px.
- Staff Claim Records: 46px.
- Inspection: 103px.
- ERCO: 43px.
- Drill: 73px.
- Fitness Test: 21px.
- ER Assessment: 18px.

At 1366px, Inspection still gives search only 83px because six structured controls compete in the same row. At 1440px it remains only 157px while equivalent reporting searches range from 385px to 441px.

Expected: search remains readable and usable at every supported desktop width, with enough room to see entered criteria and its purpose. Excess filters should recompose into a second row or an advanced-filter disclosure.

Actual: the shared flex row lets search shrink almost to zero before the filters recompose. Placeholders and entered values become clipped, and the user cannot confidently inspect or edit the query.

Likely affected seam, based on source inspection: `TableFilters` defaults to `autoWidth`, gives the search column flex growth without a useful minimum width, and keeps all primary filters in the same responsive row. Most callers inherit that behavior.

Retest acceptance:

- Search is at least a defensible readable width, recommended 220–280px, at 1024px and above.
- Inspection and other filter-heavy screens move lower-priority filters into a second row or `More filters` before shrinking search.
- No whole-page overflow is introduced.
- Search text, clear action, active filters, and result count remain visible and keyboard operable.

### DESK-FILTER-002 — Desktop search presentation does not follow the established search-field grammar

Severity: Low.

All sampled `TableFilters` desktop searches resolve to a 31px-high, 4px-radius Bootstrap field. The established records contract uses a clearly recognizable rounded search field, but the desktop rendering is visually indistinguishable from ordinary data-entry inputs and has no search icon or inline clear affordance.

This is consistent among `TableFilters` consumers, so it is a shared baseline gap rather than page-by-page drift. Local search implementations should not be mass-migrated until their semantics are classified.

Retest acceptance: desktop record searches use one shared semantic search treatment, while ordinary form inputs and domain-specific pickers remain visually distinct.

### DESK-CHOICE-001 — Decision-support descriptions truncate too aggressively at 1024px

Severity: Low.

On Apply Leave at 1024px, the three-column selection grid truncates the Compassionate, Unpaid, and Other Leave descriptions even though those descriptions explain when the option should be chosen. The same content is fully visible on wide desktop.

Expected: decision-support text remains readable, or the layout reduces columns before truncating meaningful distinctions.

Retest acceptance: all meaningful leave-type descriptions are readable at 1024px without requiring pointer hover, and card heights remain coherent.

## 5. Implementation-consistency findings

- `TableFilters` is already the correct shared seam for the majority of record collections. The main drift is inside its desktop responsive policy, not 18 unrelated implementations.
- The 11 local searches include genuinely different concepts: message conversations, bank/staff selection, roster filtering, role-permission matrices, inspection equipment rows, and modal pickers. They require semantic classification rather than blanket replacement.
- Reporting, Leave, Overtime, Claims, User Management, Audit, and staff-management pages generally share labels, filter order, active-filter state, and clear behavior through `TableFilters`.
- Inspection legitimately has more filtering dimensions, but its current one-row desktop presentation causes the worst search-width regression. Its extra fields should be treated as advanced filters rather than forcing a unique compressed visual layout.
- Desktop workflow forms now share page-heading, Back, summary, field, and primary-action hierarchy. Domain-specific field sets remain intact.

## 6. UI/UX and accessibility observations

- Page titles, top actions, sidebar alignment, tabs, and content gutters remain stable across the four desktop widths.
- No whole-page horizontal overflow was observed.
- Reporting tables preserve readable row hierarchy and keep pagination within their record boundary at 1440px.
- Shared desktop action buttons retain consistent semantic pill styling.
- Keyboard/error-recovery component checks passed where executed.
- The compressed search controls are technically focusable but visually inadequate for reading/editing a query, especially at 1024px.
- Actual browser zoom at 125% and 200% remains unverified and must not be inferred from narrow viewport coverage.

## 7. Blocked and unaccounted coverage

- Full search/no-result/filter-clear outcomes across all 19 exposed top-level searches were not established because several catalog pages were still loading when the broad runner reached the interaction step.
- High Angle desktop search could not render in its existing source-component harness. The Vite React-refresh preamble failure repeated on the one allowed clean retry.
- The offline Manrope cache test never reached service-worker readiness under either the normal blocked-worker configuration or a disposable service-worker-enabled configuration.
- Populated, dense, empty, loading, recoverable-error, and terminal-error states were not all exercised for every administration/management route.
- Actual 125% and 200% browser zoom evidence is absent.

These are coverage limitations, not proof of product failure.

## 8. Recovery and instability log

The detailed recovery record is in `recovery-log.md`.

- Initial custom runner attempt: harness invalidation caused by premature capture during session restoration.
- Corrected custom runner: completed normally after waiting for settled application chrome.
- High Angle search retry: repeated harness failure; classified as coverage blocked.
- Typography service-worker retry: repeated readiness timeout; classified as coverage blocked.
- No unrelated modal obstruction occurred, and no destructive recovery action was taken.

## 9. Test data and cleanup

- No test records were created or modified.
- No cleanup was required.
- Existing records were used only through read-only views and controlled route fixtures.

## 10. Minimum remediation and retest gate

1. Give shared desktop search a protected minimum width and define a deterministic two-row/advanced-filter layout at 1024–1366px.
2. Apply one semantic desktop search appearance through `TableFilters` and reconcile only equivalent local searches.
3. Reduce Leave choice columns or relax description clamping at constrained desktop widths.
4. Repair the High Angle source-component harness so the desktop search/reset journey can render and execute.
5. Repair or replace the offline-font service-worker oracle so it can produce valid evidence in the local environment.
6. Add settled-state desktop coverage for populated, empty, active-filter, no-result, clear, pagination, error, and reload/back-preservation states across the shared filter consumers.
7. Execute actual 125% and 200% zoom checks for critical record and form routes.

## 11. Evidence index

- `desktop-audit-ledger-attempt2.json` — corrected catalog, geometry, role, diagnostic, and search ledger.
- `screenshots-attempt2/` — 223 corrected headed desktop captures.
- `screenshots/` and `desktop-audit-ledger.json` — retained invalid first-attempt evidence.
- `recovery-log.md` — harness classification and retry outcomes.
- `C:/laragon/www/vmecc/.qa/VMECC-QA-20260904-180000-deskqa/evidence/playwright/chromium/` — 91 state-aware screenshots and first-failure traces.
- `C:/laragon/www/vmecc/.qa/VMECC-QA-20260904-181000-dretry/evidence/playwright/chromium/` — clean High Angle retry evidence.
- `service-worker-retry/` — clean typography retry evidence.

## 12. Residual risk

- The audit establishes strong shell-level and representative workflow coverage, but not a defensible full-state pass for every data-heavy administration route.
- Local search implementations may contain additional interaction drift that was not observable in their default top-level states.
- Hardware-dependent camera/scanner behavior and download-content validation were outside this desktop visual charter.

Final verdict: NOT GOOD TO GO for site-wide desktop UI/UX and visual-design sign-off. The decisive product issue is shared search compression at common desktop widths; the remaining blockers are incomplete state, High Angle search-harness, offline-font, and zoom evidence.
