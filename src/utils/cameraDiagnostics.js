const text = (value) => String(value || '').trim()

export const CAMERA_FAILURE_TYPES = Object.freeze({
  INSECURE_CONTEXT: 'insecure_context',
  UNSUPPORTED_BROWSER: 'unsupported_browser',
  PERMISSION_DENIED_SESSION: 'permission_denied_session',
  PERMISSION_BLOCKED_PERSISTED: 'permission_blocked_persisted',
  POLICY_BLOCKED: 'policy_blocked',
  NO_CAMERA_FOUND: 'no_camera_found',
  CAMERA_BUSY_OR_UNREADABLE: 'camera_busy_or_unreadable',
  CAMERA_OVERCONSTRAINED: 'camera_overconstrained',
  STARTUP_FAILED: 'startup_failed',
  SCAN_TIMEOUT_OR_DECODE_FAILURE: 'scan_timeout_or_decode_failure',
})

const KNOWN_FAILURE_TYPES = new Set(Object.values(CAMERA_FAILURE_TYPES))
const CAMERA_PERMISSION = 'camera'

const getPermissionsPolicy = () =>
  globalThis?.document?.permissionsPolicy || globalThis?.document?.featurePolicy || null

const getPermissionStateValue = (value = '') => {
  const normalized = text(value).toLowerCase()
  return ['granted', 'prompt', 'denied'].includes(normalized) ? normalized : 'unsupported'
}

const normalizeFailureType = (value = '') => {
  const normalized = text(value)
  return KNOWN_FAILURE_TYPES.has(normalized) ? normalized : ''
}

const getServiceWorkerCacheVersion = async () => {
  const cachesApi = globalThis?.caches
  if (!cachesApi?.keys) return ''

  try {
    const keys = await cachesApi.keys()
    return (
      keys
        .map(text)
        .filter((key) => key.startsWith('vmecc-app-shell-'))
        .sort()
        .at(-1) || ''
    )
  } catch {
    return ''
  }
}

export const isTopLevelContext = () => {
  try {
    return globalThis?.window?.self === globalThis?.window?.top
  } catch {
    return false
  }
}

export const getDisplayMode = () => {
  try {
    if (globalThis?.navigator?.standalone === true) return 'standalone'
    if (globalThis?.window?.matchMedia?.('(display-mode: standalone)')?.matches) {
      return 'standalone'
    }
  } catch {
    return 'unknown'
  }
  return 'browser'
}

export const getCameraPolicyState = () => {
  const policy = getPermissionsPolicy()
  if (!policy?.allowsFeature) {
    return {
      supported: false,
      allowsCamera: null,
    }
  }

  try {
    return {
      supported: true,
      allowsCamera: Boolean(policy.allowsFeature(CAMERA_PERMISSION)),
    }
  } catch {
    return {
      supported: true,
      allowsCamera: null,
    }
  }
}

export const getCameraPermissionState = async () => {
  const permissions = globalThis?.navigator?.permissions
  if (!permissions?.query) return 'unsupported'

  try {
    const result = await permissions.query({ name: CAMERA_PERMISSION })
    return getPermissionStateValue(result?.state)
  } catch {
    return 'unsupported'
  }
}

export const inspectCameraEnvironment = async () => {
  const policyState = getCameraPolicyState()
  const serviceWorker = globalThis?.navigator?.serviceWorker

  return {
    isSecureContext: Boolean(globalThis?.isSecureContext),
    isTopLevelContext: isTopLevelContext(),
    displayMode: getDisplayMode(),
    supportsMediaDevices: Boolean(globalThis?.navigator?.mediaDevices?.getUserMedia),
    permissionState: await getCameraPermissionState(),
    policyAllowsCamera: policyState.allowsCamera,
    policySupported: policyState.supported,
    online: globalThis?.navigator?.onLine !== false,
    userAgent: text(globalThis?.navigator?.userAgent),
    serviceWorkerSupported: Boolean(serviceWorker),
    serviceWorkerControlled: Boolean(serviceWorker?.controller),
    serviceWorkerControllerState: text(serviceWorker?.controller?.state),
    serviceWorkerCacheVersion: await getServiceWorkerCacheVersion(),
  }
}

