import {
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  getScbaFieldEvidenceKeys,
  HIGH_ANGLE_CONDITION_FIELD,
  HYDRAULIC_CHECK_FIELDS,
  normalizeScbaCustomSections,
  SCBA_SECTION_DEFINITIONS,
} from './inspectionFormHelpers'

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024
const TARGET_PHOTO_BYTES = 1.0 * 1024 * 1024
const CAMERA_TARGET_PHOTO_BYTES = 750 * 1024
const MAX_PHOTO_COUNT = 10
const MAX_TOTAL_PHOTO_BYTES = 12 * 1024 * 1024
const MAX_CAMERA_FILE_BYTES = 12 * 1024 * 1024
const IMAGE_OPERATION_TIMEOUT_MS = 12000
const COMPRESS_DIMENSION_CANDIDATES = [2048, 1920, 1600, 1365, 1280, 1024, 900, 768, 640, 512]
const CAMERA_COMPRESS_DIMENSION_CANDIDATES = [1280, 1024]
const COMPRESS_QUALITY_CANDIDATES = [0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4, 0.32, 0.25]
const CAMERA_COMPRESS_QUALITY_CANDIDATES = [0.72, 0.58, 0.45]

const FAILURE_TITLES = {
  invalid_file: 'Invalid photo',
  max_photo_count: 'Too many photos',
  no_photo_data: 'No photo data',
  processing_failed: 'Upload failed',
  compressed_too_large: 'Photo too large',
  total_size_exceeded: 'Photos too large',
  read_failed: 'Read failed',
  file_too_large: 'Photo too large',
  low_memory: 'Camera memory limit',
  unsupported_file_type: 'Unsupported file type',
  operation_timeout: 'Upload timeout',
  scan_timeout_or_decode_failure: 'Scan decode timeout',
}

const FAILURE_COLORS = {
  invalid_file: 'warning',
  max_photo_count: 'warning',
  no_photo_data: 'warning',
  processing_failed: 'danger',
  compressed_too_large: 'warning',
  total_size_exceeded: 'warning',
  read_failed: 'danger',
  file_too_large: 'warning',
  low_memory: 'warning',
  unsupported_file_type: 'warning',
  operation_timeout: 'warning',
  scan_timeout_or_decode_failure: 'warning',
}

const DEFAULT_FAILURE_MESSAGES = {
  invalid_file: 'Selected file is not a valid image.',
  no_photo_data: 'Could not read photo bytes from file.',
  max_photo_count: 'You can upload up to 10 photos per inspection report.',
  processing_failed: 'Unable to process selected photo.',
  compressed_too_large: 'Photo is too large even after compression.',
  total_size_exceeded: 'Total photo size must be 12 MB or smaller.',
  read_failed: 'Unable to read selected photo.',
  file_too_large:
    'Camera photo is too large for in-browser processing. Upload a smaller photo manually.',
  low_memory:
    'Camera processing failed due to low device memory. You can upload the photo manually to continue.',
  unsupported_file_type:
    'This photo format is not supported for camera upload. Please upload a jpg, png, or webp file.',
  operation_timeout: 'Photo processing timed out. You can retry or upload manually.',
  scan_timeout_or_decode_failure:
    'Camera capture decode timed out. You can retry or upload the photo manually.',
}

const asString = (value, fallback = '') => String(value || fallback)

const normalizeErrorMessage = (error) => asString(error?.message).replace(/\s+/g, ' ').trim()

const withTimeout = (
  promise,
  timeoutMs = IMAGE_OPERATION_TIMEOUT_MS,
  timeoutMessage = 'Operation timed out.',
) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const timeoutError = new Error(timeoutMessage)
      timeoutError.name = 'TimeoutError'
      reject(timeoutError)
    }, timeoutMs)
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })

const isLowMemoryError = (error) => {
  const name = asString(error?.name).toLowerCase()
  const message = normalizeErrorMessage(error).toLowerCase()
  return (
    name === 'quotaexceedederror' ||
    /out of memory|low memory|not enough memory|memory allocation|allocation failed|quota/.test(
      message,
    )
  )
}

