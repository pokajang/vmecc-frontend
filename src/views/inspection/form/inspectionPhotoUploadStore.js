import {
  loadOfflineValue,
  offlineStoreKeys,
  removeOfflineValue,
  saveOfflineValue,
} from '../domain/offline/inspectionOfflineStore'

const text = (value) => String(value || '').trim()

const serializeUploadTarget = (target = {}) => ({
  kind: text(target.kind) || 'root',
  issueId: text(target.issueId),
  sectionKey: text(target.sectionKey),
  photosKey: text(target.photosKey),
  defaultDescription: text(target.defaultDescription),
  caption: text(target.caption),
  row:
    target?.row && typeof target.row === 'object'
      ? JSON.parse(JSON.stringify(target.row))
      : undefined,
})

const isPersistableFile = (file) =>
  typeof Blob !== 'undefined' && file instanceof Blob && Number(file.size || 0) > 0

const normalizeRecoveredFile = (item = {}) => {
  if (!isPersistableFile(item.file)) return null
  if (typeof File !== 'undefined' && item.file instanceof File) return item.file
  if (typeof File === 'undefined') return item.file
  return new File([item.file], text(item.fileName) || 'inspection-photo.jpg', {
    type: text(item.mimeType) || text(item.file?.type) || 'application/octet-stream',
    lastModified: Number(item.lastModified || Date.now()),
  })
}

const normalizeRecoveredItem = (item = {}) => {
  const file = normalizeRecoveredFile(item)
  const clientUploadId = text(item.clientUploadId)
  const batchId = text(item.batchId)
  if (!file || !clientUploadId || !batchId) return null
  return {
    batchId,
    clientUploadId,
    index: Math.max(0, Number(item.index || 0) || 0),
    count: Math.max(1, Number(item.count || 1) || 1),
    file,
    fileName: text(item.fileName) || text(file.name) || 'Inspection photo',
    mimeType: text(item.mimeType) || text(file.type),
    sizeBytes: Math.max(0, Number(item.sizeBytes || file.size || 0) || 0),
    lastModified: Math.max(0, Number(item.lastModified || file.lastModified || 0) || 0),
    source: item.source === 'camera' ? 'camera' : 'upload',
    status: 'failed',
    percent: 0,
    failure: {
      code: 'interrupted_upload',
      message: 'This upload was interrupted. Retry to continue without selecting the photo again.',
    },
    uploadTarget: serializeUploadTarget(item.uploadTarget),
  }
}

const storeKey = (userId, scopeKey) => offlineStoreKeys.photoUploads(userId, scopeKey)

export const loadInspectionPhotoUploadQueue = async ({ userId, scopeKey }) => {
  const record = await loadOfflineValue(storeKey(userId, scopeKey), { value: [] })
  return (Array.isArray(record?.value) ? record.value : [])
    .map(normalizeRecoveredItem)
    .filter(Boolean)
}

export const saveInspectionPhotoUploadQueue = async ({ userId, scopeKey, items }) => {
  const rows = (Array.isArray(items) ? items : [])
    .filter(
      (item) =>
        item?.status !== 'uploaded' &&
        item?.status !== 'cancelled' &&
        isPersistableFile(item?.file),
    )
    .map((item) => ({
      batchId: text(item.batchId),
      clientUploadId: text(item.clientUploadId),
      index: item.index,
      count: item.count,
      file: item.file,
      fileName: text(item.fileName),
      mimeType: text(item.mimeType),
      sizeBytes: Number(item.sizeBytes || item.file?.size || 0),
      lastModified: Number(item.file?.lastModified || 0),
      source: item.source === 'camera' ? 'camera' : 'upload',
      status: item.status,
      uploadTarget: serializeUploadTarget(item.uploadTarget),
    }))

  if (rows.length === 0) {
    await removeOfflineValue(storeKey(userId, scopeKey))
    return { persisted: true, count: 0 }
  }

  const result = await saveOfflineValue(storeKey(userId, scopeKey), rows)
  return { persisted: result.persisted, count: rows.length }
}

export const clearInspectionPhotoUploadQueue = ({ userId, scopeKey }) =>
  removeOfflineValue(storeKey(userId, scopeKey))
