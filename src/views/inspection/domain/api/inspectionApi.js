import { apiRequest, buildApiUrl, fetchWithCsrfRetry } from 'src/services/apiClient'
import featureFlags from 'src/config/featureFlags'
import {
  loadAllInspectionRecords,
  loadInspectionRecords,
  saveInspectionRecords,
} from '../storage/inspectionStorage'
import { normalizeInspectionTypeSlug, normalizeReportRecords } from '../utils/inspectionSharedUtils'
import { WORKFLOW_SESSION_KEY } from '../storage/workflowSession'
import {
  dutyConfirmationHeaders,
  resolveInspectionDutyConfirmation,
} from './inspectionDutyContextApi'

const INSPECTION_TYPE = 'inspection'
const REPORT_API_ENABLED_TYPES_RAW = String(import.meta.env.VITE_REPORT_API_TYPES || '*')
  .split(',')
  .map((value) => normalizeInspectionTypeSlug(value))
  .filter(Boolean)

const INSPECTION_API_ENABLED =
  REPORT_API_ENABLED_TYPES_RAW.includes('*') || REPORT_API_ENABLED_TYPES_RAW.length === 0
    ? true
    : REPORT_API_ENABLED_TYPES_RAW.includes(INSPECTION_TYPE)

const assertInspectionPersistenceAvailable = () => {
  if (INSPECTION_API_ENABLED || featureFlags.reportLocalFallbackEnabled) return
  throw new Error('Inspection report API is disabled and local fallback is not enabled.')
}

const toApiStatus = (status) => {
  const value = normalizeInspectionTypeSlug(status)
  if (value === 'draft') return 'Draft'
  if (value === 'reviewed') return 'Reviewed'
  if (value === 'approved') return 'Approved'
  if (value === 'rejected') return 'Rejected'
  if (value === 'cancelled') return 'Cancelled'
  return 'Submitted'
}

export const stripInspectionWorkflowMetadata = (row) => {
  const safe = row && typeof row === 'object' ? { ...row } : {}
  delete safe.workflowSession
  delete safe[WORKFLOW_SESSION_KEY]
  delete safe.__draftMode
  delete safe.__editReportId
  return safe
}

const toPayload = (row) => {
  const safe = stripInspectionWorkflowMetadata(row)
  delete safe.id
  delete safe.version
  delete safe.revision
  delete safe.createdAt
  delete safe.updatedAt
  delete safe.recordKind
  delete safe.reportType
  delete safe.submissionKey
  delete safe.idempotentReplay
  delete safe.idempotent_replay
  delete safe.queueId
  delete safe.queueStatus
  delete safe.queuedAt
  delete safe.sourceReportUid
  delete safe.operation
  delete safe.baseVersion
  delete safe.baseRevision
  delete safe.baseServerSnapshot
  delete safe.conflictServerSnapshot
  delete safe.conflictDetectedAt
  delete safe.resolutionStatus
  delete safe.lastAttemptAt
  delete safe.nextRetryAt
  delete safe.lastError
  delete safe.history
  delete safe.attempts
  return safe
}

export const isInspectionApiEnabled = () => INSPECTION_API_ENABLED

export const fetchInspectionRecords = async ({ scope = 'mine' } = {}) => {
  assertInspectionPersistenceAvailable()
  if (!INSPECTION_API_ENABLED) return []
  const params = new URLSearchParams({ reportType: INSPECTION_TYPE })
  if (
    String(scope || '')
      .trim()
      .toLowerCase() === 'all'
  )
    params.set('scope', 'all')
  const response = await apiRequest(`/reports?${params.toString()}`)
  const rows = normalizeReportRecords(Array.isArray(response?.data) ? response.data : [])
  return rows.filter((row) => normalizeInspectionTypeSlug(row?.reportType) === INSPECTION_TYPE)
}

export const fetchInspectionChecklistSummary = async (filters = {}) => {
  assertInspectionPersistenceAvailable()
  if (!INSPECTION_API_ENABLED) {
    return {
      totalReports: 0,
      withChecklist: 0,
      withoutChecklist: 0,
      items: [],
    }
  }
  const params = new URLSearchParams()
  Object.entries(filters || {}).forEach(([key, value]) => {
    const next = String(value ?? '').trim()
    if (next && next !== 'All') params.set(key, next)
  })
  const path = `/reports/inspection/checklist-summary${params.toString() ? `?${params.toString()}` : ''}`
  const response = await apiRequest(path)
  return (
    response?.data || {
      totalReports: 0,
      withChecklist: 0,
      withoutChecklist: 0,
      items: [],
    }
  )
}

export const loadInspectionRecordsForScope = ({ userId, scope = 'mine' }) => {
  if (scope === 'all') return loadAllInspectionRecords()
  return loadInspectionRecords(userId)
}

