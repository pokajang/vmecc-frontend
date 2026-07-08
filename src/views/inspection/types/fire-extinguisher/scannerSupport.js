const text = (value) => String(value || '').trim()

export const SCANNER_FAILURE_TYPES = Object.freeze({
  INSECURE_CONTEXT: 'insecure_context',
  UNSUPPORTED_BROWSER: 'unsupported_browser',
  PERMISSION_DENIED_SESSION: 'permission_denied_session',
  PERMISSION_BLOCKED_PERSISTED: 'permission_blocked_persisted',
  POLICY_BLOCKED: 'policy_blocked',
  NO_CAMERA_FOUND: 'no_camera_found',
  CAMERA_BUSY_OR_UNREADABLE: 'camera_busy_or_unreadable',
  SCAN_TIMEOUT_OR_DECODE_FAILURE: 'scan_timeout_or_decode_failure',
})

const KNOWN_FAILURE_TYPES = new Set(Object.values(SCANNER_FAILURE_TYPES))
const REAR_CAMERA_LABEL = /\b(rear|back|environment)\b/i
const REAR_CAMERA_HINT = /\b(main|wide|ultra|world|camera)\b/i
const CAMERA_PERMISSION = 'camera'

const getPermissionsPolicy = () =>
  globalThis?.document?.permissionsPolicy || globalThis?.document?.featurePolicy || null

const getPermissionStateValue = (value = '') => {
  const normalized = text(value).toLowerCase()
  return ['granted', 'prompt', 'denied'].includes(normalized) ? normalized : 'unsupported'
}

export const isTopLevelContext = () => {
  try {
    return globalThis?.window?.self === globalThis?.window?.top
  } catch {
    return false
  }
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

export const inspectScannerEnvironment = async () => {
  const policyState = getCameraPolicyState()

  return {
    isSecureContext: Boolean(globalThis?.isSecureContext),
    isTopLevelContext: isTopLevelContext(),
    supportsMediaDevices: Boolean(globalThis?.navigator?.mediaDevices?.getUserMedia),
    permissionState: await getCameraPermissionState(),
    policyAllowsCamera: policyState.allowsCamera,
    policySupported: policyState.supported,
    online: globalThis?.navigator?.onLine !== false,
    userAgent: text(globalThis?.navigator?.userAgent),
  }
}

export const selectPreferredVideoDevice = (devices = [], fallbackDeviceId = '') => {
  const videoDevices = (Array.isArray(devices) ? devices : []).filter(
    (device) => text(device?.kind).toLowerCase() === 'videoinput',
  )

  if (videoDevices.length === 0) {
    return fallbackDeviceId ? { deviceId: fallbackDeviceId, label: '' } : null
  }

  const ranked = videoDevices
    .map((device) => {
      const label = text(device?.label)
      return {
        device,
        score: REAR_CAMERA_LABEL.test(label) ? 3 : REAR_CAMERA_HINT.test(label) ? 2 : 1,
      }
    })
    .sort((left, right) => right.score - left.score)

  return ranked[0]?.device || null
}

export const getStreamDeviceDetails = (stream) => {
  const track = Array.isArray(stream?.getVideoTracks?.()) ? stream.getVideoTracks()[0] : null
  const settings = track?.getSettings?.() || {}

  return {
    deviceId: text(settings?.deviceId),
    label: text(track?.label),
  }
}

export const stopMediaStream = (stream) => {
  const tracks = Array.isArray(stream?.getTracks?.()) ? stream.getTracks() : []
  tracks.forEach((track) => track?.stop?.())
}

const normalizeFailureType = (value = '') => {
  const normalized = text(value)
  return KNOWN_FAILURE_TYPES.has(normalized) ? normalized : ''
}

export const classifyScannerFailure = ({ environment = {}, error = null, phase = '' }) => {
  const explicitType = normalizeFailureType(error?.scannerFailureType || error?.type)
  if (explicitType) return explicitType

  if (environment.isSecureContext === false) {
    return SCANNER_FAILURE_TYPES.INSECURE_CONTEXT
  }

  if (environment.supportsMediaDevices === false) {
    return SCANNER_FAILURE_TYPES.UNSUPPORTED_BROWSER
  }

  if (environment.isTopLevelContext === false) {
    return SCANNER_FAILURE_TYPES.UNSUPPORTED_BROWSER
  }

  if (environment.policyAllowsCamera === false) {
    return SCANNER_FAILURE_TYPES.POLICY_BLOCKED
  }

  const permissionState = getPermissionStateValue(environment.permissionState)
  const name = text(error?.name || error?.code)
  const message = text(error?.message).toLowerCase()

  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError'
  ) {
    return SCANNER_FAILURE_TYPES.NO_CAMERA_FOUND
  }

  if (
    name === 'NotReadableError' ||
    name === 'AbortError' ||
    name === 'TrackStartError' ||
    message.includes('could not start video source')
  ) {
    return SCANNER_FAILURE_TYPES.CAMERA_BUSY_OR_UNREADABLE
  }

  if (name === 'SecurityError') {
    return environment.policyAllowsCamera === false
      ? SCANNER_FAILURE_TYPES.POLICY_BLOCKED
      : SCANNER_FAILURE_TYPES.UNSUPPORTED_BROWSER
  }

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    if (environment.policyAllowsCamera === false) {
      return SCANNER_FAILURE_TYPES.POLICY_BLOCKED
    }
    if (permissionState === 'denied') {
      return SCANNER_FAILURE_TYPES.PERMISSION_BLOCKED_PERSISTED
    }
    return SCANNER_FAILURE_TYPES.PERMISSION_DENIED_SESSION
  }

  if (phase === 'scanning') {
    return SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE
  }

  return SCANNER_FAILURE_TYPES.UNSUPPORTED_BROWSER
}

