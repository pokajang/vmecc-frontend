const PREPARE_THRESHOLD_BYTES = 2 * 1024 * 1024
const MAX_CLIENT_PREPARE_BYTES = 8 * 1024 * 1024
const MAX_LONG_EDGE = 2048
const OUTPUT_QUALITY = 0.82
const BROWSER_DECODABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => {
    if (typeof canvas?.toBlob !== 'function') {
      resolve(null)
      return
    }
    canvas.toBlob(resolve, type, quality)
  })

const replaceExtension = (fileName, extension) => {
  const normalized = String(fileName || 'inspection-photo').replace(/\.[^.]+$/, '')
  return `${normalized || 'inspection-photo'}.${extension}`
}

const loadWithImageElement = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve({ image, objectUrl })
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to decode selected image in this browser.'))
    }
    image.src = objectUrl
  })

const decodeImage = async (file) => {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close?.(),
    }
  }

  if (
    typeof Image === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function' ||
    typeof document === 'undefined'
  ) {
    return null
  }
  const { image, objectUrl } = await loadWithImageElement(file)
  return {
    image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    release: () => {
      image.src = ''
      URL.revokeObjectURL(objectUrl)
    },
  }
}

export const prepareInspectionPhotoFile = async (file, { signal, onState } = {}) => {
  const type = String(file?.type || '').toLowerCase()
  const size = Number(file?.size || 0)
  if (
    !file ||
    size <= 0 ||
    size < PREPARE_THRESHOLD_BYTES ||
    size > MAX_CLIENT_PREPARE_BYTES ||
    !BROWSER_DECODABLE_TYPES.has(type) ||
    typeof document === 'undefined'
  ) {
    return file
  }

  onState?.({ status: 'preparing', percent: 0 })
  let decoded = null
  try {
    if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')
    decoded = await decodeImage(file)
    if (!decoded?.width || !decoded?.height) return file

    const scale = Math.min(1, MAX_LONG_EDGE / Math.max(decoded.width, decoded.height))
    const width = Math.max(1, Math.round(decoded.width * scale))
    const height = Math.max(1, Math.round(decoded.height * scale))
    if (scale === 1 && size <= PREPARE_THRESHOLD_BYTES) return file

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: false })
    if (!context || signal?.aborted) return file
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.drawImage(decoded.image, 0, 0, width, height)
    const blob = await canvasToBlob(canvas, 'image/jpeg', OUTPUT_QUALITY)
    canvas.width = 1
    canvas.height = 1
    if (!blob || blob.size <= 0 || blob.size >= size) return file

    if (typeof File === 'undefined') return blob
    return new File([blob], replaceExtension(file.name, 'jpg'), {
      type: 'image/jpeg',
      lastModified: Number(file.lastModified || Date.now()),
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    return file
  } finally {
    decoded?.release?.()
  }
}

export const inspectionPhotoPreparationPolicy = {
  maxLongEdge: MAX_LONG_EDGE,
  outputQuality: OUTPUT_QUALITY,
  prepareThresholdBytes: PREPARE_THRESHOLD_BYTES,
  maxClientPrepareBytes: MAX_CLIENT_PREPARE_BYTES,
}
