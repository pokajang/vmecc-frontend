import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CSpinner,
  CContainer,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CBadge,
  CNavLink,
  CNavItem,
} from '@coreui/react'
import { Bell, MessageSquareText, Menu, User } from 'lucide-react'

import { AppHeaderDropdown } from './header/index'
import MobileNavSheet from './header/MobileNavSheet'
import NotificationDrawer from './NotificationDrawer'
import WorkflowNotifications from 'src/views/notifications/workflow/WorkflowNotifications'
import ErrorBoundary from './ErrorBoundary'
import useWorkflowNotificationCounts from 'src/hooks/useWorkflowNotificationCounts'
import useMessageUnreadCount from 'src/hooks/useMessageUnreadCount'
import useOnDutyTeam from 'src/hooks/useOnDutyTeam'
import useOvertimeEligibility from 'src/hooks/useOvertimeEligibility'
import { fetchRolePermissions, logoutRequest } from 'src/services/apiClient'
import { getVisibleNavigationWithOptions } from 'src/utils/navigation'
import { getPrimaryRoleLabel, hasPermission, isSystemAdministrator } from 'src/utils/authz'
import { ROLE_OPTIONS } from 'src/constants/roles'
import navigation from 'src/_nav'
import { useGuardedNavigate } from 'src/contexts/NavigationGuardContext'

