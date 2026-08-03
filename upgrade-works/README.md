# Frontend Upgrade Works

This directory is the durable index for the VMECC frontend quality, reliability, performance, accessibility, security, and maintainability upgrade programme.

Application source, generated builds, temporary logs, screenshots, traces, and browser-test artifacts do not belong in this directory.

## Current Status

| Item | Status |
| --- | --- |
| Working branch | `codex/frontend-upgrade-stage-1` |
| Current stage | Stage 1 Days 1–2 locally completed |
| Gate decision | **Open for local-only Stage 1; blocked for staging/production promotion** |
| Application/tooling changes started | Yes; implementation checkpoint `b1b0804` |
| Next planned implementation | Day 3 — production headers and source configuration |

## Document Register

| Document | Purpose | Status |
| --- | --- | --- |
| [Frontend upgrade plan](./FRONTEND_UPGRADE_PLAN_2026-08-03.md) | Hardened 90-day implementation plan, quality gates, rollback controls, and stage criteria | Draft for owner approval |
| [Preflight record](./FRONTEND_UPGRADE_PREFLIGHT_2026-08-03.md) | Repository, toolchain, artifact, environment, CI, service, and safety-gate baseline | Completed; blocking actions open |
| [Stage 1 execution record](./FRONTEND_UPGRADE_STAGE_1_EXECUTION_2026-08-03.md) | Day 1 lint repair, Day 2 correctness fixes, validation evidence, rollback, and residual risks | Days 1–2 locally completed; promotion blocked |

## Completed Work

### 2026-08-03

- Completed the frontend code-quality audit.
- Created and hardened the 90-day frontend upgrade plan.
- Created the dedicated local branch `codex/frontend-upgrade-stage-1`.
- Captured the repository, toolchain, package, build, environment-name, security-header, CI, and local-service baselines.
- Identified the preflight blockers that must be resolved before Day 1 implementation.
- Confirmed that no application, tooling, dependency, test, or generated build source was changed during preflight.
- Received repository-owner authorization to begin local-only Stage 1 work while keeping staging and production promotion blocked.
- Committed the programme documentation checkpoint as `3bfb03b`.
- Initially tested Node.js `22.23.1`, then corrected the repository and CI policy to Node.js `24.16.0` after clean install exposed `@zxing/library@0.23.0` requiring Node.js 24 or newer.
- Repaired ESLint so JavaScript, React, Hooks, accessibility, tests, scripts, and service-worker contexts enforce the intended rules.
- Fixed all blocking undefined, unreachable, React, accessibility, and JavaScript recommended-rule findings without autofix.
- Added focused regression coverage and passed 312 test files / 1,706 tests under the final Node.js runtime.
- Passed the clean install, lint, repository audits, and isolated production build at implementation revision `b1b0804`.

## Open Preflight Actions

1. Record named QA, operations/deployment, security/privacy, and production release decision owners.
2. Verify GitHub branch protection and required-check policy.
3. Identify approved staging frontend/backend origins and isolated test-data procedures.
4. Confirm the currently deployed build ID or designate another last-known-good artifact.
5. Execute and record a staging rollback drill.

## Next Work

Continue with the locally reviewable Day 3 work while promotion remains blocked:

1. Correct and test production Permissions Policy and CSP source configuration.
2. Remove silent production API fallback behavior and validate required production configuration.
3. Preserve a configuration-only rollback diff.
4. Defer deployed-origin and physical-device claims until approved staging, owners, and devices are available.

## File Naming

Use uppercase descriptive names with an ISO date where the document is a dated snapshot:

```text
FRONTEND_UPGRADE_<DOCUMENT_TYPE>_YYYY-MM-DD.md
```

Recommended document types include:

- `PLAN`
- `PREFLIGHT`
- `STAGE_1_EXECUTION`
- `STAGE_1_RELEASE`
- `STAGE_2_EXECUTION`
- `STAGE_2_RELEASE`
- `STAGE_3_EXECUTION`
- `STAGE_3_RELEASE`
- `DECISION_LOG`
- `RISK_REGISTER`
- `FINAL_REPORT`

Use `README.md` only as this living directory index.

## Evidence Storage

- Durable plans, decisions, summaries, risk records, and release records: `upgrade-works/`
- Generated local evidence, raw logs, temporary builds, and scans: `.codex-run/frontend-upgrade/`
- Playwright output: the configured ignored test/evidence directory
- CI evidence: immutable CI artifacts linked from the relevant durable summary

Do not commit credentials, environment values, personal information, payroll data, report contents, attachments, raw production payloads, or unredacted screenshots/traces.

## Update Rule

Update this index whenever:

- a gate decision changes
- a stage begins or ends
- a new durable programme document is added
- a risk is accepted, closed, or escalated
- a release candidate is approved, rejected, deployed, or rolled back

The index must link to evidence; it must not claim completion based only on a passing summary.
