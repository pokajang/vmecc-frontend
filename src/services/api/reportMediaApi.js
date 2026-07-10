import {
  buildApiUrl,
  getClientId,
  getClientMode,
  getCsrfToken,
  refreshCsrfToken,
} from './httpClient'

export const REPORT_PHOTO_MAX_COUNT = 10
export const REPORT_PHOTO_MAX_BYTES = 1.5 * 1024 * 1024
export const REPORT_PHOTO_MAX_TOTAL_BYTES = 12 * 1024 * 1024
export const CAMERA_SOURCE_MAX_BYTES = 30 * 1024 * 1024
export const UPLOAD_SOURCE_MAX_BYTES = 30 * 1024 * 1024

const UNSUPPORTED_TYPES = new Set(['image/svg+xml', 'image/gif', 'image/bmp', 'image/tiff'])
const UNSUPPORTED_EXTENSIONS = /\.(svg|gif|bmp|tiff?)$/i
const RETRYABLE_STATUSES = new Set([0, 502, 503, 504])
const HTTP_FAILURE_CODES = new Map([
  [401, 'session_expired'],
  [413, 'file_too_large'],
  [419, 'csrf_expired'],
  [422, 'invalid_file'],
  [429, 'rate_limited'],
  [507, 'storage_unavailable'],
])
const createUploadId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16)
    const value = token === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

const waitForRetry = (milliseconds, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Upload cancelled', 'AbortError'))
      },
      { once: true },
    )
  })

const parsePayload = (xhr) => {
  try {
    return JSON.parse(xhr.responseText || '{}')
  } catch {
    return null
  }
}

const sendMultipart = ({ endpoint, file, fields, signal, onProgress, timeoutMs = 180000 }) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', buildApiUrl(endpoint), true)
    xhr.withCredentials = true
    xhr.timeout = timeoutMs
    xhr.setRequestHeader('Accept', 'application/json')
    const csrf = getCsrfToken()
    if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf)
    const clientId = getClientId()
    if (clientId) xhr.setRequestHeader('X-Client-Id', clientId)
    xhr.setRequestHeader('X-Client-Mode', getClientMode())
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    const fail = (status, payload = null, name = 'UploadError') => {
      const error = new Error(
        payload?.message ||
          (status === 0 ? 'Unable to reach the upload server.' : 'Photo upload failed.'),
      )
      error.name = name
      error.status = status
      error.payload = payload
      error.code =
        payload?.code ||
        (status === 0 ? 'network_error' : HTTP_FAILURE_CODES.get(status) || 'processing_failed')
      reject(error)
    }
    xhr.onload = () => {
      const payload = parsePayload(xhr)
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload)
      else fail(xhr.status, payload)
    }
    xhr.onerror = () => fail(0)
    xhr.ontimeout = () =>
      fail(0, { code: 'processing_timeout', message: 'Photo upload timed out.' }, 'TimeoutError')
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    const body = new FormData()
    body.append('file', file)
    Object.entries(fields).forEach(([key, value]) => body.append(key, String(value)))
    xhr.send(body)
  })

const uploadWithRetry = async (options, attempt = 0, csrfRetried = false) => {
  try {
    return await sendMultipart(options)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    if (error?.status === 419 && !csrfRetried) {
      await refreshCsrfToken()
      return uploadWithRetry(options, attempt, true)
    }
    if (
      (RETRYABLE_STATUSES.has(Number(error?.status || 0)) || error?.code === 'upload_busy') &&
      attempt < 1
    ) {
      options.onRetry?.(attempt + 1)
      await waitForRetry(650 + Math.floor(Math.random() * 250), options.signal)
      return uploadWithRetry(options, attempt + 1, csrfRetried)
    }
    throw error
  }
}

export const classifyReportPhotoFailure = (error) => {
  const explicitCode = String(error?.code || error?.payload?.code || '').trim()
  if (explicitCode) return explicitCode
  if (error?.name === 'AbortError') return 'aborted'
  const status = Number(error?.status || 0)
  return status ? HTTP_FAILURE_CODES.get(status) || 'processing_failed' : 'network_error'
}

export const reportPhotoFailureMessage = (code, fileName = '') => {
  const label = fileName ? `"${fileName}"` : 'Selected photo'
  const messages = {
    invalid_file: `${label} is empty or invalid.`,
    unsupported_file_type: `${label} is not a supported camera image.`,
    file_too_large: `${label} exceeds the allowed source size.`,
    image_dimensions_too_large: `${label} has dimensions that are too large to process safely.`,
    image_decode_failed: `${label} could not be decoded.`,
    processing_timeout: `${label} took too long to process.`,
    rate_limited: 'Too many photo uploads. Wait briefly and retry.',
    storage_unavailable: 'Photo storage is temporarily unavailable. Try again later.',
    storage_quota_exceeded: 'Temporary photo storage is full. Remove unused photos and retry.',
    upload_busy: 'Another photo is still being processed. Wait briefly and retry.',
    thumbnail_failed: 'The server could not create a safe photo preview. Retry the upload.',
    network_error: 'Photo upload failed because the server could not be reached.',
    session_expired: 'Your session expired before the photo could be uploaded. Sign in and retry.',
    csrf_expired: 'The secure upload token could not be refreshed. Reload the form and retry.',
    aborted: 'Photo upload was cancelled.',
  }
  return messages[code] || `${label} could not be processed.`
}

