const SCHEMA_VERSION = 1

const CLAIM_RECORDS_BASE_KEY = 'vmecc_claim_records'
const CLAIM_DRAFTS_BASE_KEY = 'vmecc_claim_drafts'

const isEnvelope = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'version' in value &&
      'data' in value,
  )

const normalizeApprovalHistoryOrder = (entries) => {
  const rows = Array.isArray(entries)
    ? entries.filter((entry) => entry && typeof entry === 'object')
    : []
  if (rows.length < 2) return rows

  const firstAt = new Date(rows[0]?.at || rows[0]?.updatedAt || '').getTime()
  const lastAt = new Date(
    rows[rows.length - 1]?.at || rows[rows.length - 1]?.updatedAt || '',
  ).getTime()
  if (!Number.isFinite(firstAt) || !Number.isFinite(lastAt)) return rows

  return firstAt > lastAt ? [...rows].reverse() : rows
}

const normalizeClaimRecord = (record) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null
  return {
    ...record,
    approvalHistory: normalizeApprovalHistoryOrder(record.approvalHistory),
  }
}

const normalizeDraftEntry = (entry) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
  return { ...entry }
}

const decodeStoredRows = (raw) => {
  if (raw === null) return { rows: null, shouldRewrite: false }

  try {
    const parsed = JSON.parse(raw)
    if (isEnvelope(parsed)) {
      return {
        rows: Array.isArray(parsed.data) ? parsed.data : [],
        shouldRewrite: parsed.version !== SCHEMA_VERSION || !Array.isArray(parsed.data),
      }
    }
    if (Array.isArray(parsed)) {
      return { rows: parsed, shouldRewrite: true }
    }
    return { rows: [], shouldRewrite: true }
  } catch {
    return { rows: [], shouldRewrite: true }
  }
}

