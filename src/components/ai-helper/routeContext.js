import { matchPath } from 'react-router-dom'
import routes from 'src/routes'

const serializableParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params || {}).map(([key, value]) => [key, value == null ? '' : String(value)]),
  )

export const resolveAiHelperRouteContext = (location) => {
  const pathname = location?.pathname || '/'
  const candidates = routes
    .filter((route) => route.path)
    .slice()
    .sort((a, b) => String(b.path).length - String(a.path).length)

  let matchedRoute = null
  let matchedParams = {}
  for (const route of candidates) {
    const match = matchPath({ path: route.path, end: true }, pathname)
    if (match) {
      matchedRoute = route
      matchedParams = match.params || {}
      break
    }
  }

  if (!matchedRoute) {
    for (const route of candidates) {
      const match = matchPath({ path: route.path, end: false }, pathname)
      if (match) {
        matchedRoute = route
        matchedParams = match.params || {}
        break
      }
    }
  }

  const routeName =
    matchedRoute?.name || (typeof document !== 'undefined' ? document.title : '') || 'Current page'
  return {
    path: pathname,
    search: location?.search || '',
    route_name: routeName,
    module_key: matchedRoute?.module || '',
    title: routeName,
    params: serializableParams(matchedParams),
  }
}

export const routeContextSignature = (context) =>
  JSON.stringify({
    path: context?.path || '/',
    search: context?.search || '',
    route_name: context?.route_name || '',
    module_key: context?.module_key || '',
    params: context?.params || {},
  })
