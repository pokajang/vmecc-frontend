export const INSPECTION_CAMERA_MAX_DIMENSION = 1600
export const INSPECTION_CAMERA_JPEG_QUALITY = 0.84

export const INSPECTION_CAMERA_START_ATTEMPTS = [
  {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1600, max: 1920 },
      height: { ideal: 1200, max: 1920 },
    },
    audio: false,
  },
  {
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  },
  {
    video: true,
    audio: false,
  },
]

const TERMINAL_CAMERA_ERROR_NAMES = new Set([
  'NotAllowedError',
  'PermissionDeniedError',
  'SecurityError',
])

export const supportsInAppInspectionCamera = () => {
  const navigatorObject = globalThis.navigator
  if (!navigatorObject?.mediaDevices?.getUserMedia) return false
  if (globalThis.isSecureContext === false) return false
  return true
}

export const stopInspectionCameraStream = (stream) => {
  const tracks = Array.from(stream?.getTracks?.() || [])
  tracks.forEach((track) => track?.stop?.())
}

export const startInspectionCameraStream = async ({
  getUserMedia = globalThis.navigator?.mediaDevices?.getUserMedia?.bind(
    globalThis.navigator?.mediaDevices,
  ),
  attempts = INSPECTION_CAMERA_START_ATTEMPTS,
} = {}) => {
  if (typeof getUserMedia !== 'function') {
    throw new DOMException('Camera streaming is unavailable.', 'NotSupportedError')
  }

  let lastError = null
  for (const constraints of attempts) {
    try {
      return await getUserMedia(constraints)
    } catch (error) {
      lastError = error
      if (TERMINAL_CAMERA_ERROR_NAMES.has(String(error?.name || ''))) throw error
    }
  }

  throw lastError || new DOMException('No usable camera was found.', 'NotFoundError')
}

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('The browser could not capture this camera frame.'))
      },
      mimeType,
      quality,
    )
  })

export const captureInspectionCameraFrame = async ({
  video,
  createCanvas = () => globalThis.document?.createElement('canvas'),
  maxDimension = INSPECTION_CAMERA_MAX_DIMENSION,
  quality = INSPECTION_CAMERA_JPEG_QUALITY,
  now = () => Date.now(),
} = {}) => {
  const sourceWidth = Number(video?.videoWidth || 0)
  const sourceHeight = Number(video?.videoHeight || 0)
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('The camera is not ready yet. Hold steady and retry.')
  }

  const scale = Math.min(
    1,
    Math.max(320, Number(maxDimension) || 0) / Math.max(sourceWidth, sourceHeight),
  )
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale))
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = createCanvas()
  const context = canvas?.getContext?.('2d', { alpha: false })
  if (!canvas || !context || typeof canvas.toBlob !== 'function') {
    throw new Error('This browser cannot capture an in-app photo.')
  }

  canvas.width = targetWidth
  canvas.height = targetHeight
  context.drawImage(video, 0, 0, targetWidth, targetHeight)
  const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  const timestamp = now()
  const fileName = `inspection-camera-${timestamp}.jpg`

  if (typeof File === 'function') {
    return new File([blob], fileName, {
      type: 'image/jpeg',
      lastModified: timestamp,
    })
  }

  Object.defineProperties(blob, {
    name: { configurable: true, value: fileName },
    lastModified: { configurable: true, value: timestamp },
  })
  return blob
}