const isOperationTimeoutError = (error) => {
  const name = asString(error?.name).toLowerCase()
  const message = normalizeErrorMessage(error).toLowerCase()
  return name === 'timeouterror' || /timed out|timeout/i.test(message)
}

const isUnsupportedFileTypeError = (error) => {
  const message = normalizeErrorMessage(error).toLowerCase()
  const name = asString(error?.name).toLowerCase()
  return (
    name === 'notfounderror' ||
    /not supported|unsupported format|unsupported image format|unsupported file|decode|unsupported/i.test(
      message,
    )
  )
}

export const collectInspectionPhotos = (form = {}) => [
  ...(Array.isArray(form.photos) ? form.photos : []),
  ...(Array.isArray(form.fireExtinguisherChecks)
    ? form.fireExtinguisherChecks.flatMap((check) => [
        ...(Array.isArray(check.photos) ? check.photos : []),
        ...FIRE_EXTINGUISHER_CHECK_FIELDS.flatMap((field) =>
          Array.isArray(check[field.photosKey]) ? check[field.photosKey] : [],
        ),
      ])
    : []),
  ...(Array.isArray(form.hydraulicChecks)
    ? form.hydraulicChecks.flatMap((check) => [
        ...(Array.isArray(check.photos) ? check.photos : []),
        ...HYDRAULIC_CHECK_FIELDS.flatMap((field) =>
          Array.isArray(check[field.photosKey]) ? check[field.photosKey] : [],
        ),
      ])
    : []),
  ...(Array.isArray(form.erAuxChecks)
    ? form.erAuxChecks.flatMap((check) => [
        ...(Array.isArray(check?.photos) ? check.photos : []),
        ...(Array.isArray(check?.defectPhotos) ? check.defectPhotos : []),
      ])
    : []),
  ...(Array.isArray(form.frtDailyChecks)
    ? form.frtDailyChecks.flatMap((check) => [
        ...(Array.isArray(check.photos) ? check.photos : []),
        ...(Array.isArray(check.additionalPhotos) ? check.additionalPhotos : []),
      ])
    : []),
  ...(Array.isArray(form.frtOneOffChecks)
    ? form.frtOneOffChecks.flatMap((check) => [
        ...(Array.isArray(check.photos) ? check.photos : []),
        ...(Array.isArray(check.additionalPhotos) ? check.additionalPhotos : []),
      ])
    : []),
  ...(Array.isArray(form.highAngleChecks)
    ? form.highAngleChecks.flatMap((check) => [
        ...(Array.isArray(check[HIGH_ANGLE_CONDITION_FIELD.photosKey])
          ? check[HIGH_ANGLE_CONDITION_FIELD.photosKey]
          : []),
        ...(Array.isArray(check.additionalPhotos) ? check.additionalPhotos : []),
      ])
    : []),
  ...SCBA_SECTION_DEFINITIONS.flatMap((section) => {
    const checks =
      section.key === 'backPlate'
        ? form.scbaBackPlateChecks
        : section.key === 'cylinder'
          ? form.scbaCylinderChecks
          : form.scbaFaceMaskChecks
    return (Array.isArray(checks) ? checks : []).flatMap((check) => [
      ...(Array.isArray(check.photos) ? check.photos : []),
      ...(section.fields || []).flatMap((field) => {
        if (field.kind !== 'status') return []
        const { photosKey } = getScbaFieldEvidenceKeys(field)
        return Array.isArray(check[photosKey]) ? check[photosKey] : []
      }),
    ])
  }),
  ...normalizeScbaCustomSections(form.scbaCustomSections || form.scba_custom_sections).flatMap(
    (section) =>
      (Array.isArray(section.rows) ? section.rows : []).flatMap((check) => [
        ...(Array.isArray(check.photos) ? check.photos : []),
        ...(section.fields || []).flatMap((field) => {
          const { photosKey } = getScbaFieldEvidenceKeys(field)
          return Array.isArray(check[photosKey]) ? check[photosKey] : []
        }),
      ]),
  ),
]