const upsertInspectionRecordToApi = async (
  row,
  { submissionKey = '', expectedVersion, dutyConfirmationToken = '' } = {},
) => {
  if (
    !row ||
    row?.recordKind === 'draft' ||
    normalizeInspectionTypeSlug(row?.reportType) !== INSPECTION_TYPE
  ) {
    return true
  }
  const reportUid = String(row?.id || '').trim()
  if (!reportUid) return false

  const latestRows = await fetchInspectionRecords()
  const latest = latestRows.find((item) => String(item?.id || '').trim() === reportUid)
  const body = {
    display_id: String(row?.displayId || row?.id || '').trim(),
    report_type: INSPECTION_TYPE,
    payload: toPayload(row),
    status: toApiStatus(row?.status),
    submitted_at: String(row?.submittedAt || '').trim(),
    inspected_at: String(row?.inspectedAt || '').trim(),
    ...(String(submissionKey || row?.submissionKey || '').trim()
      ? { submission_key: String(submissionKey || row?.submissionKey || '').trim() }
      : {}),
  }
  const confirmationToken =
    dutyConfirmationToken ||
    (await resolveInspectionDutyConfirmation({
      operation: 'submit',
      formId: normalizeInspectionTypeSlug(row?.incidentType),
      recordId: reportUid,
      idempotencyKey: String(submissionKey || row?.submissionKey || '').trim(),
    }))

  if (!latest) {
    await apiRequest('/reports', {
      method: 'POST',
      headers: dutyConfirmationHeaders(confirmationToken),
      body: JSON.stringify({
        ...body,
        report_uid: reportUid,
      }),
    })
    return true
  }

  await apiRequest(`/reports/${encodeURIComponent(reportUid)}`, {
    method: 'PUT',
    headers: dutyConfirmationHeaders(confirmationToken),
    body: JSON.stringify({
      ...body,
      version: Number(expectedVersion || latest?.version || row?.version || 1),
    }),
  })
  return true
}

const persistInspectionRecordsToApi = async (rows) => {
  const desiredRows = (Array.isArray(rows) ? rows : []).filter(
    (row) =>
      row?.recordKind !== 'draft' &&
      normalizeInspectionTypeSlug(row?.reportType) === INSPECTION_TYPE,
  )
  for (const row of desiredRows) {
    await upsertInspectionRecordToApi(row)
  }

  return true
}

export const persistInspectionRecords = async (userId, rows) => {
  if (!userId) return false
  assertInspectionPersistenceAvailable()
  if (!INSPECTION_API_ENABLED) {
    return saveInspectionRecords(
      userId,
      (Array.isArray(rows) ? rows : []).map(stripInspectionWorkflowMetadata),
    )
  }
  const saved = await persistInspectionRecordsToApi(rows)
  if (!saved) return false
  return true
}

export const persistInspectionRecord = async (userId, row, options = {}) => {
  if (!userId || !row) return false
  assertInspectionPersistenceAvailable()
  const safeRow = stripInspectionWorkflowMetadata(row)
  if (!INSPECTION_API_ENABLED) {
    const existingRows = loadInspectionRecords(userId)
    return saveInspectionRecords(userId, [
      safeRow,
      ...existingRows.filter((item) => String(item?.id || '') !== String(safeRow?.id || '')),
    ])
  }
  await upsertInspectionRecordToApi(safeRow, options)
  return true
}

export const deleteInspectionRecord = async (
  userId,
  reportUid,
  { dutyConfirmationToken = '' } = {},
) => {
  if (!userId) return false
  const id = String(reportUid || '').trim()
  if (!id) return false
  assertInspectionPersistenceAvailable()
  if (!INSPECTION_API_ENABLED) {
    return saveInspectionRecords(
      userId,
      loadInspectionRecords(userId).filter((row) => String(row?.id || '') !== id),
    )
  }
  const confirmationToken =
    dutyConfirmationToken ||
    (await resolveInspectionDutyConfirmation({ operation: 'delete', recordId: id }))
  await apiRequest(`/reports/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: dutyConfirmationHeaders(confirmationToken),
  })
  return true
}

const transitionInspection = async ({
  reportUid,
  action,
  version,
  remarks,
  dutyConfirmationToken,
}) => {
  const recordId = String(reportUid || '').trim()
  const path = `/reports/${encodeURIComponent(recordId)}/${action}`
  const confirmationToken =
    dutyConfirmationToken ||
    (await resolveInspectionDutyConfirmation({ operation: action, recordId }))
  const response = await apiRequest(path, {
    method: 'POST',
    headers: dutyConfirmationHeaders(confirmationToken),
    body: JSON.stringify({
      version: Number(version || 0) || 1,
      remarks: String(remarks || ''),
    }),
  })
  return response?.data || null
}

export const reviewInspectionRecord = async ({
  reportUid,
  version,
  remarks = '',
  dutyConfirmationToken = '',
}) => transitionInspection({ reportUid, action: 'review', version, remarks, dutyConfirmationToken })

export const approveInspectionRecord = async ({
  reportUid,
  version,
  remarks = '',
  dutyConfirmationToken = '',
}) =>
  transitionInspection({ reportUid, action: 'approve', version, remarks, dutyConfirmationToken })

export const rejectInspectionRecord = async ({
  reportUid,
  version,
  remarks,
  dutyConfirmationToken = '',
}) => transitionInspection({ reportUid, action: 'reject', version, remarks, dutyConfirmationToken })

export const loadInspectionRecordsFromLocal = (userId) => loadInspectionRecords(userId)

export const downloadInspectionReportPdf = async (record) => {
  const reportUid = String(record?.id || '').trim()
  const reportVersion = Number(record?.version || 0) || undefined
  if (!reportUid) {
    const error = new Error('Missing report UID for download.')
    error.status = 400
    throw error
  }
  const response = await fetchWithCsrfRetry(buildApiUrl('/reports/inspection/pdf'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
    body: JSON.stringify({
      report_uid: reportUid,
      ...(reportVersion !== undefined ? { version: reportVersion } : {}),
    }),
  })

  if (!response.ok) {
    let message = 'Download failed'
    let code = ''
    try {
      const raw = await response.text()
      if (raw) {
        try {
          const payload = JSON.parse(raw)
          message = payload?.message || raw || message
          code = String(payload?.code || '').trim()
        } catch {
          message = raw
        }
      }
    } catch {
      // Ignore body parse/read failure; keep default message.
    }
    const error = new Error(message)
    error.status = response.status
    error.code = code
    throw error
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('content-disposition') || ''
  const filenameMatch = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(contentDisposition)
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : ''
  return { blob, filename: String(filename || '').trim() }
}
