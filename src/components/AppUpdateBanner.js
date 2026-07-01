import React, { useCallback } from 'react'
import { CAlert, CButton } from '@coreui/react'
import { RefreshCw } from 'lucide-react'

import { useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import useAppUpdateAvailable from 'src/hooks/useAppUpdateAvailable'

const defaultReloadPage = () => window.location.reload()

const AppUpdateBanner = ({
  useUpdateState = useAppUpdateAvailable,
  reloadPage = defaultReloadPage,
}) => {
  const { requestNavigation } = useNavigationGuard()
  const { updateAvailable, dismissUpdate } = useUpdateState()

  const handleRefresh = useCallback(() => {
    requestNavigation(() => reloadPage(), { allowUnload: true })
  }, [reloadPage, requestNavigation])

  if (!updateAvailable) return null

  return (
    <CAlert color="info" className="app-update-banner rounded-0 mb-0 border-start-0 border-end-0">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span className="small fw-semibold">
          A new version is available. Finish your current task, then refresh.
        </span>
        <span className="d-flex align-items-center gap-2">
          <CButton
            color="info"
            variant="outline"
            size="sm"
            className="d-inline-flex align-items-center gap-1"
            onClick={handleRefresh}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Refresh
          </CButton>
          <CButton color="light" size="sm" onClick={dismissUpdate}>
            Later
          </CButton>
        </span>
      </div>
    </CAlert>
  )
}

export default AppUpdateBanner