export const normalizePhotoFailure = (failure = {}, fileName = '') => {
  const code = asString(failure?.code, 'processing_failed').trim()
  const rawMessage = asString(failure?.message).trim()
  const fallbackFile = asString(fileName).trim()
  const message =
    rawMessage || DEFAULT_FAILURE_MESSAGES[code] || DEFAULT_FAILURE_MESSAGES.processing_failed
  const wrappedMessage = fallbackFile ? message.replace(/".*"/, `"${fallbackFile}"`) : message
  return { ...failure, code, message: wrappedMessage }
}

export const buildPhotoFailure = (code, message = '') => ({
  code,
  message,
})

const isCameraFailureToRetry = (code) =>
  code !== 'max_photo_count' && code !== 'total_size_exceeded'

const isKnownUnsupportedImageFormat = (file = {}) => {
  const type = asString(file?.type).toLowerCase()
  const name = asString(file?.name).toLowerCase()
  const extension = name.includes('.') ? name.split('.').pop() : ''
  const unsupportedExtensionSet = new Set(['heic', 'heif', 'heics', 'heifc'])
  if (unsupportedExtensionSet.has(extension)) return true
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heics' ||
    type === 'image/heifc'
  )
}

const isImageFile = (file = {}) => {
  const type = asString(file?.type).toLowerCase()
  const name = asString(file?.name).toLowerCase()
  if (type) return type.startsWith('image/')
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$/.test(name)
}

const classifyValidationFailure = (file = {}, isCameraUpload = false) => {
  const fileName = asString(file?.name, 'selected file')
  if (!file || typeof file !== 'object') {
    return buildPhotoFailure('invalid_file', 'Unable to read selected file.')
  }

  const normalizedSize = Number(file.size)
  if (!Number.isFinite(normalizedSize) || normalizedSize <= 0) {
    return buildPhotoFailure(
      'invalid_file',
      `The selected file "${fileName}" is empty or not readable.`,
    )
  }

  if (isKnownUnsupportedImageFormat(file)) {
    return buildPhotoFailure(
      'unsupported_file_type',
      `The selected file "${fileName}" is in a format that cannot be processed from this camera flow.`,
    )
  }

  if (!isImageFile(file)) {
    return buildPhotoFailure('unsupported_file_type', `"${fileName}" is not an image file.`)
  }

  if (isCameraUpload && normalizedSize > MAX_CAMERA_FILE_BYTES) {
    return buildPhotoFailure(
      'file_too_large',
      `"${fileName}" is over 12 MB. Upload a smaller photo manually or retake the photo at a lower resolution.`,
    )
  }

  return null
}

const classifyPhotoError = (error, defaultCode = 'processing_failed') => {
  if (isLowMemoryError(error)) return 'low_memory'
  if (isOperationTimeoutError(error)) return 'scan_timeout_or_decode_failure'
  if (isUnsupportedFileTypeError(error)) return 'unsupported_file_type'
  return defaultCode
}

const getFailureToastOptions = (failure) => {
  const { code, message } = failure
  return {
    title: FAILURE_TITLES[code] || 'Upload failed',
    color: FAILURE_COLORS[code] || 'danger',
    message:
      message || DEFAULT_FAILURE_MESSAGES[code] || DEFAULT_FAILURE_MESSAGES.processing_failed,
  }
}

const emitFailure = (failure, { onFailure, pushToast, suppressToasts = false }) => {
  const normalizedFailure = normalizePhotoFailure(failure)
  if (typeof onFailure === 'function') onFailure(normalizedFailure)
  if (suppressToasts && isCameraFailureToRetry(normalizedFailure.code)) return
  if (!suppressToasts || !isCameraFailureToRetry(normalizedFailure.code)) {
    const toastOptions = getFailureToastOptions(normalizedFailure)
    if (typeof pushToast === 'function') {
      pushToast(toastOptions.message, {
        title: toastOptions.title,
        color: toastOptions.color,
      })
    }
  }
}

