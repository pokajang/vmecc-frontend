import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

export const PWA_INSTALL_DISMISSED_KEY = 'vmecc-pwa-install-dismissed'

const PwaInstallContext = createContext(null)

const getNavigator = () => (typeof window === 'undefined' ? null : window.navigator)

const isRunningStandalone = () => {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
    getNavigator()?.standalone === true
  )
}

const isIosDevice = () => {
  const nav = getNavigator()
  if (!nav) return false

  const platform = String(nav.platform || '')
  const userAgent = String(nav.userAgent || '')

  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && nav.maxTouchPoints > 1)
}

const isMobileLikeDevice = () => {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia?.('(pointer: coarse)')?.matches ||
    window.matchMedia?.('(max-width: 768px)')?.matches
  )
}

const getPlatformVariant = () => {
  if (isIosDevice()) return 'ios'
  if (isMobileLikeDevice()) return 'android'
  return 'desktop'
}

const readDismissed = () => {
  if (typeof localStorage === 'undefined') return false

  try {
    return localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

const writeDismissed = () => {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, '1')
  } catch {
    // Non-fatal. The prompt can remain visible if storage is unavailable.
  }
}

const INSTALL_MODAL_COPY = {
  ios: {
    intro:
      'Apple does not allow websites to open the iPhone install prompt directly. Use these steps in Safari:',
    steps: [
      'Tap the Share button in Safari.',
      'Scroll down and tap Add to Home Screen.',
      'Tap Add to install VMECC on this device.',
    ],
    footnote: 'This is the fastest install flow available on iPhone and iPad.',
  },
  android: {
    intro:
      'Your browser does not have the one-tap install prompt available right now. Use these steps:',
    steps: [
      'Open the browser menu.',
      'Tap Install app or Add to Home screen.',
      'Confirm Install to add VMECC to this device.',
    ],
    footnote:
      'These labels can vary slightly between Chrome, Samsung Internet, and other browsers.',
  },
  desktop: {
    intro:
      'This browser does not have the one-click install prompt available right now. Use one of these options:',
    steps: [
      'Click the install icon in the address bar if your browser shows one.',
      'Or open the browser menu and choose Install VMECC or Install app.',
      'Confirm the install to add VMECC to this computer.',
    ],
    footnote: 'Install wording can vary slightly between Chrome, Edge, and other desktop browsers.',
  },
}

export const PwaInstallProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [isInstalled, setIsInstalled] = useState(isRunningStandalone)
  const [isMobileLike, setIsMobileLike] = useState(isMobileLikeDevice)
  const [platformVariant, setPlatformVariant] = useState(getPlatformVariant)
  const [installModalVisible, setInstallModalVisible] = useState(false)

  useEffect(() => {
    const refreshDeviceState = () => {
      setIsInstalled(isRunningStandalone())
      setIsMobileLike(isMobileLikeDevice())
      setPlatformVariant(getPlatformVariant())
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const handleInstalled = () => {
      setDeferredPrompt(null)
      setInstallModalVisible(false)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('resize', refreshDeviceState)

    refreshDeviceState()

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('resize', refreshDeviceState)
    }
  }, [])

  const canNativeInstall = Boolean(deferredPrompt) && !isInstalled
  const showBanner = !isInstalled && isMobileLike && !dismissed
  const showNavInstallItem = !isInstalled

  const openInstallExperience = useCallback(async () => {
    if (isInstalled) return null

    if (!deferredPrompt) {
      setInstallModalVisible(true)
      return null
    }

    const promptEvent = deferredPrompt
    setDeferredPrompt(null)
    setInstallModalVisible(false)

    const result = await promptEvent.prompt()
    if (result?.outcome === 'accepted') {
      setIsInstalled(true)
    }

    return result || null
  }, [deferredPrompt, isInstalled])

  const dismissBanner = useCallback(() => {
    writeDismissed()
    setDismissed(true)
  }, [])

  const closeInstallExperience = useCallback(() => {
    setInstallModalVisible(false)
  }, [])

  const installModalCopy = INSTALL_MODAL_COPY[platformVariant] || INSTALL_MODAL_COPY.desktop

  const value = useMemo(
    () => ({
      isInstalled,
      canNativeInstall,
      platformVariant,
      showBanner,
      showNavInstallItem,
      openInstallExperience,
      dismissBanner,
      closeInstallExperience,
    }),
    [
      canNativeInstall,
      closeInstallExperience,
      dismissBanner,
      isInstalled,
      openInstallExperience,
      platformVariant,
      showBanner,
      showNavInstallItem,
    ],
  )

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      <CModal
        alignment="center"
        visible={installModalVisible}
        onClose={closeInstallExperience}
        aria-labelledby="pwa-install-modal-title"
      >
        <CModalHeader onClose={closeInstallExperience}>
          <CModalTitle id="pwa-install-modal-title">Install VMECC</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-3">{installModalCopy.intro}</p>
          <ol className="mb-3 ps-3">
            {installModalCopy.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mb-0 text-body-secondary small">{installModalCopy.footnote}</p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeInstallExperience}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </PwaInstallContext.Provider>
  )
}

const usePwaInstallPrompt = () => {
  const context = useContext(PwaInstallContext)
  if (!context) {
    throw new Error('usePwaInstallPrompt must be used within PwaInstallProvider')
  }
  return context
}

export default usePwaInstallPrompt
