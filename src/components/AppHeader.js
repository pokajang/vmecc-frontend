import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CBadge,
  CNavLink,
  CNavItem,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
  CTooltip,
} from '@coreui/react'
import { Bell, Flag, MessageSquareText, Menu, Sparkles, User } from 'lucide-react'

import { AppHeaderDropdown } from './header/index'
import FeedbackReportModal from './header/FeedbackReportModal'
import MobileNavSheet from './header/MobileNavSheet'
import NotificationDrawer from './NotificationDrawer'
import WorkflowNotifications from 'src/views/notifications/workflow/WorkflowNotifications'
import ErrorBoundary from './ErrorBoundary'
import useWorkflowNotificationCounts from 'src/hooks/useWorkflowNotificationCounts'
import useMessageUnreadCount from 'src/hooks/useMessageUnreadCount'
import useOnDutyTeam from 'src/hooks/useOnDutyTeam'
import useMediaQuery from 'src/hooks/useMediaQuery'
import usePwaInstallPrompt from 'src/hooks/usePwaInstallPrompt'
import { createFeedbackReport, logoutRequest } from 'src/services/apiClient'
import { getVisibleNavigationWithOptions } from 'src/utils/navigation'
import { hasAnyPermission, hasPermission, isSystemAdministrator } from 'src/utils/authz'
import { isModuleEnabled } from 'src/utils/modules'
import { canLoadMessageThreads } from 'src/utils/messageAccess'
import navigation from 'src/_nav'
import { useGuardedNavigate } from 'src/contexts/NavigationGuardContext'
import useHeaderVisibilityOptions from 'src/hooks/useHeaderVisibilityOptions'
import { PWA_INSTALL_ACTION } from 'src/constants/pwa'

const HEADER_TOOLTIP_TRIGGER = ['hover']

