import React, { Suspense, useCallback, useEffect, useRef } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { CButton, useColorModes } from '@coreui/react'
import './scss/style.scss'
import { NavigationGuardProvider } from './contexts/NavigationGuardContext'

import { fetchModuleActivation, fetchSession, SYSTEM_MAINTENANCE_EVENT } from './services/apiClient'
import { isSystemAdministrator } from './utils/authz'
import { normalizeModuleActivationPayload } from './utils/modules'
import { shouldShowMaintenancePage } from './utils/systemMaintenance'
import PageState from './components/PageState'
import AppUpdateBanner from './components/AppUpdateBanner'
import { getPendingCameraOperation } from './utils/cameraRecovery'
import useSystemMaintenanceMonitor from './hooks/useSystemMaintenanceMonitor'
import { normalizeSystemMaintenanceSetting } from './views/settings/systemMaintenanceStorage'
import {
  activatePayrollIdentity,
  clearPayrollSensitiveState,
  PAYROLL_SESSION_CLEARED_EVENT,
} from './services/payrollPrivacy'

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
const AUTH_BOOTSTRAP_TIMEOUT_MS = 12_000

const PUBLIC_AUTH_BOOTSTRAP_PATHS = new Set(['/login', '/forgot-password', '/reset-password'])

const isGoogleAuthSuccessCallback = (path, search) => {
  if (path !== '/login') return false
  return new URLSearchParams(search || '').get('status') === 'success'
}

const createLinkedAbortController = (signal) => {
  const controller = new AbortController()
  if (!signal) {
    return { controller, cleanup: () => {} }
  }

  const abort = () => controller.abort(signal.reason)
  if (signal.aborted) {
    abort()
    return { controller, cleanup: () => {} }
  }

  signal.addEventListener('abort', abort, { once: true })
  return {
    controller,
    cleanup: () => signal.removeEventListener('abort', abort),
  }
}

