import React, { Suspense, useCallback, useEffect, useRef } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { CSpinner, useColorModes } from '@coreui/react'
import './scss/style.scss'
import { NavigationGuardProvider } from './contexts/NavigationGuardContext'

import { fetchSession, SYSTEM_MAINTENANCE_EVENT } from './services/apiClient'
import { isSystemAdministrator } from './utils/authz'
import { shouldShowMaintenancePage } from './utils/systemMaintenance'
import {
  loadSystemMaintenanceSetting,
  normalizeSystemMaintenanceSetting,
} from './views/settings/systemMaintenanceStorage'

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// Pages
const Login = React.lazy(() => import('./views/pages/login/Login'))
const ForgotPassword = React.lazy(() => import('./views/pages/forgot-password/ForgotPassword'))
const ResetPassword = React.lazy(() => import('./views/pages/reset-password/ResetPassword'))
const Page403 = React.lazy(() => import('./views/pages/page403/Page403'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))
const Maintenance = React.lazy(() => import('./views/pages/maintenance/Maintenance'))
const MAINTENANCE_POLL_INTERVAL_AUTHENTICATED_MS = 10000
const MAINTENANCE_POLL_INTERVAL_PUBLIC_MS = 30000

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const dispatch = useDispatch()
  const storedTheme = useSelector((state) => state.theme)
  const authStatus = useSelector((state) => state.authStatus)
  const authUser = useSelector((state) => state.authUser)
  const systemMaintenance = useSelector((state) => state.systemMaintenance)
  const systemMaintenanceRef = useRef(systemMaintenance)

  useEffect(() => {
    systemMaintenanceRef.current = systemMaintenance
  }, [systemMaintenance])

  const applySystemMaintenance = useCallback(
    (nextValue) => {
      const normalized = normalizeSystemMaintenanceSetting(nextValue)
      const current = systemMaintenanceRef.current || {}
      const unchanged =
        Boolean(current?.enabled) === Boolean(normalized?.enabled) &&
        String(current?.phase || '') === String(normalized?.phase || '') &&
        String(current?.graceEndsAt || '') === String(normalized?.graceEndsAt || '') &&
        String(current?.message || '') === String(normalized?.message || '') &&
        String(current?.updatedAt || '') === String(normalized?.updatedAt || '') &&
        (current?.updatedByUserId ?? null) === (normalized?.updatedByUserId ?? null)

      if (unchanged) return

      systemMaintenanceRef.current = normalized
      dispatch({ type: 'set', systemMaintenance: normalized })
    },
    [dispatch],
  )

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    const theme = urlParams.get('theme') && urlParams.get('theme').match(/^[A-Za-z0-9\s]+/)[0]
    if (theme) {
      setColorMode(theme)
      return
    }

    setColorMode(storedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let isMounted = true
    const loadSession = async () => {
      dispatch({ type: 'set', authStatus: 'checking', authError: null })
      try {
        const session = await fetchSession()
        if (!isMounted) {
          return
        }
        dispatch({
          type: 'set',
          authStatus: 'authenticated',
          authUser: session?.user || session,
          authError: null,
        })
      } catch (error) {
        if (!isMounted) {
          return
        }
        dispatch({
          type: 'set',
          authStatus: 'anonymous',
          authUser: null,
          authError: error.status && error.status >= 500 ? 'Unable to connect to server' : null,
        })
      }
    }

    loadSession()
    return () => {
      isMounted = false
    }
  }, [dispatch])

  useEffect(() => {
    let isMounted = true
    let timer = null
    let inFlight = false

    const nextDelay = () =>
      authStatus === 'authenticated'
        ? MAINTENANCE_POLL_INTERVAL_AUTHENTICATED_MS
        : MAINTENANCE_POLL_INTERVAL_PUBLIC_MS

    const scheduleNext = () => {
      if (!isMounted) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        loadMaintenanceSetting()
      }, nextDelay())
    }

    const loadMaintenanceSetting = async () => {
      if (inFlight) return
      inFlight = true
      const result = await loadSystemMaintenanceSetting()
      if (!isMounted) return
      // Keep the last known state on transient fetch failures to prevent
      // maintenance page flicker that looks like app auto-refresh.
      if (result?.ok) {
        applySystemMaintenance(result.data)
      }
      inFlight = false
      scheduleNext()
    }
    loadMaintenanceSetting()
    return () => {
      isMounted = false
      if (timer) clearTimeout(timer)
    }
  }, [applySystemMaintenance, authStatus])

  useEffect(() => {
    const handleMaintenanceEvent = (event) => {
      const payload = event?.detail
      const maintenanceData = normalizeSystemMaintenanceSetting(payload?.data || payload, {
        enabled: true,
        message: payload?.message || 'System is under maintenance. Please try again later.',
        updatedAt: '',
        updatedByUserId: null,
      })
      applySystemMaintenance(maintenanceData)
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener(SYSTEM_MAINTENANCE_EVENT, handleMaintenanceEvent)
    }

    return () => {
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener(SYSTEM_MAINTENANCE_EVENT, handleMaintenanceEvent)
      }
    }
  }, [applySystemMaintenance])

  const renderLoadingState = () => (
    <div className="pt-5 text-center">
      <CSpinner color="primary" variant="grow" />
    </div>
  )

  const renderPrivateRoute = (element) => {
    if (authStatus === 'authenticated') {
      if (
        shouldShowMaintenancePage({
          setting: systemMaintenance,
          authUser,
          isSystemAdministratorFn: isSystemAdministrator,
        })
      ) {
        return <Maintenance />
      }
      return element
    }
    if (authStatus === 'checking' || authStatus === 'unknown') {
      return renderLoadingState()
    }
    return <Navigate to="/login" replace />
  }

  const renderPublicRoute = (element) => {
    if (authStatus === 'authenticated') {
      return <Navigate to="/" replace />
    }
    if (authStatus === 'checking' || authStatus === 'unknown') {
      return renderLoadingState()
    }
    return element
  }

  return (
    <BrowserRouter>
      <NavigationGuardProvider>
        <Suspense
          fallback={
            <div className="pt-3 text-center">
              <CSpinner color="primary" variant="grow" />
            </div>
          }
        >
          <Routes>
            <Route exact path="/login" name="Login Page" element={renderPublicRoute(<Login />)} />
            <Route exact path="/register" element={<Navigate to="/login" replace />} />
            <Route
              exact
              path="/forgot-password"
              name="Forgot Password"
              element={renderPublicRoute(<ForgotPassword />)}
            />
            <Route
              exact
              path="/reset-password"
              name="Reset Password"
              element={renderPublicRoute(<ResetPassword />)}
            />
            <Route exact path="/403" name="Page 403" element={<Page403 />} />
            <Route exact path="/404" name="Page 404" element={<Page404 />} />
            <Route exact path="/500" name="Page 500" element={<Page500 />} />
            <Route path="*" name="Home" element={renderPrivateRoute(<DefaultLayout />)} />
          </Routes>
        </Suspense>
      </NavigationGuardProvider>
    </BrowserRouter>
  )
}

export default App
