export const resetInspectionWorkingState = ({
  setFormState,
  defaultInspectionForm,
  setIsFormReady,
  setIsFormDirty,
  setDraftStatus,
  initRouteKeyRef,
  lastPersistedSignatureRef,
  clearWorkspace,
  userId,
}) => {
  setFormState(defaultInspectionForm)
  setIsFormReady(false)
  setIsFormDirty(false)
  setDraftStatus('')
  initRouteKeyRef.current = ''
  lastPersistedSignatureRef.current = ''
  clearWorkspace(userId)
}

export const clearInspectionContinuationState = ({
  continuationCompletedKeysRef,
  setContinuationPrompt,
}) => {
  continuationCompletedKeysRef.current.clear()
  setContinuationPrompt(null)
}

export const prepareInspectionContinuationPrompt = ({
  record,
  continuationCompletedKeysRef,
  buildInspectionContinuationPrompt,
}) => {
  const prompt = buildInspectionContinuationPrompt({
    record,
    completedKeys: Array.from(continuationCompletedKeysRef.current),
    isNewReport: Number(record?.version || 0) <= 0,
  })
  if (prompt?.completedKey) {
    continuationCompletedKeysRef.current.add(prompt.completedKey)
  }
  return prompt
}

export const handleInspectionStartNew = ({
  clearContinuationState,
  activeDraftRows,
  activeSection,
  setShowDraftChoice,
  clearWorkingState,
  navigate,
  reportBasePath,
}) => {
  clearContinuationState()
  const hasSavedDraft = activeDraftRows.some((row) => row?.recordKind === 'draft')
  if (activeSection !== 'form' && hasSavedDraft) {
    setShowDraftChoice(true)
    return
  }
  clearWorkingState()
  navigate(`${reportBasePath}/new`)
}

export const handleInspectionOpenSavedDraft = ({
  clearContinuationState,
  setShowDraftChoice,
  clearWorkingState,
  navigate,
  reportBasePath,
}) => {
  clearContinuationState()
  setShowDraftChoice(false)
  clearWorkingState()
  navigate(`${reportBasePath}/new`)
}

export const handleInspectionStartBlankReport = async ({
  clearContinuationState,
  setShowDraftChoice,
  clearInspectionDraft,
  userId,
  setDraftVersion,
  clearWorkingState,
  navigate,
  reportBasePath,
}) => {
  clearContinuationState()
  setShowDraftChoice(false)
  await clearInspectionDraft(userId)
  setDraftVersion((prev) => prev + 1)
  clearWorkingState()
  navigate(`${reportBasePath}/new`)
}

export const recoverInspectionLocalDraft = ({
  user,
  loadOfflineDraftSync,
  pushToast,
  getInspectionDraftMeta,
  selectInspectionInitialForm,
  saveWorkspace,
  buildDraftRow,
  setActiveDraftRows,
  setDraftVersion,
  setShowMobileRecords,
  navigate,
  buildRecoveredDraftNavigationTarget,
  reportBasePath,
}) => {
  if (!user?.id) return
  const localDraft = loadOfflineDraftSync(user.id)
  if (!localDraft) {
    pushToast('No local draft was found on this device.', {
      title: 'Draft unavailable',
      color: 'warning',
    })
    return
  }
  const meta = getInspectionDraftMeta(localDraft)
  const next = selectInspectionInitialForm({
    routeMode: meta.mode,
    routeRecordId: meta.editReportId,
    workspace: null,
    draftPayload: localDraft,
    record: null,
  })
  saveWorkspace(user.id, {
    mode: meta.mode,
    recordId: meta.editReportId,
    form: next.form,
  })
  setActiveDraftRows(
    [buildDraftRow(localDraft, user?.name || user?.email || user?.id || '')].filter(Boolean),
  )
  setDraftVersion((prev) => prev + 1)
  setShowMobileRecords(false)
  navigate(buildRecoveredDraftNavigationTarget(meta, reportBasePath))
  pushToast('Local draft recovered on this device.', {
    title: 'Draft recovered',
    color: 'success',
  })
}

export const handleInspectionStartNewWithType = ({
  inspectionType,
  clearContinuationState,
  clearWorkingState,
  saveWorkspace,
  userId,
  buildTypedInspectionWorkspaceForm,
  defaultInspectionForm,
  getDefaultInspectionDateTime,
  normalizeInspectionForm,
  navigate,
  reportBasePath,
}) => {
  clearContinuationState()
  const normalizedType = String(inspectionType || '').trim()
  if (!normalizedType) return
  const start = () => {
    clearWorkingState()
    saveWorkspace(userId, {
      mode: 'new',
      recordId: '',
      form: buildTypedInspectionWorkspaceForm({
        inspectionType: normalizedType,
        defaultInspectionForm,
        getDefaultInspectionDateTime,
        normalizeInspectionForm,
      }),
    })
    navigate(`${reportBasePath}/new`)
  }

  if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') {
    start()
    return
  }

  window.setTimeout(start, 0)
}

export const handleInspectionMobileBack = ({
  activeSection,
  showMobileRecords,
  setShowMobileRecords,
  backFromReview,
  navigate,
  reportBasePath,
  runGuardedAction,
  clearContinuationState,
}) => {
  if (activeSection === 'records' && showMobileRecords) {
    setShowMobileRecords(false)
    return
  }
  if (activeSection === 'review') {
    backFromReview()
    return
  }
  if (activeSection === 'detail') {
    setShowMobileRecords(true)
    navigate(reportBasePath)
    return
  }
  runGuardedAction(() => {
    clearContinuationState()
    navigate(reportBasePath)
  })
}
