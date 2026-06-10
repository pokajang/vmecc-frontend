import {
  defaultInspectionForm,
  getInspectionDraftMeta,
  isInspectionDraftPayload,
  normalizeInspectionForm,
} from './inspectionFormHelpers'

const WORKSPACE_KEY_PREFIX = 'inspection_workspace_v1_'

export const buildDraftRow = (payload, actorName = '') => {
  if (!isInspectionDraftPayload(payload)) return null
  const meta = getInspectionDraftMeta(payload)
  return {
    ...payload,
    __rawDraftPayload: payload,
    id: `draft-inspection-${meta.editReportId || 'new'}`,
    draftId: 'inspection',
    displayId: 'Inspection Draft',
    reportType: 'inspection',
    recordKind: 'draft',
    status: 'Draft',
    savedAt: String(payload.savedAt || '').trim(),
    sourceReportUid: meta.editReportId,
    originMode: meta.mode,
    location: String(payload.location || payload.selectedLocation || '').trim(),
    timeline: payload.savedAt
      ? [
          {
            id: 'inspection-draft-saved',
            action: 'Draft',
            at: payload.savedAt,
            by: actorName || 'Unknown user',
          },
        ]
      : [],
  }
}

const getWorkspaceKey = (userId) => `${WORKSPACE_KEY_PREFIX}${String(userId || 'unknown')}`

export const loadWorkspace = (userId) => {
  try {
    const raw = globalThis.sessionStorage?.getItem(getWorkspaceKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      mode: String(parsed.mode || '').trim() === 'edit' ? 'edit' : 'new',
      recordId: String(parsed.recordId || '').trim(),
      form: normalizeInspectionForm(parsed.form || defaultInspectionForm),
    }
  } catch {
    return null
  }
}

export const saveWorkspace = (userId, workspace) => {
  try {
    globalThis.sessionStorage?.setItem(getWorkspaceKey(userId), JSON.stringify(workspace))
  } catch {
    // Session storage is only a workspace fallback.
  }
}

export const clearWorkspace = (userId) => {
  try {
    globalThis.sessionStorage?.removeItem(getWorkspaceKey(userId))
  } catch {
    // Ignore storage failures.
  }
}

export const getActiveSection = (pathname) => {
  const segments = String(pathname || '')
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.toLowerCase())
  if (segments.includes('review')) return 'review'
  if (segments.includes('edit') || segments.includes('new')) return 'form'
  if (segments.length >= 2) return 'detail'
  return 'records'
}
