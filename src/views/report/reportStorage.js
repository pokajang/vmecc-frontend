import { RKEY } from './constants'
import {
  clearReportDraftApi,
  createReportDraftApi,
  deleteReportDraftApi,
  fetchReportDraft,
  getReportDraftApi,
  listReportDraftsApi,
  saveReportDraftApi,
  updateReportDraftApi,
} from './reportDraftApi'
import {
  normalizeReportRecords,
  parse,
  readStorageValue,
  storageKey,
  writeStorageValue,
} from './utils'

export const loadReportRecords = (userId) => {
  if (!userId) return []
  const rows = parse(readStorageValue(storageKey(RKEY, userId)), [])
  return normalizeReportRecords(rows)
}

export const saveReportRecords = (userId, rows) => {
  if (!userId) return false
  try {
    return writeStorageValue(storageKey(RKEY, userId), JSON.stringify(normalizeReportRecords(rows)))
  } catch {
    return false
  }
}

export const loadReportDraft = (userId, reportTypeSlug) => {
  if (!userId) return Promise.resolve(null)
  return fetchReportDraft({ reportTypeSlug }).then((row) =>
    row?.payload && typeof row.payload === 'object' ? row.payload : null,
  )
}

export const saveReportDraft = (userId, draft, reportTypeSlug) => {
  if (!userId) return Promise.resolve(false)
  return saveReportDraftApi({ reportTypeSlug, payload: draft }).then((row) => Boolean(row))
}

export const clearReportDraft = (userId, reportTypeSlug) => {
  if (!userId) return Promise.resolve(false)
  return clearReportDraftApi({ reportTypeSlug }).then(() => true)
}

export const listErcoDrafts = (userId, { page = 1, limit = 50 } = {}) => {
  if (!userId) return Promise.resolve([])
  return listReportDraftsApi({ reportTypeSlug: 'erco', page, limit })
}

export const loadErcoDraft = (userId, draftId) => {
  if (!userId) return Promise.resolve(null)
  return getReportDraftApi({ draftId })
}

export const createErcoDraft = (userId, payload, meta = {}) => {
  if (!userId) return Promise.resolve(null)
  return createReportDraftApi({
    reportTypeSlug: 'erco',
    payload,
    title: meta?.title || '',
    originMode: meta?.originMode || 'new',
    sourceReportUid: meta?.sourceReportUid || '',
  })
}

export const updateErcoDraft = (userId, draftId, payload, meta = {}) => {
  if (!userId) return Promise.resolve(null)
  return updateReportDraftApi({
    draftId,
    payload,
    title: meta?.title || '',
    originMode: meta?.originMode || 'new',
    sourceReportUid: meta?.sourceReportUid || '',
  })
}

export const deleteErcoDraft = (userId, draftId) => {
  if (!userId) return Promise.resolve(false)
  return deleteReportDraftApi({ draftId }).then(() => true)
}
