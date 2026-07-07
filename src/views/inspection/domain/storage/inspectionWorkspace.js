import {
  defaultInspectionForm,
  getFireExtinguisherCheckSummary,
  getInspectionDraftMeta,
  isInspectionDraftPayload,
  normalizeInspectionForm,
} from '../../form/inspectionFormHelpers'
import { isFireExtinguisherInspectionType } from '../../types/fire-extinguisher/helpers'
import {
  clearOfflineWorkspace,
  loadOfflineWorkspaceSync,
  saveOfflineWorkspace,
} from '../offline/inspectionOfflineStore'

const WORKSPACE_KEY_PREFIX = 'inspection_workspace_v1_'

const buildFireExtinguisherDraftProgress = (payload = {}) => {
  const inspectionType = String(payload.inspectionType || payload.incidentType || '').trim()
  if (!isFireExtinguisherInspectionType(inspectionType)) return {}

  const summary = getFireExtinguisherCheckSummary(normalizeInspectionForm(payload))
  const total = Number(summary.totalCount || 0)
  if (!total) return {}

  const completed = Number(summary.completedCount || 0)
  const defectCount = Number(summary.defectCount || 0)
  return {
    draftProgressSummary: `${completed}/${total} checked`,
    draftDefectSummary: defectCount ? `${defectCount} defect${defectCount === 1 ? '' : 's'}` : '',
  }
}

export const buildDraftRow = (payload, actorName = '') => {
  if (!isInspectionDraftPayload(payload)) return null
  const meta = getInspectionDraftMeta(payload)
  const draftProgress = buildFireExtinguisherDraftProgress(payload)
  return {
    ...payload,
    ...draftProgress,
    __rawDraftPayload: payload,
    id: `draft-inspection-${meta.editReportId || 'new'}`,
    draftId: 'inspection',
    displayId: 'Draft',
    reportType: 'inspection',
    recordKind: 'draft',
    status: 'Draft',
    savedAt: String(payload.savedAt || '').trim(),
    sourceReportUid: meta.editReportId,
    originMode: meta.mode,
    syncStatus: String(payload.__offlineSyncStatus || '').trim(),
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
    let parsed = loadOfflineWorkspaceSync(userId)
    if (!parsed) {
      const raw = globalThis.sessionStorage?.getItem(getWorkspaceKey(userId))
      parsed = raw ? JSON.parse(raw) : null
      if (parsed) saveOfflineWorkspace(userId, parsed)
    }
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
    saveOfflineWorkspace(userId, workspace)
    globalThis.sessionStorage?.setItem(getWorkspaceKey(userId), JSON.stringify(workspace))
  } catch {
    // Offline persistence is best-effort.
  }
}

export const clearWorkspace = (userId) => {
  try {
    clearOfflineWorkspace(userId)
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
  if (segments.includes('all-extinguishers')) return 'extinguishers'
  if (segments.includes('edit') || segments.includes('new')) return 'form'
  if (segments.length >= 2) return 'detail'
  return 'records'
}
