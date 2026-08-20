# Live Full-System CRUD UAT — Stage 0 Execution

**Date:** 2026-08-14  
**Status:** Safety-qualified; blocked before live CRUD  
**Parent plan:** [Live full-system module and CRUD UAT plan](./FRONTEND_LIVE_FULL_SYSTEM_CRUD_UAT_PLAN_2026-08-14.md)

## Completed safely

- Confirmed the deployed application accepts the supplied administrator account.
- Confirmed that account has the `System Administrator` role and 35 active permissions.
- Confirmed the existing production UAT browser guard remains read-only: safe reads and login pass; all business mutations and foreign origins are blocked.
- Added a separate controlled-CRUD Playwright guard. It requires all of the following before it can run:
  - `VMECC_LIVE_UAT=1`;
  - `VMECC_LIVE_UAT_ALLOW_MUTATIONS=1`;
  - a specific `RUN_OWNED_CRUD_ONLY` production acknowledgement;
  - the exact production frontend/API origins;
  - a valid UAT run ID whose marker is present in every create payload; and
  - no foreign-workflow override.
- The guard permits only marker-bearing creates at explicitly registered endpoints and later mutations for IDs registered by that same run. It blocks all foreign record IDs and records sanitized diagnostics.
- Added focused safety coverage for both read-only and controlled-CRUD guards: **8/8 Playwright tests passed**.
- `git diff --check` passed.

## Live data/role reconciliation

The live database currently contains three users. No dedicated UAT account was found for any required persona:

| Persona | Dedicated UAT account present |
|---|---:|
| Tactical Response Team | No |
| Incident Commander | No |
| Contract Manager | No |
| Human Resource | No |
| Finance | No |
| System Administrator | No |

The supplied administrator is valid for administrative read-only coverage, but it cannot prove the normal user, reviewer, finance, HR, team-scoped, or permission-denial journeys.

## Why execution stopped

Creating UAT users through the live Users screen/API queues an invitation email. That violates the plan's side-effect boundary and cannot safely be used to bootstrap missing personas. No inspection, report, payroll, leave, roster, team, user, message, setting, or catalogue record was mutated.

## Required server-side prerequisite

From the production backend working copy, seed the six protected UAT accounts using the existing server-side seeder. This does not require an `.env` change:

```bash
cd ~/vmecc-backend
php artisan db:seed --class=LiveUatUsersSeeder --force
php artisan config:cache
```

The seeder is intentionally guarded: it accepts only the six `[Live UAT]` account markers, resets their sessions, restores only those soft-deleted accounts, and refuses to overwrite a non-UAT user with the configured emails.

Plaintext passwords are deliberately not in Git. Before the next stage, provide the six UAT credentials through the active session or set a known temporary password for those protected accounts on the server. Do not add credentials to the repository, `.env`, screenshots, test traces, or UAT reports.

## Next execution step

After the protected UAT personas are seeded and available, run Stage 0 account authentication for all six roles, then continue with Stage 1 and the inspection/reporting lifecycle matrix using only run-owned records.