export const getScannerFailureContent = (failureType) => {
  switch (failureType) {
    case SCANNER_FAILURE_TYPES.INSECURE_CONTEXT:
      return {
        title: 'Secure connection required',
        message: 'Camera scanning needs HTTPS or localhost. Open the secure site URL and retry.',
        canRetry: true,
      }
    case SCANNER_FAILURE_TYPES.UNSUPPORTED_BROWSER:
      return {
        title: 'Open in a supported browser',
        message:
          'Use Safari, Chrome, Edge, or Samsung Internet in a normal browser tab. Embedded or in-app browsers may block camera access.',
        canRetry: true,
      }
    case SCANNER_FAILURE_TYPES.PERMISSION_DENIED_SESSION:
      return {
        title: 'Camera access was denied',
        message: 'Allow camera access for this attempt, then retry scanning.',
        canRetry: true,
      }
    case SCANNER_FAILURE_TYPES.PERMISSION_BLOCKED_PERSISTED:
      return {
        title: 'Camera access is blocked',
        message:
          'This site is blocked from using the camera in browser settings. Re-enable camera access for this site, then retry.',
        canRetry: true,
      }
    case SCANNER_FAILURE_TYPES.POLICY_BLOCKED:
      return {
        title: 'Camera is blocked by site policy',
        message:
          'This page is not currently allowed to use the camera. Reload the latest site build or contact support if this persists.',
        canRetry: true,
      }
    case SCANNER_FAILURE_TYPES.NO_CAMERA_FOUND:
      return {
        title: 'No camera found',
        message: 'No usable camera was found on this device.',
        canRetry: true,
      }
    case SCANNER_FAILURE_TYPES.CAMERA_BUSY_OR_UNREADABLE:
      return {
        title: 'Camera unavailable',
        message: 'The camera is busy or unreadable. Close other camera apps or tabs, then retry.',
        canRetry: true,
      }
    case SCANNER_FAILURE_TYPES.SCAN_TIMEOUT_OR_DECODE_FAILURE:
      return {
        title: 'No readable code detected',
        message: 'Align the QR or barcode inside the frame, improve lighting, and retry scanning.',
        canRetry: true,
      }
    default:
      return {
        title: 'Camera scanning unavailable',
        message:
          'Camera scanning could not start on this device. Retry or enter the FE code manually.',
        canRetry: true,
      }
  }
}

export const buildScannerDiagnostics = ({
  environment = {},
  error = null,
  failureType = '',
  selectedDevice = null,
  phase = '',
}) => ({
  failureType: normalizeFailureType(failureType),
  phase: text(phase),
  errorName: text(error?.name || error?.code),
  errorMessage: text(error?.message),
  permissionState: getPermissionStateValue(environment.permissionState),
  secureContext: Boolean(environment.isSecureContext),
  topLevelContext: Boolean(environment.isTopLevelContext),
  supportsMediaDevices: Boolean(environment.supportsMediaDevices),
  policyAllowsCamera:
    typeof environment.policyAllowsCamera === 'boolean' ? environment.policyAllowsCamera : null,
  selectedDeviceId: text(selectedDevice?.deviceId),
  selectedDeviceLabel: text(selectedDevice?.label),
  userAgent: text(environment.userAgent),
})
