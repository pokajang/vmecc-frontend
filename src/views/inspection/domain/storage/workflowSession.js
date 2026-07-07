export const WORKFLOW_SESSION_KEY = '__inspectionWorkflowSession'

const toTrimmedString = (value) => String(value || '').trim()

const normalizeWorkflowMode = (value) =>
  toTrimmedString(value).toLowerCase() === 'edit' ? 'edit' : 'new'

const asObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}

export const normalizeWorkflowSession = (value, fallback = null) => {
  const source = { ...asObject(fallback), ...asObject(value) }
  const editReportId = toTrimmedString(source.editReportId || source.__editReportId)
  const mode = editReportId ? 'edit' : normalizeWorkflowMode(source.mode)

  return {
    mode,
    editReportId,
    returnFromReview: Boolean(source.returnFromReview),
    skipDraftLoad: Boolean(source.skipDraftLoad),
    source: toTrimmedString(source.source),
  }
}

export const deriveWorkflowSessionFromDraftPayload = (payload, fallback = null) => {
  const source = asObject(payload)
  const embedded = normalizeWorkflowSession(
    source[WORKFLOW_SESSION_KEY] || source.workflowSession || null,
    fallback,
  )
  const legacyEditReportId = toTrimmedString(source.__editReportId)
  const legacyMode = normalizeWorkflowMode(source.__draftMode)
  const editReportId = embedded.editReportId || legacyEditReportId
  const mode = editReportId ? 'edit' : legacyMode === 'edit' ? 'edit' : embedded.mode

  return normalizeWorkflowSession({ ...embedded, mode, editReportId })
}

export const attachWorkflowSessionToDraftPayload = (payload, workflowSession) => {
  const source = asObject(payload)
  const normalizedSession = normalizeWorkflowSession(workflowSession)
  const isEditSession = normalizedSession.mode === 'edit' && Boolean(normalizedSession.editReportId)

  return {
    ...source,
    [WORKFLOW_SESSION_KEY]: normalizedSession,
    __draftMode: isEditSession ? 'edit' : 'new',
    __editReportId: isEditSession ? normalizedSession.editReportId : '',
  }
}

export const pickInspectionInitializationSource = ({
  workflowSession,
  reviewReturnRecord,
  editingRecord,
  prefillDraft,
  loadedDraft,
}) => {
  const session = normalizeWorkflowSession(workflowSession)
  if (session.returnFromReview && reviewReturnRecord) {
    return { kind: 'review-return', payload: reviewReturnRecord }
  }
  if (prefillDraft && session.source === 'draft-row-edit') {
    return { kind: 'prefill', payload: prefillDraft }
  }
  if (session.mode === 'edit' && editingRecord) {
    return { kind: 'edit-record', payload: editingRecord }
  }
  if (prefillDraft) {
    return { kind: 'prefill', payload: prefillDraft }
  }
  if (session.mode === 'new' && loadedDraft) {
    return { kind: 'saved-draft', payload: loadedDraft }
  }
  return { kind: 'empty', payload: null }
}
