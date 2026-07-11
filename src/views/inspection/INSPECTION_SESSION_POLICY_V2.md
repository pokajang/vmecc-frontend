# Fire Extinguisher Inspection Session Policy V2

Approved: 11 July 2026

## Session identity

A V2 session is identified by the server from:

- configured site key;
- inspection date;
- the team's roster shift, or `unrostered` when no roster exists;
- the inspector's active team assignment; and
- an explicit batch key, defaulting to the team batch.

Locations remain progress dimensions inside the session. They do not create separate sessions.
The server derives the site, team, and shift and hashes the canonical dimensions. Client-provided
team or site values are not authoritative.

## Participation and ownership

- The starter, current members of the scoped team, and supervisors may read an active V2 session.
- Current team members may check, recheck, and reset extinguisher results.
- Only the session starter or a supervisor may submit and close the session.
- Supervisors are System Administrator, Admin, Contract Manager, Incident Commander, or Assistant
  Incident Commander roles.
- Submission requires at least one completed extinguisher. Full catalog completion is not required.
- Pending server operations, a stale session version, or a non-active session blocks submission.
- Submitted sessions are immutable. Recovery creates a new explicit batch; submitted sessions are
  never reopened.

## Compatibility and rollout

- Existing sessions retain `legacy` scope and continue through the legacy resolver.
- V2 uses an additive scope key and a unique active-scope claim to prevent concurrent duplicate
  sessions.
- `INSPECTION_SESSION_SCOPE_V2_ENABLED` and
  `VITE_INSPECTION_SESSION_SCOPE_V2_ENABLED` must both be enabled for a V2 cohort.
- Disabling either flag returns new clients to the legacy resolver without changing or deleting V2
  session data.
- Submission releases the V2 active-scope claim so a later recovery batch can be created safely.
