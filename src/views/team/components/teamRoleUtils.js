/**
 * Canonical role-label mapping for team member roles.
 * All consumers should derive their display from these helpers so that label
 * strings, badge colours, and abbreviation logic stay in sync.
 */

const ROLE_BADGES = [
  {
    match: 'assistant incident commander',
    label: 'AIC',
    color: '#b91c1c',
    bg: '#fee2e2',
  },
  {
    match: 'incident commander',
    label: 'IC',
    color: '#92400e',
    bg: '#fef3c7',
  },
  {
    match: 'tactical response team',
    label: 'TRT',
    color: '#1e40af',
    bg: '#dbeafe',
  },
]

/**
 * Role names eligible for team membership.
 * Used by EditTeamModal to filter the staff roster dropdown and by
 * TeamMemberSyncService (backend) to identify leader roles.
 * Keep in sync with the backend allowedRoles list in TeamMemberSyncService.
 */
export const TEAM_ELIGIBLE_ROLES = ROLE_BADGES.map((b) => b.match)

/**
 * Returns the badge descriptor for a role string, or null if no match.
 * The `match` strings are tested in order — more-specific entries (AIC)
 * must appear before less-specific ones (IC) in ROLE_BADGES above.
 *
 * @param {string|null|undefined} role
 * @returns {{ label: string, color: string, bg: string } | null}
 */
export const getRoleBadge = (role) => {
  if (!role) return null
  const r = role.toLowerCase()
  return ROLE_BADGES.find((b) => r.includes(b.match)) || null
}

/**
 * Returns a short display label for a role string.
 * Falls back to the original role string (or '--') when no badge matches.
 *
 * @param {string|null|undefined} role
 * @returns {string}
 */
export const mapRoleLabel = (role) => {
  if (!role) return '--'
  return getRoleBadge(role)?.label ?? role
}
