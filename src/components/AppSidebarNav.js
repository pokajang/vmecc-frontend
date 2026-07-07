import React, { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'

import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

import { CBadge, CNavLink, CSidebarNav } from '@coreui/react'
import { preloadInspectionRoute } from 'src/routePreloaders'

const isInspectionRoute = (item = {}) => String(item.to || '').startsWith('/inspection')

const hasInspectionRoute = (items = []) =>
  items.some((item) => {
    if (isInspectionRoute(item)) return true
    return Array.isArray(item?.items) && hasInspectionRoute(item.items)
  })

const scheduleInspectionRoutePreload = () => {
  if (typeof window === 'undefined') return
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => preloadInspectionRoute(), { timeout: 2500 })
    return
  }
  window.setTimeout(() => preloadInspectionRoute(), 750)
}

export const AppSidebarNav = ({ items, onAction }) => {
  const location = useLocation()
  useEffect(() => {
    if (!hasInspectionRoute(items)) return undefined
    scheduleInspectionRoutePreload()
    return undefined
  }, [items])

  const navLink = (name, icon, badge, indent = false) => {
    return (
      <>
        {icon
          ? icon
          : indent && (
              <span className="nav-icon">
                <span className="nav-icon-bullet"></span>
              </span>
            )}
        {name && name}
        {badge && (
          <CBadge
            color={badge.color}
            className={`ms-auto ${badge.className || ''}`.trim()}
            size="sm"
          >
            {badge.text}
          </CBadge>
        )}
      </>
    )
  }

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, matchPrefix, action, ...rest } = item
    const Component = component
    const prefixes = matchPrefix ? (Array.isArray(matchPrefix) ? matchPrefix : [matchPrefix]) : []
    const prefixActive =
      prefixes.length > 0 && prefixes.some((p) => location.pathname.startsWith(p))
        ? { active: true }
        : {}
    const actionClassName = [rest.className, action ? 'w-100 text-start' : null]
      .filter(Boolean)
      .join(' ')
    const preloadProps = isInspectionRoute(item)
      ? {
          onFocus: preloadInspectionRoute,
          onMouseEnter: preloadInspectionRoute,
          onTouchStart: preloadInspectionRoute,
        }
      : {}

    return (
      <Component as="div" key={index}>
        {rest.to || rest.href ? (
          <CNavLink
            {...(rest.to && { as: NavLink })}
            {...(rest.href && { target: '_blank', rel: 'noopener noreferrer' })}
            {...rest}
            {...preloadProps}
            {...prefixActive}
          >
            {navLink(name, icon, badge, indent)}
          </CNavLink>
        ) : action ? (
          <CNavLink
            as="button"
            type="button"
            {...rest}
            className={actionClassName}
            onClick={() => onAction?.(action, item)}
          >
            {navLink(name, icon, badge, indent)}
          </CNavLink>
        ) : (
          navLink(name, icon, badge, indent)
        )}
      </Component>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, items, to, ...rest } = item
    const Component = component
    return (
      <Component compact as="div" key={index} toggler={navLink(name, icon)} {...rest}>
        {items?.map((item, index) =>
          item.items ? navGroup(item, index) : navItem(item, index, true),
        )}
      </Component>
    )
  }

  return (
    <CSidebarNav as={SimpleBar}>
      {items &&
        items.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </CSidebarNav>
  )
}

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
  onAction: PropTypes.func,
}