const AppHeader = () => {
  const headerRef = useRef()
  const toaster = useRef()
  const menuTriggerRef = useRef(null)
  const accountTriggerRef = useRef(null)
  const returnFocusRef = useRef(null)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const guardedNavigate = useGuardedNavigate()
  const location = useLocation()

  const sidebarShow = useSelector((state) => state.sidebarShow)
  const aiHelperOpen = useSelector((state) => state.aiHelperOpen)
  const authUser = useSelector((state) => state.authUser)
  const moduleActivation = useSelector((state) => state.moduleActivation)
  const payrollEnabled = isModuleEnabled(moduleActivation, 'payroll.self_service')
  const overtimeEnabled = isModuleEnabled(moduleActivation, 'overtime.self_service')
  const rosterEnabled = isModuleEnabled(moduleActivation, 'roster')
  const canReadRosterStatus = hasAnyPermission(authUser, ['rosters.manage', 'teams.view'])
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { showNavInstallItem, openInstallExperience } = usePwaInstallPrompt()

  const canLoadMessages = canLoadMessageThreads(authUser, moduleActivation)
  const unreadCount = useMessageUnreadCount({ enabled: canLoadMessages })
  const onDuty = useOnDutyTeam({ enabled: rosterEnabled && canReadRosterStatus })
  const notifUnread = useWorkflowNotificationCounts()

  const [mobileOverlay, setMobileOverlay] = useState(null)
  const [sheetMode, setSheetMode] = useState('menu')
  const [sheetSession, setSheetSession] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [toast, addToast] = useState(null)
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  const canClaim = payrollEnabled && hasPermission(authUser, 'self.payroll')
  const canLeave = hasPermission(authUser, 'self.leave')
  const canOvertimePermission = hasPermission(authUser, 'self.overtime')
  const isSysAdmin = isSystemAdministrator(authUser)
  const headerVisibilityOptions = useHeaderVisibilityOptions()
  const canOvertime = isSysAdmin
    ? overtimeEnabled && canOvertimePermission
    : overtimeEnabled &&
      canOvertimePermission &&
      headerVisibilityOptions.overtimeEligibilityResolved &&
      headerVisibilityOptions.overtimeEligible

  const menuData = useMemo(
    () =>
      getVisibleNavigationWithOptions(navigation, authUser, unreadCount, {
        overtimeEligible: headerVisibilityOptions.overtimeEligible,
        moduleActivation: headerVisibilityOptions.moduleActivation,
        showNavInstallItem,
      }),
    [authUser, headerVisibilityOptions, showNavInstallItem, unreadCount],
  )
  useEffect(() => {
    const handleScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }
    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOverlay(null)
  }, [location.pathname])

  const openMobileSheet = useCallback((mode, triggerRef) => {
    returnFocusRef.current = triggerRef?.current || null
    setSheetMode(mode)
    setSheetSession((prev) => prev + 1)
    setMobileOverlay(mode)
  }, [])

  const closeMobileOverlay = useCallback(() => setMobileOverlay(null), [])

  const closeAiHelper = useCallback(() => {
    if (!aiHelperOpen) return
    dispatch({
      type: 'set',
      aiHelperOpen: false,
      ...(isDesktop ? { sidebarShow: true } : {}),
    })
  }, [aiHelperOpen, dispatch, isDesktop])

  const pushToast = useCallback((message, { title = '', color = 'light' } = {}) => {
    addToast(
      <CToast autohide delay={4000} color={color}>
        {title ? (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        ) : null}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  const handleSheetNavigate = useCallback(
    (item) => {
      if (!item) return
      closeAiHelper()
      if (item.action === PWA_INSTALL_ACTION) {
        void openInstallExperience()
        setMobileOverlay(null)
        return
      }
      if (item.href) {
        window.open(item.href, '_blank', 'noopener,noreferrer')
        setMobileOverlay(null)
        return
      }
      if (item.to) guardedNavigate(item.to)
      setMobileOverlay(null)
    },
    [closeAiHelper, guardedNavigate, openInstallExperience],
  )

  const handleMobileLogout = useCallback(async () => {
    if (isLoggingOut) return
    closeAiHelper()
    setIsLoggingOut(true)
    try {
      await logoutRequest()
    } catch (err) {
      console.error('Failed to log out', err)
    } finally {
      setMobileOverlay(null)
      dispatch({
        type: 'set',
        authStatus: 'anonymous',
        authUser: null,
        authError: null,
        moduleActivation: {
          hydrated: false,
          registry: [],
          configured: {},
          effective: {},
          forceAllEnabled: false,
          fallbackMode: true,
        },
      })
      navigate('/login', { replace: true })
      setIsLoggingOut(false)
    }
  }, [closeAiHelper, dispatch, isLoggingOut, navigate])

  const openNotifDrawer = useCallback((e) => {
    e.preventDefault()
    returnFocusRef.current = e.currentTarget || null
    setMobileOverlay('alerts')
  }, [])

  const openAiHelper = useCallback(() => {
    setMobileOverlay(null)
    dispatch({ type: 'set', aiHelperOpen: true, sidebarShow: false })
  }, [dispatch])

  const closeFeedbackReportModal = useCallback(() => {
    if (isSubmittingFeedback) return
    setFeedbackModalVisible(false)
    setFeedbackMessage('')
    setFeedbackError('')
  }, [isSubmittingFeedback])

  const openFeedbackReportModal = useCallback(
    (event) => {
      event?.preventDefault?.()
      returnFocusRef.current = event?.currentTarget || null
      event?.currentTarget?.blur?.()
      closeAiHelper()
      setMobileOverlay(null)
      setFeedbackError('')
      setFeedbackModalVisible(true)
    },
    [closeAiHelper],
  )

  const handleFeedbackSubmit = useCallback(async () => {
    const trimmedMessage = feedbackMessage.trim()
    if (trimmedMessage.length < 10) {
      setFeedbackError('Please describe the issue in at least 10 characters.')
      return
    }

    setIsSubmittingFeedback(true)
    setFeedbackError('')

    try {
      await createFeedbackReport({
        message: trimmedMessage,
        page_context: {
          path: location.pathname || '/',
          search: location.search || '',
          title: typeof document !== 'undefined' ? document.title || '' : '',
        },
      })
      setFeedbackModalVisible(false)
      setFeedbackMessage('')
      setFeedbackError('')
      pushToast('Your report has been submitted to system administrators.', {
        title: 'Report submitted',
        color: 'success',
      })
    } catch (err) {
      setFeedbackError(err?.payload?.message || err?.message || 'Unable to submit report.')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }, [feedbackMessage, location.pathname, location.search, pushToast])

  const navItems = (
    <>
      <CNavItem>
        <CTooltip content="Ask AI" placement="bottom" trigger={HEADER_TOOLTIP_TRIGGER}>
          <CNavLink
            as="button"
            type="button"
            className={`app-header-ask-ai px-2 border-0 bg-transparent d-inline-flex align-items-center gap-1 ${
              aiHelperOpen ? 'active' : ''
            }`}
            onClick={openAiHelper}
            aria-label="Ask AI"
            aria-pressed={aiHelperOpen}
          >
            <Sparkles size={16} />
            <span className="d-none d-lg-inline">Ask AI</span>
          </CNavLink>
        </CTooltip>
      </CNavItem>

      {onDuty && (
        <CNavItem className="d-none d-sm-flex align-items-center">
          <NavLink to="/roster/overview" className="text-decoration-none">
            <span
              className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-semibold"
              style={{
                fontSize: '0.78rem',
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
        <CTooltip content="Report issue" placement="bottom" trigger={HEADER_TOOLTIP_TRIGGER}>
          <CNavLink
            as="button"
            type="button"
            className="px-2 border-0 bg-transparent d-inline-flex align-items-center gap-1"
            onClick={openFeedbackReportModal}
            aria-label="Report issue"
          >
            <Flag size={16} />
            <span className="d-none d-lg-inline">Report issue</span>
          </CNavLink>
        </CTooltip>
      </CNavItem>

      <CNavItem>
        <CTooltip content="Notifications" placement="bottom" trigger={HEADER_TOOLTIP_TRIGGER}>
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
        </CTooltip>
      </CNavItem>

      {canLoadMessages && (
        <CNavItem>
          <CTooltip content="Messages" placement="bottom" trigger={HEADER_TOOLTIP_TRIGGER}>
            <CNavLink as={NavLink} to="/messages" className="px-2 position-relative">
              <MessageSquareText size={16} />
              {unreadCount > 0 && (
                <CBadge color="light" className="header-message-badge">
                  {unreadCount}
                </CBadge>
              )}
            </CNavLink>
          </CTooltip>
        </CNavItem>
      )}
    </>
  )

  return (
    <>
      {/* Desktop header */}
      <CHeader position="sticky" className="mb-2 p-0 d-none d-md-flex" ref={headerRef}>
        <CContainer className="border-bottom px-3 px-md-4" fluid>
          <CTooltip content="Toggle sidebar" placement="bottom" trigger={HEADER_TOOLTIP_TRIGGER}>
            <CHeaderToggler
              onClick={() =>
                dispatch(
                  aiHelperOpen
                    ? {
                        type: 'set',
                        aiHelperOpen: false,
                        ...(isDesktop ? { sidebarShow: true } : {}),
                      }
                    : { type: 'set', sidebarShow: !sidebarShow },
                )
              }
              aria-label="Toggle sidebar"
            >
              <Menu size={16} />
            </CHeaderToggler>
          </CTooltip>
          <CHeaderNav className="ms-auto gap-2">{navItems}</CHeaderNav>
          <CHeaderNav>
            <li className="nav-item py-1">
              <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
            </li>
            <AppHeaderDropdown canClaim={canClaim} canOvertime={canOvertime} />
          </CHeaderNav>
        </CContainer>
      </CHeader>

      {/* Mobile bottom bar */}
      <nav className="app-bottom-nav d-flex d-md-none">
        <button
          ref={menuTriggerRef}
          type="button"
          className="app-bottom-nav-item"
          onClick={() => openMobileSheet('menu', menuTriggerRef)}
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={mobileOverlay === 'menu'}
          data-active={mobileOverlay === 'menu'}
        >
          <Menu size={20} />
          <span className="app-bottom-nav-label">Menu</span>
        </button>

        <button
          type="button"
          className={`app-bottom-nav-item${aiHelperOpen ? ' active' : ''}`}
          onClick={openAiHelper}
          aria-label="Ask AI"
          aria-pressed={aiHelperOpen}
        >
          <Sparkles size={20} />
          <span className="app-bottom-nav-label">Ask AI</span>
        </button>

        <button
          type="button"
          className="app-bottom-nav-item position-relative"
          onClick={openNotifDrawer}
          aria-label="Notifications"
          aria-haspopup="dialog"
          aria-expanded={mobileOverlay === 'alerts'}
          data-active={mobileOverlay === 'alerts'}
        >
          <Bell size={20} />
          <span className="app-bottom-nav-label">Alerts</span>
          {notifUnread > 0 && (
            <CBadge color="light" className="header-alert-badge">
              {notifUnread}
            </CBadge>
          )}
        </button>

        <button
          ref={accountTriggerRef}
          type="button"
          className="app-bottom-nav-item app-bottom-nav-profile"
          onClick={() => openMobileSheet('account', accountTriggerRef)}
          aria-label="Open account menu"
          aria-haspopup="dialog"
          aria-expanded={mobileOverlay === 'account'}
          data-active={mobileOverlay === 'account'}
        >
          <User size={20} />
          <span className="app-bottom-nav-label">Account</span>
        </button>
      </nav>

      <MobileNavSheet
        key={`${sheetMode}-${sheetSession}`}
        open={mobileOverlay === 'menu' || mobileOverlay === 'account'}
        mode={sheetMode}
        onClose={closeMobileOverlay}
        onNavigate={handleSheetNavigate}
        onLogout={handleMobileLogout}
        menuData={menuData}
        user={authUser}
        canClaim={canClaim}
        canLeave={canLeave}
        canOvertime={canOvertime}
        isLoggingOut={isLoggingOut}
        onReportIssue={openFeedbackReportModal}
        returnFocusRef={returnFocusRef}
      />

      <NotificationDrawer
        open={mobileOverlay === 'alerts'}
        onClose={closeMobileOverlay}
        title="Notifications"
        count={notifUnread}
        returnFocusRef={returnFocusRef}
      >
        {mobileOverlay === 'alerts' ? (
          <ErrorBoundary>
            <WorkflowNotifications onClose={closeMobileOverlay} />
          </ErrorBoundary>
        ) : null}
      </NotificationDrawer>

      <FeedbackReportModal
        visible={feedbackModalVisible}
        message={feedbackMessage}
        error={feedbackError}
        submitting={isSubmittingFeedback}
        onClose={closeFeedbackReportModal}
        onMessageChange={setFeedbackMessage}
        onSubmit={handleFeedbackSubmit}
      />

      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />
    </>
  )
}

export default AppHeader
