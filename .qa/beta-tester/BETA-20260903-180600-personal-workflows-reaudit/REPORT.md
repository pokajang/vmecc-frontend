# Beta Acceptance Report

VERDICT: GOOD TO GO
SCOPE: Employee-facing Leave, Overtime, and Payroll Claim visual-parity re-audit
REASON CODES: none
CONFIDENCE: High

Build/version: Local dirty worktree; commit not supplied
Environment: Local development (`localhost`, frontend 3000 / API 8000)
Run ID: `BETA-20260903-180600-personal-workflows-reaudit`
Executed: 2026-09-03, Asia/Kuala_Lumpur
Browser session: Headed Chromium, one worker, deliberate 125 ms pacing for detail inspection
Roles: 1/1 synthetic employee applicant
Critical coverage: 8/8 passed

The corrected employee visual scope is ready. Leave, Overtime, and Salary Claim retain their workflows while matching the reporting/inspection hierarchy. No unresolved visual blocker, console error, failed API request, clipping, or horizontal overflow was observed in the final evidence.

## 1. Scope and charter

Included:

- Employee Leave, Overtime, and Payroll Claim forms and records contract.
- Existing cancelled Leave, Overtime, and Salary detail records.
- Module context chip, Back action, detail hierarchy, workflow progress, Salary breakdown, narrow-width wrapping, responsive overflow, light/dark parity, and loading/error-state contracts.
- Viewports: 320x568, 390x844, 768x1024, and 1440x1000.
- Read-only visual inspection in the final beta phase; no new application records were created.

Excluded:

- HR/reviewer/approver journeys, because this verdict is limited to employee-facing visual parity.
- New attachment upload and external file-download integrations.
- Formal accessibility certification; semantic names and status announcements were checked only within this scope.

## 2. Executive results

- Pending workflow gates now use open circles; completed gates alone use checkmarks.
- Leave, Overtime, and Salary show loading states during record hydration instead of transient false not-found errors.
- Salary detail uses `Payroll` as module context and `Salary Claim` as record identity without repeated “View Only” copy.
- Salary overtime narratives stack on mobile; key/value rows retain a bounded label column.
- Duplicate mobile adjustment summary content was removed.
- Back remained visible and aligned at mobile widths.
- The final 320px Salary measurement reported `clientWidth=305`, `scrollWidth=305`, and a 108px contribution-label column.
- No console errors or failed API responses were observed in final visual confirmation.

## 3. Coverage summary

- Passed: 8
- Failed: 0
- Blocked: 0
- Excluded: 2 noncritical areas
- Not applicable: 0
- Roles: 1/1
- Critical journeys: 8/8
- Viewports: 4/4
- Themes: light and dark in the controlled parity suite
- Evidence-bearing product failures: 0

Focused verification:

- Component regression: 18/18 tests passed.
- Focused ESLint: passed.
- `git diff --check`: passed.
- Controlled headed Playwright parity: 2/2 tests passed.

## 4. Role and permission matrix

| Role | Authentication | Routes | Permitted behavior | Denied behavior | Result |
| --- | --- | --- | --- | --- | --- |
| Synthetic employee applicant | Passed | `/leave`, `/overtime`, `/payroll` and detail routes | View own records, forms, details, and available record actions | Admin-only payroll settings remained outside the employee flow | Passed |

Ownership and negative authorization were established in the preceding live acceptance run and were not mutated during this visual-only re-audit.

## 5. Journey results

| Journey | Start to end | Variations | Persistent outcome | Result |
| --- | --- | --- | --- | --- |
| Leave detail | Direct own-record route to complete cancelled detail | 320 and 390 | Record content loaded; no false missing state | Passed |
| Overtime detail | Direct own-record route to complete cancelled detail | 320 and 390 | Record content loaded; no false missing state | Passed |
| Salary detail | Direct own-record route to payout breakdown | 320, 390, 1440 | Server snapshot values remained consistent | Passed |
| Responsive application parity | Leave, Overtime, Salary application stages | 320, 390, 768, 1440; light/dark | Shared form contract preserved | Passed |
| Records parity | Leave, Overtime, Claim records | Responsive light/dark | Reporting records header contract preserved | Passed |

