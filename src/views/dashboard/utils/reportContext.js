const SOURCE_LABELS = {
  temporary_coverage: 'Temporary coverage',
  role_assignment: 'Permanent assignment',
  legacy_role: 'Legacy role assignment',
  legacy_team: 'Legacy team assignment',
  organization: 'Organization-wide role',
  fallback: 'Fallback assignment',
  unassigned: 'Recipient unavailable',
}

export const reportContextParts = (context = {}) => {
  const source = String(context.assignmentSource || context.routingSource || '')
  const role = String(context.actingRoleCode || context.actingRole || context.role || '').trim()
  const roleLabel =
    source === 'temporary_coverage' && role ? `Acting ${role}` : role || 'Workflow role'

  return [
    String(context.teamName || context.scopeLabel || '').trim() || 'Organization-wide',
    roleLabel,
    SOURCE_LABELS[source] || '',
  ].filter(Boolean)
}

export const reportContextLabel = (context = {}) => reportContextParts(context).join(' · ')
