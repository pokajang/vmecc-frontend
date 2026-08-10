import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const auditScriptPath = fileURLToPath(import.meta.url)
const minimumPatchedRouterVersion = '7.18.2'
const excludedDirectories = new Set([
  '.codex-run',
  '.git',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'upgrade-works',
])

const fail = (message) => {
  throw new Error(`React Router advisory audit failed: ${message}`)
}

const readJson = async (path) => JSON.parse(await readFile(resolve(frontendRoot, path), 'utf8'))

const collectSourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) {
        return excludedDirectories.has(entry.name) ? [] : collectSourceFiles(path)
      }
      if (!entry.isFile()) return []
      return ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'].includes(extname(entry.name))
        ? [path]
        : []
    }),
  )
  return files.flat()
}

const [packageJson, packageLock, appSource, sourceFiles] = await Promise.all([
  readJson('package.json'),
  readJson('package-lock.json'),
  readFile(resolve(frontendRoot, 'src/App.js'), 'utf8'),
  collectSourceFiles(frontendRoot),
])

const declaredRouterVersion = packageJson.dependencies?.['react-router-dom']
const lockedRouterDomVersion = packageLock.packages?.['node_modules/react-router-dom']?.version
const lockedRouterVersion = packageLock.packages?.['node_modules/react-router']?.version

if (declaredRouterVersion !== minimumPatchedRouterVersion) {
  fail(
    `react-router-dom must remain exactly pinned to the reviewed patched version ${minimumPatchedRouterVersion}; found ${declaredRouterVersion || 'missing'}.`,
  )
}
if (
  lockedRouterDomVersion !== minimumPatchedRouterVersion ||
  lockedRouterVersion !== minimumPatchedRouterVersion
) {
  fail(
    `the locked router tree must remain at ${minimumPatchedRouterVersion} (react-router-dom=${lockedRouterDomVersion || 'missing'}, react-router=${lockedRouterVersion || 'missing'}).`,
  )
}

const declaredPackages = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
  ...packageJson.optionalDependencies,
}
const forbiddenPackagePatterns = [
  /^react-router$/,
  /^react-server-dom-/,
  /^@react-router\/(?:dev|node|serve|cloudflare|express)$/,
]
for (const packageName of Object.keys(declaredPackages)) {
  if (forbiddenPackagePatterns.some((pattern) => pattern.test(packageName))) {
    fail(
      `RSC/server-router dependency ${packageName} was introduced; reassess the router architecture.`,
    )
  }
}

if (
  !/from\s+['"]react-router-dom['"]/.test(appSource) ||
  !/<BrowserRouter(?:\s|>)/.test(appSource)
) {
  fail('src/App.js is no longer the reviewed declarative BrowserRouter entry point.')
}

const forbiddenSourcePatterns = [
  ['React Server Components package', /react-server-dom-/],
  ['React Router server package', /@react-router\/(?:dev|node|serve|cloudflare|express)/],
  [
    'React Router RSC/server API',
    /\b(?:routeRSCServerRequest|matchRSCServerRequest|RSCStaticRouter|createRequestHandler|allowedActionOrigins)\b/,
  ],
]

for (const path of sourceFiles) {
  if (/^entry\.(?:rsc|server|ssr)(?:\.[cm]?[jt]sx?)?$/.test(path.split(/[\\/]/).at(-1))) {
    fail(
      `RSC/server entry file detected at ${relative(frontendRoot, path)}; reassess the router architecture.`,
    )
  }
  if (path === auditScriptPath) continue
  const source = await readFile(path, 'utf8')
  for (const [label, pattern] of forbiddenSourcePatterns) {
    if (pattern.test(source)) {
      fail(
        `${label} detected in ${relative(frontendRoot, path)}; reassess the router architecture.`,
      )
    }
  }
}

console.log(
  'React Router advisory audit passed: patched 7.18.2 packages remain exactly locked, the app remains a declarative BrowserRouter SPA, and no reviewed RSC/server-router indicators were found.',
)
