import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const routesSource = await readFile(resolve(root, 'src', 'routes.js'), 'utf8')
const appSource = await readFile(resolve(root, 'src', 'App.js'), 'utf8')
const outputDirectory = resolve(root, 'tests', 'e2e', 'live-uat')
const manifestPath = resolve(outputDirectory, 'route-manifest.json')
const matrixPath = resolve(root, 'upgrade-works', 'FRONTEND_LIVE_UAT_ROUTE_MATRIX_2026-08-10.md')

const sourceRouteMatches = Array.from(
  routesSource.matchAll(/\{\s*path:\s*(['"`])([^'"`]+)\1\s*,([\s\S]*?)\},?/g),
)

const publicRoutePaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/403',
  '/404',
  '/500',
]

for (const path of publicRoutePaths) {
  if (!appSource.includes(`path="${path}"`)) {
    throw new Error(`Expected public route ${path} was not found in src/App.js`)
  }
}

const redirectDestinations = {
  '/': '/dashboard',
  '/register': '/login',
  '/reporting-settings': '/reporting-settings/inspection',
  '/inspection/workflow-settings': '/reporting-settings/inspection',
  '/report/inspection': '/inspection',
  '/report/inspection/new': '/inspection/new',
  '/report/inspection/new/:newSection': '/inspection/new/:newSection',
  '/report/inspection/:reportId': '/inspection/:reportId',
  '/staff/leave-management': '/staff/leave-management/leaves',
  '/staff/leave-management/:legacyLeaveId': '/staff/leave-management/record/:leaveId',
  '/staff/overtime-management': '/staff/overtime-management/records',
  '/staff/overtime-management/:legacyOvertimeRouteKey':
    '/staff/overtime-management/record/:overtimeRouteKey',
  '/staff/leave': '/staff/leave-management/leaves',
  '/staff/leave/:leaveId': '/staff/leave-management/record/:leaveId',
  '/staff/salary-claims': '/staff/salary-claims/salary',
  '/staff/salary-claims/set-salary': '/staff/set-salary/set-salary',
  '/staff/salary-claims/set-ot-rate': '/staff/set-salary/set-ot-rate',
  '/staff/salary-claims/workflow-rules': '/staff/set-salary/workflow-rules',
  '/staff/salary-claims/company-legal': '/staff/set-salary/company-legal',
  '/staff/salary-claims/assignment/new': '/staff/set-salary/assignment/new',
  '/staff/salary-claims/assignment/:assignmentId/edit':
    '/staff/set-salary/assignment/:assignmentId/edit',
  '/staff/salary-claims/assignment/:assignmentId/view':
    '/staff/set-salary/assignment/:assignmentId/view',
  '/staff/set-salary': '/staff/set-salary/set-salary',
  '/staff/salary-claims/overtime/:overtimeRouteKey':
    '/staff/overtime-management/record/:overtimeRouteKey',
  '/staff/salary-claims/:legacyClaimId': '/staff/salary-claims/claim/:claimId',
  '/roster': '/roster/overview',
  '/settings/inspection-workflow': '/reporting-settings/inspection',
  '/notifications/leave': '/notifications/workflow',
}

const inspectionSubtypes = [
  ['general', 'General Inspection'],
  ['hse', 'Health Safety Environment'],
  ['fire-extinguisher', 'Fire Extinguisher'],
  ['frt-daily', 'Fire Truck Daily Readiness'],
  ['hydraulic', 'Hydraulic Rescue Tools'],
  ['high-angle', 'High Angle Rescue Equipment'],
  ['er-aux', 'Emergency Response Auxiliary Equipment'],
  ['scba', 'SCBA'],
].map(([key, name]) => ({
  key,
  name,
  route: '/inspection',
  states: ['home', 'new-form', 'review', 'submitted-detail', 'image-evidence'],
  intendedPersonas: ['tactical-response-team', 'incident-commander'],
  requiredPermissions: ['reports.inspection.view'],
  viewports: ['mobile', 'desktop'],
  productionMode: 'read-only-details',
  mutationMode: 'controlled-only',
}))

const reportSubtypes = [
  ['erco', 'ERCO', 'reports.erco.view'],
  ['fitness-test', 'Fitness Test', 'reports.fitness.view'],
  ['drill', 'Drill', 'reports.drill.view'],
].map(([key, name, permission]) => ({
  key,
  name,
  route: `/report/${key}`,
  states: ['home', 'new-form', 'review', 'submitted-detail', 'image-evidence'],
  intendedPersonas: ['tactical-response-team', 'incident-commander'],
  requiredPermissions: [permission],
  viewports: ['mobile', 'desktop'],
  productionMode: 'read-only-details',
  mutationMode: 'controlled-only',
}))

const moduleFamilyFor = (path) => {
  if (publicRoutePaths.includes(path)) return 'public'
  if (path === '/' || path === '/dashboard') return 'dashboard'
  if (path.startsWith('/admin/')) return 'administration'
  if (path.startsWith('/profile')) return 'profile'
  if (path.startsWith('/payroll')) return 'payroll-self-service'
  if (path.startsWith('/leave')) return 'leave-self-service'
  if (path.startsWith('/overtime')) return 'overtime-self-service'
  if (path.startsWith('/inspection') || path.startsWith('/report/inspection')) return 'inspection'
  if (path.startsWith('/reporting-settings')) return 'reporting-settings'
  if (path.startsWith('/report/')) return 'reports'
  if (path.startsWith('/staff/leave')) return 'leave-management'
  if (path.startsWith('/staff/overtime')) return 'overtime-management'
  if (path.startsWith('/staff/salary') || path.startsWith('/staff/set-salary')) {
    return 'payroll-management'
  }
  if (path.startsWith('/staff/')) return 'staff'
  if (path.startsWith('/roster')) return 'roster'
  if (path.startsWith('/team')) return 'teams'
  if (path.startsWith('/messages')) return 'messages'
  if (path.startsWith('/settings')) return 'settings'
  if (path.startsWith('/notifications')) return 'notifications'
  return 'application'
}

const permissionsFor = (path, family) => {
  if (path === '/inspection/workflow-settings') return ['settings.manage']
  if (path === '/staff/overtime-management/rules') return ['settings.manage']
  if (path === '/staff/shift-settings') return ['staff.leave.manage', 'staff.salary.manage']
  if (family === 'public' || family === 'profile' || family === 'notifications') return []
  if (family === 'dashboard') return path === '/' ? [] : ['self.dashboard']
  if (path.startsWith('/admin/users')) return ['users.manage']
  if (path === '/admin/audit') return ['audit.view']
  if (path.startsWith('/admin/')) return ['system-administrator']
  if (family === 'payroll-self-service') return ['self.payroll']
  if (family === 'leave-self-service') return ['self.leave']
  if (family === 'overtime-self-service') return ['self.overtime']
  if (family === 'inspection') return ['reports.inspection.view']
  if (family === 'reporting-settings' || family === 'settings') return ['settings.manage']
  if (family === 'reports') {
    return ['reports.erco.view', 'reports.drill.view', 'reports.fitness.view']
  }
  if (family === 'leave-management') return ['staff.leave.manage']
  if (family === 'overtime-management') return ['staff.overtime.manage']
  if (family === 'payroll-management') return ['staff.salary.manage']
  if (family === 'roster') return ['rosters.manage']
  if (family === 'teams') return ['teams.view', 'teams.manage']
  if (family === 'messages') return ['self.messages']
  if (family === 'staff') return ['staff.view', 'staff.manage']
  return []
}

const personasFor = (family, path = '') => {
  if (path === '/staff/overtime-management/rules') return ['system-administrator']
  const map = {
    public: ['unauthenticated'],
    dashboard: ['tactical-response-team'],
    administration: ['system-administrator'],
    profile: ['authenticated-user'],
    'payroll-self-service': ['tactical-response-team'],
    'leave-self-service': ['tactical-response-team'],
    'overtime-self-service': ['tactical-response-team'],
    inspection: ['tactical-response-team', 'incident-commander'],
    'reporting-settings': ['system-administrator'],
    reports: ['tactical-response-team', 'incident-commander'],
    'leave-management': ['human-resource'],
    'overtime-management': ['human-resource', 'contract-manager'],
    'payroll-management': ['finance', 'human-resource'],
    staff: ['human-resource', 'contract-manager'],
    roster: ['contract-manager'],
    teams: ['contract-manager'],
    messages: ['authenticated-user'],
    settings: ['system-administrator'],
    notifications: ['authenticated-user'],
  }
  return map[family] || ['authenticated-user']
}

const fixtureAliasFor = (path) => {
  if (path.includes(':reportId') && path.startsWith('/inspection')) return 'submitted-inspection'
  if (path.includes(':reportId') && path.startsWith('/report/inspection')) {
    return 'submitted-inspection'
  }
  if (path.includes(':reportId')) return 'submitted-report'
  if (path.includes(':extinguisherId')) return 'active-fire-extinguisher'
  if (path.includes(':claimId')) return 'payroll-claim'
  if (path.includes(':assignmentId')) return 'salary-assignment'
  if (path.includes(':leaveId')) return 'leave-record'
  if (path.includes(':overtimeId') || path.includes(':overtimeRouteKey')) return 'overtime-record'
  if (path === '/admin/users/:id/:slug' || path === '/admin/users/:id') return 'managed-user'
  if (path === '/staff/profile/:id') return 'staff-member'
  if (path === '/team/details/:id') return 'team'
  if (path.includes(':newSection')) return 'new-section'
  if (path.includes(':moduleKey')) return 'reporting-module'
  if (path.includes(':legacyLeaveId')) return 'legacy-leave-record'
  if (path.includes(':legacyOvertimeRouteKey')) return 'legacy-overtime-record'
  if (path.includes(':legacyClaimId')) return 'legacy-claim-record'
  if (path.includes(':reportType')) return 'report-type'
  return null
}

const patternTagsFor = (path, family) => {
  const tags = ['page-header', 'loading-empty-error']
  if (path.includes(':') || /details|profile|security/.test(path)) tags.push('detail-surface')
  if (/inspection|report/.test(family)) {
    tags.push('metadata-summary', 'workflow-status', 'image-gallery', 'mobile-actions')
  }
  if (/leave|overtime|payroll/.test(family)) tags.push('workflow-status', 'workflow-actions')
  if (/users|claims|records|roster|team|inspection|report/.test(path)) {
    tags.push('search-filter', 'responsive-data-list')
  }
  if (/messages|inspection|report|leave|overtime|payroll|profile|team/.test(path)) {
    tags.push('media-consumer')
  }
  return [...new Set(tags)]
}

const primaryTaskFor = (path, family) => {
  if (redirectDestinations[path]) return `Continue to ${redirectDestinations[path]}`
  if (path.includes('/new') || path.endsWith('/assignment/new')) return `Start a ${family} record`
  if (path.includes('/edit')) return `Edit a ${family} record`
  if (path.includes(':')) return `Understand a ${family} detail`
  const tasks = {
    public: 'Authenticate or understand access state',
    dashboard: 'Orient and resume operational work',
    administration: 'Review or administer system records',
    profile: 'Review personal account and security',
    inspection: 'Find and understand inspection work',
    reports: 'Find and understand report work',
    'reporting-settings': 'Review reporting workflow configuration',
    notifications: 'Review workflow notifications',
  }
  return tasks[family] || `Review ${family.replaceAll('-', ' ')}`
}

const controlledPath = (path) =>
  /\/new(?:\/|$)|\/edit$|\/settings|set-|workflow-rules|company-legal/.test(path) ||
  [
    '/admin/users',
    '/admin/ai-helper-knowledge',
    '/inspection/ux-matrix',
    '/staff/overtime-management/rules',
  ].includes(path)

const buildRoute = ({ path, name, module = null, element = null, source }) => {
  const family = moduleFamilyFor(path)
  const expectedDestination = redirectDestinations[path] || null
  const isPublic = family === 'public'
  const routeType = expectedDestination
    ? 'redirect'
    : isPublic
      ? 'public'
      : path.includes(':')
        ? 'dynamic'
        : 'static'
  const fixtureAlias = fixtureAliasFor(path)
  const mutationRisk = controlledPath(path) ? 'controlled-only' : 'safe-interaction'
  const plannedStatus = expectedDestination
    ? 'redirect-only'
    : controlledPath(path)
      ? 'controlled-only'
      : fixtureAlias
        ? 'data-blocked'
        : 'testable'

  return {
    id: '',
    path,
    name: name || (expectedDestination ? 'Redirect' : path),
    moduleFamily: family,
    module,
    source,
    sourceComponent: element,
    routeType,
    expectedDestination,
    intendedPersonas: personasFor(family, path),
    requiredPermissions: permissionsFor(path, family),
    fixtureAlias,
    expectedHeading: expectedDestination ? null : name || null,
    primaryTask: primaryTaskFor(path, family),
    states: fixtureAlias ? ['populated', 'sparse', 'long-content'] : ['default', 'empty', 'error'],
    viewports: ['mobile', 'desktop'],
    mutationRisk,
    plannedStatus,
    patternTags: patternTagsFor(path, family),
  }
}

const sourceRoutes = sourceRouteMatches.map((match) => {
  const body = match[3]
  return buildRoute({
    path: match[2],
    name: body.match(/\bname:\s*['"]([^'"]+)['"]/)?.[1] || null,
    module: body.match(/\bmodule:\s*['"]([^'"]+)['"]/)?.[1] || null,
    element: body.match(/\belement:\s*([A-Za-z_$][\w$]*)/)?.[1] || null,
    source: match[2] === '/' ? 'src/routes.js + src/App.js' : 'src/routes.js',
  })
})

const sourcePaths = new Set(sourceRoutes.map((route) => route.path))
const publicRoutes = publicRoutePaths
  .filter((path) => !sourcePaths.has(path))
  .map((path) =>
    buildRoute({
      path,
      name:
        {
          '/login': 'Login',
          '/register': 'Registration Redirect',
          '/forgot-password': 'Forgot Password',
          '/reset-password': 'Reset Password',
          '/403': 'Forbidden',
          '/404': 'Not Found',
          '/500': 'Server Error',
        }[path] || path,
      source: 'src/App.js',
    }),
  )

const routes = [...sourceRoutes, ...publicRoutes]
  .sort((left, right) => left.path.localeCompare(right.path))
  .map((route, index) => ({ ...route, id: `LIVE-UAT-${String(index + 1).padStart(3, '0')}` }))

const manifest = {
  schemaVersion: 1,
  generatedFrom: ['src/routes.js', 'src/App.js', 'src/_nav.js'],
  allowedValues: {
    routeType: ['public', 'static', 'dynamic', 'redirect'],
    plannedStatus: [
      'testable',
      'permission-blocked',
      'data-blocked',
      'feature-disabled',
      'redirect-only',
      'controlled-only',
    ],
    mutationRisk: ['none', 'safe-interaction', 'controlled-only'],
    viewport: ['mobile', 'tablet', 'desktop'],
  },
  routes,
  inspectionSubtypes,
  reportSubtypes,
}

const statusCounts = Object.fromEntries(
  manifest.allowedValues.plannedStatus.map((status) => [
    status,
    routes.filter((route) => route.plannedStatus === status).length,
  ]),
)
const familyRows = Object.entries(
  routes.reduce((groups, route) => {
    groups[route.moduleFamily] ||= []
    groups[route.moduleFamily].push(route)
    return groups
  }, {}),
).sort(([left], [right]) => left.localeCompare(right))

const markdown = `# Frontend Live UAT Route Matrix

**Date:** 2026-08-10

**Status:** Day 1 baseline; routes have not yet passed live UAT

**Machine-readable source:** \`tests/e2e/live-uat/route-manifest.json\`

## Baseline

- Source routes: ${sourceRoutes.length}
- Public routes added from \`src/App.js\`: ${publicRoutes.length}
- Canonical manifest rows: ${routes.length}
- Implemented inspection subtypes: ${inspectionSubtypes.length}
- Report subtypes: ${reportSubtypes.length}
- Planned status counts: ${Object.entries(statusCounts)
  .map(([status, count]) => `\`${status}\` ${count}`)
  .join(', ')}

\`data-blocked\` means a safe representative dynamic record still needs to be discovered with an authorized account. \`controlled-only\` means opening or completing the primary task could mutate data and belongs in the disposable local environment.

## Route families

| Module family | Routes | Intended personas | Route patterns |
|---|---:|---|---|
${familyRows
  .map(([family, entries]) => {
    const personas = [...new Set(entries.flatMap((entry) => entry.intendedPersonas))].join(', ')
    const patterns = entries.map((entry) => `\`${entry.path}\``).join('<br>')
    return `| ${family} | ${entries.length} | ${personas} | ${patterns} |`
  })
  .join('\n')}

