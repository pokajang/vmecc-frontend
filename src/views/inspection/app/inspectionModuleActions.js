import { DRAFT_STATUS_LABELS } from './inspectionModuleFlow'
import { getInspectionApiErrorMessage } from '../domain/api/inspectionApiError'
import { countFireExtinguisherSessionRetryQueue } from '../form/hooks/fireExtinguisherSessionRetryQueue'

const text = (value) => String(value || '').trim()
const getFriendlySubmitMessage = (error = {}, record = {}) => {
  return (
    getInspectionApiErrorMessage(error, 'Unable to save this report. Please try again.') ||
    'Unable to save this report. Please try again.'
  )
}

export const continueInspectionToLocation = ({
  option,
  continuationPrompt,
  normalizeInspectionForm,
  buildInspectionContinuationForm,
  getDefaultInspectionDateTime,
  saveWorkspace,
  userId,
  setContinuationPrompt,
  navigate,
  reportBasePath,
}) => {
  const prompt = continuationPrompt
  const nextLocation = String(option?.value || option?.title || '').trim()
  const inspectionType = String(prompt?.inspectionType || '').trim()
  if (!inspectionType || !nextLocation) return
  const nextZone = String(option?.zone || '').trim()
  const nextMainLocation = String(option?.mainLocation || '').trim() || nextLocation
  const nextSubLocation = String(option?.subLocation || '').trim()

  const nextForm = normalizeInspectionForm(
    buildInspectionContinuationForm({
      inspectionType,
      zone: nextZone,
      mainLocation: nextMainLocation,
      subLocation: nextSubLocation,
      inspectedAt: getDefaultInspectionDateTime(),
    }),
  )
  saveWorkspace(userId, {
    mode: 'new',
    recordId: '',
    form: nextForm,
  })
  setContinuationPrompt(null)
  navigate(`${reportBasePath}/new`)
}

export const saveInspectionDraftAction = async ({
  nextForm,
  context,
  loadWorkspace,
  userId,
  routeMode,
  routeRecordId,
  applySessionInspector,
  user,
  buildInspectionDraftPayload,
  saveInspectionDraft,
  createInspectionFormSignature,
  lastPersistedSignatureRef,
  setIsFormDirty,
  setDraftVersion,
  setDraftStatus,
  pushToast,
}) => {
  const workspace = context || loadWorkspace(userId)
  const mode = workspace?.mode || routeMode
  const editReportId = workspace?.recordId || routeRecordId
  const sessionForm = applySessionInspector(nextForm, user)
  const payload = buildInspectionDraftPayload({
    form: sessionForm,
    mode,
    editReportId,
    user,
  })
  let result = { saved: false, synced: false }
  try {
    result = await saveInspectionDraft(userId, payload)
  } catch (error) {
    setDraftStatus('Draft save failed')
    pushToast(getInspectionApiErrorMessage(error, 'Unable to save draft. Please try again.'), {
      title: 'Draft save failed',
      color: 'danger',
    })
    return false
  }
  if (!result?.saved) {
    setDraftStatus('Draft save failed')
    pushToast('Unable to save draft. Please try again.', {
      title: 'Draft save failed',
      color: 'danger',
    })
    return false
  }
  lastPersistedSignatureRef.current = createInspectionFormSignature(sessionForm)
  setIsFormDirty(false)
  setDraftVersion((prev) => prev + 1)
  setDraftStatus(result.synced ? DRAFT_STATUS_LABELS.synced : DRAFT_STATUS_LABELS.localSaved)
  return result
}

export const requestInspectionReview = ({
  nextForm,
  applySessionInspector,
  user,
  setFormState,
  saveWorkspace,
  userId,
  routeMode,
  routeRecordId,
  navigate,
  reportBasePath,
}) => {
  const normalized = applySessionInspector(nextForm, user)
  setFormState(normalized)
  saveWorkspace(userId, {
    mode: routeMode,
    recordId: routeRecordId,
    form: normalized,
  })
  navigate(`${reportBasePath}/review`)
}

