import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const backendCatalogPath = resolve(
  root,
  '..',
  'vmecc-backend',
  'app',
  'Services',
  'ModuleCatalog.php',
)
const manifestPath = resolve(root, 'tests', 'e2e', 'module-coverage.manifest.json')

const [catalogSource, manifestSource] = await Promise.all([
  readFile(backendCatalogPath, 'utf8'),
  readFile(manifestPath, 'utf8'),
])
const catalogKeys = Array.from(
  catalogSource.matchAll(/^\s{8}'([^']+)'\s*=>\s*\[/gm),
  (match) => match[1],
).sort()
const manifest = JSON.parse(manifestSource)
const entries = manifest.modules || []
const manifestKeys = entries.map(({ key }) => key).sort()
const defaults = manifest.coverageDefaults || {}
const allowedStatuses = ['mapped', 'partial', 'qualified', 'blocked']
const requiredArrayFields = [
  'routeFamilies',
  'apiFamilies',
  'positiveCaseIds',
  'negativeCaseIds',
  'workflowCaseIds',
  'artifactCaseIds',
]

assert.equal(manifest.schemaVersion, 2, 'Coverage manifest must use the qualification-aware schema')

assert.equal(
  new Set(manifestKeys).size,
  manifestKeys.length,
  'Coverage manifest contains duplicate keys',
)
assert.deepEqual(
  manifestKeys,
  catalogKeys,
  'Coverage manifest must exactly match ModuleCatalog keys',
)
for (const entry of entries) {
  assert.match(entry.route, /^\//, `${entry.key} must declare an application route`)
  assert.ok(
    ['critical', 'standard', 'contract'].includes(entry.tier),
    `${entry.key} has invalid tier`,
  )
  assert.ok(entry.specs.length > 0, `${entry.key} must identify at least one executable spec`)

  const effective = {
    ...defaults,
    ...entry,
    moduleKey: entry.key,
    routeFamilies: entry.routeFamilies || [entry.route],
    risk: entry.risk || entry.tier,
    executionTier: entry.executionTier || entry.tier,
  }
  assert.equal(effective.moduleKey, entry.key, `${entry.key} has an invalid moduleKey`)
  assert.ok(String(effective.owner).trim(), `${entry.key} must identify an owner or 'unassigned'`)
  assert.ok(
    allowedStatuses.includes(effective.automationStatus),
    `${entry.key} has invalid automationStatus`,
  )
  assert.ok(
    effective.lastQualifiedAt === null || /^\d{4}-\d{2}-\d{2}/.test(effective.lastQualifiedAt),
    `${entry.key} has invalid lastQualifiedAt`,
  )
  for (const field of requiredArrayFields) {
    assert.ok(Array.isArray(effective[field]), `${entry.key}.${field} must be an array`)
  }
  if (effective.automationStatus === 'qualified') {
    assert.notEqual(effective.owner, 'unassigned', `${entry.key} cannot qualify without an owner`)
    assert.ok(effective.positiveCaseIds.length > 0, `${entry.key} lacks positive cases`)
    assert.ok(effective.negativeCaseIds.length > 0, `${entry.key} lacks negative cases`)
    assert.ok(effective.lastQualifiedAt, `${entry.key} lacks a qualification date`)
  }

  await Promise.all(
    entry.specs.map((spec) =>
      access(resolve(root, 'tests', 'e2e', spec)).catch(() => {
        throw new Error(`${entry.key} references missing executable spec ${spec}`)
      }),
    ),
  )
}

const statusCounts = entries.reduce((counts, entry) => {
  const status = entry.automationStatus || defaults.automationStatus
  counts[status] = (counts[status] || 0) + 1
  return counts
}, {})

console.log(
  `E2E module inventory contract passed: ${entries.length}/${catalogKeys.length} catalog modules mapped. Qualification status: ${allowedStatuses.map((status) => `${status}=${statusCounts[status] || 0}`).join(', ')}.`,
)
