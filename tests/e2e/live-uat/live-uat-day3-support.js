const { API_BASE_URL, redactDiagnostic } = require('./live-uat-support')

const ENDPOINTS = {
  'active-fire-extinguisher': '/inspection/fire-extinguishers',
  'salary-assignment': '/staff/salary-assignments',
  'staff-member': '/users?include_deleted=0&limit=25',
  'managed-user': '/users?include_deleted=1&limit=25',
  team: '/teams',
}

const unwrapRows = (body) => {
  const candidates = [
    body,
    body?.data,
    body?.data?.data,
    body?.items,
    body?.records,
    body?.users,
    body?.data?.items,
    body?.data?.records,
    body?.data?.users,
  ]
  return candidates.find(Array.isArray) || []
}

const safeGetJson = async (page, endpoint) => {
  if (!String(endpoint).startsWith('/')) throw new Error('Fixture endpoint must be relative')
  return page.evaluate(
    async ({ apiBaseUrl, relativeEndpoint }) => {
      const response = await fetch(`${apiBaseUrl}${relativeEndpoint}`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      const text = await response.text()
      let body = null
      try {
        body = text ? JSON.parse(text) : null
      } catch {
        body = null
      }
      return { ok: response.ok, status: response.status, body }
    },
    { apiBaseUrl: API_BASE_URL, relativeEndpoint: endpoint },
  )
}

const firstValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
  }
  return ''
}

const rowIdentity = (row) =>
  firstValue(row, [
    'report_uid',
    'reportUid',
    'public_id',
    'publicId',
    'recordKey',
    'id',
    '_id',
    'uid',
  ])

const ownerIdentity = (row) =>
  firstValue(row, ['ownerUserId', 'owner_id', 'userId', 'user_id', 'employeeId', 'employee_id'])

const safeSlug = (value) =>
  String(value || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user'

const getStaticFixtureValue = (alias, routePattern) => {
  if (alias === 'report-type') return 'erco'
  if (alias === 'reporting-module') return 'inspection'
  if (alias !== 'new-section') return ''
  if (routePattern.startsWith('/inspection/')) return 'details'
  if (routePattern.includes('fitness-test')) return 'period'
  return 'setup'
}

const endpointFor = (alias, routePattern, persona) => {
  const staffRoute = routePattern.startsWith('/staff/')
  if (['leave-record', 'legacy-leave-record'].includes(alias)) {
    return staffRoute ? '/staff/leave/records' : '/leave'
  }
  if (['overtime-record', 'legacy-overtime-record'].includes(alias)) {
    return staffRoute ? '/staff/overtime/records' : '/overtime'
  }
  if (['payroll-claim', 'legacy-claim-record'].includes(alias)) {
    return staffRoute ? '/staff/salary-claims/records' : '/payroll/claims'
  }
  if (alias === 'submitted-inspection') {
    const scope = persona === 'incidentCommander' ? 'all' : 'mine'
    return `/reports?reportType=inspection&scope=${scope}`
  }
  if (alias === 'submitted-report') {
    const reportType = routePattern.match(/^\/report\/([^/:]+)/)?.[1]
    const scope = persona === 'incidentCommander' ? 'all' : 'mine'
    return reportType ? `/reports?reportType=${encodeURIComponent(reportType)}&scope=${scope}` : ''
  }
  return ENDPOINTS[alias] || ''
}

const replaceParameters = (routePattern, alias, row, staticValue) => {
  const id = rowIdentity(row)
  const ownerId = ownerIdentity(row)
  const routeKey =
    firstValue(row, ['recordKey', 'routeKey', 'publicId', 'public_id']) ||
    (ownerId && id ? `${ownerId}::${id}` : id)
  const replacements = {
    id,
    slug: safeSlug(firstValue(row, ['slug', 'name', 'fullName', 'email'])),
    reportId: id,
    extinguisherId: id,
    leaveId: routeKey,
    overtimeId: id,
    overtimeRouteKey: routeKey,
    claimId: routeKey,
    assignmentId: id,
    legacyLeaveId: routeKey,
    legacyOvertimeRouteKey: routeKey,
    legacyClaimId: routeKey,
    moduleKey: staticValue,
    reportType: staticValue,
    newSection: staticValue,
  }
  let resolved = routePattern
  for (const [parameter, value] of Object.entries(replacements)) {
    if (resolved.includes(`:${parameter}`) && value) {
      resolved = resolved.replace(`:${parameter}`, encodeURIComponent(value))
    }
  }
  return resolved.includes(':') ? '' : resolved
}

const expandScheduledRoute = (route) => {
  if (route.probes?.length) {
    return route.probes.map((probe) => ({
      ...route,
      routePattern: probe.routePattern,
      probe: probe.key,
    }))
  }
  return [route]
}

const resolveScheduledRoute = async (page, route, persona = route.primaryPersona) => {
  const staticValue = getStaticFixtureValue(route.fixtureAlias, route.routePattern)
  if (!route.routePattern.includes(':')) {
    return { status: 'resolved', route: route.routePattern, source: 'static' }
  }
  if (staticValue) {
    const resolved = replaceParameters(route.routePattern, route.fixtureAlias, {}, staticValue)
    if (resolved) return { status: 'resolved', route: resolved, source: 'enumerated' }
  }
  const endpoint = endpointFor(route.fixtureAlias, route.routePattern, persona)
  if (!endpoint) {
    return { status: 'data-blocked', reason: `No read-only adapter for ${route.fixtureAlias}` }
  }
  try {
    const response = await safeGetJson(page, endpoint)
    if (!response.ok) {
      return { status: 'data-blocked', reason: `Fixture GET returned ${response.status}` }
    }
    const row = unwrapRows(response.body).find((candidate) => rowIdentity(candidate))
    if (!row) return { status: 'data-blocked', reason: 'No suitable production record' }
    const resolved = replaceParameters(route.routePattern, route.fixtureAlias, row, staticValue)
    if (!resolved) return { status: 'data-blocked', reason: 'Record lacks a stable route identity' }
    return { status: 'resolved', route: resolved, source: endpoint }
  } catch (error) {
    return { status: 'data-blocked', reason: redactDiagnostic(error?.message || error) }
  }
}

module.exports = {
  ENDPOINTS,
  endpointFor,
  expandScheduledRoute,
  replaceParameters,
  resolveScheduledRoute,
  rowIdentity,
  safeGetJson,
  unwrapRows,
}