export const navigateBackFromInspectionReview = ({
  loadWorkspace,
  userId,
  navigate,
  reportBasePath,
}) => {
  const workspace = loadWorkspace(userId)
  if (!workspace) return
  if (workspace.mode === 'edit' && workspace.recordId) {
    navigate(`${reportBasePath}/${encodeURIComponent(workspace.recordId)}/edit`)
    return
  }
  navigate(`${reportBasePath}/new`)
}

export const submitInspectionRecordAction = async ({
  record,
  submitLockRef,
  setIsSubmitting,
  makeInspectionSubmissionKey,
  userId,
  persistInspectionRecord,
  prepareContinuationPrompt,
  reloadRecords,
  clearInspectionDraft,
  setDraftVersion,
  clearWorkingState,
  pushToast,
  reportTypeLabel,
  navigate,
  reportBasePath,
  setContinuationPrompt,
  isInspectionQueueableError,
  enqueueInspectionSubmission,
  editingRecord,
  editReportId = '',
  refreshQueueRows,
  submitInspectionSessionReport,
  clearWorkingStateOnSuccess = true,
  navigateOnSuccess = true,
  onSubmitted = null,
  sourceDraftId = '',
}) => {
  if (submitLockRef.current) return
  submitLockRef.current = true
  setIsSubmitting(true)
  const normalizedEditReportId = text(editReportId)
  const effectiveRecord = normalizedEditReportId
    ? { ...record, id: normalizedEditReportId }
    : record
  const submissionKey = makeInspectionSubmissionKey(userId, effectiveRecord)
  const inspectionSessionUid = text(
    effectiveRecord?.inspectionSessionUid || effectiveRecord?.inspection_session_uid,
  )
  const editingRecordKind = text(editingRecord?.recordKind).toLowerCase()
  const hasPersistedEditingRecord =
    Boolean(text(editingRecord?.id)) && !['draft', 'queued'].includes(editingRecordKind)
  const isUpdate =
    Boolean(normalizedEditReportId) ||
    Number(effectiveRecord?.version || 0) > 0 ||
    hasPersistedEditingRecord
  const useSessionSubmit = Boolean(inspectionSessionUid) && !isUpdate
  const sourceDraftOptions = sourceDraftId ? { sourceDraftId } : {}
  try {
    if (
      useSessionSubmit &&
      countFireExtinguisherSessionRetryQueue({ userId, sessionUid: inspectionSessionUid }) > 0
    ) {
      const pendingError = new Error(
        'Inspection changes are still syncing. Retry sync before submitting.',
      )
      pendingError.code = 'inspection_session_operations_pending'
      throw pendingError
    }
    const saved = useSessionSubmit
      ? await submitInspectionSessionReport?.({
          sessionUid: inspectionSessionUid,
          displayId: effectiveRecord.displayId,
          submissionKey,
          ...sourceDraftOptions,
          reportRemarks: effectiveRecord.reportRemarks,
          photos: effectiveRecord.photos,
          inspectedAt: effectiveRecord.inspectedAt,
          submittedAt: effectiveRecord.submittedAt,
          sessionVersion: effectiveRecord.inspectionSessionVersion,
        })
      : await persistInspectionRecord(userId, effectiveRecord, {
          submissionKey,
          isUpdate,
          ...sourceDraftOptions,
        })
    if (!saved) throw new Error('Unable to save this report in database/API. Please try again.')
    const nextContinuationPrompt = prepareContinuationPrompt(effectiveRecord)
    await reloadRecords()
    if (clearWorkingStateOnSuccess) {
      await (sourceDraftId
        ? clearInspectionDraft(userId, sourceDraftId)
        : clearInspectionDraft(userId))
    }
    setDraftVersion((prev) => prev + 1)
    if (clearWorkingStateOnSuccess) clearWorkingState()
    onSubmitted?.(saved, effectiveRecord)
    pushToast(
      `${reportTypeLabel} report ${saved.displayId || effectiveRecord.displayId} ${
        isUpdate ? 'updated' : 'submitted'
      }.`,
      {
        title: isUpdate ? 'Updated' : 'Submitted',
        color: 'success',
      },
    )
    if (navigateOnSuccess) navigate(reportBasePath)
    if (nextContinuationPrompt) setContinuationPrompt(nextContinuationPrompt)
  } catch (error) {
    if (!useSessionSubmit && isInspectionQueueableError(error)) {
      const queued = enqueueInspectionSubmission({
        userId,
        record: {
          ...effectiveRecord,
          submissionKey,
          ...(sourceDraftId ? { sourceDraftId } : {}),
        },
        submissionKey,
        operation: isUpdate ? 'update' : 'create',
        baseServerSnapshot: isUpdate ? editingRecord : null,
      })
      if (queued) {
        refreshQueueRows()
        if (clearWorkingStateOnSuccess) clearWorkingState()
        onSubmitted?.(queued, effectiveRecord)
        pushToast('Report saved to this device and queued for sync.', {
          title: 'Queued for sync',
          color: 'warning',
        })
        if (navigateOnSuccess) navigate(reportBasePath)
        return
      }
    }
    pushToast(getFriendlySubmitMessage(error, effectiveRecord), {
      title: 'Save failed',
      color: 'danger',
    })
  } finally {
    submitLockRef.current = false
    setIsSubmitting(false)
  }
}