const estimateDataUrlBytes = (value = '') => {
  const match = /^data:[^;]+;base64,([a-z0-9+/=\r\n]+)$/i.exec(String(value || ''))
  if (!match) return 0
  const base64 = String(match[1] || '').replace(/\s+/g, '')
  if (!base64) return 0
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

const replaceFileExtension = (name, extension) => {
  const base =
    String(name || '')
      .replace(/\.[^.]+$/, '')
      .trim() || 'photo'
  return `${base}.${extension}`
}

const loadImageElement = async (file) => {
  const image = await withTimeout(
    new Promise((resolve, reject) => {
      const loadedImage = new Image()
      const objectUrl = URL.createObjectURL(file)
      loadedImage.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(loadedImage)
      }
      loadedImage.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Unable to decode selected image.'))
      }
      loadedImage.src = objectUrl
    }),
    IMAGE_OPERATION_TIMEOUT_MS,
    'Image decode timed out.',
  )
  return image
}

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to compress selected image.'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })

const compressInspectionPhoto = async (file, targetBytes, options = {}) => {
  const { isCameraUpload = false } = options

  if (
    !file ||
    !String(file.type || '')
      .toLowerCase()
      .startsWith('image/')
  ) {
    return file
  }
  if (Number(file.size || 0) <= targetBytes) return file

  const image = await loadImageElement(file)
  const targetMime = 'image/jpeg'
  let bestBlob = null
  const dimensions = isCameraUpload
    ? CAMERA_COMPRESS_DIMENSION_CANDIDATES
    : COMPRESS_DIMENSION_CANDIDATES
  const qualities = isCameraUpload
    ? CAMERA_COMPRESS_QUALITY_CANDIDATES
    : COMPRESS_QUALITY_CANDIDATES
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to process selected image.')

  for (const maxDimension of dimensions) {
    const ratio = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1))
    const nextWidth = Math.max(1, Math.round((image.width || 1) * ratio))
    const nextHeight = Math.max(1, Math.round((image.height || 1) * ratio))
    canvas.width = nextWidth
    canvas.height = nextHeight

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, nextWidth, nextHeight)
    context.drawImage(image, 0, 0, nextWidth, nextHeight)

    for (const quality of qualities) {
      const candidate = await canvasToBlob(canvas, targetMime, quality)
      if (!bestBlob || candidate.size < bestBlob.size) bestBlob = candidate
      if (candidate.size <= targetBytes) break
    }

    if (bestBlob?.size <= targetBytes) break
  }

  if (!bestBlob) return file

  const compressedFile = new File([bestBlob], replaceFileExtension(file.name, 'jpg'), {
    type: bestBlob.type || 'image/jpeg',
    lastModified: Date.now(),
  })

  return compressedFile.size < file.size ? compressedFile : file
}

const readFileAsDataUrl = async (file) => {
  const url = await withTimeout(
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error || new Error('Unable to read file'))
      reader.readAsDataURL(file)
    }),
    IMAGE_OPERATION_TIMEOUT_MS,
    'Image read timed out.',
  )
  return url
}

