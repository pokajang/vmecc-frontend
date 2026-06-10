import { BadgeDollarSign, ReceiptText, ShieldCheck } from 'lucide-react'

export const LOCAL_AUTOSAVE_KEY_PREFIX = 'payroll-claim-autosave'
export const LOCAL_AUTOSAVE_DELAY_MS = 450
export const API_AUTOSAVE_DELAY_MS = 1800
export const API_AUTOSAVE_MAX_RETRIES = 4
export const API_AUTOSAVE_RETRY_BASE_MS = 1200
export const API_AUTOSAVE_MAX_BACKOFF_MS = 12000
export const PAYROLL_ATTACHMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024
export const PAYROLL_ATTACHMENT_MAX_SIZE_MB = 25
export const PAYROLL_ATTACHMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]
export const PAYROLL_ATTACHMENT_ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
export const PAYROLL_ATTACHMENT_ACCEPT = PAYROLL_ATTACHMENT_ALLOWED_EXTENSIONS.join(',')

export const CLAIM_TYPE_META = {
  salary: { label: 'Salary Claim', icon: BadgeDollarSign },
  expense: { label: 'Expense Claim', icon: ReceiptText },
  other: { label: 'Exceptional Claim', icon: ShieldCheck },
}

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(value || 0)

export const parseAmount = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const buildLocalAutosaveKey = (userId, type) =>
  `${LOCAL_AUTOSAVE_KEY_PREFIX}:${String(userId || 'anon').trim() || 'anon'}:${String(type || '').trim() || 'expense'}`

export const parseTimestamp = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return 0
  const time = new Date(raw).getTime()
  return Number.isFinite(time) ? time : 0
}

export const formatSyncTime = (value) => {
  const time = parseTimestamp(value)
  if (!time) return ''
  return new Date(time).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const generateSubmissionKey = (type = 'expense', userId = '') => {
  const normalizedType = String(type || 'expense')
    .trim()
    .toLowerCase()
  const normalizedUser = String(userId || 'anon').trim() || 'anon'
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${normalizedType}:${normalizedUser}:${randomPart}`
}

export const validatePayrollAttachmentFile = (file) => {
  if (!(file instanceof File)) {
    return { ok: false, message: 'Select a valid file to attach.' }
  }

  const normalizedName = String(file.name || '')
    .trim()
    .toLowerCase()
  const normalizedMime = String(file.type || '')
    .trim()
    .toLowerCase()
  const hasAllowedExtension = PAYROLL_ATTACHMENT_ALLOWED_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension),
  )
  const hasAllowedMime = PAYROLL_ATTACHMENT_ALLOWED_MIME_TYPES.includes(normalizedMime)

  if (!hasAllowedExtension || !hasAllowedMime) {
    return {
      ok: false,
      message: `Only PDF, JPG, JPEG, and PNG files are allowed.`,
    }
  }

  const fileSize = Number(file.size || 0) || 0
  if (fileSize <= 0) {
    return { ok: false, message: 'The selected file is empty.' }
  }
  if (fileSize > PAYROLL_ATTACHMENT_MAX_SIZE_BYTES) {
    return {
      ok: false,
      message: `File size must not exceed ${PAYROLL_ATTACHMENT_MAX_SIZE_MB} MB.`,
    }
  }

  return { ok: true, message: '' }
}

export const getAttachmentKind = (item = {}) => {
  const mime = String(item?.attachmentMimeType || '')
    .trim()
    .toLowerCase()
  const name = String(item?.attachmentName || '')
    .trim()
    .toLowerCase()
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return 'image'
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  return 'file'
}
