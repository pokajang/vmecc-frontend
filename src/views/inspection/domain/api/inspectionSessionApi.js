import { apiRequest } from 'src/services/apiClient'
import { getFireExtinguisherCanonicalAssetKey } from '../../types/fire-extinguisher/identity'
import {
  dutyConfirmationHeaders,
  resolveInspectionDutyConfirmation,
} from './inspectionDutyContextApi'

const text = (value) => String(value || '').trim()

const queryString = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    const normalized = text(value)
    if (normalized) query.set(key, normalized)
  })
  return query.toString()
}

export const getFireExtinguisherAssetKey = (row = {}) => {
  return getFireExtinguisherCanonicalAssetKey(row)
}

export const createOrResumeInspectionSession = async ({
  inspectionType,
  zone = '',
  mainLocation = '',
  subLocation = '',
  forceNew = false,
  scope = null,
} = {}) => {
  const response = await apiRequest('/inspection/sessions', {
    method: 'POST',
    body: JSON.stringify({
      inspectionType,
      zone,
      mainLocation,
      subLocation,
      forceNew,
      ...(scope && typeof scope === 'object' ? scope : {}),
    }),
  })
  return response?.data || null
}

export const fetchInspectionSessionResults = async ({
  sessionUid,
  zone = '',
  mainLocation = '',
  subLocation = '',
} = {}) => {
  const uid = text(sessionUid)
  if (!uid) return { rows: [], meta: null }
  const query = queryString({ zone, mainLocation, subLocation })
  const response = await apiRequest(
    `/inspection/sessions/${encodeURIComponent(uid)}/extinguishers${query ? `?${query}` : ''}`,
  )
  return {
    rows: Array.isArray(response?.data) ? response.data : [],
    meta: response?.meta || null,
  }
}

export const fetchInspectionSessionProgress = async ({ sessionUid } = {}) => {
  const uid = text(sessionUid)
  if (!uid) return null
  const response = await apiRequest(`/inspection/sessions/${encodeURIComponent(uid)}`)
  return response?.data?.progress || null
}

export const fetchInspectionSession = async ({ sessionUid } = {}) => {
  const uid = text(sessionUid)
  if (!uid) return null
  const response = await apiRequest(`/inspection/sessions/${encodeURIComponent(uid)}`)
  return response?.data || null
}

export const completeInspectionSessionExtinguisher = async ({
  sessionUid,
  row,
  clientResultId = '',
  operationId = '',
  baseVersion = 0,
  forceRecheck = false,
  dutyConfirmationToken = '',
} = {}) => {
  const uid = text(sessionUid)
  const assetRouteId = text(
    row?.catalogId ||
      row?.catalog_id ||
      row?.fireExtinguisherId ||
      row?.id ||
      getFireExtinguisherAssetKey(row),
  )
  if (!uid || !assetRouteId) return null
  const confirmationToken =
    dutyConfirmationToken ||
    (await resolveInspectionDutyConfirmation({
      operation: 'session-write',
      formId: 'fire-extinguisher-inspection',
      recordId: uid,
      idempotencyKey: text(operationId || clientResultId),
    }))
  const response = await apiRequest(
    `/inspection/sessions/${encodeURIComponent(uid)}/extinguishers/${encodeURIComponent(
      assetRouteId,
    )}/complete`,
    {
      method: 'POST',
      headers: dutyConfirmationHeaders(confirmationToken),
      body: JSON.stringify({
        checkPayload: row || {},
        clientResultId,
        operationId,
        baseVersion,
        forceRecheck,
      }),
    },
  )
  return {
    row: response?.data || null,
    meta: response?.meta || null,
    operation: response?.operation || null,
  }
}

export const resetInspectionSessionExtinguisher = async ({
  sessionUid,
  row,
  operationId = '',
  baseVersion = 0,
  dutyConfirmationToken = '',
} = {}) => {
  const uid = text(sessionUid)
  const assetRouteId = text(
    row?.catalogId ||
      row?.catalog_id ||
      row?.fireExtinguisherId ||
      row?.id ||
      getFireExtinguisherAssetKey(row),
  )
  if (!uid || !assetRouteId) return null
  const confirmationToken =
    dutyConfirmationToken ||
    (await resolveInspectionDutyConfirmation({
      operation: 'session-write',
      formId: 'fire-extinguisher-inspection',
      recordId: uid,
      idempotencyKey: text(operationId),
    }))
  const response = await apiRequest(
    `/inspection/sessions/${encodeURIComponent(uid)}/extinguishers/${encodeURIComponent(
      assetRouteId,
    )}/reset`,
    {
      method: 'POST',
      headers: dutyConfirmationHeaders(confirmationToken),
      body: JSON.stringify({
        checkPayload: row || {},
        operationId,
        baseVersion,
      }),
    },
  )
  return {
    row: response?.data || null,
    meta: response?.meta || null,
    operation: response?.operation || null,
  }
}

export const submitInspectionSessionReport = async ({
  sessionUid,
  displayId = '',
  submissionKey = '',
  remarks = '',
  reportRemarks = '',
  photos = [],
  inspectedAt = '',
  submittedAt = '',
  sessionVersion = 0,
  dutyConfirmationToken = '',
} = {}) => {
  const uid = text(sessionUid)
  if (!uid) return null
  const confirmationToken =
    dutyConfirmationToken ||
    (await resolveInspectionDutyConfirmation({
      operation: 'session-submit',
      formId: 'fire-extinguisher-inspection',
      recordId: uid,
      idempotencyKey: text(submissionKey),
    }))
  const response = await apiRequest(`/inspection/sessions/${encodeURIComponent(uid)}/submit`, {
    method: 'POST',
    headers: dutyConfirmationHeaders(confirmationToken),
    body: JSON.stringify({
      display_id: displayId,
      submission_key: submissionKey,
      remarks,
      report_remarks: reportRemarks,
      photos: Array.isArray(photos) ? photos : [],
      inspected_at: inspectedAt,
      submitted_at: submittedAt,
      ...(Number(sessionVersion || 0) > 0 ? { session_version: Number(sessionVersion) } : {}),
    }),
  })
  return response?.data || null
}
