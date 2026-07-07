const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024
const TARGET_PHOTO_BYTES = 1.0 * 1024 * 1024
const MAX_PHOTO_COUNT = 10
const MAX_TOTAL_PHOTO_BYTES = 12 * 1024 * 1024
const COMPRESS_DIMENSION_CANDIDATES = [2048, 1920, 1600, 1365, 1280, 1024, 900, 768, 640, 512]
const COMPRESS_QUALITY_CANDIDATES = [0.88, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4, 0.32]

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

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to read selected image.'))
    }
    image.src = objectUrl
  })

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

const compressInspectionPhoto = async (file, targetBytes) => {
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

  for (const maxDimension of COMPRESS_DIMENSION_CANDIDATES) {
    const ratio = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1))
    const nextWidth = Math.max(1, Math.round((image.width || 1) * ratio))
    const nextHeight = Math.max(1, Math.round((image.height || 1) * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = nextWidth
    canvas.height = nextHeight

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to process selected image.')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, nextWidth, nextHeight)
    context.drawImage(image, 0, 0, nextWidth, nextHeight)

    for (const quality of COMPRESS_QUALITY_CANDIDATES) {
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

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })

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

export const prepareInspectionPhotoUploads = async ({
  files = [],
  form,
  pushToast,
  defaultDescription = '',
  createPhotoId,
}) => {
  const photoFiles = Array.from(files || [])
  if (photoFiles.length === 0) return []

  const allCurrentPhotos = collectInspectionPhotos(form)
  const nextCount = allCurrentPhotos.length + photoFiles.length
  if (nextCount > MAX_PHOTO_COUNT) {
    pushToast(`You can upload up to ${MAX_PHOTO_COUNT} photos per inspection report.`, {
      title: 'Too many photos',
      color: 'warning',
    })
    return null
  }

  const existingTotalBytes = allCurrentPhotos.reduce(
    (sum, photo) => sum + estimateDataUrlBytes(photo?.url),
    0,
  )
  const processedFiles = []
  for (const file of photoFiles) {
    let nextFile = file
    try {
      nextFile = await compressInspectionPhoto(file, TARGET_PHOTO_BYTES)
    } catch {
      pushToast(`Unable to process "${file.name}".`, {
        title: 'Upload failed',
        color: 'danger',
      })
      return null
    }
    if (Number(nextFile.size || 0) > MAX_PHOTO_BYTES) {
      pushToast(`"${file.name}" is over 1.5 MB even after compression.`, {
        title: 'Photo too large',
        color: 'warning',
      })
      return null
    }
    processedFiles.push(nextFile)
  }

  const incomingTotalBytes = processedFiles.reduce((sum, file) => sum + Number(file.size || 0), 0)
  if (existingTotalBytes + incomingTotalBytes > MAX_TOTAL_PHOTO_BYTES) {
    pushToast('Total photo size must be 12 MB or smaller.', {
      title: 'Photos too large',
      color: 'warning',
    })
    return null
  }

  const normalizedDefaultDescription = String(defaultDescription || '').trim()
  const nextPhotos = []
  for (const file of processedFiles) {
    try {
      const url = await readFileAsDataUrl(file)
      nextPhotos.push({
        id: createPhotoId(),
        fileName: file.name,
        ...(normalizedDefaultDescription ? { description: normalizedDefaultDescription } : {}),
        url,
      })
    } catch {
      pushToast(`Unable to read "${file.name}".`, {
        title: 'Upload failed',
        color: 'danger',
      })
      return null
    }
  }

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
import {
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  getScbaFieldEvidenceKeys,
  HIGH_ANGLE_CONDITION_FIELD,
  HYDRAULIC_CHECK_FIELDS,
  normalizeScbaCustomSections,
  SCBA_SECTION_DEFINITIONS,
} from './inspectionFormHelpers'
