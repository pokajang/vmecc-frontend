import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_ROOT = path.resolve(SCRIPT_DIR, '..')
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..')
const API_ROUTES_PATH = path.resolve(REPO_ROOT, 'vmecc-backend', 'routes', 'api.php')
const PENDING_NOTES_PATH = path.resolve(REPO_ROOT, 'PENDING_JOYRIDE_MODULES.md')
const TUTORIAL_REGISTRY_PATH = path.resolve(
  FRONTEND_ROOT,
  'src',
  'onboarding',
  'tutorialRegistry.js',
)

const MODULE_MARKER_START = '<!-- BEGIN_ONBOARDING_BACKEND_MODULE_OWNERSHIP -->'
const MODULE_MARKER_END = '<!-- END_ONBOARDING_BACKEND_MODULE_OWNERSHIP -->'
const MATRIX_MARKER_START = '<!-- BEGIN_ONBOARDING_BACKEND_ENDPOINT_MATRIX -->'
const MATRIX_MARKER_END = '<!-- END_ONBOARDING_BACKEND_ENDPOINT_MATRIX -->'

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
const STATUS_VALUES = new Set([
  'in scope now',
  'explicitly deferred',
  'shared support surface',
  'out of scope',
])

const normalizeRoute = (route = '') =>
  String(route || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
const normalizeMethod = (method = '') =>
  String(method || '')
    .trim()
    .toUpperCase()

const read = (targetPath) => fs.readFileSync(targetPath, 'utf8')

const getSection = (content, startMarker, endMarker) => {
  const start = content.indexOf(startMarker)
  const end = content.indexOf(endMarker)
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Unable to find section markers: ${startMarker} -> ${endMarker}`)
  }
  return content.slice(start + startMarker.length, end)
}

const parseMarkdownTable = (section) => {
  const rows = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))

  if (rows.length < 2) return []

  const toCells = (line) => {
    const cells = []
    let current = ''
    let inBackticks = false
    const content = line.slice(1, -1)

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index]
      if (char === '`') {
        inBackticks = !inBackticks
        current += char
        continue
      }
      if (char === '|' && !inBackticks) {
        cells.push(current.trim())
        current = ''
        continue
      }
      current += char
    }

    cells.push(current.trim())
    return cells
  }

  const headers = toCells(rows[0])

  return rows
    .slice(2)
    .map((row) => toCells(row))
    .filter((cells) => cells.some(Boolean))
    .map((cells) =>
      headers.reduce((acc, header, index) => {
        acc[header] = cells[index] || ''
        return acc
      }, {}),
    )
}

const parseTutorialRegistryModuleIds = (content) => {
  const ids = new Set()
  const pattern = /moduleId:\s*'([^']+)'/g
  let match = pattern.exec(content)
  while (match) {
    ids.add(match[1])
    match = pattern.exec(content)
  }
  return ids
}

const parseApiRoutes = (content) => {
  const lines = content.split(/\r?\n/)
  const routes = []
  const groupStack = []
  let pending = ''

  const openGroup = (statement) => {
    const prefixMatches = [...statement.matchAll(/prefix\('([^']+)'\)/g)]
    groupStack.push(prefixMatches.length > 0 ? prefixMatches[prefixMatches.length - 1][1] : null)
  }

  const closeGroups = (line) => {
    const matches = line.match(/\}\);/g) || []
    matches.forEach(() => {
      if (groupStack.length > 0) groupStack.pop()
    })
  }

  const flushRouteStatement = (statement) => {
    const routeMatch = statement.match(/(?:Route::|->)(get|post|put|patch|delete)\('([^']+)'/)
    const actionMatch = statement.match(/\[([A-Za-z0-9_]+)::class,\s*'([^']+)'\]/)

    if (!routeMatch || !actionMatch) return

    const method = normalizeMethod(routeMatch[1])
    const rawRoute = normalizeRoute(routeMatch[2])
    const prefix = groupStack.filter(Boolean).join('/')
    const route = normalizeRoute(prefix ? `${prefix}/${rawRoute}` : rawRoute)
    const controller = actionMatch[1]
    const action = actionMatch[2]

    routes.push({
      method,
      route,
      controller,
      action,
    })
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) return

    if (pending || trimmed.startsWith('Route::') || trimmed.startsWith('->')) {
      pending += `${pending ? ' ' : ''}${trimmed}`

      if (pending.includes('group(function () {')) {
        openGroup(pending)
        pending = ''
        return
      }

      if (pending.includes(';')) {
        const parts = pending.split(';')
        parts.slice(0, -1).forEach((part) => flushRouteStatement(part))
        pending = parts[parts.length - 1].trim()
      }
    }

    closeGroups(trimmed)
  })

  return routes
}

