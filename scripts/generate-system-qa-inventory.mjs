import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const backendRoot = resolve(frontendRoot, '..', 'vmecc-backend')
const outputArgument = process.argv.indexOf('--output')

if (outputArgument === -1 || !process.argv[outputArgument + 1]) {
  throw new Error('Usage: node scripts/generate-system-qa-inventory.mjs --output <directory>')
}

const outputRoot = resolve(process.argv[outputArgument + 1])
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.php'])
const isProductionSource = (path) =>
  sourceExtensions.has(extname(path)) &&
  !/[\\/]__tests__[\\/]/.test(path) &&
  !/\.(?:test|spec)\.[^.]+$/.test(path)

const listFiles = async (root, predicate = () => true) => {
  const entries = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(root, entry.name)
      if (entry.isDirectory()) return listFiles(path, predicate)
      return predicate(path) ? [path] : []
    }),
  )
  return nested.flat().sort()
}

const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()

const phpJson = (code) =>
  JSON.parse(execFileSync('php', ['-r', code], { cwd: backendRoot, encoding: 'utf8' }))

const writeJson = (name, value) =>
  writeFile(resolve(outputRoot, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8')

const stableId = (kind, index) => `${kind.toUpperCase()}-${String(index + 1).padStart(4, '0')}`

await mkdir(outputRoot, { recursive: true })

const routesSource = await readFile(resolve(frontendRoot, 'src', 'routes.js'), 'utf8')
const frontendRoutes = Array.from(
  routesSource.matchAll(/\{\s*path:\s*(['"`])([^'"`]+)\1\s*,([\s\S]*?)\},?/g),
  (match, index) => {
    const body = match[3]
    return {
      id: stableId('fe-route', index),
      path: match[2],
      name: body.match(/\bname:\s*['"]([^'"]+)['"]/)?.[1] ?? null,
      module: body.match(/\bmodule:\s*['"]([^'"]+)['"]/)?.[1] ?? null,
      element: body.match(/\belement:\s*([A-Za-z_$][\w$]*)/)?.[1] ?? null,
      exact: /\bexact:\s*true\b/.test(body),
      source: 'src/routes.js',
    }
  },
)

const backendRoutes = JSON.parse(
  execFileSync('php', ['artisan', 'route:list', '--env=testing', '--json'], {
    cwd: backendRoot,
    encoding: 'utf8',
    env: process.env,
  }),
).map((route, index) => ({
  id: stableId('be-route', index),
  method: route.method,
  uri: route.uri,
  name: route.name || null,
  action: route.action,
  middleware: route.middleware,
}))

const modules = Object.entries(
  phpJson(
    "require 'vendor/autoload.php'; echo json_encode(App\\Services\\ModuleCatalog::MODULES, JSON_THROW_ON_ERROR);",
  ),
).map(([key, metadata], index) => ({ id: stableId('module', index), key, ...metadata }))

const inventoryFiles = async (root, kind) =>
  (await listFiles(root, isProductionSource)).map((path, index) => ({
    id: stableId(kind, index),
    path: relative(frontendRoot, path).replaceAll('\\', '/'),
    name: basename(path, extname(path)),
  }))

const views = await inventoryFiles(resolve(frontendRoot, 'src', 'views'), 'view')
const components = await inventoryFiles(resolve(frontendRoot, 'src', 'components'), 'component')

const backendClassInventory = async (directory, kind) =>
  (await listFiles(resolve(backendRoot, directory), (path) => extname(path) === '.php')).map(
    async (path, index) => {
      const source = await readFile(path, 'utf8')
      return {
        id: stableId(kind, index),
        path: relative(backendRoot, path).replaceAll('\\', '/'),
        class: source.match(/\bclass\s+([A-Za-z_$][\w$]*)/)?.[1] ?? basename(path, '.php'),
        queued: /\bShouldQueue\b/.test(source),
        signature: source.match(/\$signature\s*=\s*['"]([^'"]+)/)?.[1] ?? null,
      }
    },
  )

const jobs = await Promise.all(await backendClassInventory('app/Jobs', 'job'))
const commands = await Promise.all(await backendClassInventory('app/Console/Commands', 'command'))
const notifications = await Promise.all(
  await backendClassInventory('app/Notifications', 'notification'),
)

const frontendSourceFiles = await listFiles(resolve(frontendRoot, 'src'), isProductionSource)
const navigation = []
for (const path of frontendSourceFiles) {
  const source = await readFile(path, 'utf8')
  const lines = source.split(/\r?\n/)
  lines.forEach((line, lineIndex) => {
    const matches = line.matchAll(
      /(?:\bto\s*=\s*|\bnavigate\s*\(\s*|\bhref\s*=\s*)[{'"`]\s*(\/[A-Za-z0-9_/:.?&=+${}-]*)/g,
    )
    for (const match of matches) {
      navigation.push({
        id: stableId('navigation', navigation.length),
        destination: match[1],
        source: relative(frontendRoot, path).replaceAll('\\', '/'),
        line: lineIndex + 1,
      })
    }
  })
}

const categories = [
  ['frontend_route', frontendRoutes],
  ['backend_route', backendRoutes],
  ['module', modules],
  ['view', views],
  ['component', components],
  ['job', jobs],
  ['command', commands],
  ['notification', notifications],
  ['navigation', navigation],
]
const ledger = categories.flatMap(([kind, items]) =>
  items.map((item) => ({
    inventoryId: item.id,
    kind,
    locator: item.path ?? item.uri ?? item.key ?? item.destination,
    status: 'mapped',
    risk: 'unclassified',
    intendedPersonas: [],
    positiveCaseIds: [],
    negativeCaseIds: [],
    artifactCaseIds: [],
    evidence: [],
    defectIds: [],
    notes: null,
  })),
)

const metadata = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  runId: process.env.E2E_RUN_ID || null,
  frontend: {
    root: frontendRoot,
    head: git(frontendRoot, 'rev-parse', 'HEAD'),
    status: git(frontendRoot, 'status', '--porcelain').split('\n').filter(Boolean),
  },
  backend: {
    root: backendRoot,
    head: git(backendRoot, 'rev-parse', 'HEAD'),
    status: git(backendRoot, 'status', '--porcelain').split('\n').filter(Boolean),
  },
}
const summary = Object.fromEntries(categories.map(([kind, items]) => [kind, items.length]))

await Promise.all([
  writeJson('metadata.json', metadata),
  writeJson('frontend-routes.json', frontendRoutes),
  writeJson('backend-routes.json', backendRoutes),
  writeJson('modules.json', modules),
  writeJson('views.json', views),
  writeJson('components.json', components),
  writeJson('jobs.json', jobs),
  writeJson('commands.json', commands),
  writeJson('notifications.json', notifications),
  writeJson('navigation.json', navigation),
  writeJson('master-coverage-ledger.json', ledger),
  writeJson('summary.json', summary),
])

console.log(`System QA inventory written to ${outputRoot}`)
console.log(JSON.stringify(summary))
