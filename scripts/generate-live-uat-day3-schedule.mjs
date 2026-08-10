import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = resolve(root, 'tests', 'e2e', 'live-uat', 'route-manifest.json')
const outputPath = resolve(root, 'tests', 'e2e', 'live-uat', 'day3-route-schedule.json')
const reportPath = resolve(
  root,
  'upgrade-works',
  'FRONTEND_LIVE_UAT_DAY_3_ROUTE_SCHEDULE_2026-08-10.md',
)
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

const personaMap = {
  unauthenticated: 'unauthenticated',
  'authenticated-user': 'trt',
  'tactical-response-team': 'trt',
  'incident-commander': 'incidentCommander',
  'contract-manager': 'contractManager',
  'human-resource': 'humanResource',
  finance: 'finance',
  'system-administrator': 'sysadmin',
}

const expandProbes = (route) => {
  if (!route.path.includes(':reportType')) return []
  return manifest.reportSubtypes.map((report) => ({
    key: report.key,
    routePattern: route.path.replace(':reportType', report.key),
  }))
}

const routes = manifest.routes.map((route) => {
  const mappedPersonas = [...new Set(route.intendedPersonas.map((name) => personaMap[name]))]
  if (mappedPersonas.some((persona) => !persona)) {
    throw new Error(`${route.id}: unknown manifest persona`)
  }
  return {
    routeId: route.id,
    routePattern: route.path,
    name: route.name,
    moduleFamily: route.moduleFamily,
    primaryPersona: mappedPersonas[0],
    secondaryPersonas: mappedPersonas.slice(1),
    routeType: route.routeType,
    plannedStatus: route.plannedStatus,
    expectedDestination: route.expectedDestination,
    fixtureAlias: route.fixtureAlias,
    expectedHeading: route.expectedHeading,
    mutationRisk: route.mutationRisk,
    interactionMode: route.mutationRisk === 'controlled-only' ? 'shell-only' : 'read-only',
    viewports: route.viewports.filter((viewport) => ['mobile', 'desktop'].includes(viewport)),
    patternTags: route.patternTags,
    probes: expandProbes(route),
  }
})

const schedule = {
  schemaVersion: 1,
  generatedFrom: 'tests/e2e/live-uat/route-manifest.json',
  productionMode: 'read-only',
  personas: Object.values(personaMap).filter(
    (persona, index, values) => values.indexOf(persona) === index,
  ),
  inspectionStates: manifest.inspectionSubtypes.map(({ key, name, states }) => ({
    key,
    name,
    states,
  })),
  reportStates: manifest.reportSubtypes.map(({ key, name, states }) => ({ key, name, states })),
  routes,
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(schedule, null, 2)}\n`, 'utf8')

const lines = [
  '# Frontend Live UAT - Day 3 Route Schedule',
  '',
  '**Date:** 2026-08-10  ',
  '**Production mode:** Read-only  ',
  `**Coverage contract:** ${routes.length}/${manifest.routes.length} canonical routes, ${schedule.inspectionStates.length} inspection types, ${schedule.reportStates.length} report types`,
  '',
  '| Route ID | Pattern | Primary persona | Secondary | Status | Interaction | Fixture |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...routes.map(
    (route) =>
      `| ${route.routeId} | \`${route.routePattern}\` | ${route.primaryPersona} | ${route.secondaryPersonas.join(', ') || '-'} | ${route.plannedStatus} | ${route.interactionMode} | ${route.fixtureAlias || '-'} |`,
  ),
  '',
  '## Inspection state probes',
  '',
  ...schedule.inspectionStates.map((item) => `- ${item.key}: ${item.states.join(', ')}`),
  '',
  '## Report state probes',
  '',
  ...schedule.reportStates.map((item) => `- ${item.key}: ${item.states.join(', ')}`),
  '',
]
await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8')
console.log(
  `Generated Day 3 schedule: ${routes.length} routes, ${schedule.inspectionStates.length} inspection types, ${schedule.reportStates.length} report types.`,
)
