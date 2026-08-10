import { readFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(
  await readFile(resolve(root, 'tests', 'e2e', 'live-uat', 'route-manifest.json'), 'utf8'),
)
const routesSource = await readFile(resolve(root, 'src', 'routes.js'), 'utf8')
const appSource = await readFile(resolve(root, 'src', 'App.js'), 'utf8')
const reportRegistry = await readFile(
  resolve(root, 'src', 'views', 'report', 'formRegistry.js'),
  'utf8',
)

const failures = []
const fail = (message) => failures.push(message)
const unique = (values) => new Set(values).size === values.length

const sourceRoutes = Array.from(
  routesSource.matchAll(/\{\s*path:\s*(['"`])([^'"`]+)\1\s*,([\s\S]*?)\},?/g),
  (match) => match[2],
)
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/403',
  '/404',
  '/500',
]
const expectedRoutes = [...new Set([...sourceRoutes, ...publicRoutes])].sort()
const manifestRoutes = Array.isArray(manifest.routes) ? manifest.routes : []
const manifestPaths = manifestRoutes.map((route) => route.path).sort()

for (const path of publicRoutes) {
  if (!appSource.includes(`path="${path}"`)) fail(`Public route missing from src/App.js: ${path}`)
}
for (const path of expectedRoutes) {
  if (!manifestPaths.includes(path)) fail(`Route missing from live UAT manifest: ${path}`)
}
for (const path of manifestPaths) {
  if (!expectedRoutes.includes(path)) fail(`Stale route in live UAT manifest: ${path}`)
}
if (!unique(manifestRoutes.map((route) => route.id))) fail('Manifest route IDs must be unique')
if (!unique(manifestPaths)) fail('Manifest route paths must be unique')

const allowedStatuses = new Set(manifest.allowedValues?.plannedStatus || [])
const allowedMutationRisks = new Set(manifest.allowedValues?.mutationRisk || [])
const allowedViewports = new Set(manifest.allowedValues?.viewport || [])
const allowedRouteTypes = new Set(manifest.allowedValues?.routeType || [])

for (const route of manifestRoutes) {
  const label = route.path || route.id || 'unknown route'
  if (!allowedStatuses.has(route.plannedStatus)) fail(`${label}: invalid plannedStatus`)
  if (!allowedRouteTypes.has(route.routeType)) fail(`${label}: invalid routeType`)
  if (!allowedMutationRisks.has(route.mutationRisk)) fail(`${label}: invalid mutationRisk`)
  if (!Array.isArray(route.viewports) || route.viewports.length === 0) {
    fail(`${label}: at least one viewport is required`)
  } else if (route.viewports.some((viewport) => !allowedViewports.has(viewport))) {
    fail(`${label}: invalid viewport`)
  }
  if (!Array.isArray(route.intendedPersonas) || route.intendedPersonas.length === 0) {
    fail(`${label}: intendedPersonas are required`)
  }
  if (route.path.includes(':') && !route.fixtureAlias) {
    fail(`${label}: dynamic route requires a fixtureAlias`)
  }
  if (route.routeType === 'redirect' && !route.expectedDestination) {
    fail(`${label}: redirect requires expectedDestination`)
  }
  if (route.plannedStatus === 'passed') fail(`${label}: Day 1 must not claim a passed route`)
}

const inspectionTypesDirectory = resolve(root, 'src', 'views', 'inspection', 'types')
const inspectionDirectories = await readdir(inspectionTypesDirectory, { withFileTypes: true })
const implementedInspectionKeys = []
for (const entry of inspectionDirectories) {
  if (!entry.isDirectory()) continue
  const definitionPath = resolve(inspectionTypesDirectory, entry.name, 'definition.js')
  let definition = ''
  try {
    definition = await readFile(definitionPath, 'utf8')
  } catch {
    continue
  }
  if (/\bimplemented:\s*true\b/.test(definition)) implementedInspectionKeys.push(entry.name)
}
implementedInspectionKeys.sort()
const manifestInspectionKeys = (manifest.inspectionSubtypes || []).map((entry) => entry.key).sort()
for (const key of implementedInspectionKeys) {
  if (!manifestInspectionKeys.includes(key)) fail(`Implemented inspection subtype missing: ${key}`)
}
for (const key of manifestInspectionKeys) {
  if (!implementedInspectionKeys.includes(key)) fail(`Stale inspection subtype in manifest: ${key}`)
}

const implementedReportKeys = Array.from(
  reportRegistry.matchAll(/^\s*['"]?([a-z][a-z-]+)['"]?:\s*[A-Z]/gm),
  (match) => match[1],
).sort()
const manifestReportKeys = (manifest.reportSubtypes || []).map((entry) => entry.key).sort()
for (const key of implementedReportKeys) {
  if (!manifestReportKeys.includes(key)) fail(`Implemented report subtype missing: ${key}`)
}
for (const key of manifestReportKeys) {
  if (!implementedReportKeys.includes(key)) fail(`Stale report subtype in manifest: ${key}`)
}

if (failures.length > 0) {
  console.error('Live UAT route coverage audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `Live UAT route coverage passed: ${manifestRoutes.length}/${expectedRoutes.length} routes, ${manifestInspectionKeys.length}/${implementedInspectionKeys.length} inspection subtypes, ${manifestReportKeys.length}/${implementedReportKeys.length} report subtypes.`,
)
