# Beta Acceptance Report

VERDICT: NOT GOOD TO GO
SCOPE: Mobile-only full-suite visual and UX consistency audit of VMECC frontend routes and shared workflow primitives.
REASON CODES: COVERAGE BLOCKER
CONFIDENCE: Medium

Build/version: `ec84c998` (working tree already contained user changes; no product files modified by this audit)
Environment: local controlled frontend `http://localhost:3000`, API `http://localhost:8000/api`
Run ID: `BETA-20260904-104900-mobile-full-suite`
Executed: 2026-09-04, Asia/Kuala_Lumpur
Browser session: headed Chrome/Chromium, single worker
Roles: 1 live authenticated field-user journey; controlled administrator/reviewer presentations; full role matrix not completed
Critical coverage: 8/8 representative mobile visual journeys passed; full route/role denominator blocked

## Release recommendation

The audited reporting, inspection, personal-application, dashboard, admin-review, and shared-control mobile surfaces are visually coherent at 320px and 390px. However, this cannot be released as a *full-suite* mobile consistency sign-off: the repository's own coverage-contract check fails because `reports.er_assessment` is missing from the manifest, and all route/role families cannot be accounted for by the current mobile visual suites.

## Passed evidence

- Four reporting setup modules (ERCO, Drill, Fitness Test, ER Assessment) at 320px and 390px: no horizontal overflow, clipped setup text, undersized targets, or sticky-action geometry regression.
- Eight inspection type variants: parity capture and evidence drawers completed at 390px.
- Inspection representative matrix, including 320px partial and validation states: legible and overflow-safe.
- Inspection, ERCO, Drill, and Fitness Test record journeys: shared mobile records contract passed at 320px and 390px.
- Leave, Overtime, Salary, Expense, and Exceptional Claim form and records parity: common Back, compact setup summary, full-width primary CTA, dock-at-end action, and no-clear-form contract passed.
- Dashboard mobile composition, admin review queues, compact record/detail component, mobile button system, and field-error recovery passed.
- Contrast audit passed for semantic contracts and high-risk controls.

## Findings

### MOB-COV-001 — ER Assessment is absent from the mandatory coverage manifest

Severity: Medium. Release-blocking for this declared full-suite audit.

The UI is implemented, routable, permission-gated, and independently passed mobile rendering checks, but `npm run test:e2e:coverage-contract` fails because the manifest does not contain `reports.er_assessment`. The automated coverage denominator therefore excludes one reporting module and will not guard it consistently going forward.

Expected: every `ModuleCatalog` entry, including ER Assessment, has a matching route/coverage row with its relevant mobile journey specs.

Retest acceptance: the coverage-contract script passes and the ER Assessment entry identifies its record, setup, detail, and permission coverage.

### MOB-DESIGN-001 — Typography-token discipline has regressed beyond the declared budget

Severity: Low observation with Medium drift risk.

`npm run audit:typography` reports 72 direct font-size declarations against a budget of 63. This does not demonstrate a visible defect in the captured mobile journeys, but it weakens the design-system seam and is a credible cause of future module-by-module mobile type drift.

Expected: direct size declarations remain within the project's budget or are replaced by semantic type tokens/classes.

Retest acceptance: typography audit passes, with any intentional exceptions documented by semantic family.

### MOB-ARCH-001 — Remaining drift risk is concentrated in legacy, non-workflow surfaces

Severity: Observation.

Source inventory found 489 direct Bootstrap/CoreUI button declarations under `src/views`. The recently aligned reporting and personal workflows have migrated to shared primitives, but settings, team, user, roster, audit, and legacy inspection/admin dialogs still own many local button/action implementations. Those are not automatically equivalent defects—many are desktop administration flows—but they are the likely next places where controls with the same intent can diverge on mobile.

Question to apply during the next audit: “This action has the same intent as the reporting control; is the visual difference an intentional domain need, or a local implementation that missed the shared primitive?”

### MOB-ARCH-002 — Mobile type-description policy is opt-in/opt-out rather than semantic

Severity: Observation.

The same `WorkflowChoiceStage` can show descriptions by default, while Leave and Overtime explicitly suppress them on mobile. The rendered Drill selection still shows multi-line supporting copy. This can be a legitimate information need—drill types benefit from distinguishing operational descriptions—but the implementation does not make that exception a named policy. A future option set can therefore become tall and visually dense merely because a caller omitted the override.

Question to apply: “Does this description change the decision before the user taps, or is it duplicating a title the user already understands?” Keep it only when the answer is yes; otherwise make compact/no-description the semantic default for mobile type selection.

## Intentional differences retained

- Reporting stages advance through an atomic report workflow; inspection may operate on repeated equipment/location scope.
- Mobile rows that navigate immediately use a chevron/action affordance; persistent multi-select choices use selected-state semantics.
- Dedicated review/approval actions retain role and workflow-state differences while sharing record/detail and action hierarchy.

## Coverage gaps

- Full live mobile route/role sweep across all ten personas was not completed in this visual round.
- Settings, users, team, roster, audit, and every management subroute were source-inventoried but not each exercised in a dedicated 320px/390px journey.
- The existing broad UI route sweep is desktop-configured, so it cannot establish the requested mobile verdict without a mobile counterpart.
- The first controlled dashboard/admin attempt used the wrong loopback API origin for its mocks. It showed the session-recovery alert and was classified as harness invalidation; the clean corrected run passed.

## Minimum retest gate

1. Add ER Assessment to the E2E module coverage manifest and make the coverage contract pass.
2. Bring direct font-size usage back within budget or formally revise the budget with documented semantic exceptions.
3. Add a single-worker, headed 320px/390px role-route sweep for the uncovered mobile admin/management families, including empty, dense, error, and permission-denied states.
4. Re-run this audit and issue a verdict only after every critical discovered mobile route is accounted for.

## Evidence index

- `../../VMECC-QA-20260904-101500-mobaud/evidence/playwright/chromium/` — reporting cross-module audit, 32 captures.
- `../../VMECC-QA-20260904-102100-mobaud/evidence/playwright/chromium/` — employee application parity, 64 captures.
- `../../VMECC-QA-20260904-103500-mobaud/evidence/playwright/chromium/` — dashboard and admin review mobile checks.
- `../../VMECC-QA-20260904-103700-mobaud/evidence/playwright/chromium/` — compact detail/record checks at 320px.
- `../../VMECC-QA-20260904-104100-mobaud/evidence/playwright/chromium/` — inspection and reporting-records consistency.
- `../../VMECC-QA-20260904-104600-mobaud/evidence/playwright/chromium/` — shared button and validation-error mobile checks.
- `../../VMECC-QA-20260904-105100-mobaud/evidence/playwright/chromium/` — eight inspection-type mobile parity captures.

Final verdict: NOT GOOD TO GO for a full-repo mobile consistency release decision. The representative workflow surfaces pass, but coverage governance and denominator completeness must be corrected before that broader claim is supportable.
