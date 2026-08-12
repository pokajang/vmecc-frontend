# Frontend Live UAT Credential Seeder

> [!WARNING]
> Archived status: the deployment-waiting state below is superseded. Do not treat this record as a current seeding instruction.

**Date:** 2026-08-10  
**Status:** Implemented in backend; awaiting deployment and production execution

## Purpose

Provide the six temporary role accounts required by the credential-gated Day 3 live route sweep without committing passwords or using the backend's fixed-password smoke seeders.

## Backend implementation

- `config/live_uat.php`
- `database/seeders/LiveUatUsersSeeder.php`
- `database/seeders/LiveUatUsersCleanupSeeder.php`
- `tests/Feature/LiveUatUsersSeederTest.php`
- `docs/LIVE_UAT_USERS.md`

## Safety properties

- explicitly invoked and excluded from the normal database seeder;
- exactly six fixed, clearly marked dummy UAT accounts;
- no backend `.env` changes;
- strong random credentials recorded only in the workspace-level `UAT/creds.md` outside both repositories;
- only one-way bcrypt password hashes committed to the backend;
- collision refusal for an existing account without the exact protected UAT marker;
- the existing on-duty Alpha team required for TRT and Incident Commander;
- transactional and idempotent reconciliation;
- rerunning restores the recorded credentials and revokes prior sessions and tokens;
- cleanup revokes access and soft-deletes only exact marked accounts;
- neither seeder is part of `DatabaseSeeder`.

## Verification

- PHP syntax: passed.
- Laravel Pint: passed.
- `git diff --check`: passed.
- PostgreSQL feature execution: blocked because the configured local test PostgreSQL service is unavailable and its local data directory reports an invalid checkpoint.
- SQLite fallback: blocked by an unrelated PostgreSQL-specific historical roster migration.

No test account has been created locally or in production. Full database assertions remain pending on a healthy isolated PostgreSQL test database or after the committed test runs in CI/another controlled backend environment.
