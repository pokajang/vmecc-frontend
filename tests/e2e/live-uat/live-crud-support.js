const {
  API_BASE_URL,
  API_ORIGIN,
  AUTH_LOGIN_URL,
  FRONTEND_ORIGIN,
  redactDiagnostic,
  sanitizeRequestUrl,
} = require('./live-uat-support')

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const RUN_ID_PATTERN = /^VMECC-QA-\d{8}-\d{6}-[a-z0-9]{6}$/
const PRODUCTION_ACKNOWLEDGEMENT = 'RUN_OWNED_CRUD_ONLY'
const API_REQUEST_INTERVAL_MS = 750
let nextApiRequestAt = 0
const PERMITTED_SELF_STATE_PATHS = new Set(['/api/onboarding/states/profile_completion_trt'])

const normalizeMethod = (method) =>
  String(method || 'GET')
    .trim()
    .toUpperCase()

const requireControlledCrudEnvironment = (environment = process.env) => {
  const runId = String(environment.E2E_RUN_ID || '').trim()
  const marker = String(environment.VMECC_LIVE_UAT_MARKER || '').trim()
  const baseUrl = String(environment.VMECC_LIVE_UAT_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '')
  const apiUrl = String(environment.VMECC_LIVE_UAT_API_URL || '')
    .trim()
    .replace(/\/+$/, '')

  if (environment.VMECC_LIVE_UAT !== '1')
    throw new Error('Controlled CRUD requires VMECC_LIVE_UAT=1')
  if (environment.VMECC_LIVE_UAT_READ_ONLY === '1') {
    throw new Error('Controlled CRUD refuses VMECC_LIVE_UAT_READ_ONLY=1')
  }
  if (environment.VMECC_LIVE_UAT_ALLOW_MUTATIONS !== '1') {
    throw new Error('Controlled CRUD requires VMECC_LIVE_UAT_ALLOW_MUTATIONS=1')
  }
  if (environment.VMECC_LIVE_UAT_CONFIRM_PRODUCTION !== PRODUCTION_ACKNOWLEDGEMENT) {
    throw new Error(
      `Controlled CRUD requires VMECC_LIVE_UAT_CONFIRM_PRODUCTION=${PRODUCTION_ACKNOWLEDGEMENT}`,
    )
  }
  if (baseUrl !== FRONTEND_ORIGIN)
    throw new Error(`Controlled CRUD base URL must be ${FRONTEND_ORIGIN}`)
  if (apiUrl !== API_BASE_URL) throw new Error(`Controlled CRUD API URL must be ${API_BASE_URL}`)
  if (!RUN_ID_PATTERN.test(runId)) throw new Error('Controlled CRUD requires a valid E2E_RUN_ID')
  if (marker !== runId) throw new Error('Controlled CRUD marker must exactly match E2E_RUN_ID')
  if (String(environment.VMECC_LIVE_ALLOW_FOREIGN_WORKFLOW || '').trim()) {
    throw new Error('Controlled CRUD refuses VMECC_LIVE_ALLOW_FOREIGN_WORKFLOW')
  }
  return { runId, marker }
}

const readRequestBody = (request) => {
  try {
    return request.postDataJSON()
  } catch {
    return request.postData() || ''
  }
}

const containsMarker = (value, marker) => {
  if (typeof value === 'string') return value.includes(marker)
  if (Array.isArray(value)) return value.some((entry) => containsMarker(entry, marker))
  if (value && typeof value === 'object')
    return Object.values(value).some((entry) => containsMarker(entry, marker))
  return false
}

const normalizePath = (value) => {
  try {
    const rawValue = String(value || '')
    const url = /^https?:\/\//i.test(rawValue)
      ? new URL(rawValue)
      : new URL(rawValue.replace(/^\/+/, ''), `${API_BASE_URL}/`)
    return url.pathname.replace(/\/+$/, '') || '/'
  } catch {
    return ''
  }
}

