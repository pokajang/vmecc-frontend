import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const baseUrl = 'https://vmecc.amiosh.com'
const outputIndex = process.argv.indexOf('--output')
const buildIndex = process.argv.indexOf('--expected-build-id')
const outputValue = outputIndex >= 0 ? process.argv[outputIndex + 1] : ''
const expectedBuildId = buildIndex >= 0 ? process.argv[buildIndex + 1] : ''

if (!outputValue || !expectedBuildId) {
  throw new Error(
    'Usage: node scripts/capture-live-uat-baseline.mjs --output <outside-repo-directory> --expected-build-id <build-id>',
  )
}

const outputRoot = isAbsolute(outputValue) ? resolve(outputValue) : resolve(root, outputValue)
const relativeToRepo = relative(root, outputRoot)
if (relativeToRepo === '' || (!relativeToRepo.startsWith('..') && !isAbsolute(relativeToRepo))) {
  throw new Error('Live UAT evidence output must be outside the frontend repository')
}

const safeFetch = async (path, method = 'GET') => {
  const url = new URL(path, baseUrl)
  if (url.origin !== baseUrl)
    throw new Error(`Refusing non-production frontend origin: ${url.origin}`)
  const response = await fetch(url, {
    method,
    redirect: 'manual',
    headers: { 'Cache-Control': 'no-cache', Accept: method === 'GET' ? '*/*' : 'text/html' },
  })
  const headers = Object.fromEntries(response.headers.entries())
  const body = method === 'HEAD' ? '' : await response.text()
  return { url: url.href, method, status: response.status, headers, body }
}

const versionResponse = await safeFetch(`/version.json?uat=${Date.now()}`)
if (versionResponse.status !== 200) {
  throw new Error(`Production version request returned ${versionResponse.status}`)
}
let version
try {
  version = JSON.parse(versionResponse.body)
} catch {
  throw new Error('Production version response was not valid JSON')
}
if (version.buildId !== expectedBuildId) {
  throw new Error(
    `Production build mismatch: expected ${expectedBuildId}, received ${version.buildId}`,
  )
}

const routeChecks = await Promise.all(
  ['/', '/login', '/inspection'].map(async (path) => {
    const response = await safeFetch(path, 'HEAD')
    return { path, status: response.status, headers: response.headers }
  }),
)
for (const route of routeChecks) {
  if (route.status !== 200) throw new Error(`${route.path} returned ${route.status}`)
}

const rootResponse = await safeFetch('/')
const assetPaths = Array.from(
  rootResponse.body.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
  (match) => match[1],
)
const assets = await Promise.all(
  assetPaths.map(async (path) => {
    const response = await safeFetch(path)
    return {
      path,
      status: response.status,
      containsProductionApi: response.body.includes('https://vmecc-api.amiosh.com'),
      containsLocalApi: /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api(?:\/|['"`]|$)/i.test(
        response.body,
      ),
    }
  }),
)
if (assets.some((asset) => asset.status !== 200))
  throw new Error('One or more production assets failed')
if (assets.some((asset) => asset.containsLocalApi)) {
  throw new Error('A production asset contains a localhost API configuration')
}
if (!assets.some((asset) => asset.containsProductionApi)) {
  throw new Error('Production API origin was not found in served application assets')
}

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const evidence = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  baseUrl,
  source: {
    branch: git('branch', '--show-current'),
    head: git('rev-parse', 'HEAD'),
    status: git('status', '--porcelain').split('\n').filter(Boolean),
    node: process.version,
    npmUserAgent: process.env.npm_config_user_agent || null,
  },
  production: {
    version,
    routeChecks,
    assets,
  },
  verdict: 'matched-read-only-baseline',
}

await mkdir(outputRoot, { recursive: true })
await Promise.all([
  writeFile(
    resolve(outputRoot, 'production-version.json'),
    `${JSON.stringify(version, null, 2)}\n`,
  ),
  writeFile(
    resolve(outputRoot, 'production-headers.json'),
    `${JSON.stringify(routeChecks, null, 2)}\n`,
  ),
  writeFile(resolve(outputRoot, 'source-metadata.json'), `${JSON.stringify(evidence, null, 2)}\n`),
])

console.log(
  `Live UAT baseline captured without authentication or mutation: ${version.buildId}, ${routeChecks.length} routes, ${assets.length} assets.`,
)
