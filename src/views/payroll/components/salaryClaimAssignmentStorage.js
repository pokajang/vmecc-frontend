const SCHEMA_VERSION = 1

const SALARY_ASSIGNMENTS_KEY = 'vmecc_salary_claim_assignments'
const SALARY_ASSIGNMENT_HISTORY_KEY = 'vmecc_salary_claim_assignment_history'
const SALARY_ASSIGNMENT_DRAFTS_KEY = 'vmecc_salary_claim_assignment_drafts'

const isEnvelope = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'version' in value &&
      'data' in value,
  )

export const getSalaryAssignmentsKey = (userId) =>
  userId ? `${SALARY_ASSIGNMENTS_KEY}_${userId}` : SALARY_ASSIGNMENTS_KEY

export const getSalaryAssignmentHistoryKey = (userId) =>
  userId ? `${SALARY_ASSIGNMENT_HISTORY_KEY}_${userId}` : SALARY_ASSIGNMENT_HISTORY_KEY

export const getSalaryAssignmentDraftsKey = (userId) =>
  userId ? `${SALARY_ASSIGNMENT_DRAFTS_KEY}_${userId}` : SALARY_ASSIGNMENT_DRAFTS_KEY

const decodeStoredArray = (raw) => {
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

const writeStoredArray = (key, rows) => {
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

const readStoredArray = (key, normalizeRow = (row) => row) => {
  try {
    const decoded = decodeStoredArray(localStorage.getItem(key))
    if (decoded.rows === null) return null

    const normalizedRows = decoded.rows
      .map((row) => normalizeRow(row))
      .filter((row) => row !== null && typeof row !== 'undefined')

    return normalizedRows
  } catch {
    return null
  }
}

const parseAmount = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeAllowanceEntry = (entry, index = 0, rowId = '') => {
  const amount = parseAmount(entry?.amount)
  return {
    id: entry?.id || `allow-${String(rowId || 'legacy')}-${index + 1}`,
    name: String(entry?.name || '').trim(),
    amount,
  }
}

const normalizeNotesHistory = (row = {}) => {
  const normalized = Array.isArray(row?.notesHistory)
    ? row.notesHistory
        .map((entry, index) => {
          const text = String(entry?.text || '').trim()
          if (!text) return null
          return {
            id: String(entry?.id || '').trim() || `remark-${index + 1}`,
            text,
            createdAt: String(entry?.createdAt || '').trim(),
            createdBy: String(entry?.createdBy || '').trim(),
            updatedAt: String(entry?.updatedAt || '').trim(),
            updatedBy: String(entry?.updatedBy || '').trim(),
          }
        })
        .filter(Boolean)
    : []
  if (normalized.length > 0) return normalized
  const legacyText = String(row?.notes || '').trim()
  if (!legacyText) return []
  return [
    {
      id: 'remark-legacy',
      text: legacyText,
      createdAt: String(row?.notesUpdatedAt || row?.updatedAt || '').trim(),
      createdBy: String(row?.notesUpdatedBy || row?.updatedBy || '').trim(),
      updatedAt: '',
      updatedBy: '',
    },
  ]
}

const normalizeSalaryAssignmentRow = (row = {}) => {
  const fixedAllowances = parseAmount(row?.fixedAllowances)
  let allowances = Array.isArray(row?.allowances)
    ? row.allowances.map((entry, index) => normalizeAllowanceEntry(entry, index, row?.id))
    : []
  if (allowances.length === 0 && fixedAllowances > 0) {
    allowances = [
      {
        id: `allow-${String(row?.id || 'legacy')}-1`,
        name: 'Allowance',
        amount: fixedAllowances,
      },
    ]
  }

  const allowanceTotal =
    allowances.length > 0
      ? allowances.reduce((sum, entry) => sum + parseAmount(entry.amount), 0)
      : fixedAllowances
  const employeeContributions = {
    epf: parseAmount(row?.employeeContributions?.epf ?? row?.epf),
    perkeso: parseAmount(row?.employeeContributions?.perkeso ?? row?.perkeso),
    sip: parseAmount(row?.employeeContributions?.sip ?? row?.sip),
  }
  const employerContributions = {
    epf: parseAmount(row?.employerContributions?.epf),
    perkeso: parseAmount(row?.employerContributions?.perkeso),
    sip: parseAmount(row?.employerContributions?.sip),
  }

  return {
    ...row,
    status: String(row?.status || '').trim() || 'Active',
    allowances,
    notesHistory: normalizeNotesHistory(row),
    allowanceTotal,
    employeeContributions,
    employerContributions,
    fixedAllowances: allowanceTotal,
    epf: employeeContributions.epf,
    perkeso: employeeContributions.perkeso,
    sip: employeeContributions.sip,
  }
}

const normalizeSalaryAssignmentDraftRecord = (record = {}) => {
  const nowIso = new Date().toISOString()
  const draftData =
    record?.draftData && typeof record.draftData === 'object' ? { ...record.draftData } : {}
  return {
    id:
      String(record?.id || '').trim() ||
      `sad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(record?.name || '').trim() || 'Untitled draft',
    status: 'Draft',
    savedAt: record?.savedAt || nowIso,
    updatedAt: record?.updatedAt || record?.savedAt || nowIso,
    updatedBy: String(record?.updatedBy || '').trim(),
    sourceAssignmentId: String(record?.sourceAssignmentId || '').trim(),
    draftData,
  }
}

const assignmentSignature = (row) =>
  [
    String(row?.employeeId || '').trim(),
    String(row?.employee || '')
      .trim()
      .toLowerCase(),
    String(row?.email || '')
      .trim()
      .toLowerCase(),
    String(row?.effectiveFrom || '').trim(),
  ].join('::')

const saveRowsToPrimaryAndShared = (primaryKey, sharedKey, rows) => {
  const primaryOk = writeStoredArray(primaryKey, rows)
  if (primaryKey === sharedKey) return primaryOk
  const sharedOk = writeStoredArray(sharedKey, rows)
  return primaryOk && sharedOk
}

export const saveSalaryAssignments = (userId, rows) => {
  const key = getSalaryAssignmentsKey(userId)
  const sharedKey = getSalaryAssignmentsKey()
  const normalizedRows = Array.isArray(rows)
    ? rows.map((row) => normalizeSalaryAssignmentRow(row))
    : []
  return saveRowsToPrimaryAndShared(key, sharedKey, normalizedRows)
}

export const loadSalaryAssignments = (userId, fallbackRows = []) => {
  const key = getSalaryAssignmentsKey(userId)
  const sharedKey = getSalaryAssignmentsKey()

  const primary = readStoredArray(key, normalizeSalaryAssignmentRow)
  if (primary) return primary

  const shared = readStoredArray(sharedKey, normalizeSalaryAssignmentRow)
  if (shared) {
    if (userId) {
      writeStoredArray(key, shared)
    }
    return shared
  }

  const seeded = Array.isArray(fallbackRows)
    ? fallbackRows.map((row) => normalizeSalaryAssignmentRow(row))
    : []
  saveSalaryAssignments(userId, seeded)
  return seeded
}

export const loadSalaryAssignmentDrafts = (userId) => {
  const key = getSalaryAssignmentDraftsKey(userId)
  const sharedKey = getSalaryAssignmentDraftsKey()

  const primary = readStoredArray(key, normalizeSalaryAssignmentDraftRecord)
  if (primary) return primary

  const shared = readStoredArray(sharedKey, normalizeSalaryAssignmentDraftRecord)
  if (shared) {
    if (userId) {
      saveSalaryAssignmentDrafts(userId, shared)
    }
    return shared
  }

  return []
}

export const saveSalaryAssignmentDrafts = (userId, rows) => {
  const key = getSalaryAssignmentDraftsKey(userId)
  const sharedKey = getSalaryAssignmentDraftsKey()
  const normalizedRows = Array.isArray(rows)
    ? rows.map((row) => normalizeSalaryAssignmentDraftRecord(row))
    : []
  return saveRowsToPrimaryAndShared(key, sharedKey, normalizedRows)
}

export const loadSalaryAssignmentDraftById = (userId, draftId) => {
  const normalizedId = String(draftId || '').trim()
  if (!normalizedId) return null
  return (
    loadSalaryAssignmentDrafts(userId).find((row) => String(row?.id || '') === normalizedId) || null
  )
}

export const upsertSalaryAssignmentDraft = (userId, draftRecord) => {
  const normalized = normalizeSalaryAssignmentDraftRecord(draftRecord)
  const current = loadSalaryAssignmentDrafts(userId)
  const exists = current.some((row) => row.id === normalized.id)
  const next = exists
    ? current.map((row) => (row.id === normalized.id ? { ...row, ...normalized } : row))
    : [normalized, ...current]
  return {
    ok: saveSalaryAssignmentDrafts(userId, next),
    row: normalized,
    rows: next,
  }
}

export const deleteSalaryAssignmentDraft = (userId, draftId) => {
  const normalizedId = String(draftId || '').trim()
  if (!normalizedId) return { ok: false, rows: loadSalaryAssignmentDrafts(userId) }
  const current = loadSalaryAssignmentDrafts(userId)
  const next = current.filter((row) => String(row?.id || '') !== normalizedId)
  return {
    ok: saveSalaryAssignmentDrafts(userId, next),
    rows: next,
  }
}

export const renameSalaryAssignmentDraft = (userId, draftId, name) => {
  const normalizedId = String(draftId || '').trim()
  const normalizedName = String(name || '').trim()
  if (!normalizedId || !normalizedName) return { ok: false, row: null }
  const current = loadSalaryAssignmentDrafts(userId)
  let target = null
  const next = current.map((row) => {
    if (String(row?.id || '') !== normalizedId) return row
    target = {
      ...row,
      name: normalizedName,
      updatedAt: new Date().toISOString(),
    }
    return target
  })
  if (!target) return { ok: false, row: null }
  return {
    ok: saveSalaryAssignmentDrafts(userId, next),
    row: target,
    rows: next,
  }
}

export const loadSharedSalaryAssignments = () => {
  try {
    const keys = Object.keys(localStorage).filter(
      (key) => key === SALARY_ASSIGNMENTS_KEY || key.startsWith(`${SALARY_ASSIGNMENTS_KEY}_`),
    )
    if (!keys.length) return []

    const mergedBySignature = new Map()
    keys.forEach((key) => {
      const rows = readStoredArray(key, normalizeSalaryAssignmentRow)
      if (!rows) return
      rows.forEach((row) => {
        const normalizedRow = normalizeSalaryAssignmentRow(row)
        mergedBySignature.set(assignmentSignature(normalizedRow), { ...normalizedRow })
      })
    })

    return Array.from(mergedBySignature.values())
  } catch {
    return []
  }
}

export const saveSalaryAssignmentHistory = (userId, rows) => {
  const key = getSalaryAssignmentHistoryKey(userId)
  const sharedKey = getSalaryAssignmentHistoryKey()
  return saveRowsToPrimaryAndShared(key, sharedKey, Array.isArray(rows) ? rows : [])
}

export const loadSalaryAssignmentHistory = (userId) => {
  const key = getSalaryAssignmentHistoryKey(userId)
  const sharedKey = getSalaryAssignmentHistoryKey()

  const primary = readStoredArray(key, (row) => row)
  if (primary) return primary

  const shared = readStoredArray(sharedKey, (row) => row)
  if (shared) {
    if (userId) {
      writeStoredArray(key, shared)
    }
    return shared
  }

  return []
}