const classifyJoyrideRoute = ({ route }) => {
  if (!route) return null

  if (route === 'dashboard/me' || route.startsWith('stats/')) return 'dashboard'
  if (route.startsWith('messages')) return 'messages'
  if (route.startsWith('users')) return 'users'
  if (route === 'audit-logs') return 'audit'
  if (route.startsWith('teams')) return 'team_directory'
  if (route.startsWith('rosters')) return 'roster_management'
  if (route.startsWith('settings/')) return 'settings'
  if (route.startsWith('workflow/attachments') || route.startsWith('workflow/notifications')) {
    return 'shared_workflow_support'
  }
  if (route === 'reports/erco/pdf') return 'erco'
  if (route === 'reports/drill/pdf') return 'drill'
  if (route === 'reports/inspection/pdf') return 'inspection'
  if (route.startsWith('inspection/')) return 'inspection'
  if (route === 'reports/inspection/checklist-summary') return 'inspection'
  if (
    route === 'reports' ||
    route.startsWith('reports/draft') ||
    route.startsWith('reports/drafts')
  ) {
    return 'shared_report_runtime'
  }
  if (/^reports\/[^/]+$/.test(route) || /^reports\/[^/]+\/(review|approve|reject)$/.test(route)) {
    return 'shared_report_runtime'
  }
  if (route === 'leave' || route.startsWith('leave/')) return 'my_leave'
  if (route === 'overtime' || route.startsWith('overtime/')) return 'my_overtime'
  if (route.startsWith('payroll/')) return 'payroll_claims'
  if (route.startsWith('holidays')) return 'leave_management'
  if (route.startsWith('staff/leave/')) return 'leave_management'
  if (route.startsWith('staff/overtime/')) return 'overtime_management'
  if (route.startsWith('staff/salary-claims/')) return 'salary_claims_management'
  if (route === 'staff/salary-assignments' || route.startsWith('staff/salary-assignments/')) {
    return 'salary_claims_management'
  }

  return null
}

const main = () => {
  const pendingNotes = read(PENDING_NOTES_PATH)
  const apiRoutes = parseApiRoutes(read(API_ROUTES_PATH))
  const tutorialRegistryModuleIds = parseTutorialRegistryModuleIds(read(TUTORIAL_REGISTRY_PATH))

  const ownershipRows = parseMarkdownTable(
    getSection(pendingNotes, MODULE_MARKER_START, MODULE_MARKER_END),
  )
  const endpointRows = parseMarkdownTable(
    getSection(pendingNotes, MATRIX_MARKER_START, MATRIX_MARKER_END),
  )

  const ownershipModuleIds = new Set(
    ownershipRows.map((row) => String(row.Module || '').trim()).filter(Boolean),
  )

  const endpointRowsByKey = new Map()
  const endpointKeys = new Set()
  const deferredRows = []

  endpointRows.forEach((row, index) => {
    const method = normalizeMethod(row.Method)
    const route = normalizeRoute(row.Route)
    const status = String(row.Status || '').trim()

    if (!method || !route) {
      throw new Error(`Endpoint matrix row ${index + 1} is missing method or route.`)
    }
    if (HTTP_METHODS.has(method) && !STATUS_VALUES.has(status)) {
      throw new Error(
        `Endpoint matrix row ${index + 1} has invalid status "${status}" for ${method} ${route}.`,
      )
    }

    const key = `${method} ${route}`
    if (HTTP_METHODS.has(method)) {
      if (endpointRowsByKey.has(key)) {
        throw new Error(`Duplicate endpoint matrix row found for ${key}.`)
      }
      endpointRowsByKey.set(key, row)
      endpointKeys.add(key)
      if (status === 'explicitly deferred') deferredRows.push(row)
    }
  })

  const scopedApiRoutes = apiRoutes
    .map((routeRecord) => ({
      ...routeRecord,
      module: classifyJoyrideRoute(routeRecord),
    }))
    .filter((routeRecord) => routeRecord.module)

  const uncoveredRoutes = []
  scopedApiRoutes.forEach((routeRecord) => {
    const key = `${routeRecord.method} ${routeRecord.route}`
    if (!endpointRowsByKey.has(key)) {
      uncoveredRoutes.push(key)
    }
  })

  const apiRouteKeys = new Set(
    scopedApiRoutes.map((routeRecord) => `${routeRecord.method} ${routeRecord.route}`),
  )
  const extraMatrixRoutes = [...endpointKeys].filter((key) => !apiRouteKeys.has(key))

  const missingRegistryModules = [...tutorialRegistryModuleIds].filter(
    (moduleId) => !ownershipModuleIds.has(moduleId),
  )

  if (missingRegistryModules.length > 0) {
    console.error('Missing tutorial registry modules in backend ownership table:')
    missingRegistryModules.forEach((moduleId) => console.error(`- ${moduleId}`))
    process.exit(1)
  }

  if (uncoveredRoutes.length > 0) {
    console.error('Uncovered non-sysadmin onboarding API routes:')
    uncoveredRoutes.forEach((key) => console.error(`- ${key}`))
    process.exit(1)
  }

  if (extraMatrixRoutes.length > 0) {
    console.error('Endpoint matrix rows that do not match scoped backend routes:')
    extraMatrixRoutes.forEach((key) => console.error(`- ${key}`))
    process.exit(1)
  }

  console.log(`Backend endpoint coverage verified for ${scopedApiRoutes.length} scoped API routes.`)
  console.log(`Deferred endpoints recorded: ${deferredRows.length}.`)
}

main()