const createRunOwnedRegistry = ({ marker, createPaths = [], selfStatePaths = [] } = {}) => {
  if (!RUN_ID_PATTERN.test(String(marker || ''))) throw new Error('A valid run marker is required')
  const allowedCreatePaths = new Set(createPaths.map(normalizePath).filter(Boolean))
  const allowedSelfStatePaths = new Set(selfStatePaths.map(normalizePath).filter(Boolean))
  for (const path of allowedSelfStatePaths) {
    if (!PERMITTED_SELF_STATE_PATHS.has(path)) {
      throw new Error(`Unsupported controlled self-state path: ${path}`)
    }
  }
  const ownedRecords = new Map()

  const register = ({ collectionPath, id } = {}) => {
    const normalized = String(id || '').trim()
    const normalizedCollectionPath = normalizePath(collectionPath)
    if (!normalized) throw new Error('Cannot register an empty UAT record ID')
    if (!normalizedCollectionPath.startsWith('/api/')) {
      throw new Error('A registered UAT record must use an API collection path')
    }
    if (!ownedRecords.has(normalizedCollectionPath))
      ownedRecords.set(normalizedCollectionPath, new Set())
    ownedRecords.get(normalizedCollectionPath).add(normalized)
    return normalized
  }

  const isOwnedUrl = (rawUrl) => {
    let url
    try {
      url = new URL(rawUrl)
    } catch {
      return false
    }
    if (url.origin !== API_ORIGIN) return false
    return [...ownedRecords.entries()].some(([collectionPath, ids]) =>
      [...ids].some((id) => {
        const recordPath = `${collectionPath}/${encodeURIComponent(id)}`
        return url.pathname === recordPath || url.pathname.startsWith(`${recordPath}/`)
      }),
    )
  }

  const classify = (request) => {
    let url
    try {
      url = new URL(request.url())
    } catch {
      return 'block-origin'
    }
    const method = normalizeMethod(request.method())
    if (![FRONTEND_ORIGIN, API_ORIGIN].includes(url.origin)) return 'block-origin'
    if (SAFE_METHODS.has(method)) return 'allow-safe-method'
    if (method === 'POST' && url.href === AUTH_LOGIN_URL) return 'allow-auth-login'
    if (url.origin !== API_ORIGIN) return 'block-mutation'

    if (method === 'POST' && allowedSelfStatePaths.has(normalizePath(url.href))) {
      return 'allow-owned-self-state'
    }

    if (
      method === 'POST' &&
      allowedCreatePaths.has(normalizePath(url.href)) &&
      containsMarker(readRequestBody(request), marker)
    ) {
      return 'allow-owned-create'
    }
    if (['PUT', 'PATCH', 'DELETE', 'POST'].includes(method) && isOwnedUrl(url.href)) {
      return 'allow-owned-mutation'
    }
    return 'block-mutation'
  }

  return {
    marker,
    register,
    ownedIds: () =>
      [...ownedRecords.entries()]
        .flatMap(([collectionPath, ids]) => [...ids].map((id) => `${collectionPath}/${id}`))
        .sort(),
    classify,
  }
}

const installControlledCrudRequestGuard = async (context, registry) => {
  const ledger = []
  const handler = async (route) => {
    const request = route.request()
    const classification = registry.classify(request)
    if (classification.startsWith('allow-')) {
      if (new URL(request.url()).origin === API_ORIGIN) {
        const now = Date.now()
        const scheduledAt = Math.max(now, nextApiRequestAt)
        nextApiRequestAt = scheduledAt + API_REQUEST_INTERVAL_MS
        if (scheduledAt > now)
          await new Promise((resolve) => setTimeout(resolve, scheduledAt - now))
      }
      await route.fallback().catch(() => {})
      return
    }
    ledger.push({
      classification,
      method: normalizeMethod(request.method()),
      url: sanitizeRequestUrl(request.url()),
    })
    await route.abort('blockedbyclient')
  }
  await context.route('**/*', handler)
  return {
    ledger,
    async dispose() {
      await context.unroute('**/*', handler)
    },
  }
}

const serializeControlledCrudLedger = ({ registry, guardLedger = [], cleanup = [] } = {}) =>
  `${JSON.stringify(
    {
      schemaVersion: 1,
      marker: registry?.marker || '',
      ownedIds: registry?.ownedIds?.() || [],
      blockedRequests: Array.isArray(guardLedger)
        ? guardLedger.map((entry) => ({
            ...entry,
            url: sanitizeRequestUrl(entry?.url || ''),
          }))
        : [],
      cleanup: Array.isArray(cleanup)
        ? cleanup.map((entry) => redactDiagnostic(JSON.stringify(entry)))
        : [],
    },
    null,
    2,
  )}\n`

module.exports = {
  PRODUCTION_ACKNOWLEDGEMENT,
  RUN_ID_PATTERN,
  containsMarker,
  createRunOwnedRegistry,
  installControlledCrudRequestGuard,
  requireControlledCrudEnvironment,
  serializeControlledCrudLedger,
}
