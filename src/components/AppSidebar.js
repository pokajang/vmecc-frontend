import React, { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { CCloseButton, CSidebar, CSidebarBrand, CSidebarHeader } from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'

import logoHorizontalSvg from 'src/assets/brand/logo-horizontal.svg'
import logoSvg from 'src/assets/brand/logo.svg'
import useMessageUnreadCount from 'src/hooks/useMessageUnreadCount'
import useOvertimeEligibility from 'src/hooks/useOvertimeEligibility'
import { getVisibleNavigationWithOptions } from 'src/utils/navigation'
import { hasPermission, isSystemAdministrator } from 'src/utils/authz'

// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const authUser = useSelector((state) => state.authUser)
  const unreadCount = useMessageUnreadCount()
  const isSysAdmin = isSystemAdministrator(authUser)
  const shouldResolveOvertimeEligibility =
    hasPermission(authUser, 'self.overtime') || hasPermission(authUser, 'self.payroll')
  const { eligible: overtimeEligible, isResolved: overtimeEligibilityResolved } =
    useOvertimeEligibility({ enabled: shouldResolveOvertimeEligibility })
  const overtimeEligibleForMenu = shouldResolveOvertimeEligibility
    ? isSysAdmin
      ? true
      : overtimeEligibilityResolved && overtimeEligible
    : null

  const navigationWithBadge = useMemo(
    () =>
      getVisibleNavigationWithOptions(navigation, authUser, unreadCount, {
        overtimeEligible: overtimeEligibleForMenu,
      }),
    [authUser, overtimeEligibleForMenu, unreadCount],
  )

  return (
    <CSidebar
      className="border-end sidebar-main"
      colorScheme="light"
      position="fixed"
      unfoldable={false}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom sidebar-brand-header">
        <CSidebarBrand to="/">
          <img
            className="sidebar-brand-full"
            src={logoHorizontalSvg}
            alt="VMECC"
            style={{ height: '50%', width: 'auto', maxWidth: 160, objectFit: 'contain' }}
          />
          <img
            className="sidebar-brand-narrow"
            src={logoSvg}
            alt="VMECC"
            style={{ height: '50%', width: 'auto', maxWidth: 40, objectFit: 'contain' }}
          />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={navigationWithBadge} />
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