const writeStoredRows = (key, rows) => {
  const payload = {
    version: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data: Array.isArray(rows) ? rows : [],
  }
  try {
    localStorage.setItem(key, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

const loadRowsFromKey = (key, normalizeRow = (row) => row) => {
  try {
    const decoded = decodeStoredRows(localStorage.getItem(key))
    if (decoded.rows === null) return []

    const normalizedRows = decoded.rows
      .map((row) => normalizeRow(row))
      .filter((row) => row !== null && typeof row !== 'undefined')

    return normalizedRows
  } catch {
    return []
  }
}

const parseLegacyDraftPayload = (raw) => {
  try {
    const parsed = JSON.parse(raw)
    if (
      isEnvelope(parsed) &&
      parsed.data &&
      typeof parsed.data === 'object' &&
      !Array.isArray(parsed.data)
    ) {
      return parsed.data
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0]
      return first && typeof first === 'object' && !Array.isArray(first) ? first : null
    }
    return null
  } catch {
    return null
  }
}

export const getClaimRecordsKey = (userId) =>
  userId ? `${CLAIM_RECORDS_BASE_KEY}_${userId}` : CLAIM_RECORDS_BASE_KEY

export const getClaimDraftsKey = (userId, type) => {
  const suffix = type ? `_${type}` : ''
  return userId
    ? `${CLAIM_DRAFTS_BASE_KEY}${suffix}_${userId}`
    : `${CLAIM_DRAFTS_BASE_KEY}${suffix}`
}

export const loadClaimRecords = (userId) =>
  loadRowsFromKey(getClaimRecordsKey(userId), normalizeClaimRecord)

export const loadClaimDraftEntries = (userId, type) =>
  loadRowsFromKey(getClaimDraftsKey(userId, type), normalizeDraftEntry)

export const saveClaimDraftEntries = (userId, type, entries) => {
  const normalizedRows = (Array.isArray(entries) ? entries : [])
    .map((entry) => normalizeDraftEntry(entry))
    .filter(Boolean)
  return writeStoredRows(getClaimDraftsKey(userId, type), normalizedRows)
}

export const deleteClaimDraftEntry = (userId, draftId) => {
  if (!draftId) return false
  const types = ['expense', 'salary', 'other']
  let changed = false
  let allWritesOk = true

  types.forEach((type) => {
    const current = loadClaimDraftEntries(userId, type)
    if (!current.length) return
    const next = current.filter((entry) => entry?.id !== draftId)
    if (next.length !== current.length) {
      changed = true
      if (!saveClaimDraftEntries(userId, type, next)) {
        allWritesOk = false
      }
    }
  })

  return changed ? allWritesOk : true
}

export const loadClaimDraftEntryById = (userId, draftId) => {
  const all = [
    ...loadClaimDraftEntries(userId, 'expense'),
    ...loadClaimDraftEntries(userId, 'salary'),
    ...loadClaimDraftEntries(userId, 'other'),
  ]
  return all.find((entry) => entry?.id === draftId) || null
}

export const appendClaimDraftEntry = (userId, type, entry) => {
  const normalizedEntry = normalizeDraftEntry(entry)
  if (!normalizedEntry) return null
  const current = loadClaimDraftEntries(userId, type)
  const next = [normalizedEntry, ...current]
  return saveClaimDraftEntries(userId, type, next) ? next : null
}

export const upsertClaimDraftEntry = (userId, type, entry) => {
  const normalizedEntry = normalizeDraftEntry(entry)
  if (!normalizedEntry) return null

  if (!normalizedEntry?.id) {
    return appendClaimDraftEntry(userId, type, normalizedEntry)
  }

  const current = loadClaimDraftEntries(userId, type)
  const index = current.findIndex((item) => item?.id === normalizedEntry.id)
  if (index === -1) {
    return appendClaimDraftEntry(userId, type, normalizedEntry)
  }

  const next = [...current]
  next[index] = { ...current[index], ...normalizedEntry }
  return saveClaimDraftEntries(userId, type, next) ? next : null
}

export const saveClaimRecords = (userId, records) => {
  const normalizedRows = (Array.isArray(records) ? records : [])
    .map((record) => normalizeClaimRecord(record))
    .filter(Boolean)
  return writeStoredRows(getClaimRecordsKey(userId), normalizedRows)
}

export const generateClaimId = (records, now = new Date()) => {
  const year = now.getFullYear()
  const prefix = `CLM-${year}-`
  const maxSeq = records.reduce((max, record) => {
    if (!record?.id || !record.id.startsWith(prefix)) return max
    const seq = Number.parseInt(record.id.slice(prefix.length), 10)
    return Number.isFinite(seq) && seq > max ? seq : max
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

export const appendClaimRecord = (userId, record) => {
  const normalizedRecord = normalizeClaimRecord(record)
  if (!normalizedRecord) return null

  const current = loadClaimRecords(userId)
  const next = [normalizedRecord, ...current]
  return saveClaimRecords(userId, next) ? next : null
}

export const updateClaimRecord = (userId, recordId, updater) => {
  if (!recordId || typeof updater !== 'function') return null
  const current = loadClaimRecords(userId)
  const index = current.findIndex((record) => record?.id === recordId)
  if (index < 0) return null

  const existing = current[index]
  const updated = updater(existing)
  if (!updated) return null

  const normalized = normalizeClaimRecord({ ...existing, ...updated, id: existing.id })
  if (!normalized) return null

  const next = [...current]
  next[index] = normalized
  if (!saveClaimRecords(userId, next)) return null
  return next[index]
}

export const deleteClaimRecord = (userId, recordId) => {
  if (!recordId) return false
  const current = loadClaimRecords(userId)
  const next = current.filter((record) => record?.id !== recordId)
  return saveClaimRecords(userId, next)
}

export const generateDraftId = (type, updatedAt) => {
  const date = updatedAt ? new Date(updatedAt) : new Date()
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  const stamp = `${safeDate.getFullYear()}${String(safeDate.getMonth() + 1).padStart(2, '0')}${String(
    safeDate.getDate(),
  ).padStart(2, '0')}${String(safeDate.getHours()).padStart(2, '0')}${String(
    safeDate.getMinutes(),
  ).padStart(2, '0')}`
  return `DRAFT-${type.toUpperCase()}-${stamp}`
}

const formatPeriodLabel = (value) => {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
}

const parseAmount = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const hasExpenseDraftContent = (draftItem = {}) =>
  Boolean(
    draftItem.expenseDate ||
      draftItem.amount ||
      draftItem.attachmentName ||
      draftItem.lineNotes ||
      draftItem.fromLocation ||
      draftItem.toLocation ||
      draftItem.distanceKm ||
      draftItem.destination ||
      draftItem.tripDateFrom ||
      draftItem.tripDateTo ||
      draftItem.billedPeriod ||
      draftItem.approvalNote,
  )

const hasSalaryDraftContent = (draft = {}, draftItem = {}) =>
  Boolean(
    draftItem.claimDate ||
      draftItem.amount ||
      draftItem.attachmentName ||
      draftItem.lineNotes ||
      draftItem.totalHours ||
      draftItem.ratePerHour ||
      draftItem.effectiveMonth ||
      draft.period ||
      draft.periodConfirmed ||
      draft.payrollBaselineConfirmed ||
      draft.payrollSnapshot?.hasConfiguredBaseline ||
      parseAmount(draft.payrollSnapshot?.net) > 0 ||
      parseAmount(draft.approvedOvertimePayout) > 0 ||
      parseAmount(draft.projectedNetPayout) > 0,
  )

const buildDraftRecord = (draft, type) => {
  if (!draft) return null
  const effectiveType = draft.claimType || type
  const savedItems = Array.isArray(draft.savedItems) ? draft.savedItems : []
  const draftItem = draft.draftItem || {}
  const hasContent =
    savedItems.length > 0 ||
    (effectiveType === 'salary'
      ? hasSalaryDraftContent(draft, draftItem)
      : hasExpenseDraftContent(draftItem))
  if (!hasContent) return null

  const amount =
    savedItems.length > 0
      ? savedItems.reduce((sum, item) => sum + parseAmount(item.amount), 0)
      : parseAmount(draftItem.amount)

  const category =
    savedItems.length > 1
      ? 'Multiple'
      : savedItems.length === 1
        ? effectiveType === 'salary'
          ? savedItems[0]?.claimType || 'Salary'
          : savedItems[0]?.category || (effectiveType === 'other' ? 'Exceptional' : 'Expense')
        : effectiveType === 'salary'
          ? draftItem.claimType || 'Salary'
          : draftItem.category || (effectiveType === 'other' ? 'Exceptional' : 'Expense')

  const attachmentAvailable =
    savedItems.some((item) => item.attachmentName) || Boolean(draftItem.attachmentName)

  const updatedAt = draft.updatedAt || new Date().toISOString()

  return {
    id: draft.id || generateDraftId(effectiveType, updatedAt),
    backendId: draft.backendId || null,
    backendDraftId: draft.backendDraftId || '',
    period: formatPeriodLabel(draft.period),
    category,
    amount,
    status: 'Draft',
    submittedAt: updatedAt,
    updatedAt,
    attachmentAvailable,
    attachmentName:
      savedItems.find((item) => item.attachmentName)?.attachmentName ||
      draftItem.attachmentName ||
      '',
    notes: savedItems[0]?.lineNotes || draftItem.lineNotes || '',
    type: effectiveType,
    isDraft: true,
  }
}

const draftRecordDedupeKey = (record) => {
  const id = String(record?.id || '').trim()
  if (id) return `id:${id}`

  const signature = [
    String(record?.type || '').trim(),
    String(record?.period || '').trim(),
    String(record?.category || '').trim(),
    String(record?.submittedAt || '').trim(),
    String(record?.amount || '').trim(),
    String(record?.attachmentName || '').trim(),
    String(record?.notes || '').trim(),
  ].join('::')

  return `sig:${signature}`
}

export const loadClaimDrafts = (userId) => {
  const deduped = new Map()
  const expenseKeyLegacy = userId
    ? `vmecc_claim_draft_expense_${userId}`
    : 'vmecc_claim_draft_expense'
  const salaryKeyLegacy = userId ? `vmecc_claim_draft_salary_${userId}` : 'vmecc_claim_draft_salary'

  const pushDraft = (draft, type) => {
    const record = buildDraftRecord(draft, type)
    if (!record) return
    const key = draftRecordDedupeKey(record)
    if (!deduped.has(key)) {
      deduped.set(key, record)
    }
  }

  loadClaimDraftEntries(userId, 'expense').forEach((entry) => pushDraft(entry, 'expense'))
  loadClaimDraftEntries(userId, 'salary').forEach((entry) => pushDraft(entry, 'salary'))
  loadClaimDraftEntries(userId, 'other').forEach((entry) => pushDraft(entry, 'other'))

  const legacyExpenseRaw = localStorage.getItem(expenseKeyLegacy)
  if (legacyExpenseRaw) {
    const legacyExpense = parseLegacyDraftPayload(legacyExpenseRaw)
    pushDraft(legacyExpense, 'expense')
  }

  const legacySalaryRaw = localStorage.getItem(salaryKeyLegacy)
  if (legacySalaryRaw) {
    const legacySalary = parseLegacyDraftPayload(legacySalaryRaw)
    pushDraft(legacySalary, 'salary')
  }

  return Array.from(deduped.values())
}