export const prepareInspectionPhotoUploads = async ({
  files = [],
  form,
  pushToast,
  defaultDescription = '',
  createPhotoId,
  onFailure,
  isCameraUpload = false,
  suppressToasts = false,
}) => {
  const photoFiles = Array.from(files || [])
  if (photoFiles.length === 0) return []
  const notifyFailure = (failure) => emitFailure(failure, { onFailure, pushToast, suppressToasts })
  const seenFailureCodes = new Set()

  const notifyFailureOnce = (failure) => {
    const normalized = normalizePhotoFailure(failure)
    if (seenFailureCodes.has(normalized.code)) return
    seenFailureCodes.add(normalized.code)
    notifyFailure(normalized)
  }

  const allCurrentPhotos = collectInspectionPhotos(form)
  const remainingPhotoSlots = Math.max(0, MAX_PHOTO_COUNT - allCurrentPhotos.length)
  if (remainingPhotoSlots === 0) {
    notifyFailureOnce(
      buildPhotoFailure('max_photo_count', `You can upload up to ${MAX_PHOTO_COUNT} photos.`),
    )
    return null
  }

  const existingTotalBytes = allCurrentPhotos.reduce(
    (sum, photo) => sum + estimateDataUrlBytes(photo?.url),
    0,
  )
  let remainingTotalBytes = Math.max(0, MAX_TOTAL_PHOTO_BYTES - existingTotalBytes)
  const processedFiles = []
  let exceededTotalSize = false

  for (const file of photoFiles) {
    if (processedFiles.length >= remainingPhotoSlots) {
      notifyFailureOnce(
        buildPhotoFailure('max_photo_count', `You can upload up to ${MAX_PHOTO_COUNT} photos.`),
      )
      break
    }

    const fileValidationFailure = classifyValidationFailure(file, isCameraUpload)
    if (fileValidationFailure) {
      notifyFailureOnce(fileValidationFailure)
      continue
    }

    let nextFile = file
    try {
      nextFile = await compressInspectionPhoto(
        file,
        isCameraUpload ? CAMERA_TARGET_PHOTO_BYTES : TARGET_PHOTO_BYTES,
        { isCameraUpload },
      )
    } catch (error) {
      const failureCode = classifyPhotoError(error, 'processing_failed')
      notifyFailureOnce(
        buildPhotoFailure(
          failureCode,
          normalizeErrorMessage(error) ||
            (failureCode === 'low_memory'
              ? DEFAULT_FAILURE_MESSAGES.low_memory
              : `Unable to process "${file.name}".`),
        ),
      )
      continue
    }

    if (Number(nextFile.size || 0) <= 0) {
      notifyFailureOnce(buildPhotoFailure('invalid_file', `Unable to process "${file.name}".`))
      continue
    }

    if (Number(nextFile.size || 0) > MAX_PHOTO_BYTES) {
      notifyFailureOnce(
        buildPhotoFailure(
          'compressed_too_large',
          `"${file.name}" is over 1.5 MB even after compression.`,
        ),
      )
      continue
    }

    if (Number(nextFile.size || 0) > remainingTotalBytes) {
      exceededTotalSize = true
      notifyFailureOnce(
        buildPhotoFailure('total_size_exceeded', `Total photo size must be 12 MB or smaller.`),
      )
      continue
    }

    processedFiles.push(nextFile)
    remainingTotalBytes -= Number(nextFile.size || 0)
  }

  if (exceededTotalSize && processedFiles.length === 0) {
    return null
  }

  const normalizedDefaultDescription = String(defaultDescription || '').trim()
  if (processedFiles.length === 0) return null
  const nextPhotos = []
  const readFailures = []

  for (const file of processedFiles) {
    try {
      const url = await readFileAsDataUrl(file)
      nextPhotos.push({
        id: createPhotoId(),
        fileName: file.name,
        ...(normalizedDefaultDescription ? { description: normalizedDefaultDescription } : {}),
        url,
      })
    } catch (error) {
      const failureCode = classifyPhotoError(error, 'read_failed')
      readFailures.push(file)
      notifyFailureOnce(
        buildPhotoFailure(
          failureCode,
          normalizeErrorMessage(error) || `Unable to read "${file.name}".`,
        ),
      )
    }
  }

  if (nextPhotos.length === 0) return null
  if (readFailures.length > 0) return nextPhotos
  return nextPhotos
}

export const getRowPhotoList = (checks = [], row, photosKey = 'photos') => {
  const rowId = String(row?.id || '').trim()
  const existing = (Array.isArray(checks) ? checks : []).find(
    (check) => String(check?.id || '') === rowId,
  )
  return Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
}

export const removePhotoById = (photos = [], photoId) =>
  (Array.isArray(photos) ? photos : []).filter(
    (photo) => String(photo?.id || '') !== String(photoId || ''),
  )

export const updatePhotoDescriptionById = (photos = [], photoId, description) =>
  (Array.isArray(photos) ? photos : []).map((photo) =>
    String(photo?.id || '') === String(photoId || '') ? { ...photo, description } : photo,
  )

export const applyPhotoCaptionById = (photos = [], photoId, caption, appendText) =>
  (Array.isArray(photos) ? photos : []).map((photo) =>
    String(photo?.id || '') === String(photoId || '')
      ? { ...photo, description: appendText(photo.description, caption) }
      : photo,
  )

export { isCameraFailureToRetry }