## 6. Defect register

No unresolved defects remain in the declared scope.

Corrected before the final beta pass:

- Low: pending workflow stages visually appeared completed because every stage used a check icon.
- Low: Salary detail repeated its type/context and displayed inaccurate “View Only” wording despite available record actions.
- Low: long Salary breakdown values over-compressed narrow labels.
- Low: Leave and Overtime briefly rendered terminal missing-record feedback while their records hydrated.

## 7. UI/UX, responsive, and accessibility findings

- Context hierarchy is now consistent: compact module label, record title/status, then domain details.
- Workflow stages expose `complete` or `pending` in accessible list-item names.
- Mobile Salary narrative metadata is stacked rather than competing with its label.
- No character-level label break, clipped Back action, or horizontal document overflow remained at 320px.
- Touch actions and bottom navigation remained visible. Full-page screenshot compositing can place the fixed nav over intermediate content, but normal viewport scrolling remains functional.

## 8. Blocked, excluded, and unaccounted coverage

No critical item was blocked or unaccounted. Reviewer/approver journeys and external attachment behavior were deliberately excluded as outside this employee visual-parity re-audit.

## 9. Recovery and instability log

The first disposable overflow oracle compared `documentElement.scrollWidth` with Playwright's outer viewport width. Headed Chromium's visible scrollbar makes the document client width smaller, producing a false failure. The corrected mobile oracle compared scroll width with client width and passed at 320 and 390.

A duplicate stale desktop assertion repeated the same harness mistake. It was not counted as product evidence and was not repeatedly tuned. Desktop coverage was reconciled using the captured clean desktop screenshot plus the established headed parity suite, which passed. Confidence was not reduced because the rendered desktop page showed no overflow or clipping and the official suite independently passed.

## 10. Test-data and cleanup ledger

- No records were created, modified, cancelled, or deleted during this re-audit.
- Existing synthetic cancelled records were read only:
  - `LV-AL-2026-004`
  - `OT-2026-006`
  - `CLM-2026-002`
- No unowned data was deliberately changed.

## 11. Recommendations and retest gate

No blocking retest condition remains. Preserve the new shared `ApprovalGates` complete/pending distinction and the three personal-module hydration states in future workflow changes.

## 12. Evidence index

- `BETA-20260903-180600-personal-workflows-reaudit-results.json`
- `BETA-20260903-180600-personal-workflows-reaudit-visual-confirm.json`
- `BETA-20260903-180600-personal-workflows-reaudit-leave-detail-mobile-320.png`
- `BETA-20260903-180600-personal-workflows-reaudit-leave-detail-mobile-390.png`
- `BETA-20260903-180600-personal-workflows-reaudit-overtime-detail-mobile-320.png`
- `BETA-20260903-180600-personal-workflows-reaudit-overtime-detail-mobile-390.png`
- `BETA-20260903-180600-personal-workflows-reaudit-salary-detail-mobile-320.png`
- `BETA-20260903-180600-personal-workflows-reaudit-salary-detail-mobile-390.png`
- `BETA-20260903-180600-personal-workflows-reaudit-salary-final-mobile-320.png`
- `BETA-20260903-180600-personal-workflows-reaudit-failure.png` (desktop screenshot from invalid harness assertion; product rendering is clean)
- Controlled Playwright result: 2 tests passed in 2.3 minutes.

## 13. Residual risk

This is not a site-wide or reviewer-workflow verdict. Native mobile browsers, physical safe-area insets, external attachment handling, and cross-role approval transitions were not repeated in this visual-only re-audit.

VERDICT: GOOD TO GO — employee-facing Leave, Overtime, and Payroll Claim visual-parity scope only.
