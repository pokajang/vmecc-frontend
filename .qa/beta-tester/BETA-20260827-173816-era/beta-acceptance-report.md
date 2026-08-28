# Beta Acceptance Report

VERDICT: NOT GOOD TO GO
SCOPE: ER Assessment frontend UI/UX module only
REASON CODES: PRODUCT FAILURE
CONFIDENCE: High

Build/version: `8c5579bc`, VMECC frontend 5.5.0
Environment: Local controlled frontend at `http://127.0.0.1:3001`
Run ID: `BETA-20260827-173816-era`
Executed: 2026-08-27, Asia/Kuala_Lumpur
Browser session: Headed Chrome for Testing 149.0.7827.55, Playwright 1.61.1, one worker, 125 ms slow motion for expanded journeys
Roles: 3/3
Critical coverage: 10/12 passed

Release recommendation: do not release the ER Assessment frontend navigation contract yet. The form and responsive journeys are usable, but module discovery is inverted for scoped users: the intended ER Assessment operator cannot see its navigation link, while an ERCO-only operator can see the link and reaches a permission-denied page. Correct and retest role-aware navigation before acceptance.

## 1. Scope and charter

This is a feature-level frontend UI/UX verdict, not a site-wide or production-readiness verdict.

Included:

- ER Assessment records landing and mobile home.
- Setup, requirements, rescue, equipment, sign-off, and review journey.
- Required-field and conditional-remarks recovery.
- Back navigation and unsaved-change cancellation.
- Keyboard activation and focus recovery.
- Authorized and unauthorized route/navigation behavior.
- Responsive operation at 320×568, 390×844, and 1440×1000.
- Console, page-error, request-failure, touch-target, and overflow observation.

Roles:

- System Administrator UI auditor.
- Tactical Response Team operator with only `reports.er_assessment.view`.
- Tactical Response Team operator with only `reports.erco.view` as the negative case.

Authorized mutation was limited to synthetic, mocked frontend data carrying the run marker. Backend persistence, production API integration, cross-role approval, detail-after-submit, PDF/download, and deployment were excluded because the module is explicitly frontend-only. The visible headed browser ran locally; no headless fallback was used.

Evidence: [initial coverage ledger](coverage-ledger-initial.json), [headed Playwright evidence](../../../../../.qa/BETA-20260827-173816-era/evidence/playwright/chromium/).

## 2. Executive results

- Full mobile and desktop first-time completion passed through shared review.
- Validation explained missing setup values and kept the user on the correct stage.
- A No readiness response was keyboard-selectable, required remarks, and focused the recovery field.
- Back navigation and cancelling the unsaved-change confirmation preserved entered data.
- The draft-save UI retained entered rescue-plan data.
- The five mobile assessment choices were reachable at 320 px; measured targets exceeded 44×44 px and no horizontal overflow was observed.
- Direct route authorization behaved safely: the ER Assessment-scoped operator was allowed and the ERCO-only operator was denied.
- Role-aware navigation failed in both directions. This is the sole release-blocking finding.
- No uncaught page error, material console error, or failed request was observed in the completed controlled journeys.

## 3. Coverage summary

| Measure | Result |
| --- | --- |
| Expanded ledger | 15 passed, 2 failed, 0 blocked |
| Project-native headed journeys | 3 passed |
| Critical coverage | 10/12 passed |
| Roles | 3/3 covered |
| Routes/views | 7/8 covered; persisted detail excluded |
| Critical journeys | 5/5 executed; permission-discovery journey failed |
| Viewports | 320×568, 390×844, 1440×1000 |
| Evidence-bearing product failures | 2/2 |

## 4. Role and permission matrix

| Role | Authentication | Intended capability | Navigation | Direct route | Result |
| --- | --- | --- | --- | --- | --- |
| System Administrator | Mocked controlled session | Complete UI journey | Visible | Allowed | Passed |
| ER Assessment operator | Mocked controlled session | Discover and enter ER Assessment | Incorrectly hidden | Allowed | Failed |
| ERCO-only operator | Mocked controlled session | ERCO only; ER Assessment denied | ER Assessment incorrectly visible | Denied safely | Failed |

No ownership/team isolation claim is made because persisted backend records were excluded.

## 5. Journey results

| Journey | Persona | Start → end | Variations | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| First-time assessment, mobile | System Administrator | Setup → review | Layout upload, equipment, dual sign-off | Passed | Project-native headed trace |
| First-time assessment, desktop | System Administrator | Setup → review | Layout upload, equipment, dual sign-off | Passed | Project-native headed trace |
| Setup validation recovery | System Administrator | Blank setup → explained errors | Required fields | Passed | Project-native headed trace |
| Scoped positive authorization | ER Assessment operator | Direct records route | Navigation discovery | Failed | [initial ledger](coverage-ledger-initial.json) |
| Scoped negative authorization | ERCO-only operator | ERCO landing → ER Assessment direct route | Hidden navigation and denial | Failed navigation; passed denial | [initial ledger](coverage-ledger-initial.json) |
| Data-preserving recovery | ER Assessment operator | Setup → requirements → setup | Back, unsaved cancel, conditional remarks, draft save | Passed | [unsaved dialog](evidence/unsaved-change-dialog-desktop.png), [save outcome](evidence/draft-failure-recovery-desktop.png) |
| Small-mobile discovery | ER Assessment operator | Mobile home → preselected setup | 320 px, five types, touch targets | Passed | [320 px screenshot](evidence/mobile-home-320.png) |