export const confirmInspectionDeleteAction = async ({
  target,
  userId,
  setIsDeleting,
  clearInspectionDraft,
  clearWorkingState,
  setDraftVersion,
  deleteRecord,
  pushToast,
  reportId,
  navigate,
  reportBasePath,
}) => {
  if (!target) return
  setIsDeleting(true)
  try {
    if (target.recordKind === 'draft') {
      await clearInspectionDraft(userId)
      clearWorkingState()
      setDraftVersion((prev) => prev + 1)
    } else {
      const result = await deleteRecord(target.id)
      if (!result.saved) {
        pushToast(result.error?.message || 'Unable to delete this report. Please try again.', {
          title: 'Delete failed',
          color: 'danger',
        })
        return
      }
    }
    pushToast(`${target.displayId || 'Report'} deleted.`, {
      title: target.recordKind === 'draft' ? 'Draft deleted' : 'Report deleted',
      color: 'info',
    })
    if (String(reportId || '') === String(target.id)) navigate(reportBasePath)
  } finally {
    setIsDeleting(false)
  }
}

export const canEditInspectionRecord = ({ row, user, isSystemAdministrator }) => {
  if (!row) return false
  if (row.recordKind === 'draft') return true
  if (isSystemAdministrator(user)) return true
  const ownerUserId = String(row.ownerUserId ?? '').trim()
  if (ownerUserId && String(ownerUserId) !== String(user?.id ?? '').trim()) return false
  return ['Submitted', 'Rejected'].includes(String(row.status || '').trim())
}

export const canDeleteInspectionRecord = ({ row, user, isSystemAdministrator }) => {
  if (!row || row.recordKind === 'queued') return false
  if (row.recordKind === 'draft') return true
  if (isSystemAdministrator(user)) return true
  const ownerUserId = String(row.ownerUserId ?? '').trim()
  return ownerUserId !== '' && ownerUserId === String(user?.id ?? '').trim()
}

export const navigateToInspectionEdit = ({
  row,
  getInspectionDraftMeta,
  navigate,
  reportBasePath,
}) => {
  if (!row) return
  if (row.recordKind === 'draft') {
    const meta = getInspectionDraftMeta(row.__rawDraftPayload || {})
    if (meta.mode === 'edit' && meta.editReportId) {
      navigate(`${reportBasePath}/${encodeURIComponent(meta.editReportId)}/edit`)
      return
    }
    navigate(`${reportBasePath}/new`)
    return
  }
  navigate(`${reportBasePath}/${encodeURIComponent(String(row.id || '').trim())}/edit`)
}
