import { normalizeOvertimeType } from './utils'

const SCHEMA_VERSION = 1
const OVERTIME_RECORDS_KEY = 'vmecc_overtime_records'
const OVERTIME_DRAFT_KEY = 'vmecc_overtime_draft'

const nowIso = () => new Date().toISOString()
const buildScopedKey = (baseKey, userId) => (userId ? `${baseKey}_${userId}` : baseKey)
const cloneArray = (rows) => (Array.isArray(rows) ? rows.map((row) => ({ ...row })) : [])

const parseJson = (raw) => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const isEnvelope = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'version' in value &&
      'data' in value,
  )

const isQuotaExceededError = (error) => {
  if (!error) return false
  if (error.name === 'QuotaExceededError') return true
  return String(error?.message || '')
    .toLowerCase()
    .includes('quota')
}

const normalizeRecord = (row) => ({
  id: String(row?.id || '').trim(),
  overtimeType: normalizeOvertimeType(row?.overtimeType),
  claimDate: String(row?.claimDate || ''),
  startTime: String(row?.startTime || ''),
  endTime: String(row?.endTime || ''),
  isOvernight: Boolean(row?.isOvernight),
  durationMinutes: Number(row?.durationMinutes || 0) || 0,
  durationLabel: String(row?.durationLabel || ''),
  reason: String(row?.reason || ''),
  status: String(row?.status || 'Pending'),
  appliedAt: String(row?.appliedAt || nowIso()),
  submittedBy: String(row?.submittedBy || ''),
  workflowSnapshot:
    row?.workflowSnapshot && typeof row.workflowSnapshot === 'object' ? row.workflowSnapshot : null,
  workflowStage: String(row?.workflowStage || 'review'),
  nextActionRole: row?.nextActionRole ? String(row.nextActionRole) : null,
  applicantRoles: Array.isArray(row?.applicantRoles) ? row.applicantRoles : [],
  approvalHistory: Array.isArray(row?.approvalHistory) ? row.approvalHistory : [],
})

const normalizeRecords = (rows) =>
  cloneArray(rows)
    .map(normalizeRecord)
    .filter((row) => row.id)

const normalizeDraft = (draft) => {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null
  return {
    overtimeType: normalizeOvertimeType(draft.overtimeType),
    overtimeTypeConfirmed: Boolean(draft.overtimeTypeConfirmed),
    claimDate: String(draft.claimDate || ''),
    startTime: String(draft.startTime || ''),
    endTime: String(draft.endTime || ''),
    reason: String(draft.reason || ''),
    savedAt: String(draft.savedAt || nowIso()),
  }
}

const writeEnvelope = (key, data) => {
  const payload = {
    version: SCHEMA_VERSION,
    updatedAt: nowIso(),
    data,
  }
  try {
    localStorage.setItem(key, JSON.stringify(payload))
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error,
      quotaExceeded: isQuotaExceededError(error),
    }
  }
}

const loadEnvelope = ({ key, fallbackData, normalize }) => {
  let raw = null
  try {
    raw = localStorage.getItem(key)
  } catch (error) {
    return {
      ok: false,
      data: normalize(fallbackData),
      missing: false,
      migrated: false,
      recovered: true,
      error,
    }
  }
  if (raw === null) {
    return { ok: true, data: null, missing: true, migrated: false, recovered: false }
  }

  const fallback = normalize(fallbackData)
  const parsed = parseJson(raw)
  if (!parsed) {
    writeEnvelope(key, fallback)
    return { ok: true, data: fallback, missing: false, migrated: false, recovered: true }
  }

  if (isEnvelope(parsed)) {
    const normalized = normalize(parsed.data)
    const needsRewrite =
      JSON.stringify(normalized) !== JSON.stringify(parsed.data) ||
      parsed.version !== SCHEMA_VERSION
    if (needsRewrite) {
      writeEnvelope(key, normalized)
    }
    return { ok: true, data: normalized, missing: false, migrated: needsRewrite, recovered: false }
  }

  const migrated = normalize(parsed)
  writeEnvelope(key, migrated)
  return { ok: true, data: migrated, missing: false, migrated: true, recovered: false }
}

const loadWithFallbackKey = ({ primaryKey, fallbackKey, fallbackData, normalize }) => {
  const primary = loadEnvelope({ key: primaryKey, fallbackData, normalize })
  if (!primary.missing && primary.data !== null) return primary

  const fallback = loadEnvelope({ key: fallbackKey, fallbackData, normalize })
  if (!fallback.missing && fallback.data !== null) {
    writeEnvelope(primaryKey, fallback.data)
    return { ...fallback, recovered: true }
  }

  const seeded = normalize(fallbackData)
  writeEnvelope(primaryKey, seeded)
  return { ok: true, data: seeded, missing: false, migrated: false, recovered: false }
}

const OVERTIME_RECORDS_SCOPED_PREFIX = `${OVERTIME_RECORDS_KEY}_`
const isOvertimeRecordsStorageKey = (key) =>
  key === OVERTIME_RECORDS_KEY || key.startsWith(OVERTIME_RECORDS_SCOPED_PREFIX)

