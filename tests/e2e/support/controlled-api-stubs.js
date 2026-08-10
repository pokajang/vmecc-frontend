const DEFAULT_CONTROLLED_API_BASE_URL = 'http://127.0.0.1:8000/api'

const normalizeControlledApiBaseUrl = (value = DEFAULT_CONTROLLED_API_BASE_URL) => {
  const configuredValue = String(value || '').trim()
  let url

  try {
    url = new URL(configuredValue)
  } catch {
    throw new Error('The mocked E2E API URL must be a valid absolute URL.')
  }

  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    !url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'The mocked E2E API URL must use an explicit http://127.0.0.1:<port> origin without credentials, query, or fragment.',
    )
  }

  const pathname = url.pathname.replace(/\/+$/, '') || '/api'
  return `${url.origin}${pathname}`
}

const getControlledBrowserApiBaseUrl = () =>
  normalizeControlledApiBaseUrl(
    process.env.VMECC_E2E_BROWSER_API_URL ||
      process.env.VMECC_E2E_API_URL ||
      DEFAULT_CONTROLLED_API_BASE_URL,
  )

const isRequestWithinControlledApi = (requestUrl, apiBaseUrl) => {
  const normalizedBaseUrl = normalizeControlledApiBaseUrl(apiBaseUrl)
  const base = new URL(normalizedBaseUrl)
  const request = new URL(requestUrl)

  return (
    request.origin === base.origin &&
    (request.pathname === base.pathname || request.pathname.startsWith(`${base.pathname}/`))
  )
}

const isControlledApiTransportResourceType = (resourceType) =>
  resourceType === 'fetch' || resourceType === 'xhr'

const installControlledApiRequestGuard = async (page, apiBaseUrl) => {
  const normalizedBaseUrl = normalizeControlledApiBaseUrl(apiBaseUrl)

  await page.route('**/api/**', (route) => {
    const request = route.request()
    if (!isControlledApiTransportResourceType(request.resourceType())) {
      return route.fallback()
    }
    if (!isRequestWithinControlledApi(request.url(), normalizedBaseUrl)) {
      return route.abort('blockedbyclient')
    }
    return route.fallback()
  })
}

module.exports = {
  DEFAULT_CONTROLLED_API_BASE_URL,
  getControlledBrowserApiBaseUrl,
  installControlledApiRequestGuard,
  isControlledApiTransportResourceType,
  isRequestWithinControlledApi,
  normalizeControlledApiBaseUrl,
}
