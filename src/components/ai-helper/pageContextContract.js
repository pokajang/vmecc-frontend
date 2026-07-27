export const AI_HELPER_PAGE_CONTEXT_LIMITS = Object.freeze({
  path: 255,
  search: 1000,
  routeKey: 120,
  routeName: 160,
  moduleKey: 120,
  title: 160,
  params: 20,
  paramValue: 120,
})

const boundedText = (value, maxLength) =>
  String(value ?? '')
    .trim()
    .slice(0, maxLength)

export const serializeAiHelperParams = (params = {}) => {
  const entries =
    params && typeof params === 'object' && !Array.isArray(params) ? Object.entries(params) : []

  return Object.fromEntries(
    entries
      .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
      .slice(0, AI_HELPER_PAGE_CONTEXT_LIMITS.params)
      .map(([key, value]) => [key, boundedText(value, AI_HELPER_PAGE_CONTEXT_LIMITS.paramValue)]),
  )
}

export const buildAiHelperPageContext = ({
  path = '/',
  search = '',
  routeKey = '',
  routeName = '',
  moduleKey = '',
  title = '',
  params = {},
} = {}) => ({
  path: boundedText(path, AI_HELPER_PAGE_CONTEXT_LIMITS.path) || '/',
  search: boundedText(search, AI_HELPER_PAGE_CONTEXT_LIMITS.search),
  route_key: boundedText(routeKey, AI_HELPER_PAGE_CONTEXT_LIMITS.routeKey),
  route_name: boundedText(routeName, AI_HELPER_PAGE_CONTEXT_LIMITS.routeName),
  module_key: boundedText(moduleKey, AI_HELPER_PAGE_CONTEXT_LIMITS.moduleKey),
  title: boundedText(title, AI_HELPER_PAGE_CONTEXT_LIMITS.title),
  params: serializeAiHelperParams(params),
})