export const classifyCameraStartupFailure = ({
  environment = {},
  error = null,
  phase = '',
} = {}) => {
  const explicitType = normalizeFailureType(
    error?.cameraFailureType || error?.scannerFailureType || error?.type,
  )
  if (explicitType) return explicitType

  if (environment.isSecureContext === false) {
    return CAMERA_FAILURE_TYPES.INSECURE_CONTEXT
  }

  if (environment.supportsMediaDevices === false) {
    return CAMERA_FAILURE_TYPES.UNSUPPORTED_BROWSER
  }

  if (environment.isTopLevelContext === false) {
    return CAMERA_FAILURE_TYPES.UNSUPPORTED_BROWSER
  }

  if (environment.policyAllowsCamera === false) {
    return CAMERA_FAILURE_TYPES.POLICY_BLOCKED
  }

  const permissionState = getPermissionStateValue(environment.permissionState)
  const name = text(error?.name || error?.code)
  const message = text(error?.message).toLowerCase()

  if (name === 'ScanTimeoutError' || phase === 'image_decode') {
    return CAMERA_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return CAMERA_FAILURE_TYPES.NO_CAMERA_FOUND
  }

  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return CAMERA_FAILURE_TYPES.CAMERA_OVERCONSTRAINED
  }

  if (
    name === 'NotReadableError' ||
    name === 'AbortError' ||
    name === 'TrackStartError' ||
    message.includes('could not start video source') ||
    message.includes('device in use')
  ) {
    return CAMERA_FAILURE_TYPES.CAMERA_BUSY_OR_UNREADABLE
  }

  if (name === 'SecurityError') {
    return environment.policyAllowsCamera === false
      ? CAMERA_FAILURE_TYPES.POLICY_BLOCKED
      : CAMERA_FAILURE_TYPES.STARTUP_FAILED
  }

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    if (environment.policyAllowsCamera === false) {
      return CAMERA_FAILURE_TYPES.POLICY_BLOCKED
    }
    if (permissionState === 'denied') {
      return CAMERA_FAILURE_TYPES.PERMISSION_BLOCKED_PERSISTED
    }
    return CAMERA_FAILURE_TYPES.PERMISSION_DENIED_SESSION
  }

  if (phase === 'scanning') {
    return CAMERA_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE
  }

  if (environment.supportsMediaDevices === true) {
    return CAMERA_FAILURE_TYPES.STARTUP_FAILED
  }

  return CAMERA_FAILURE_TYPES.UNSUPPORTED_BROWSER
}