## 6. Defect register

### ERA-BETA-001 — ER Assessment navigation visibility uses the wrong permission set

- Severity: Medium; release-blocking because required critical permission/discovery coverage failed.
- Scope: ER Assessment sidebar navigation, `/report/er-assessment`, build `8c5579bc`.
- Environment: Local controlled frontend; Chrome 149; 1440×1000.
- Roles: Tactical Response Team with only `reports.er_assessment.view`; negative case with only `reports.erco.view`.
- Preconditions: clean isolated session with the stated synthetic permission list.
- Reproduction:
  1. Authenticate as a user whose only reporting permission is `reports.er_assessment.view`.
  2. Open `/report/er-assessment` and wait for the rendered application shell.
  3. Observe that the records page is allowed but the sidebar has no ER Assessment link.
  4. Repeat with a user whose only reporting permission is `reports.erco.view`.
  5. Observe that ER Assessment is shown in the sidebar.
  6. Open the shown ER Assessment link/route and observe the permission-denied page.
- Expected: ER Assessment appears only for users with `reports.er_assessment.view` or system-administrator access.
- Actual: the ER Assessment-scoped user cannot discover the module; the ERCO-only user sees a link to a route they cannot access.
- Reproducibility: repeated in the healthy-precondition headed run.
- Impact: intended operators need insider knowledge/direct links; unrelated report users encounter a dead-end permission error.
- Evidence: [initial ledger](coverage-ledger-initial.json) and the defect record in this report. The same evidence filenames were intentionally refreshed during the in-place post-fix retest; use the separate retest report for those screenshots.
- Likely affected area (inference): role-based navigation filtering for `/report/*` does not include the new ER Assessment permission.
- Required outcome: align ER Assessment navigation visibility with `reports.er_assessment.view` without changing direct-route enforcement for unauthorized users.
- Retest acceptance: scoped operator sees and opens ER Assessment; ERCO-only operator does not see it and remains denied by direct URL; existing ERCO, Drill, and Fitness navigation visibility is unchanged.

## 7. UI/UX, responsive, and accessibility findings

- Module title, stage title, progress, primary action, and contextual summary were understandable.
- Yes/No/N/A controls exposed pressed state and accepted keyboard Space activation.
- Conditional No-response validation explained the required remediation and focused the matching remarks field.
- Unsaved-change cancellation returned to the form with values intact.
- Review actions and section-specific Edit accessible names were understandable.
- At 320 px the type choices reflowed without clipping; target sizes ranged from approximately 247×83 to 247×106 px.
- No formal accessibility-conformance claim is made.

## 8. Blocked, excluded, and unaccounted coverage

- Excluded: backend persistence, submitted-detail reload, approval/rejection handoff, PDF/download, deployment, and real production permissions. These are outside the frontend-only charter and still block an overall production verdict.
- Excluded: camera capture as hardware-specific; file upload was exercised instead.
- Unaccounted critical coverage: none within the frozen frontend UI/UX charter.

## 9. Recovery and instability log

- Stale development port was avoided by using the current Vite instance on 3001.
- Harness invalidation 1: confirmation dialog was targeted by an assumed accessible dialog name. Corrected only in the disposable runner to use the visible title/action group; no product result assigned.
- Harness invalidation 2: mocked draft save was assumed to fail, but the stub returned success. Corrected the disposable runner to record either disclosed state and require data retention; no product result assigned.
- Harness invalidation 3: initial permission screenshot was captured while the app still displayed “Loading application…”. The evidence was preserved as [premature-readiness evidence](evidence/harness-premature-readiness.png), readiness was corrected to the rendered shell, and the entire role matrix was rerun cleanly.
- The healthy rerun reproduced both navigation failures with no page or network instability.

## 10. Test-data and cleanup ledger

| Data | Owner marker | Mutation | Cleanup |
| --- | --- | --- | --- |
| Form-only assessment | `BETA-20260827-173816-era` | Synthetic input through visible UI | Isolated browser context closed; no real backend record |
| Mock draft response | `BETA-20260827-173816-era` | Save Draft through visible UI against intercepted local API | Context closed; no external persistence |

No unowned application data was deliberately changed.

## 11. Recommendations and retest gate

1. Correct the report navigation permission mapping for ER Assessment.
2. Rerun the positive ER Assessment-scoped and negative ERCO-only role contexts.
3. Re-run existing navigation/report registration contracts to guard ERCO, Drill, Fitness Test, and Inspection visibility.

Retest gate: both permission-discovery cases must pass in headed Chromium, direct denial must remain intact, and no existing report navigation regression may appear.

## 12. Evidence index

- [Initial coverage ledger](coverage-ledger-initial.json)
- [Unsaved-change recovery screenshot](evidence/unsaved-change-dialog-desktop.png)
- [Draft-save retention screenshot](evidence/draft-failure-recovery-desktop.png)
- [320 px mobile screenshot](evidence/mobile-home-320.png)
- [Premature-readiness harness evidence](evidence/harness-premature-readiness.png)
- Project-native headed Playwright traces: `C:/laragon/www/vmecc/.qa/BETA-20260827-173816-era/evidence/playwright/chromium/`

## 13. Residual risk

Even after the navigation defect is corrected, backend persistence, production permissions, cross-role workflow, detail reload, and PDF generation remain unverified and unavailable in this frontend-only phase. The controlled API stubs support UI acceptance only.

VERDICT: NOT GOOD TO GO — ER Assessment frontend UI/UX module at build `8c5579bc`.
