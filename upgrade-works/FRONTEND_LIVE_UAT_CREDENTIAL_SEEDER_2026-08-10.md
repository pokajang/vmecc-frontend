# Frontend Live UAT Credential Seeder

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
- `.env.example` variable contract

## Safety properties

- disabled by default;
- separate production opt-in;
- exactly six environment-configured accounts;
- passwords require at least 16 characters and are never logged;
- collision refusal for an existing account without the exact protected UAT marker;
- existing active site team required for TRT and Incident Commander;
- transactional and idempotent reconciliation;
- password rotation revokes prior sessions and tokens;
- cleanup revokes access and soft-deletes only exact marked accounts;
- neither seeder is part of `DatabaseSeeder`.

## Verification

- PHP syntax: passed.
- Laravel Pint: passed.
- `git diff --check`: passed.
- Disabled-by-default execution: correctly refused before database access.
- PostgreSQL feature execution: blocked because the configured local test PostgreSQL service is unavailable and its local data directory reports an invalid checkpoint.
- SQLite fallback: blocked by an unrelated PostgreSQL-specific historical roster migration.

No test account has been created locally or in production. Full database assertions remain pending on a healthy isolated PostgreSQL test database or after the committed test runs in CI/another controlled backend environment.
