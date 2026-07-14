import React, { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { CCloseButton, CSidebar, CSidebarBrand, CSidebarHeader } from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'

import logoSvg from 'src/assets/brand/logo.svg'
import useMessageUnreadCount from 'src/hooks/useMessageUnreadCount'
import usePwaInstallPrompt from 'src/hooks/usePwaInstallPrompt'
import { getVisibleNavigationWithOptions } from 'src/utils/navigation'
import { canLoadMessageThreads } from 'src/utils/messageAccess'
import { PWA_INSTALL_ACTION } from 'src/constants/pwa'

// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const aiHelperOpen = useSelector((state) => state.aiHelperOpen)
  const authUser = useSelector((state) => state.authUser)
  const moduleActivation = useSelector((state) => state.moduleActivation)
  const canLoadMessages = canLoadMessageThreads(authUser, moduleActivation)
  const unreadCount = useMessageUnreadCount({ enabled: canLoadMessages })
  const { showNavInstallItem, openInstallExperience } = usePwaInstallPrompt()

  const navigationWithBadge = useMemo(
    () =>
      getVisibleNavigationWithOptions(navigation, authUser, unreadCount, {
        moduleActivation,
        showNavInstallItem,
      }),
    [authUser, moduleActivation, showNavInstallItem, unreadCount],
  )

  const handleNavigationAction = useMemo(
    () => ({
      [PWA_INSTALL_ACTION]: () => {
        void openInstallExperience()
      },
    }),
    [openInstallExperience],
  )

  return (
    <CSidebar
      className="border-end sidebar-main"
      colorScheme="light"
      position="fixed"
      unfoldable={false}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({
          type: 'set',
          sidebarShow: visible,
          ...(visible && aiHelperOpen ? { aiHelperOpen: false } : {}),
        })
      }}
    >
      <CSidebarHeader className="border-bottom sidebar-brand-header">
        <CSidebarBrand to="/">
          <img className="sidebar-brand-full sidebar-brand-mark" src={logoSvg} alt="VMECC" />
          <img className="sidebar-brand-narrow sidebar-brand-mark" src={logoSvg} alt="VMECC" />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav
        items={navigationWithBadge}
        onAction={(action) => {
          handleNavigationAction[action]?.()
        }}
      />
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
