import React, { useCallback } from 'react'
import { CAlert, CButton } from '@coreui/react'
import { Download, Share2, X } from 'lucide-react'

import usePwaInstallPrompt from 'src/hooks/usePwaInstallPrompt'

const PwaInstallBanner = ({ useInstallPrompt = usePwaInstallPrompt }) => {
  const { showBanner, platformVariant, openInstallExperience, dismissBanner } = useInstallPrompt()

  const handleInstall = useCallback(() => {
    void openInstallExperience()
  }, [openInstallExperience])

  if (!showBanner) return null

  const usesShareInstructions = platformVariant === 'ios'

  return (
    <CAlert color="info" className="pwa-install-banner rounded-0 mb-0 border-start-0 border-end-0">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span className="d-inline-flex min-w-0 align-items-center gap-2 small fw-semibold">
          {usesShareInstructions ? (
            <Share2 size={16} aria-hidden="true" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          <span className="pwa-install-banner__text">
            {usesShareInstructions
              ? 'Install VMECC on your iPhone for faster home screen access.'
              : 'Install VMECC for faster mobile access.'}
          </span>
        </span>
        <span className="d-inline-flex align-items-center gap-2">
          <CButton
            color="info"
            variant="outline"
            size="sm"
            className="d-inline-flex align-items-center gap-1"
            onClick={handleInstall}
          >
            {usesShareInstructions ? (
              <Share2 size={14} aria-hidden="true" />
            ) : (
              <Download size={14} aria-hidden="true" />
            )}
            Install VMECC
          </CButton>
          <CButton
            color="light"
            size="sm"
            className="pwa-install-banner__dismiss d-inline-flex align-items-center justify-content-center"
            aria-label="Dismiss install app prompt"
            onClick={dismissBanner}
          >
            <X size={14} aria-hidden="true" />
          </CButton>
        </span>
      </div>
    </CAlert>
  )
}

export default PwaInstallBanner
