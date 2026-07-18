import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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
}

console.log(
  `E2E module coverage contract passed: ${entries.length}/${catalogKeys.length} catalog modules mapped.`,
)
