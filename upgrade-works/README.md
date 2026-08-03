# Frontend Upgrade Works

This directory is the durable index for the VMECC frontend quality, reliability, performance, accessibility, security, and maintainability upgrade programme.

Application source, generated builds, temporary logs, screenshots, traces, and browser-test artifacts do not belong in this directory.

## Current Status

| Item | Status |
| --- | --- |
| Working branch | `codex/frontend-upgrade-stage-1` |
| Current stage | Stage 1 local implementation authorized |
| Gate decision | **Open for local-only Stage 1; blocked for staging/production promotion** |
| Application/tooling changes started | Yes; Node.js runtime policy pinned |
| Next planned implementation | Day 1 — capture and repair ESLint configuration |

## Document Register

| Document | Purpose | Status |
| --- | --- | --- |
| [Frontend upgrade plan](./FRONTEND_UPGRADE_PLAN_2026-08-03.md) | Hardened 90-day implementation plan, quality gates, rollback controls, and stage criteria | Draft for owner approval |
| [Preflight record](./FRONTEND_UPGRADE_PREFLIGHT_2026-08-03.md) | Repository, toolchain, artifact, environment, CI, service, and safety-gate baseline | Completed; blocking actions open |

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

## Open Preflight Actions

1. Record named QA, operations/deployment, security/privacy, and production release decision owners.
2. Verify GitHub branch protection and required-check policy.
3. Identify approved staging frontend/backend origins and isolated test-data procedures.
4. Confirm the currently deployed build ID or designate another last-known-good artifact.
5. Execute and record a staging rollback drill.

## Next Work

After the preflight gate opens:

1. Capture the effective ESLint configuration for each runtime context.
2. Run corrected rules without autofix and classify real defects versus configuration false positives.
3. Repair the ESLint flat configuration.
4. Fix confirmed undefined identifiers and unreachable code in focused changes.
5. Add regression tests for every corrected runtime path.

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