const withTimeout = (promise, timeoutMs, timeoutMessage, onTimeout) => {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      onTimeout?.()
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const dispatch = useDispatch()
  const storedTheme = useSelector((state) => state.theme)
  const authStatus = useSelector((state) => state.authStatus)
  const authUser = useSelector((state) => state.authUser)
  const authError = useSelector((state) => state.authError)
  const systemMaintenance = useSelector((state) => state.systemMaintenance)
  const systemMaintenanceHydrated = useSelector((state) => state.systemMaintenanceHydrated)
  const systemMaintenanceLoadError = useSelector((state) => state.systemMaintenanceLoadError)
  const systemMaintenanceRef = useRef(systemMaintenance)
  const sessionCheckInFlightRef = useRef(null)
  const sessionRetryTimersRef = useRef(new Set())

  useEffect(() => {
    systemMaintenanceRef.current = systemMaintenance
  }, [systemMaintenance])

  useEffect(() => {
    activatePayrollIdentity(authStatus === 'authenticated' ? authUser?.id : null)
  }, [authStatus, authUser?.id])

  useEffect(() => {
    const handleSensitiveSessionCleared = () => {
      dispatch({ type: 'set', authStatus: 'anonymous', authUser: null, authError: null })
    }
    window.addEventListener(PAYROLL_SESSION_CLEARED_EVENT, handleSensitiveSessionCleared)
    return () =>
      window.removeEventListener(PAYROLL_SESSION_CLEARED_EVENT, handleSensitiveSessionCleared)
  }, [dispatch])

  const loadSession = useCallback(
    ({ silent = false, isActive = () => true, signal = null, retryCount = 0 } = {}) => {
      if (sessionCheckInFlightRef.current) return sessionCheckInFlightRef.current

      let sessionPromise
      sessionPromise = (async () => {
        const { controller, cleanup: cleanupAbortLink } = createLinkedAbortController(signal)

        if (!silent && isActive()) {
          dispatch({ type: 'set', authStatus: 'checking', authError: null })
        }

        try {
          const session = await withTimeout(
            fetchSession({ signal: controller.signal }),
            AUTH_BOOTSTRAP_TIMEOUT_MS,
            'Session bootstrap timed out.',
            () => controller.abort(),
          )
          if (!isActive()) {
            return false
          }
          dispatch({
            type: 'set',
            authStatus: 'authenticated',
            authUser: session?.user || session,
            authError: null,
          })

          // Module activation data is not required to enter the app shell.
          // Load it separately so route bootstrap remains bounded and resilient
          // to transient module-service issues.
          void (async () => {
            try {
              const moduleActivationRaw = await fetchModuleActivation()
              if (!isActive()) return
              const moduleActivation = normalizeModuleActivationPayload(moduleActivationRaw)
              dispatch({
                type: 'set',
                ...(moduleActivation ? { moduleActivation } : {}),
              })
            } catch {
              // keep existing activation fallback behavior on failure
            }
          })()

          return true
        } catch (error) {
          const status = Number(error?.status || 0)
          const isTransient =
            !status || status >= 500 || String(error?.message || '').includes('timed out')
          const shouldRetryCameraSession =
            status === 401 && Boolean(getPendingCameraOperation()) && retryCount < 1
          if (isActive() && (status === 401 || !silent)) {
            if (shouldRetryCameraSession) {
              dispatch({ type: 'set', authStatus: 'checking', authError: null })
            } else {
              dispatch({
                type: 'set',
                authStatus: isTransient ? 'temporarily_unavailable' : 'anonymous',
                ...(isTransient ? {} : { authUser: null }),
                authError:
                  status === 401
                    ? null
                    : status >= 500 ||
                        String(error?.message || '').includes('Session bootstrap timed out.')
                      ? 'Unable to connect to server.'
                      : error?.message || 'Unable to initialize session.',
              })
            }
          }
          if ((isTransient || shouldRetryCameraSession) && retryCount < 1 && !signal?.aborted) {
            const retryTimer = setTimeout(() => {
              sessionRetryTimersRef.current.delete(retryTimer)
              if (signal?.aborted) return
              void loadSession({ silent, isActive, signal, retryCount: retryCount + 1 })
            }, 750)
            sessionRetryTimersRef.current.add(retryTimer)
          }
          return false
        } finally {
          cleanupAbortLink()
          if (sessionCheckInFlightRef.current === sessionPromise) {
            sessionCheckInFlightRef.current = null
          }
        }
      })()

      sessionCheckInFlightRef.current = sessionPromise
      return sessionPromise
    },
    [dispatch],
  )

  useEffect(
    () => () => {
      sessionRetryTimersRef.current.forEach((timer) => clearTimeout(timer))
      sessionRetryTimersRef.current.clear()
    },
    [],
  )

  const applySystemMaintenance = useCallback(
    (nextValue) => {
      const normalized = normalizeSystemMaintenanceSetting(nextValue)
      const current = systemMaintenanceRef.current || {}
      const currentVersion = Date.parse(String(current?.updatedAt || ''))
      const nextVersion = Date.parse(String(normalized?.updatedAt || ''))
      if (
        Number.isFinite(currentVersion) &&
        (!Number.isFinite(nextVersion) || nextVersion < currentVersion)
      ) {
        return
      }
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

  const handleSystemMaintenanceResult = useCallback(
    (result) => {
      const nextError = result?.ok
        ? null
        : result?.error?.message || 'Unable to load maintenance setting.'
      if (systemMaintenanceHydrated && systemMaintenanceLoadError === nextError) return
      dispatch({
        type: 'set',
        systemMaintenanceHydrated: true,
        systemMaintenanceLoadError: nextError,
      })
    },
    [dispatch, systemMaintenanceHydrated, systemMaintenanceLoadError],
  )

  useSystemMaintenanceMonitor({
    enabled: authStatus === 'authenticated',
    setting: systemMaintenance,
    onUpdate: applySystemMaintenance,
    onResult: handleSystemMaintenanceResult,
  })

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
    const controller = new AbortController()
    const currentPath = window.location?.pathname || '/'
    const currentSearch = window.location?.search || ''
    const hasPendingCameraOperation = Boolean(getPendingCameraOperation())

    if (
      PUBLIC_AUTH_BOOTSTRAP_PATHS.has(currentPath) &&
      !isGoogleAuthSuccessCallback(currentPath, currentSearch) &&
      !hasPendingCameraOperation
    ) {
      dispatch({ type: 'set', authStatus: 'anonymous', authUser: null, authError: null })
      return () => {
        isMounted = false
        controller.abort()
      }
    }

    void loadSession({ isActive: () => isMounted, signal: controller.signal })
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [dispatch, loadSession])

  useEffect(() => {
    if (authStatus !== 'anonymous') return undefined
    const controllers = new Set()

    const recheckSession = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') {
        return
      }
      const controller = new AbortController()
      controllers.add(controller)
      void loadSession({ silent: true, signal: controller.signal }).finally(() => {
        controllers.delete(controller)
      })
    }

    window.addEventListener('focus', recheckSession)
    window.addEventListener('pageshow', recheckSession)
    document.addEventListener('visibilitychange', recheckSession)

    return () => {
      window.removeEventListener('focus', recheckSession)
      window.removeEventListener('pageshow', recheckSession)
      document.removeEventListener('visibilitychange', recheckSession)
      controllers.forEach((controller) => controller.abort())
      controllers.clear()
    }
  }, [authStatus, loadSession])

  useEffect(() => {
    if (authStatus !== 'authenticated') return undefined
    const controllers = new Set()

    const revalidateAuthenticatedSession = (event) => {
      if (event?.type === 'pageshow' && event?.persisted) {
        clearPayrollSensitiveState({ broadcast: false })
        dispatch({ type: 'set', authStatus: 'checking', authUser: null, authError: null })
        void (async () => {
          const restored = await loadSession({ silent: false })
          if (!restored) {
            await loadSession({ silent: false })
          }
        })()
        return
      } else if (document.visibilityState && document.visibilityState !== 'visible') {
        return
      }

      const controller = new AbortController()
      controllers.add(controller)
      void loadSession({
        silent: event?.type !== 'pageshow' || event?.persisted !== true,
        signal: controller.signal,
      }).finally(() => controllers.delete(controller))
    }

    window.addEventListener('focus', revalidateAuthenticatedSession)
    window.addEventListener('pageshow', revalidateAuthenticatedSession)
    document.addEventListener('visibilitychange', revalidateAuthenticatedSession)

    return () => {
      window.removeEventListener('focus', revalidateAuthenticatedSession)
      window.removeEventListener('pageshow', revalidateAuthenticatedSession)
      document.removeEventListener('visibilitychange', revalidateAuthenticatedSession)
      controllers.forEach((controller) => controller.abort())
      controllers.clear()
    }
  }, [authStatus, dispatch, loadSession])

  useEffect(() => {
    const handleMaintenanceEvent = (event) => {
      const payload = event?.detail
      const current = systemMaintenanceRef.current || {}
      const maintenanceData = normalizeSystemMaintenanceSetting(payload?.data || payload, {
        ...current,
        enabled: true,
        message:
          payload?.message ||
          current?.message ||
          'System is under maintenance. Please try again later.',
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

  const retrySessionBootstrap = useCallback(() => {
    void loadSession()
  }, [loadSession])

  const renderLoadingState = () => <PageState message="Loading application…" minHeight="100dvh" />

  const renderSessionUnavailableState = () => (
    <PageState
      variant="error"
      title="Unable to restore session"
      message={authError || 'Unable to connect to server.'}
      minHeight="100dvh"
      action={
        <CButton type="button" color="danger" variant="outline" onClick={retrySessionBootstrap}>
          Retry session check
        </CButton>
      }
    />
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
    if (authStatus === 'temporarily_unavailable') {
      return renderSessionUnavailableState()
    }
    if (authStatus === 'checking' || authStatus === 'unknown') {
      return (
        <PageState
          message={
            getPendingCameraOperation()
              ? 'Restoring camera session and saved form...'
              : 'Restoring session...'
          }
          minHeight="100dvh"
        />
      )
    }
    return <Navigate to="/login" replace />
  }

  const renderPublicRoute = (element) => {
    if (authStatus === 'authenticated') {
      const pendingCameraOperation = getPendingCameraOperation()
      const pendingRoute = String(pendingCameraOperation?.route || '').trim()

      return <Navigate to={pendingRoute.startsWith('/') ? pendingRoute : '/'} replace />
    }
    if (authStatus === 'temporarily_unavailable') return renderSessionUnavailableState()
    if (authStatus === 'checking' || authStatus === 'unknown') return renderLoadingState()
    return element
  }

  return (
    <BrowserRouter>
      <NavigationGuardProvider>
        <AppUpdateBanner />
        <Suspense fallback={<PageState message="Loading application…" minHeight="100dvh" />}>
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
            <Route
              path="*"
              name="Home"
              element={renderPrivateRoute(
                <DefaultLayout key={`authenticated-user-${String(authUser?.id || '')}`} />,
              )}
            />
          </Routes>
        </Suspense>
      </NavigationGuardProvider>
    </BrowserRouter>
  )
}

export default App