const AppHeader = () => {
  const headerRef = useRef()
  const menuTriggerRef = useRef(null)
  const accountTriggerRef = useRef(null)
  const returnFocusRef = useRef(null)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const guardedNavigate = useGuardedNavigate()
  const location = useLocation()

  const sidebarShow = useSelector((state) => state.sidebarShow)
  const authUser = useSelector((state) => state.authUser)

  const unreadCount = useMessageUnreadCount()
  const onDuty = useOnDutyTeam()
  const notifUnread = useWorkflowNotificationCounts()

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState('menu')
  const [sheetSession, setSheetSession] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false)

  const canClaim = hasPermission(authUser, 'self.payroll')
  const canLeave = hasPermission(authUser, 'self.leave')
  const canOvertimePermission = hasPermission(authUser, 'self.overtime')
  const isSysAdmin = isSystemAdministrator(authUser)
  const shouldResolveOvertimeEligibility = canClaim || canOvertimePermission
  const { eligible: overtimeEligible, isResolved: overtimeEligibilityResolved } =
    useOvertimeEligibility({ enabled: shouldResolveOvertimeEligibility })
  const canOvertime = isSysAdmin
    ? canOvertimePermission
    : canOvertimePermission && overtimeEligibilityResolved && overtimeEligible
  const overtimeEligibleForMenu = shouldResolveOvertimeEligibility
    ? isSysAdmin
      ? true
      : overtimeEligibilityResolved && overtimeEligible
    : null

  const menuData = useMemo(
    () =>
      getVisibleNavigationWithOptions(navigation, authUser, unreadCount, {
        overtimeEligible: overtimeEligibleForMenu,
      }),
    [authUser, overtimeEligibleForMenu, unreadCount],
  )
  const switcherSource = authUser?.switcher_source || null
  const canUseRoleSwitcher = isSysAdmin || Boolean(switcherSource)
  const [rolePermissionsByRole, setRolePermissionsByRole] = useState({})
  const [roleMatrixLoading, setRoleMatrixLoading] = useState(false)
  const roleOptions = useMemo(() => {
    const list = canUseRoleSwitcher
      ? ROLE_OPTIONS
      : Array.isArray(authUser?.roles)
        ? authUser.roles
        : []
    return Array.from(new Set(list.map((role) => String(role || '').trim()).filter(Boolean)))
  }, [authUser?.roles, canUseRoleSwitcher])
  const [quickRole, setQuickRole] = useState(() => getPrimaryRoleLabel(authUser) || '')

  useEffect(() => {
    const handleScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }
    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const nextPrimary = getPrimaryRoleLabel(authUser) || roleOptions[0] || ''
    setQuickRole(nextPrimary)
  }, [authUser, roleOptions])

  useEffect(() => {
    let isMounted = true
    const loadRoleMatrix = async () => {
      if (!canUseRoleSwitcher) return
      setRoleMatrixLoading(true)
      try {
        const result = await fetchRolePermissions()
        if (!isMounted) return
        setRolePermissionsByRole(
          result?.matrix && typeof result.matrix === 'object' ? result.matrix : {},
        )
      } catch {
        if (!isMounted) return
        setRolePermissionsByRole({})
      } finally {
        if (isMounted) setRoleMatrixLoading(false)
      }
    }
    loadRoleMatrix()
    return () => {
      isMounted = false
    }
  }, [canUseRoleSwitcher])

  useEffect(() => {
    setMobileSheetOpen(false)
    setNotifDrawerOpen(false)
  }, [location.pathname])

  const openMobileSheet = useCallback((mode, triggerRef) => {
    returnFocusRef.current = triggerRef?.current || null
    setSheetMode(mode)
    setSheetSession((prev) => prev + 1)
    setMobileSheetOpen(true)
  }, [])

  const closeMobileSheet = useCallback(() => setMobileSheetOpen(false), [])

  const handleSheetNavigate = useCallback(
    (item) => {
      if (!item) return
      if (item.href) {
        window.open(item.href, '_blank', 'noopener,noreferrer')
        setMobileSheetOpen(false)
        return
      }
      if (item.to) guardedNavigate(item.to)
      setMobileSheetOpen(false)
    },
    [guardedNavigate],
  )

  const handleMobileLogout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logoutRequest()
    } catch (err) {
      console.error('Failed to log out', err)
    } finally {
      setMobileSheetOpen(false)
      dispatch({ type: 'set', authStatus: 'anonymous', authUser: null, authError: null })
      navigate('/login', { replace: true })
      setIsLoggingOut(false)
    }
  }, [dispatch, isLoggingOut, navigate])

  const openNotifDrawer = useCallback((e) => {
    e.preventDefault()
    setNotifDrawerOpen(true)
  }, [])

  const handleQuickRoleSwitch = useCallback(
    (roleName) => {
      const next = String(roleName || '').trim()
      if (!next || !authUser || next === quickRole) return
      const source =
        switcherSource &&
        Array.isArray(switcherSource.roles) &&
        Array.isArray(switcherSource.permissions)
          ? switcherSource
          : {
              roles: Array.isArray(authUser?.roles) ? authUser.roles : [],
              permissions: Array.isArray(authUser?.permissions) ? authUser.permissions : [],
            }
      const sourcePrimaryRole =
        getPrimaryRoleLabel({ roles: source.roles }) || source.roles[0] || ''

      if (next === sourcePrimaryRole) {
        const { switcher_source: _dropSwitcherSource, ...restUser } = authUser
        dispatch({
          type: 'set',
          authUser: {
            ...restUser,
            roles: source.roles,
            permissions: source.permissions,
          },
        })
        return
      }

      const nextPermissions = Array.isArray(rolePermissionsByRole?.[next])
        ? rolePermissionsByRole[next]
        : []
      dispatch({
        type: 'set',
        authUser: {
          ...authUser,
          roles: [next],
          permissions: nextPermissions,
          switcher_source: source,
        },
      })
    },
    [authUser, dispatch, quickRole, rolePermissionsByRole, switcherSource],
  )

  const navItems = (
    <>
      {onDuty && (
        <CNavItem className="d-none d-sm-flex align-items-center">
          <NavLink to="/roster/overview" className="text-decoration-none">
            <span
              className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-semibold"
              style={{
                fontSize: '0.7rem',
                background: onDuty.shift === 'day' ? '#fef9c3' : '#1e293b',
                color: onDuty.shift === 'day' ? '#854d0e' : '#e2e8f0',
                border: onDuty.shift === 'day' ? '1px solid #fde047' : '1px solid #334155',
                lineHeight: 1.4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: onDuty.shift === 'day' ? '#ca8a04' : '#94a3b8',
                  flexShrink: 0,
                }}
              />
              {onDuty.team} - {onDuty.shift === 'day' ? 'Day' : 'Night'}
            </span>
          </NavLink>
        </CNavItem>
      )}

      <CNavItem>
        <CNavLink
          as="button"
          type="button"
          className="px-2 position-relative border-0 bg-transparent"
          onClick={openNotifDrawer}
          aria-label="Notifications"
        >
          <Bell size={16} />
          {notifUnread > 0 && (
            <CBadge color="light" className="header-alert-badge">
              {notifUnread}
            </CBadge>
          )}
        </CNavLink>
      </CNavItem>

      <CNavItem>
        <CNavLink as={NavLink} to="/messages" className="px-2 position-relative">
          <MessageSquareText size={16} />
          {unreadCount > 0 && (
            <CBadge color="light" className="header-message-badge">
              {unreadCount}
            </CBadge>
          )}
        </CNavLink>
      </CNavItem>
    </>
  )

  return (
    <>
      {/* Desktop header */}
      <CHeader position="sticky" className="mb-2 p-0 d-none d-md-flex" ref={headerRef}>
        <CContainer className="border-bottom px-3 px-md-4" fluid>
          <CHeaderToggler
            onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
            style={{ marginInlineStart: '-14px' }}
          >
            <Menu size={16} />
          </CHeaderToggler>
          {canUseRoleSwitcher && roleOptions.length > 0 && (
            <CDropdown variant="btn-group" className="ms-2">
              <CDropdownToggle color="light" size="sm" className="text-truncate">
                Role switcher: {quickRole || 'Select'}
              </CDropdownToggle>
              <CDropdownMenu>
                {roleMatrixLoading && (
                  <CDropdownItem as="button" type="button" disabled>
                    <CSpinner size="sm" className="me-2" />
                    Loading roles...
                  </CDropdownItem>
                )}
                {roleOptions.map((role) => (
                  <CDropdownItem
                    key={role}
                    active={role === quickRole}
                    disabled={roleMatrixLoading}
                    onClick={() => handleQuickRoleSwitch(role)}
                  >
                    {role}
                  </CDropdownItem>
                ))}
              </CDropdownMenu>
            </CDropdown>
          )}
          <CHeaderNav className="ms-auto gap-2">{navItems}</CHeaderNav>
          <CHeaderNav>
            <li className="nav-item py-1">
              <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
            </li>
            <AppHeaderDropdown canOvertime={canOvertime} />
          </CHeaderNav>
        </CContainer>
      </CHeader>

      {/* Mobile bottom bar */}
      <nav className="app-bottom-nav d-flex d-md-none">
        <button
          ref={menuTriggerRef}
          className="app-bottom-nav-item"
          onClick={() => openMobileSheet('menu', menuTriggerRef)}
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={mobileSheetOpen && sheetMode === 'menu'}
        >
          <Menu size={20} />
          <span className="app-bottom-nav-label">Menu</span>
        </button>

        <button
          className="app-bottom-nav-item position-relative"
          onClick={openNotifDrawer}
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="app-bottom-nav-label">Alerts</span>
          {notifUnread > 0 && (
            <CBadge color="light" className="header-alert-badge">
              {notifUnread}
            </CBadge>
          )}
        </button>

        <NavLink to="/messages" className="app-bottom-nav-item position-relative">
          <MessageSquareText size={20} />
          <span className="app-bottom-nav-label">Messages</span>
          {unreadCount > 0 && (
            <CBadge color="light" className="header-message-badge">
              {unreadCount}
            </CBadge>
          )}
        </NavLink>

        <button
          ref={accountTriggerRef}
          type="button"
          className="app-bottom-nav-item app-bottom-nav-profile"
          onClick={() => openMobileSheet('account', accountTriggerRef)}
          aria-label="Open account menu"
          aria-haspopup="dialog"
          aria-expanded={mobileSheetOpen && sheetMode === 'account'}
        >
          <User size={20} />
          <span className="app-bottom-nav-label">Account</span>
        </button>
      </nav>

      <MobileNavSheet
        key={`${sheetMode}-${sheetSession}`}
        open={mobileSheetOpen}
        mode={sheetMode}
        onClose={closeMobileSheet}
        onNavigate={handleSheetNavigate}
        onLogout={handleMobileLogout}
        menuData={menuData}
        user={authUser}
        canClaim={canClaim}
        canLeave={canLeave}
        canOvertime={canOvertime}
        isLoggingOut={isLoggingOut}
        returnFocusRef={returnFocusRef}
      />

      <NotificationDrawer
        open={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        title="Notifications"
        count={notifUnread}
      >
        <ErrorBoundary>
          <WorkflowNotifications onClose={() => setNotifDrawerOpen(false)} />
        </ErrorBoundary>
      </NotificationDrawer>
    </>
  )
}

export default AppHeader
