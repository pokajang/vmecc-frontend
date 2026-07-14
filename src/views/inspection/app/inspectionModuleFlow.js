export const MOBILE_HOME_RECENT_RECORD_LIMIT = 3

export const trackInspectionDraftSyncTask = (taskRef, task) => {
  const trackedTask = Promise.resolve(task)
  taskRef.current = trackedTask
  return trackedTask
}

export const waitForInspectionDraftSyncTasks = async (taskRef, inFlightRef) => {
  let settledTask = null
  do {
    settledTask = taskRef.current
    if (settledTask) await settledTask
  } while (taskRef.current !== settledTask || inFlightRef.current)
}

export const buildInspectionRouteKey = (routeMode, routeRecordId = '') =>
  `${routeMode}:${routeRecordId || 'new'}`

export const DRAFT_STATUS_LABELS = {
  localSaved: 'Saved locally. Backend sync pending',
  syncing: 'Saved locally. Syncing...',
  synced: 'Draft synced',
  failed: 'Draft sync failed. Retry required',
  conflict: 'Draft changed elsewhere. Local work is preserved',
}

export const getDraftRestoreStatus = (draftPayload = {}) => {
  const syncStatus = String(draftPayload?.__offlineSyncStatus || '').trim()
  return syncStatus === 'synced'
    ? DRAFT_STATUS_LABELS.synced
    : syncStatus === 'failed'
      ? DRAFT_STATUS_LABELS.failed
      : syncStatus === 'conflict'
        ? DRAFT_STATUS_LABELS.conflict
        : syncStatus === 'waiting'
          ? DRAFT_STATUS_LABELS.syncing
          : DRAFT_STATUS_LABELS.localSaved
}

export const initializeInspectionRouteState = ({
  routeMode,
  routeRecordId,
  userId,
  activeDraftPayload,
  editingRecord,
  loadWorkspace,
  selectInspectionInitialForm,
  createInspectionFormSignature,
}) => {
  const next = selectInspectionInitialForm({
    routeMode,
    routeRecordId,
    workspace: loadWorkspace(userId),
    draftPayload: activeDraftPayload,
    record: editingRecord,
  })

  return {
    routeKey: buildInspectionRouteKey(routeMode, routeRecordId),
    form: next.form,
    signature: createInspectionFormSignature(next.form),
    draftStatus:
      next.source === 'draft'
        ? getDraftRestoreStatus(activeDraftPayload)
        : next.source === 'workspace'
          ? DRAFT_STATUS_LABELS.localSaved
          : '',
    source: next.source,
  }
}

export const buildRecoveredDraftNavigationTarget = (meta = {}, reportBasePath) =>
  meta.mode === 'edit' && meta.editReportId
    ? `${reportBasePath}/${encodeURIComponent(meta.editReportId)}/edit`
    : `${reportBasePath}/new`

export const buildTypedInspectionWorkspaceForm = ({
  inspectionType,
  defaultInspectionForm,
  getDefaultInspectionDateTime,
  normalizeInspectionForm,
}) =>
  normalizeInspectionForm({
    ...defaultInspectionForm,
    inspectionType: String(inspectionType || '').trim(),
    inspectedAt: getDefaultInspectionDateTime(),
  })

export const buildInspectionReviewContext = ({
  activeSection,
  currentWorkspace,
  formState,
  user,
  records,
  reportTypeIdPrefix,
  nextReportSequence,
  normalizeInspectionForm,
  applySessionInspector,
  buildInspectionReviewRecord,
}) => {
  const reviewWorkspace = activeSection === 'review' ? currentWorkspace : currentWorkspace
  const reviewForm = normalizeInspectionForm(
    activeSection === 'review' ? reviewWorkspace?.form || formState : formState,
  )
  const sessionReviewForm = applySessionInspector(reviewForm, user)
  const reviewEditingRecord =
    reviewWorkspace?.mode === 'edit'
      ? records.find(
          (row) => String(row.id || '').trim() === String(reviewWorkspace?.recordId || '').trim(),
        ) || null
      : null
  const reviewRecord =
    activeSection === 'review' && reviewWorkspace?.form
      ? buildInspectionReviewRecord({
          form: sessionReviewForm,
          mode: reviewWorkspace.mode,
          editingRecord: reviewEditingRecord,
          reportTypeSlug: 'inspection',
          reportTypeIdPrefix,
          sequence: nextReportSequence,
          user,
        })
      : null

  return {
    reviewWorkspace,
    reviewForm,
    sessionReviewForm,
    reviewEditingRecord,
    reviewRecord,
  }
}
