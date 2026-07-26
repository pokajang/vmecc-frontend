import React, { useCallback, useEffect, useRef } from 'react'
import { CAlert, CButton } from '@coreui/react'
import { RefreshCw } from 'lucide-react'

import { useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import useAppUpdateAvailable from 'src/hooks/useAppUpdateAvailable'

const defaultReloadPage = () => window.location.reload()
const defaultAutoApplyEnabled = import.meta.env.VITE_PWA_AUTO_UPDATE !== 'false'
export const APP_UPDATE_AUTO_APPLY_DELAY_MS = 250

const AppUpdateBanner = ({
  useUpdateState = useAppUpdateAvailable,
  reloadPage = defaultReloadPage,
  autoApply = defaultAutoApplyEnabled,
}) => {
  const { isBlocked, requestNavigation } = useNavigationGuard()
  const {
    updateAvailable,
    dismissUpdate,
    applyUpdate,
    status = updateAvailable ? 'discovered' : 'current',
    error = '',
  } = useUpdateState()
  const reloadStartedRef = useRef(false)

  const runUpdate = useCallback(async () => {
    if (reloadStartedRef.current) return
    reloadStartedRef.current = true
    const applied = typeof applyUpdate === 'function' ? await applyUpdate() : true
    if (!applied) {
      reloadStartedRef.current = false
      return
    }
    reloadPage()
  }, [applyUpdate, reloadPage])

  const handleRefresh = useCallback(() => {
    requestNavigation(() => void runUpdate(), {
      allowUnload: true,
      title: 'Update VMECC and discard unsaved changes?',
      confirmLabel: 'Discard and update',
    })
  }, [requestNavigation, runUpdate])

  useEffect(() => {
    if (
      status !== 'ready' ||
      !autoApply ||
      isBlocked ||
      (document.visibilityState && document.visibilityState !== 'visible')
    ) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      if (!document.visibilityState || document.visibilityState === 'visible') {
        void runUpdate()
      }
    }, APP_UPDATE_AUTO_APPLY_DELAY_MS)
    return () => window.clearTimeout(timeoutId)
  }, [autoApply, isBlocked, runUpdate, status])

  if (!updateAvailable) return null
  const isBusy = status === 'preparing' || status === 'activating'

  return (
    <CAlert color="info" className="app-update-banner rounded-0 mb-0 border-start-0 border-end-0">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span className="small fw-semibold">
          {status === 'failed'
            ? error || 'The update could not be prepared. Retry when you are online.'
            : 'A new version is available. Finish your current task, then update.'}
        </span>
        <span className="d-flex align-items-center gap-2">
          <CButton
            color="info"
            variant="outline"
            size="sm"
            className="d-inline-flex align-items-center gap-1"
            onClick={handleRefresh}
            disabled={isBusy}
          >
            <RefreshCw size={14} aria-hidden="true" />
            {status === 'preparing'
              ? 'Preparing…'
              : status === 'activating'
                ? 'Updating…'
                : status === 'failed'
                  ? 'Retry'
                  : 'Update'}
          </CButton>
          <CButton color="light" size="sm" onClick={dismissUpdate} disabled={isBusy}>
            Later
          </CButton>
        </span>
      </div>
    </CAlert>
  )
}

export default AppUpdateBanner
