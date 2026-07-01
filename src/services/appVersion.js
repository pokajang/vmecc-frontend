/* global __VMECC_APP_VERSION__, __VMECC_BUILD_ID__ */

export const VERSION_FILE_PATH = '/version.json'

export const CURRENT_APP_VERSION =
  typeof __VMECC_APP_VERSION__ === 'undefined' ? '' : String(__VMECC_APP_VERSION__ || '').trim()

export const CURRENT_BUILD_ID =
  typeof __VMECC_BUILD_ID__ === 'undefined' ? '' : String(__VMECC_BUILD_ID__ || '').trim()

export const normalizeAppVersionPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const app = String(payload.app || '').trim()
  const version = String(payload.version || '').trim()
  const buildId = String(payload.buildId || '').trim()
  const builtAt = String(payload.builtAt || '').trim()

  if (!buildId) return null

  return {
    app,
    version,
    buildId,
    builtAt,
  }
}

export const isDifferentAppVersion = (latest, currentBuildId = CURRENT_BUILD_ID) => {
  const normalized = normalizeAppVersionPayload(latest)
  const current = String(currentBuildId || '').trim()
  if (!normalized || !current) return false
  return normalized.buildId !== current
}

export const fetchLatestAppVersion = async ({ fetchImpl = fetch, now = Date.now } = {}) => {
  const response = await fetchImpl(`${VERSION_FILE_PATH}?t=${encodeURIComponent(String(now()))}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response?.ok) return null
  return normalizeAppVersionPayload(await response.json())
}

export const checkForAppUpdate = async ({
  fetchImpl = fetch,
  currentBuildId = CURRENT_BUILD_ID,
  now = Date.now,
} = {}) => {
  try {
    const latest = await fetchLatestAppVersion({ fetchImpl, now })
    return {
      available: isDifferentAppVersion(latest, currentBuildId),
      latest,
    }
  } catch {
    return {
      available: false,
      latest: null,
    }
  }
}
