import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))
const manifest = await readJson('tests/e2e/live-uat/route-manifest.json')
const schedule = await readJson('tests/e2e/live-uat/day3-route-schedule.json')
const failures = []
const fail = (message) => failures.push(message)
const allowedPersonas = new Set([
  'unauthenticated',
  'trt',
  'incidentCommander',
  'contractManager',
  'humanResource',
  'finance',
  'sysadmin',
])
const scheduled = Array.isArray(schedule.routes) ? schedule.routes : []
const manifestIds = manifest.routes.map((route) => route.id).sort()
const scheduleIds = scheduled.map((route) => route.routeId).sort()

if (new Set(scheduleIds).size !== scheduleIds.length) fail('Schedule route IDs must be unique')
for (const id of manifestIds) if (!scheduleIds.includes(id)) fail(`Missing route: ${id}`)
for (const id of scheduleIds) if (!manifestIds.includes(id)) fail(`Unknown route: ${id}`)

for (const route of scheduled) {
  const source = manifest.routes.find((item) => item.id === route.routeId)
  if (!source) continue
  if (route.routePattern !== source.path) fail(`${route.routeId}: route pattern drift`)
  if (!allowedPersonas.has(route.primaryPersona)) fail(`${route.routeId}: invalid primary persona`)
  if ((route.secondaryPersonas || []).some((persona) => !allowedPersonas.has(persona))) {
    fail(`${route.routeId}: invalid secondary persona`)
  }
  if (route.routePattern.includes(':') && !route.fixtureAlias) {
    fail(`${route.routeId}: dynamic route requires a fixture alias`)
  }
  if (route.mutationRisk === 'controlled-only' && route.interactionMode !== 'shell-only') {
    fail(`${route.routeId}: controlled-only route must use shell-only interaction`)
  }
  if (route.interactionMode === 'read-write') fail(`${route.routeId}: read-write is forbidden`)
}

const inspectionKeys = (schedule.inspectionStates || []).map((item) => item.key).sort()
const manifestInspectionKeys = manifest.inspectionSubtypes.map((item) => item.key).sort()
const reportKeys = (schedule.reportStates || []).map((item) => item.key).sort()
const manifestReportKeys = manifest.reportSubtypes.map((item) => item.key).sort()
if (JSON.stringify(inspectionKeys) !== JSON.stringify(manifestInspectionKeys)) {
  fail('Inspection state schedule does not match the manifest')
}
if (JSON.stringify(reportKeys) !== JSON.stringify(manifestReportKeys)) {
  fail('Report state schedule does not match the manifest')
}

if (failures.length) {
  console.error('Day 3 route schedule audit failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(
  `Day 3 route schedule passed: ${scheduled.length}/${manifest.routes.length} routes, ${inspectionKeys.length}/8 inspection types, ${reportKeys.length}/3 report types.`,
)