export const validateReportPhotoFile = (file, source = 'upload') => {
  const name = String(file?.name || '')
  const type = String(file?.type || '').toLowerCase()
  const size = Number(file?.size || 0)
  if (!file || !Number.isFinite(size) || size <= 0) return 'invalid_file'
  if (UNSUPPORTED_TYPES.has(type) || UNSUPPORTED_EXTENSIONS.test(name))
    return 'unsupported_file_type'
  if (type && !type.startsWith('image/') && type !== 'application/octet-stream')
    return 'unsupported_file_type'
  return size > (source === 'camera' ? CAMERA_SOURCE_MAX_BYTES : UPLOAD_SOURCE_MAX_BYTES)
    ? 'file_too_large'
    : ''
}

export const uploadReportPhoto = async ({
  file,
  module,
  source = 'upload',
  signal,
  onProgress,
  onRetry,
  uploadId = createUploadId(),
} = {}) => {
  const validationCode = validateReportPhotoFile(file, source)
  if (validationCode) {
    const error = new Error(reportPhotoFailureMessage(validationCode, file?.name))
    error.code = validationCode
    throw error
  }
  try {
    const response = await uploadWithRetry({
      endpoint: '/report-media',
      file,
      fields: { module, source, upload_id: uploadId },
      signal,
      onProgress,
      onRetry,
    })
    const row = response?.data || {}
    return {
      mediaId: String(row.media_id || ''),
      url: buildApiUrl(String(row.url || `/report-media/${row.media_id}`)),
      thumbnailUrl: row.thumbnail_url ? buildApiUrl(String(row.thumbnail_url)) : '',
      fileName: String(row.file_name || file.name || 'photo.jpg'),
      mimeType: String(row.mime_type || 'image/jpeg'),
      sizeBytes: Number(row.size_bytes || 0),
      width: Number(row.width || 0),
      height: Number(row.height || 0),
      thumbnailSizeBytes: Number(row.thumbnail_size_bytes || 0),
      thumbnailWidth: Number(row.thumbnail_width || 0),
      thumbnailHeight: Number(row.thumbnail_height || 0),
      checksumSha256: String(row.checksum_sha256 || ''),
      uploadId,
    }
  } catch (error) {
    error.code = classifyReportPhotoFailure(error)
    throw error
  }
}

export const uploadLeaveAttachmentFile = async ({
  file,
  source = 'upload',
  signal,
  onProgress,
  onRetry,
  uploadId = createUploadId(),
} = {}) => {
  const response = await uploadWithRetry({
    endpoint: '/leave/attachments',
    file,
    fields: { source, upload_id: uploadId },
    signal,
    onProgress,
    onRetry,
  })
  return response?.data || null
}

export const uploadReportPhotosSequentially = async ({
  files,
  module,
  source,
  signal,
  onFailure,
  onProgress,
  onRetry,
}) => {
  const photos = []
  const rows = Array.from(files || [])
  for (let index = 0; index < rows.length; index += 1) {
    if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')
    const file = rows[index]
    try {
      photos.push(
        await uploadReportPhoto({
          file,
          module,
          source,
          signal,
          onProgress: (percent) => onProgress?.({ index, count: rows.length, percent }),
          onRetry: () => onRetry?.({ index, count: rows.length }),
        }),
      )
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      onFailure?.({
        code: classifyReportPhotoFailure(error),
        message: error.message,
        fileName: file?.name,
      })
    }
  }
  return photos
}

export const deleteReportMedia = async (mediaId) => {
  if (!mediaId) return
  try {
    const xhr = new XMLHttpRequest()
    xhr.open('DELETE', buildApiUrl(`/report-media/${encodeURIComponent(mediaId)}`), true)
    xhr.withCredentials = true
    const csrf = getCsrfToken()
    if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf)
    xhr.send()
  } catch {
    /* pruning removes abandoned media */
  }
}

export const getReportPhotoBytes = (photo = {}) => {
  const managedSize = Number(photo?.sizeBytes || photo?.size_bytes || 0)
  if (managedSize > 0) return managedSize
  const match = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/is.exec(String(photo?.url || ''))
  if (!match) return 0
  const base64 = match[1].replace(/\s+/g, '')
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}
