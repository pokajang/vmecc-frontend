import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ModuleNavTabs from './ModuleNavTabs'

const normalizePath = (path = '') => {
  const value = String(path || '').trim()
  if (!value) return '/'
  if (value === '/') return value
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export const isRouteNavItemActive = (item = {}, currentPath = '') => {
  if (typeof item.active === 'boolean') return item.active
  const path = normalizePath(currentPath)
  const target = normalizePath(item.to)
  const match = item.match

  if (typeof match === 'function') return Boolean(match(path, item))
  if (typeof match === 'string') return path === normalizePath(match)
  if (Array.isArray(match)) {
    return match.some((entry) => isRouteNavItemActive({ ...item, match: entry }, path))
  }
  if (match && typeof match === 'object') {
    const matchPath = normalizePath(match.path || item.to)
    if (match.type === 'prefix') return path === matchPath || path.startsWith(`${matchPath}/`)
    return path === matchPath
  }
  if (item.prefix) return path === target || path.startsWith(`${target}/`)
  return path === target
}

const RouteNavTabs = ({ items = [], currentPath, navigate, replace = false, className = '' }) => {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const activePath = currentPath || location.pathname
  const runNavigate = navigate || routerNavigate

  const navItems = items.map((item) => {
    const isActive = isRouteNavItemActive(item, activePath)
    const isDisabled = Boolean(item.disabled)
    return {
      ...item,
      active: isActive,
      disabled: isDisabled,
      title: item.disabledReason || item.title,
      onClick: async (event) => {
        event?.preventDefault?.()
        if (isDisabled || !item.to || isActive) return
        const guardResult =
          typeof item.onBeforeNavigate === 'function'
            ? await item.onBeforeNavigate(item.to, item)
            : true
        if (guardResult === false) return
        runNavigate(item.to, { replace: item.replace ?? replace, state: item.state })
      },
    }
  })

  return <ModuleNavTabs items={navItems} className={className} />
}

export default RouteNavTabs