const getOwnerUserIdFromOvertimeRecordsKey = (key) => {
  if (key === OVERTIME_RECORDS_KEY) return ''
  if (key.startsWith(OVERTIME_RECORDS_SCOPED_PREFIX)) {
    return key.slice(OVERTIME_RECORDS_SCOPED_PREFIX.length)
  }
  return ''
}

const decodeOvertimeRecordsPayload = (raw) => {
  if (raw === null) {
    return { rows: null, missing: true, migrated: false, recovered: false }
  }

  const parsed = parseJson(raw)
  if (!parsed) {
    return { rows: [], missing: false, migrated: false, recovered: true }
  }

  if (isEnvelope(parsed)) {
    const rows = normalizeRecords(parsed.data)
    const needsRewrite =
      JSON.stringify(rows) !== JSON.stringify(parsed.data) || parsed.version !== SCHEMA_VERSION
    return { rows, missing: false, migrated: needsRewrite, recovered: false }
  }

  if (Array.isArray(parsed)) {
    return { rows: normalizeRecords(parsed), missing: false, migrated: true, recovered: false }
  }

  return { rows: [], missing: false, migrated: false, recovered: true }
}

export const getOvertimeRecordsKey = (userId) => buildScopedKey(OVERTIME_RECORDS_KEY, userId)
export const getOvertimeDraftKey = (userId) => buildScopedKey(OVERTIME_DRAFT_KEY, userId)

export const loadOvertimeRecords = (userId, fallbackRows = []) => {
  const primaryKey = getOvertimeRecordsKey(userId)
  const fallbackKey = getOvertimeRecordsKey()
  return loadWithFallbackKey({
    primaryKey,
    fallbackKey,
    fallbackData: fallbackRows,
    normalize: normalizeRecords,
  })
}

export const loadAllOvertimeRecords = (fallbackRows = []) => {
  const fallback = normalizeRecords(fallbackRows)
  try {
    const keys = Object.keys(localStorage).filter(isOvertimeRecordsStorageKey)
    if (keys.length === 0) {
      return {
        ok: true,
        data: fallback.map((row) => ({
          ...row,
          ownerUserId: '',
          recordKey: `::${String(row?.id || '').trim()}`,
        })),
        missing: true,
        migrated: false,
        recovered: false,
      }
    }

    let migrated = false
    let recovered = false
    const rowByRecordKey = new Map()

    keys.forEach((key) => {
      const decoded = decodeOvertimeRecordsPayload(localStorage.getItem(key))
      if (decoded?.migrated) migrated = true
      if (decoded?.recovered) recovered = true

      const ownerUserId = String(getOwnerUserIdFromOvertimeRecordsKey(key) || '')
      const rows = Array.isArray(decoded?.rows) ? decoded.rows : []

      rows.forEach((row, index) => {
        const overtimeId = String(row?.id || '').trim() || `record-${index + 1}`
        const recordKey = `${ownerUserId}::${overtimeId}`
        rowByRecordKey.set(recordKey, {
          ...row,
          id: overtimeId,
          ownerUserId,
          recordKey,
        })
      })
    })

    return {
      ok: true,
      data: Array.from(rowByRecordKey.values()),
      missing: false,
      migrated,
      recovered,
    }
  } catch (error) {
    return {
      ok: false,
      data: [],
      missing: false,
      migrated: false,
      recovered: true,
      error,
    }
  }
}

export const saveOvertimeRecords = (userId, rows) =>
  writeEnvelope(getOvertimeRecordsKey(userId), normalizeRecords(rows))

export const loadOvertimeDraft = (userId) => {
  const primaryKey = getOvertimeDraftKey(userId)
  const fallbackKey = getOvertimeDraftKey()

  const primary = loadEnvelope({
    key: primaryKey,
    fallbackData: null,
    normalize: normalizeDraft,
  })
  if (!primary.missing) return primary

  const fallback = loadEnvelope({
    key: fallbackKey,
    fallbackData: null,
    normalize: normalizeDraft,
  })
  if (!fallback.missing && fallback.data) {
    writeEnvelope(primaryKey, fallback.data)
    return { ...fallback, recovered: true }
  }

  return { ok: true, data: null, migrated: false, recovered: false }
}

export const saveOvertimeDraft = (userId, draft) =>
  writeEnvelope(getOvertimeDraftKey(userId), normalizeDraft(draft))

export const clearOvertimeDraft = (userId) => {
  try {
    localStorage.removeItem(getOvertimeDraftKey(userId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error, quotaExceeded: isQuotaExceededError(error) }
  }
}

export const generateOvertimeId = (rows, now = new Date()) => {
  const year = now.getFullYear()
  const prefix = `OT-${year}-`
  const maxSeq = (Array.isArray(rows) ? rows : []).reduce((max, row) => {
    if (!row?.id || !String(row.id).startsWith(prefix)) return max
    const seq = Number.parseInt(String(row.id).slice(prefix.length), 10)
    return Number.isFinite(seq) && seq > max ? seq : max
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}
