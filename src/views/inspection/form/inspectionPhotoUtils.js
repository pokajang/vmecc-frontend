import {
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  getScbaFieldEvidenceKeys,
  HIGH_ANGLE_CONDITION_FIELD,
  HYDRAULIC_CHECK_FIELDS,
  normalizeScbaCustomSections,
  SCBA_SECTION_DEFINITIONS,
} from './inspectionFormHelpers'
import {
  deleteReportMedia,
  getReportPhotoBytes,
  reportPhotoFailureMessage,
  uploadReportPhotosSequentially,
} from 'src/services/api/reportMediaApi'

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024
const MAX_PHOTO_COUNT = 10
const MAX_TOTAL_PHOTO_BYTES = 12 * 1024 * 1024
const MAX_CAMERA_FILE_BYTES = 12 * 1024 * 1024

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

const classifyPhotoError = (error, defaultCode = 'processing_failed') =>
  String(error?.code || defaultCode)

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

export const prepareInspectionPhotoUploads = async ({
  files = [],
  form,
  pushToast,
  defaultDescription = '',
  createPhotoId,
  onFailure,
  isCameraUpload = false,
  suppressToasts = false,
  signal,
  onProgress,
  onRetry,
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
    (sum, photo) => sum + getReportPhotoBytes(photo),
    0,
  )
  let remainingTotalBytes = Math.max(0, MAX_TOTAL_PHOTO_BYTES - existingTotalBytes)
  const normalizedDefaultDescription = String(defaultDescription || '').trim()
  const nextPhotos = []
  const selectedFiles = photoFiles.slice(0, remainingPhotoSlots).filter((file) => {
    const failure = classifyValidationFailure(file, isCameraUpload)
    if (failure) notifyFailureOnce(failure)
    return !failure
  })
  if (photoFiles.length > remainingPhotoSlots)
    notifyFailureOnce(
      buildPhotoFailure('max_photo_count', `You can upload up to ${MAX_PHOTO_COUNT} photos.`),
    )
  const uploaded = await uploadReportPhotosSequentially({
    files: selectedFiles,
    module: 'inspection',
    source: isCameraUpload ? 'camera' : 'upload',
    signal,
    onProgress,
    onRetry,
    onFailure: (failure) =>
      notifyFailureOnce(
        buildPhotoFailure(
          failure.code,
          failure.message || reportPhotoFailureMessage(failure.code, failure.fileName),
        ),
      ),
  })
  for (const photo of uploaded) {
    if (photo.sizeBytes > MAX_PHOTO_BYTES || photo.sizeBytes > remainingTotalBytes) {
      await deleteReportMedia(photo.mediaId)
      notifyFailureOnce(
        buildPhotoFailure(
          photo.sizeBytes > MAX_PHOTO_BYTES ? 'compressed_too_large' : 'total_size_exceeded',
        ),
      )
      continue
    }
    remainingTotalBytes -= photo.sizeBytes
    nextPhotos.push({
      id: createPhotoId(),
      ...photo,
      ...(normalizedDefaultDescription ? { description: normalizedDefaultDescription } : {}),
    })
  }
  return nextPhotos.length ? nextPhotos : null
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
