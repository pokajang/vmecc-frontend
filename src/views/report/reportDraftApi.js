import { apiRequest } from 'src/services/apiClient'
import { normalizeReportTypeSlug } from './utils'

const normalizeType = (value) => normalizeReportTypeSlug(value)

export const fetchReportDraft = async ({ reportTypeSlug }) => {
  const reportType = normalizeType(reportTypeSlug)
  if (!reportType) return null
  const response = await apiRequest(`/reports/draft?report_type=${encodeURIComponent(reportType)}`)
  const row = response?.data
  if (!row || typeof row !== 'object') return null
  return {
    id: row.id,
    reportType,
    savedAt: row.saved_at || row.payload?.savedAt || '',
    payload: row.payload || {},
  }
}

export const saveReportDraftApi = async ({ reportTypeSlug, payload }) => {
  const reportType = normalizeType(reportTypeSlug)
  if (!reportType) return null
  const response = await apiRequest('/reports/draft', {
    method: 'POST',
    body: JSON.stringify({
      report_type: reportType,
      payload: payload && typeof payload === 'object' ? payload : {},
    }),
  })
  const row = response?.data
  if (!row || typeof row !== 'object') return null
  return {
    id: row.id,
    reportType,
    savedAt: row.saved_at || row.payload?.savedAt || '',
    payload: row.payload || {},
  }
}

export const clearReportDraftApi = async ({ reportTypeSlug }) => {
  const reportType = normalizeType(reportTypeSlug)
  if (!reportType) return false
  await apiRequest(`/reports/draft?report_type=${encodeURIComponent(reportType)}`, {
    method: 'DELETE',
  })
  return true
}

const mapDraftRow = (row) => {
  if (!row || typeof row !== 'object') return null
  return {
    id: row.id,
    draftId: String(row.draft_id || '').trim(),
    reportType: normalizeType(row.report_type || row.reportType),
    title: String(row.title || '').trim(),
    originMode:
      String(row.origin_mode || 'new')
        .trim()
        .toLowerCase() === 'edit'
        ? 'edit'
        : 'new',
    sourceReportUid: String(row.source_report_uid || '').trim(),
    savedAt: row.saved_at || row.payload?.savedAt || '',
    payload: row.payload || {},
  }
}

export const listReportDraftsApi = async ({ reportTypeSlug, page = 1, limit = 50 }) => {
  const reportType = normalizeType(reportTypeSlug)
  if (!reportType) return []
  const response = await apiRequest(
    `/reports/drafts?report_type=${encodeURIComponent(reportType)}&page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`,
  )
  const rows = Array.isArray(response?.data) ? response.data : []
  return rows.map(mapDraftRow).filter(Boolean)
}

export const getReportDraftApi = async ({ draftId }) => {
  const id = String(draftId || '').trim()
  if (!id) return null
  const response = await apiRequest(`/reports/drafts/${encodeURIComponent(id)}`)
  return mapDraftRow(response?.data)
}

export const createReportDraftApi = async ({
  reportTypeSlug,
  payload,
  title = '',
  originMode = 'new',
  sourceReportUid = '',
}) => {
  const reportType = normalizeType(reportTypeSlug)
  if (!reportType) return null
  const response = await apiRequest('/reports/drafts', {
    method: 'POST',
    body: JSON.stringify({
      report_type: reportType,
      payload: payload && typeof payload === 'object' ? payload : {},
      title: String(title || '').trim(),
      origin_mode:
        String(originMode || '')
          .trim()
          .toLowerCase() === 'edit'
          ? 'edit'
          : 'new',
      source_report_uid: String(sourceReportUid || '').trim(),
    }),
  })
  return mapDraftRow(response?.data)
}

export const updateReportDraftApi = async ({
  draftId,
  payload,
  title = '',
  originMode = 'new',
  sourceReportUid = '',
}) => {
  const id = String(draftId || '').trim()
  if (!id) return null
  const response = await apiRequest(`/reports/drafts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      payload: payload && typeof payload === 'object' ? payload : {},
      title: String(title || '').trim(),
      origin_mode:
        String(originMode || '')
          .trim()
          .toLowerCase() === 'edit'
          ? 'edit'
          : 'new',
      source_report_uid: String(sourceReportUid || '').trim(),
    }),
  })
  return mapDraftRow(response?.data)
}

export const deleteReportDraftApi = async ({ draftId }) => {
  const id = String(draftId || '').trim()
  if (!id) return false
  await apiRequest(`/reports/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return true
}