## Inspection subtype states

| Subtype | Required permission | Required states | Production mode | Mutation mode |
|---|---|---|---|---|
${inspectionSubtypes
  .map(
    (entry) =>
      `| ${entry.name} | \`${entry.requiredPermissions.join(', ')}\` | ${entry.states.join(', ')} | ${entry.productionMode} | ${entry.mutationMode} |`,
  )
  .join('\n')}

## Report subtype states

| Subtype | Required permission | Required states | Production mode | Mutation mode |
|---|---|---|---|---|
${reportSubtypes
  .map(
    (entry) =>
      `| ${entry.name} | \`${entry.requiredPermissions.join(', ')}\` | ${entry.states.join(', ')} | ${entry.productionMode} | ${entry.mutationMode} |`,
  )
  .join('\n')}

## Day 1 interpretation

- This matrix defines the UAT population; it does not claim visual or functional passes.
- Authentication credentials were not stored in the repository.
- Actual production IDs belong only in ignored local run artifacts.
- Redirect rows are verified for destination and state preservation, not treated as duplicate UI views.
- Permission expectations are expressed through intended personas and required permissions; later UAT must use the operational role, not only SysAdmin.
`

await mkdir(outputDirectory, { recursive: true })
await Promise.all([
  writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
  writeFile(matrixPath, markdown, 'utf8'),
])

console.log(
  `Live UAT route manifest generated: ${routes.length} routes, ${inspectionSubtypes.length} inspection subtypes, ${reportSubtypes.length} report subtypes.`,
)
