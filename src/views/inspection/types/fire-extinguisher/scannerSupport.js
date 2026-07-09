import {
  buildCameraDiagnostics,
  CAMERA_FAILURE_TYPES,
  classifyCameraStartupFailure,
  getCameraFailureContent,
  getCameraPermissionState,
  getCameraPolicyState,
  getDisplayMode,
  inspectCameraEnvironment,
  isTopLevelContext,
} from 'src/utils/cameraDiagnostics'

const text = (value) => String(value || '').trim()

export const SCANNER_FAILURE_TYPES = CAMERA_FAILURE_TYPES

const REAR_CAMERA_LABEL = /\b(rear|back|environment)\b/i
const REAR_CAMERA_HINT = /\b(main|wide|ultra|world|camera)\b/i

export const inspectScannerEnvironment = inspectCameraEnvironment
export const classifyScannerFailure = classifyCameraStartupFailure
export const getScannerFailureContent = getCameraFailureContent
export const buildScannerDiagnostics = buildCameraDiagnostics
export { getCameraPermissionState, getCameraPolicyState, getDisplayMode, isTopLevelContext }

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
