import { apiRequest } from 'src/services/apiClient'
import { downloadReportPdf } from 'src/services/api/reportPdfApi'
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
  delete safe.displayId
  delete safe.ownerUserId
  delete safe.status
  delete safe.timeline
  delete safe.createdAt
  delete safe.updatedAt
  delete safe.submittedAt
  delete safe.submittedBy
  delete safe.report_uid
  delete safe.display_id
  delete safe.owner_user_id
  delete safe.created_at
  delete safe.updated_at
  delete safe.submitted_at
  delete safe.submitted_by
  delete safe.canDownloadPdf
  delete safe.canReview
  delete safe.canApprove
  delete safe.canReject
  delete safe.can_review
  delete safe.can_approve
  delete safe.can_reject
  delete safe.can_download_pdf
  delete safe.recordActionsVersion
  delete safe.recordActions
  delete safe.record_actions_version
  delete safe.record_actions
  delete safe.workflowStage
  delete safe.workflowSnapshot
  delete safe.nextActionRole
  delete safe.scopeTeamId
  delete safe.approvalHistory
  delete safe.workflow_stage
  delete safe.workflow_snapshot
  delete safe.next_action_role
  delete safe.scope_team_id
  delete safe.approval_history
  delete safe.submissionKey
  delete safe.sourceDraftId
  delete safe.source_draft_id
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

export const fetchInspectionRecords = async ({
  scope = 'mine',
  action = '',
  status = '',
  teamId = null,
  dateFrom = '',
  dateTo = '',
} = {}) => {
  assertInspectionPersistenceAvailable()
  if (!INSPECTION_API_ENABLED) return []
  const params = new URLSearchParams({ reportType: INSPECTION_TYPE })
  const normalizedScope = String(scope || '')
    .trim()
    .toLowerCase()
  if (normalizedScope) params.set('scope', normalizedScope)
  if (action) params.set('action', String(action))
  if (status) params.set('status', String(status))
  if (Number(teamId || 0) > 0) params.set('team_id', String(teamId))
  if (dateFrom) params.set('date_from', String(dateFrom))
  if (dateTo) params.set('date_to', String(dateTo))
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
  {
    submissionKey = '',
    sourceDraftId = '',
    expectedVersion,
    dutyConfirmationToken = '',
    isUpdate = false,
  } = {},
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

  let latest = null
  if (isUpdate) {
    try {
      const response = await apiRequest(`/reports/${encodeURIComponent(reportUid)}`)
      latest = normalizeReportRecords(response?.data ? [response.data] : [])[0] || null
    } catch (requestError) {
      if (Number(requestError?.status || 0) !== 404) throw requestError
      const error = new Error(
        'The inspection being edited no longer exists. Refresh the report list.',
      )
      error.code = 'inspection_update_target_missing'
      error.status = 404
      throw error
    }
    if (!latest) {
      const error = new Error(
        'The inspection being edited could not be loaded. Refresh the report list.',
      )
      error.code = 'inspection_update_target_missing'
      error.status = 404
      throw error
    }
  } else {
    const latestRows = await fetchInspectionRecords()
    latest = latestRows.find((item) => String(item?.id || '').trim() === reportUid) || null
  }
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
    ...(String(sourceDraftId || row?.sourceDraftId || row?.source_draft_id || '').trim()
      ? {
          source_draft_id: String(
            sourceDraftId || row?.sourceDraftId || row?.source_draft_id || '',
          ).trim(),
        }
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
  if (!reportUid) {
    const error = new Error('Missing report UID for download.')
    error.status = 400
    throw error
  }
  return downloadReportPdf({ endpoint: '/reports/inspection/pdf', reportUid })
}
