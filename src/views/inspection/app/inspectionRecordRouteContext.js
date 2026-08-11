const DEFAULT_RECORD_SCOPE = 'mine'
const DETAIL_RECORD_SCOPE = 'all'
const SUPPORTED_RECORD_SCOPES = new Set(['mine', 'all', 'actionable'])
const SUPPORTED_ACTIONS = new Set(['review', 'approve'])

const readSearchParams = (search = '') => new URLSearchParams(String(search || ''))

export const normalizeInspectionRouteScope = (search = '', { isDetailRoute = false } = {}) => {
  const requestedScope = String(readSearchParams(search).get('scope') || '')
    .trim()
    .toLowerCase()

  if (SUPPORTED_RECORD_SCOPES.has(requestedScope)) return requestedScope
  return isDetailRoute ? DETAIL_RECORD_SCOPE : DEFAULT_RECORD_SCOPE
}

export const getInitialInspectionRecordScope = (search = '', options = {}) =>
  normalizeInspectionRouteScope(search, options) === 'all' ? 'all' : 'mine'

const buildPreservedSearch = ({ search = '', recordScope = DEFAULT_RECORD_SCOPE } = {}) => {
  const current = readSearchParams(search)
  const next = new URLSearchParams()
  const normalizedScope = String(recordScope || DEFAULT_RECORD_SCOPE).toLowerCase()

  if (normalizedScope === 'all') {
    next.set('scope', 'all')
  } else if (normalizedScope === 'actionable') {
    next.set('scope', 'actionable')
    const action = String(current.get('action') || '').toLowerCase()
    if (SUPPORTED_ACTIONS.has(action)) next.set('action', action)

    const status = String(current.get('status') || '')
    if (status === 'Rejected') next.set('status', status)

    const teamId = Number(current.get('team_id') || 0)
    if (Number.isInteger(teamId) && teamId > 0) next.set('team_id', String(teamId))
  }

  for (const key of ['date_from', 'date_to']) {
    const value = String(current.get(key) || '').trim()
    if (value) next.set(key, value)
  }

  const query = next.toString()
  return query ? `?${query}` : ''
}

export const buildInspectionRecordsLocation = ({
  basePath = '/inspection',
  search = '',
  recordScope = DEFAULT_RECORD_SCOPE,
} = {}) => `${basePath}${buildPreservedSearch({ search, recordScope })}`

export const buildInspectionDetailLocation = ({
  basePath = '/inspection',
  reportId,
  search = '',
  recordScope = DEFAULT_RECORD_SCOPE,
} = {}) => {
  const normalizedId = String(reportId || '').trim()
  if (!normalizedId) return buildInspectionRecordsLocation({ basePath, search, recordScope })
  return `${basePath}/${encodeURIComponent(normalizedId)}${buildPreservedSearch({
    search,
    recordScope,
  })}`
}
