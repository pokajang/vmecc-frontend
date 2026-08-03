import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateProductionEnvironment } from '../config/apiEnvironment.mjs'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = (path) => readFile(resolve(frontendRoot, path), 'utf8')

const fail = (message) => {
  throw new Error(`Production configuration audit failed: ${message}`)
}

const readHeader = (source, name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`Header always set ${escapedName} "([^"]+)"`))
  if (!match) fail(`${name} is missing from .htaccess.`)
  return match[1]
}

const parseEnvironment = (source) =>
  Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=')
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
      }),
  )

const [rootHeaders, publicHeaders, productionEnvironment, loginSource] = await Promise.all([
  readSource('.htaccess'),
  readSource('public/.htaccess'),
  readSource('.env.production'),
  readSource('src/views/pages/login/Login.js'),
])

if (rootHeaders !== publicHeaders) {
  fail(
    'the root and public .htaccess files differ; deployment header sources must stay synchronized.',
  )
}

const expectedHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
}

Object.entries(expectedHeaders).forEach(([name, expected]) => {
  const actual = readHeader(publicHeaders, name)
  if (actual !== expected) fail(`${name} does not match the approved value.`)
})

const contentSecurityPolicy = readHeader(publicHeaders, 'Content-Security-Policy')
const requiredCspFragments = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
]
requiredCspFragments.forEach((fragment) => {
  if (!contentSecurityPolicy.includes(fragment)) fail(`CSP is missing ${fragment}.`)
})
if (contentSecurityPolicy.includes("'unsafe-eval'")) fail("CSP must not include 'unsafe-eval'.")
if (/(?:^|\s)\*(?:\s|;|$)/.test(contentSecurityPolicy)) {
  fail('CSP must not include a wildcard source.')
}
if (/gstatic\.com/i.test(contentSecurityPolicy)) {
  fail('CSP still permits gstatic.com after the Google icon was localized.')
}
if (/https:\/\/www\.gstatic\.com/i.test(loginSource)) {
  fail('the login view still references the remote Google icon.')
}

const env = parseEnvironment(productionEnvironment)
validateProductionEnvironment({ command: 'build', mode: 'production', env })
const apiOrigin = new globalThis.URL(env.VITE_API_URL).origin
for (const directive of ['connect-src', 'img-src']) {
  const match = contentSecurityPolicy.match(new RegExp(`${directive} ([^;]+)`))
  if (!match?.[1].split(/\s+/).includes(apiOrigin)) {
    fail(`CSP ${directive} does not include the configured production API origin.`)
  }
}

console.log(
  'Production configuration audit passed: header sources match, camera is self-only, disabled capabilities remain blocked, CSP is constrained, the Google icon is local, and the production API URL is explicit HTTPS.',
)