export const getCameraFailureContent = (failureType) => {
  switch (failureType) {
    case CAMERA_FAILURE_TYPES.INSECURE_CONTEXT:
      return {
        title: 'Secure connection required',
        message: 'Camera access needs HTTPS or localhost. Open the secure site URL and retry.',
        canRetry: true,
      }
    case CAMERA_FAILURE_TYPES.UNSUPPORTED_BROWSER:
      return {
        title: 'Open in a supported browser',
        message:
          'Use Safari, Chrome, Edge, or Samsung Internet in a normal browser tab. Embedded or in-app browsers may block camera access.',
        canRetry: true,
      }
    case CAMERA_FAILURE_TYPES.PERMISSION_DENIED_SESSION:
      return {
        title: 'Camera access was denied',
        message: 'Allow camera access for this attempt, then retry.',
        canRetry: true,
      }
    case CAMERA_FAILURE_TYPES.PERMISSION_BLOCKED_PERSISTED:
      return {
        title: 'Camera access is blocked',
        message:
          'This site is blocked from using the camera in browser settings. Re-enable camera access for this site, then retry.',
        canRetry: true,
      }
    case CAMERA_FAILURE_TYPES.POLICY_BLOCKED:
      return {
        title: 'Camera is blocked by site policy',
        message:
          'This page is not currently allowed to use the camera. Reload the latest site build or contact support if this persists.',
        canRetry: true,
      }
    case CAMERA_FAILURE_TYPES.NO_CAMERA_FOUND:
      return {
        title: 'No camera found',
        message: 'No usable camera was found on this device.',
        canRetry: true,
      }
    case CAMERA_FAILURE_TYPES.CAMERA_OVERCONSTRAINED:
      return {
        title: 'Requested camera is unavailable',
        message:
          'The preferred rear camera settings are unavailable. Retry to use a simpler camera mode, or enter the code manually.',
        canRetry: true,
      }
    case CAMERA_FAILURE_TYPES.CAMERA_BUSY_OR_UNREADABLE:
      return {
        title: 'Camera unavailable',
        message: 'The camera is busy or unreadable. Close other camera apps or tabs, then retry.',
        canRetry: true,
      }
    case CAMERA_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE:
      return {
        title: 'No readable code detected',
        message: 'Align the QR or barcode inside the frame, improve lighting, and retry scanning.',
        canRetry: true,
      }
    case CAMERA_FAILURE_TYPES.STARTUP_FAILED:
      return {
        title: 'Camera could not start',
        message:
          'This browser exposes camera APIs, but startup failed. Retry in a normal browser tab or upload/select an image manually.',
        canRetry: true,
      }
    default:
      return {
        title: 'Camera unavailable',
        message: 'Camera access could not start on this device. Retry or use manual upload.',
        canRetry: true,
      }
  }
}

export const buildCameraDiagnostics = ({
  environment = {},
  error = null,
  failureType = '',
  selectedDevice = null,
  phase = '',
  selectedConstraint = '',
} = {}) => ({
  failureType: normalizeFailureType(failureType),
  phase: text(phase),
  selectedConstraint: text(selectedConstraint),
  errorName: text(error?.name || error?.code),
  errorMessage: text(error?.message),
  permissionState: getPermissionStateValue(environment.permissionState),
  secureContext: Boolean(environment.isSecureContext),
  topLevelContext: Boolean(environment.isTopLevelContext),
  displayMode: text(environment.displayMode),
  supportsMediaDevices: Boolean(environment.supportsMediaDevices),
  policyAllowsCamera:
    typeof environment.policyAllowsCamera === 'boolean' ? environment.policyAllowsCamera : null,
  serviceWorkerSupported: Boolean(environment.serviceWorkerSupported),
  serviceWorkerControlled: Boolean(environment.serviceWorkerControlled),
  serviceWorkerControllerState: text(environment.serviceWorkerControllerState),
  serviceWorkerCacheVersion: text(environment.serviceWorkerCacheVersion),
  selectedDeviceId: text(selectedDevice?.deviceId),
  selectedDeviceLabel: text(selectedDevice?.label),
  userAgent: text(environment.userAgent),
})

export const formatCameraDiagnosticsLines = (diagnostics = {}) =>
  [
    ['Failure', diagnostics.failureType || 'unknown'],
    ['Phase', diagnostics.phase || 'unknown'],
    ['Display mode', diagnostics.displayMode || 'unknown'],
    ['Permission', diagnostics.permissionState || 'unknown'],
    ['Secure context', diagnostics.secureContext ? 'yes' : 'no'],
    ['Top-level page', diagnostics.topLevelContext ? 'yes' : 'no'],
    [
      'Policy allows camera',
      diagnostics.policyAllowsCamera === null
        ? 'unknown'
        : diagnostics.policyAllowsCamera
          ? 'yes'
          : 'no',
    ],
    ['Media devices supported', diagnostics.supportsMediaDevices ? 'yes' : 'no'],
    ['Service worker controlled', diagnostics.serviceWorkerControlled ? 'yes' : 'no'],
    ['Service worker cache', diagnostics.serviceWorkerCacheVersion || 'unknown'],
    ['Error', diagnostics.errorName || 'none'],
    ['Message', diagnostics.errorMessage || 'none'],
  ].map(([label, value]) => `${label}: ${value}`)
