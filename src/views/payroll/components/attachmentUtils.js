import {
  deleteWorkflowAttachment,
  downloadWorkflowAttachment,
  uploadWorkflowAttachment,
} from 'src/services/apiClient'
import { validatePayrollAttachmentFile } from './claim-form/utils/claimFormUtils'

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      resolve('')
      return
    }

    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

export const buildAttachmentPayloadFromFile = async (file) => {
  if (!(file instanceof File)) return null
  const dataUrl = await readFileAsDataUrl(file)
  return {
    attachmentName: String(file.name || '').trim(),
    attachmentMimeType: String(file.type || '').trim(),
    attachmentSizeBytes: Number(file.size || 0) || 0,
    attachmentDataUrl: dataUrl,
  }
}

const dataUrlToFile = async ({ attachmentDataUrl, attachmentName, attachmentMimeType }) => {
  if (!attachmentDataUrl) return null
  const response = await fetch(attachmentDataUrl)
  const blob = await response.blob()
  const mimeType = String(attachmentMimeType || blob.type || '').trim()
  return new File([blob], attachmentName || 'attachment', {
    type: mimeType || 'application/octet-stream',
  })
}

export const extractAttachmentPayload = (source) => {
  if (!source || typeof source !== 'object') return null

  const candidate = source.raw && typeof source.raw === 'object' ? source.raw : source
  const attachmentId =
    Number(
      candidate.attachmentId ||
        candidate.attachment_id ||
        candidate?.attachment?.id ||
        source.attachmentId ||
        source.attachment_id ||
        source?.attachment?.id ||
        0,
    ) || null
  const attachmentName = String(candidate.attachmentName || source.attachmentName || '').trim()
  const attachmentDataUrl = String(
    candidate.attachmentDataUrl || source.attachmentDataUrl || '',
  ).trim()
  const attachmentMimeType = String(
    candidate.attachmentMimeType || source.attachmentMimeType || '',
  ).trim()
  const attachmentSizeBytes = Number(
    candidate.attachmentSizeBytes || source.attachmentSizeBytes || 0,
  )

  if (!attachmentName && !attachmentDataUrl) return null
  return {
    attachmentId,
    attachmentName: attachmentName || 'attachment',
    attachmentDataUrl,
    attachmentMimeType,
    attachmentSizeBytes: Number.isFinite(attachmentSizeBytes) ? attachmentSizeBytes : 0,
  }
}

const triggerDownload = (href, downloadName) => {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = downloadName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

export const downloadAttachmentPayload = (payload, fallbackName = 'attachment') => {
  const normalized = extractAttachmentPayload(payload)
  if (!normalized?.attachmentDataUrl) return false
  triggerDownload(normalized.attachmentDataUrl, normalized.attachmentName || fallbackName)
  return true
}

export const uploadAttachmentPayloadToApi = async (payload) => {
  const normalized = extractAttachmentPayload(payload)
  if (!normalized?.attachmentDataUrl || !normalized?.attachmentName) return null
  const file = await dataUrlToFile(normalized)
  if (!file) return null
  const validation = validatePayrollAttachmentFile(file)
  if (!validation.ok) {
    const error = new Error(validation.message || 'Attachment validation failed')
    error.code = 'INVALID_ATTACHMENT'
    throw error
  }
  const result = await uploadWorkflowAttachment(file)
  const attachment = result?.data || null
  if (!attachment?.id) return null
  return {
    attachmentId: Number(attachment.id),
    attachmentName: attachment.original_name || normalized.attachmentName,
    attachmentMimeType: attachment.mime_type || normalized.attachmentMimeType || '',
    attachmentSizeBytes: Number(attachment.size || normalized.attachmentSizeBytes || 0) || 0,
    attachmentOwnerId: attachment.owner_id || attachment.ownerId || null,
    attachmentAccessToken: attachment.access_token || attachment.accessToken || '',
    uploadState: 'uploaded',
    needsReattach: false,
  }
}

export const uploadWorkflowAttachmentFileToApi = async (file) => {
  if (!(file instanceof File)) return null
  const validation = validatePayrollAttachmentFile(file)
  if (!validation.ok) {
    const error = new Error(validation.message || 'Attachment validation failed')
    error.code = 'INVALID_ATTACHMENT'
    throw error
  }
  const result = await uploadWorkflowAttachment(file)
  const attachment = result?.data || null
  if (!attachment?.id) return null
  return {
    attachmentId: Number(attachment.id),
    attachmentName: attachment.original_name || String(file.name || '').trim(),
    attachmentMimeType: attachment.mime_type || String(file.type || '').trim(),
    attachmentSizeBytes: Number(attachment.size || file.size || 0) || 0,
    attachmentOwnerId: attachment.owner_id || attachment.ownerId || null,
    attachmentAccessToken: attachment.access_token || attachment.accessToken || '',
    uploadState: 'uploaded',
    needsReattach: false,
  }
}

export const downloadWorkflowAttachmentToBrowser = async (attachmentId, fallbackName = '') => {
  if (!attachmentId) return false
  const result = await downloadWorkflowAttachment(attachmentId)
  if (!result?.blob) return false
  const objectUrl = URL.createObjectURL(result.blob)
  try {
    triggerDownload(objectUrl, result.filename || fallbackName || `attachment-${attachmentId}`)
    return true
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export const loadWorkflowAttachmentForPreview = async (attachmentId) => {
  if (!attachmentId) return null
  const result = await downloadWorkflowAttachment(attachmentId)
  if (!result?.blob) return null
  return {
    objectUrl: URL.createObjectURL(result.blob),
    contentType: String(result.contentType || '').trim(),
    filename: String(result.filename || '').trim(),
  }
}

export const releaseWorkflowAttachmentFromApi = async (attachmentId) => {
  const id = Number(attachmentId || 0) || 0
  if (!id) return false
  try {
    await deleteWorkflowAttachment(id)
    return true
  } catch {
    return false
  }
}

export const downloadJsonFile = (filename, data) => {
  const normalizedName = String(filename || 'download.json').trim() || 'download.json'
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  try {
    triggerDownload(objectUrl, normalizedName)
    return true
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
