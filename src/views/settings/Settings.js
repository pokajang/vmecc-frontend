import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CContainer,
  CFormSwitch,
  CNav,
  CNavItem,
  CNavLink,
} from '@coreui/react'
import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Navigate, useMatch } from 'react-router-dom'
import ButtonLoader from 'src/components/ButtonLoader'
import TableLoader from 'src/components/TableLoader'
import { hasPermission } from 'src/utils/authz'
import {
  DEFAULT_SYSTEM_MAINTENANCE,
  loadSystemMaintenanceSetting,
  saveSystemMaintenance,
} from 'src/views/settings/systemMaintenanceStorage'

const RolePermissionMatrix = React.lazy(() => import('./RolePermissionMatrix'))
const DashboardVisibilityMatrix = React.lazy(() => import('./DashboardVisibilityMatrix'))

const TAB_GENERAL = 'general'
const TAB_ROLES = 'role-permissions'
const TAB_DASHBOARD = 'dashboard-visibility'

const toRemainingMs = (iso) => {
  const ts = Date.parse(String(iso || ''))
  if (!Number.isFinite(ts)) return 0
  return Math.max(0, ts - Date.now())
}

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const Settings = () => {
  const authUser = useSelector((state) => state.authUser)
  const canManage = useMemo(() => hasPermission(authUser, 'settings.manage'), [authUser])
  const dispatch = useDispatch()

  const isRolesRoute = Boolean(useMatch({ path: '/settings/role-permissions', end: true }))
  const isDashboardVisibilityRoute = Boolean(
    useMatch({ path: '/settings/dashboard-visibility', end: true }),
  )
  const activeTab = isRolesRoute
    ? TAB_ROLES
    : isDashboardVisibilityRoute
      ? TAB_DASHBOARD
      : TAB_GENERAL

  const [maintenanceSetting, setMaintenanceSetting] = useState({ ...DEFAULT_SYSTEM_MAINTENANCE })
  const [maintenanceLoading, setMaintenanceLoading] = useState(true)
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)
  const [maintenanceError, setMaintenanceError] = useState(null)
  const [, forceCountdownTick] = useState(0)

  const maintenanceEnabled = Boolean(maintenanceSetting?.enabled)
  const maintenancePhase = String(maintenanceSetting?.phase || 'off')
  const isGracePhase = maintenanceEnabled && maintenancePhase === 'grace'
  const remainingMs = toRemainingMs(maintenanceSetting?.graceEndsAt)

  useEffect(() => {
    if (!isGracePhase) return undefined
    const timer = window.setInterval(() => forceCountdownTick((v) => v + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isGracePhase])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setMaintenanceLoading(true)
      setMaintenanceError(null)
      const result = await loadSystemMaintenanceSetting()
      if (!isMounted) return
      setMaintenanceSetting(result?.data || { ...DEFAULT_SYSTEM_MAINTENANCE })
      if (!result?.ok) {
        setMaintenanceError(result?.error?.message || 'Unable to load maintenance setting.')
      }
      setMaintenanceLoading(false)
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const handleMaintenanceToggle = useCallback(
    async (nextEnabled) => {
      const previousSetting = maintenanceSetting
      setMaintenanceSaving(true)
      setMaintenanceError(null)

      const optimistic = {
        ...maintenanceSetting,
        enabled: nextEnabled,
        updatedAt: new Date().toISOString(),
        phase: nextEnabled ? 'grace' : 'off',
        graceEndsAt: nextEnabled ? maintenanceSetting?.graceEndsAt || null : null,
      }
      setMaintenanceSetting(optimistic)

      const result = await saveSystemMaintenance({
        enabled: nextEnabled,
        message: maintenanceSetting?.message || DEFAULT_SYSTEM_MAINTENANCE.message,
        phase: nextEnabled ? undefined : 'off',
      })

      if (result?.ok) {
        const nextSetting = result?.data || optimistic
        setMaintenanceSetting(nextSetting)
        dispatch({ type: 'set', systemMaintenance: nextSetting })
      } else {
        setMaintenanceSetting(previousSetting)
        setMaintenanceError(result?.error?.message || 'Unable to save maintenance setting.')
      }

      setMaintenanceSaving(false)
    },
    [dispatch, maintenanceSetting],
  )

  const handleEnforceNow = useCallback(async () => {
    if (!maintenanceEnabled || maintenancePhase !== 'grace') return
    const previousSetting = maintenanceSetting
    setMaintenanceSaving(true)
    setMaintenanceError(null)

    const optimistic = {
      ...maintenanceSetting,
      phase: 'enforced',
      graceEndsAt: null,
      updatedAt: new Date().toISOString(),
    }
    setMaintenanceSetting(optimistic)

    const result = await saveSystemMaintenance({
      enabled: true,
      message: maintenanceSetting?.message || DEFAULT_SYSTEM_MAINTENANCE.message,
      phase: 'enforced',
      graceEndsAt: null,
    })

    if (result?.ok) {
      const nextSetting = result?.data || optimistic
      setMaintenanceSetting(nextSetting)
      dispatch({ type: 'set', systemMaintenance: nextSetting })
    } else {
      setMaintenanceSetting(previousSetting)
      setMaintenanceError(result?.error?.message || 'Unable to enforce maintenance lock.')
    }

    setMaintenanceSaving(false)
  }, [dispatch, maintenanceEnabled, maintenancePhase, maintenanceSetting])

  if (!canManage) {
    return <Navigate to="/403" replace />
  }

  return (
    <CContainer fluid>
      <CNav variant="underline" role="tablist" className="mb-3">
        <CNavItem role="presentation">
          <CNavLink
            as={NavLink}
            to="/settings"
            end
            active={activeTab === TAB_GENERAL}
            className={activeTab === TAB_GENERAL ? 'text-primary' : ''}
          >
            General
          </CNavLink>
        </CNavItem>
        <CNavItem role="presentation">
          <CNavLink
            as={NavLink}
            to="/settings/role-permissions"
            active={activeTab === TAB_ROLES}
            className={activeTab === TAB_ROLES ? 'text-primary' : ''}
          >
            Role Permissions
          </CNavLink>
        </CNavItem>
        <CNavItem role="presentation">
          <CNavLink
            as={NavLink}
            to="/settings/dashboard-visibility"
            active={activeTab === TAB_DASHBOARD}
            className={activeTab === TAB_DASHBOARD ? 'text-primary' : ''}
          >
            Dashboard Visibility
          </CNavLink>
        </CNavItem>
      </CNav>

      {activeTab === TAB_GENERAL && (
        <>
          <CCard className="mb-3">
            <CCardBody>
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <div className="fw-semibold">System Maintenance Mode</div>
                  <div className="small text-muted">
                    When enabled, users enter grace period first, then maintenance lock is enforced.
                  </div>
                </div>
                <div className="d-flex align-items-start gap-2 flex-wrap justify-content-end">
                  {maintenanceLoading ? (
                    <ButtonLoader label="Loading..." size={14} />
                  ) : (
                    <>
                      <CFormSwitch
                        id="system-maintenance-switch"
                        size="lg"
                        checked={maintenanceEnabled}
                        disabled={maintenanceSaving}
                        onChange={(e) => handleMaintenanceToggle(e.target.checked)}
                        label={maintenanceEnabled ? 'ON' : 'OFF'}
                      />
                      {maintenanceEnabled && maintenancePhase === 'grace' && (
                        <CButton
                          size="sm"
                          color="warning"
                          variant="outline"
                          disabled={maintenanceSaving}
                          onClick={handleEnforceNow}
                        >
                          {maintenanceSaving ? <ButtonLoader size={13} /> : 'Enforce now'}
                        </CButton>
                      )}
                    </>
                  )}
                </div>
              </div>
              {maintenanceEnabled && (
                <div className="small text-muted mt-2">
                  Status:{' '}
                  {maintenancePhase === 'grace'
                    ? `Grace period active (${formatCountdown(remainingMs)} remaining)`
                    : maintenancePhase === 'enforced'
                      ? 'Enforced lock active'
                      : 'Enabled'}
                </div>
              )}
              {maintenanceSaving && (
                <div className="small text-muted mt-2">
                  <ButtonLoader label="Applying maintenance setting..." size={13} />
                </div>
              )}
              {maintenanceError && (
                <CAlert color="warning" className="mt-2 mb-0 py-2">
                  {maintenanceError}
                </CAlert>
              )}
            </CCardBody>
          </CCard>
        </>
      )}

      {activeTab === TAB_ROLES && (
        <Suspense
          fallback={
            <div className="py-5" aria-label="Loading role permissions">
              <TableLoader />
            </div>
          }
        >
          <RolePermissionMatrix />
        </Suspense>
      )}

      {activeTab === TAB_DASHBOARD && (
        <Suspense
          fallback={
            <div className="py-5" aria-label="Loading dashboard visibility">
              <TableLoader />
            </div>
          }
        >
          <DashboardVisibilityMatrix />
        </Suspense>
      )}
    </CContainer>
  )
}

export default Settings
