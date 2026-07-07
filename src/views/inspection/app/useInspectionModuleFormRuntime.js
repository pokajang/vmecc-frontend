import { useCallback, useEffect, useRef, useState } from 'react'
import { loadOfflineDraftSync } from 'src/views/inspection/inspectionOfflineStore'
import { clearInspectionDraft, saveInspectionDraft } from 'src/views/inspection/inspectionStorage'
import {
  buildDraftRow,
  clearWorkspace,
  loadWorkspace,
  saveWorkspace,
} from 'src/views/inspection/inspectionWorkspace'
import {
  applySessionInspector,
  buildInspectionDraftPayload,
  createInspectionFormSignature,
  defaultInspectionForm,
  getDefaultInspectionDateTime,
  getInspectionDraftMeta,
  normalizeInspectionForm,
  selectInspectionInitialForm,
} from '../inspectionFormHelpers'
import {
  buildInspectionContinuationForm,
  buildInspectionContinuationPrompt,
} from '../inspectionContinuation'
import {
  continueInspectionToLocation,
  requestInspectionReview,
  saveInspectionDraftAction,
} from './inspectionModuleActions'
import {
  buildInspectionRouteKey,
  DRAFT_STATUS_LABELS,
  buildRecoveredDraftNavigationTarget,
  buildTypedInspectionWorkspaceForm,
  initializeInspectionRouteState,
} from './inspectionModuleFlow'
import {
  clearInspectionContinuationState,
  handleInspectionOpenSavedDraft,
  handleInspectionStartBlankReport,
  handleInspectionStartNew,
  handleInspectionStartNewWithType,
  prepareInspectionContinuationPrompt,
  recoverInspectionLocalDraft,
  resetInspectionWorkingState,
} from './inspectionModuleUiFlow'
import { getPendingSubmissionTypeKey } from '../form/pendingSubmissionSummary'

const useInspectionModuleFormRuntime = ({
  activeDraftPayload,
  activeDraftRows,
  activeSection,
  editingRecord,
  isLoading,
  localWorkspaceStatus,
  navigate,
  pushToast,
  reportBasePath,
  routeMode,
  routeRecordId,
  setActiveDraftRows,
  setDraftVersion,
  setShowDraftChoice,
  user,
}) => {
  const initRouteKeyRef = useRef('')
  const lastPersistedSignatureRef = useRef('')
  const continuationCompletedKeysRef = useRef(new Set())
  const pendingDraftSnapshotRef = useRef(null)
  const draftSyncInFlightRef = useRef(false)
  const draftSyncVersionRef = useRef(0)

  const [showMobileRecords, setShowMobileRecords] = useState(false)
  const [formState, setFormState] = useState(defaultInspectionForm)
  const [isFormReady, setIsFormReady] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [draftStatus, setDraftStatus] = useState('')
  const [draftSyncState, setDraftSyncState] = useState({
    status: 'idle',
    lastSyncedAt: '',
    lastError: '',
    pendingReason: '',
    pendingType: '',
    scope: 'type',
  })
  const [continuationPrompt, setContinuationPrompt] = useState(null)

  useEffect(() => {
    if (activeSection !== 'form') {
      initRouteKeyRef.current = ''
      return
    }
    if (!user?.id) return
    if (routeMode === 'edit' && !editingRecord && isLoading) return

    const routeKey = buildInspectionRouteKey(routeMode, routeRecordId)
    if (initRouteKeyRef.current === routeKey) return

    const next = initializeInspectionRouteState({
      routeMode,
      routeRecordId,
      userId: user.id,
      draftPayload: activeDraftPayload,
      editingRecord,
      loadWorkspace,
      selectInspectionInitialForm,
      createInspectionFormSignature,
    })

    initRouteKeyRef.current = routeKey
    setFormState(next.form)
    setIsFormReady(true)
    setIsFormDirty(false)
    lastPersistedSignatureRef.current = next.signature
    pendingDraftSnapshotRef.current = null
    setDraftSyncState({
      status: 'idle',
      lastSyncedAt: '',
      lastError: '',
      pendingReason: '',
      pendingType: '',
      scope: 'type',
    })
    if (next.source === 'draft') {
      setDraftStatus(next.draftStatus)
      pushToast('Draft restored.', { title: 'Draft loaded', color: 'info' })
    } else if (next.source === 'workspace') {
      setDraftStatus(next.draftStatus || localWorkspaceStatus)
    } else {
      setDraftStatus('')
    }
  }, [
    activeDraftPayload,
    activeSection,
    editingRecord,
    isLoading,
    localWorkspaceStatus,
    pushToast,
    routeMode,
    routeRecordId,
    user?.id,
  ])

  useEffect(() => {
    if (activeSection !== 'form' || !isFormReady || !user?.id) return
    const normalizedForm = normalizeInspectionForm(formState)
    const nextIsDirty =
      createInspectionFormSignature(normalizedForm) !== lastPersistedSignatureRef.current

    setIsFormDirty(nextIsDirty)
    if (nextIsDirty) setDraftStatus(localWorkspaceStatus)

    const timerId = window.setTimeout(() => {
      saveWorkspace(user.id, {
        mode: routeMode,
        recordId: routeRecordId,
        form: normalizedForm,
      })
    }, 300)

    return () => window.clearTimeout(timerId)
  }, [
    activeSection,
    formState,
    isFormReady,
    localWorkspaceStatus,
    routeMode,
    routeRecordId,
    user?.id,
  ])

  useEffect(() => {
    if (activeSection === 'records') return undefined
    const timerId = window.setTimeout(() => setShowMobileRecords(false), 0)
    return () => window.clearTimeout(timerId)
  }, [activeSection])

  const clearWorkingState = useCallback(() => {
    resetInspectionWorkingState({
      setFormState,
      defaultInspectionForm,
      setIsFormReady,
      setIsFormDirty,
      setDraftStatus,
      initRouteKeyRef,
      lastPersistedSignatureRef,
      clearWorkspace,
      userId: user?.id,
    })
    pendingDraftSnapshotRef.current = null
    setDraftSyncState({
      status: 'idle',
      lastSyncedAt: '',
      lastError: '',
      pendingReason: '',
      pendingType: '',
      scope: 'type',
    })
  }, [user?.id])

  const clearContinuationState = useCallback(() => {
    clearInspectionContinuationState({
      continuationCompletedKeysRef,
      setContinuationPrompt,
    })
  }, [])

  const prepareContinuationPromptForRecord = useCallback((record) => {
    return prepareInspectionContinuationPrompt({
      record,
      continuationCompletedKeysRef,
      buildInspectionContinuationPrompt,
    })
  }, [])

  const continueToInspectionLocationFromPrompt = useCallback(
    (option) => {
      continueInspectionToLocation({
        option,
        continuationPrompt,
        normalizeInspectionForm,
        buildInspectionContinuationForm,
        getDefaultInspectionDateTime,
        saveWorkspace,
        userId: user?.id,
        setContinuationPrompt,
        navigate,
        reportBasePath,
      })
    },
    [continuationPrompt, navigate, reportBasePath, user?.id],
  )

  const startNew = useCallback(() => {
    handleInspectionStartNew({
      clearContinuationState,
      activeDraftRows,
      activeSection,
      setShowDraftChoice,
      clearWorkingState,
      navigate,
      reportBasePath,
    })
  }, [
    activeDraftRows,
    activeSection,
    clearContinuationState,
    clearWorkingState,
    navigate,
    reportBasePath,
    setShowDraftChoice,
  ])

  const openSavedDraft = useCallback(
    (draftRowOrPayload = null) => {
      clearContinuationState()
      setShowDraftChoice(false)

      const draftPayload =
        draftRowOrPayload?.__rawDraftPayload || draftRowOrPayload || activeDraftPayload
      if (!draftPayload) {
        handleInspectionOpenSavedDraft({
          clearContinuationState,
          setShowDraftChoice,
          clearWorkingState,
          navigate,
          reportBasePath,
        })
        return
      }

      const meta = getInspectionDraftMeta(draftPayload)
      const next = selectInspectionInitialForm({
        routeMode: meta.mode,
        routeRecordId: meta.editReportId,
        workspace: null,
        draftPayload,
        record: null,
      })

      saveWorkspace(user?.id, {
        mode: meta.mode,
        recordId: meta.editReportId,
        form: next.form,
      })
      setIsFormReady(false)
      setIsFormDirty(false)
      setDraftStatus('')
      initRouteKeyRef.current = ''
      lastPersistedSignatureRef.current = ''
      navigate(buildRecoveredDraftNavigationTarget(meta, reportBasePath))
    },
    [
      activeDraftPayload,
      clearContinuationState,
      clearWorkingState,
      navigate,
      reportBasePath,
      setShowDraftChoice,
      user?.id,
    ],
  )

  const startBlankReport = useCallback(async () => {
    return handleInspectionStartBlankReport({
      clearContinuationState,
      setShowDraftChoice,
      clearInspectionDraft,
      userId: user?.id,
      setDraftVersion,
      clearWorkingState,
      navigate,
      reportBasePath,
    })
  }, [
    clearContinuationState,
    clearWorkingState,
    navigate,
    reportBasePath,
    setDraftVersion,
    setShowDraftChoice,
    user?.id,
  ])

  const recoverLocalDraft = useCallback(() => {
    return recoverInspectionLocalDraft({
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
    })
  }, [navigate, pushToast, reportBasePath, setActiveDraftRows, setDraftVersion, user])

  const startNewWithType = useCallback(
    (inspectionType) => {
      handleInspectionStartNewWithType({
        inspectionType,
        clearContinuationState,
        clearWorkingState,
        saveWorkspace,
        userId: user?.id,
        buildTypedInspectionWorkspaceForm,
        defaultInspectionForm,
        getDefaultInspectionDateTime,
        normalizeInspectionForm,
        navigate,
        reportBasePath,
      })
    },
    [clearContinuationState, clearWorkingState, navigate, reportBasePath, user?.id],
  )

  const saveDraftForForm = useCallback(
    async (nextForm = formState, context = null) => {
      const normalizedForm = normalizeInspectionForm(nextForm)
      saveWorkspace(user?.id, {
        mode: context?.mode || routeMode,
        recordId: context?.recordId || routeRecordId,
        form: normalizedForm,
      })
      setDraftSyncState((current) => ({
        ...current,
        status: 'syncing',
        lastError: '',
        pendingReason: 'manual',
        pendingType: String(normalizedForm.inspectionType || '').trim(),
        scope: 'all',
      }))
      setDraftStatus(DRAFT_STATUS_LABELS.syncing)
      return saveInspectionDraftAction({
        nextForm: normalizedForm,
        context,
        loadWorkspace,
        userId: user?.id,
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
      }).then((result) => {
        const synced = result?.synced === true
        if (synced) pendingDraftSnapshotRef.current = null
        setDraftSyncState({
          status: synced ? 'synced' : result?.saved ? 'failed' : 'failed',
          lastSyncedAt: synced ? new Date().toISOString() : '',
          lastError: synced ? '' : result?.error?.message || 'Draft sync failed.',
          pendingReason: synced ? '' : 'manual',
          pendingType: synced ? '' : String(normalizedForm.inspectionType || '').trim(),
          scope: synced ? 'type' : 'all',
        })
        if (!synced && result?.saved) setDraftStatus(DRAFT_STATUS_LABELS.failed)
        return result
      })
    },
    [formState, pushToast, routeMode, routeRecordId, setDraftVersion, user],
  )

  const runDraftSnapshotSync = useCallback(
    async (snapshot = pendingDraftSnapshotRef.current) => {
      if (!snapshot || draftSyncInFlightRef.current || !user?.id) return null
      draftSyncInFlightRef.current = true
      setDraftSyncState((current) => ({
        ...current,
        status: 'syncing',
        lastError: '',
        pendingType: String(snapshot.inspectionType || '').trim(),
        scope: snapshot.scope,
      }))
      setDraftStatus(DRAFT_STATUS_LABELS.syncing)

      try {
        const normalizedForm = normalizeInspectionForm(snapshot.form)
        const sessionForm = applySessionInspector(normalizedForm, user)
        const payload = buildInspectionDraftPayload({
          form: sessionForm,
          mode: snapshot.mode,
          editReportId: snapshot.recordId,
          user,
        })
        const result = await saveInspectionDraft(user.id, payload)
        if (snapshot.version !== draftSyncVersionRef.current) return result

        if (result?.synced) {
          pendingDraftSnapshotRef.current = null
          lastPersistedSignatureRef.current = createInspectionFormSignature(sessionForm)
          setIsFormDirty(false)
          setDraftVersion((prev) => prev + 1)
          setDraftStatus(DRAFT_STATUS_LABELS.synced)
          setDraftSyncState({
            status: 'synced',
            lastSyncedAt: new Date().toISOString(),
            lastError: '',
            pendingReason: '',
            pendingType: '',
            scope: 'type',
          })
          return result
        }

        setDraftStatus(DRAFT_STATUS_LABELS.failed)
        setDraftSyncState({
          status: 'failed',
          lastSyncedAt: '',
          lastError: result?.error?.message || 'Draft sync failed.',
          pendingReason: snapshot.reason,
          pendingType: String(snapshot.inspectionType || '').trim(),
          scope: snapshot.scope,
        })
        return result || { saved: true, synced: false }
      } catch (error) {
        if (snapshot.version === draftSyncVersionRef.current) {
          setDraftStatus(DRAFT_STATUS_LABELS.failed)
          setDraftSyncState({
            status: 'failed',
            lastSyncedAt: '',
            lastError: error?.message || 'Draft sync failed.',
            pendingReason: snapshot.reason,
            pendingType: String(snapshot.inspectionType || '').trim(),
            scope: snapshot.scope,
          })
        }
        return { saved: true, synced: false, error }
      } finally {
        draftSyncInFlightRef.current = false
        if (
          pendingDraftSnapshotRef.current &&
          pendingDraftSnapshotRef.current.version !== snapshot.version
        ) {
          void runDraftSnapshotSync(pendingDraftSnapshotRef.current)
        }
      }
    },
    [setDraftVersion, user],
  )

  const commitDraftSnapshot = useCallback(
    (nextForm = formState, options = {}) => {
      if (!user?.id) return { saved: false, local: false, pending: false }
      const normalizedForm = normalizeInspectionForm(nextForm)
      const nextVersion = draftSyncVersionRef.current + 1
      draftSyncVersionRef.current = nextVersion
      const reason = String(options.reason || options.source || 'item-save').trim()
      const scope =
        String(options.scope || '').trim() ||
        (reason === 'review-submissions-open' ? 'all' : 'type')
      const snapshot = {
        form: normalizedForm,
        mode: routeMode,
        recordId: routeRecordId,
        reason,
        source: String(options.source || '').trim(),
        inspectionType: String(normalizedForm.inspectionType || '').trim(),
        scope,
        version: nextVersion,
      }
      pendingDraftSnapshotRef.current = snapshot
      saveWorkspace(user.id, {
        mode: routeMode,
        recordId: routeRecordId,
        form: normalizedForm,
      })
      setFormState(normalizedForm)
      setIsFormDirty(true)
      setDraftStatus(DRAFT_STATUS_LABELS.syncing)
      setDraftSyncState((current) => ({
        ...current,
        status: 'syncing',
        lastError: '',
        pendingReason: snapshot.reason,
        pendingType: snapshot.inspectionType,
        scope: snapshot.scope,
      }))
      void runDraftSnapshotSync(snapshot)
      return { saved: true, local: true, pending: true }
    },
    [formState, routeMode, routeRecordId, runDraftSnapshotSync, user?.id],
  )

  const clearInspectionTypeDraft = useCallback(
    (inspectionType = '') => {
      if (!user?.id) return null
      const typeKey = getPendingSubmissionTypeKey(inspectionType)
      if (!typeKey) return null
      const normalized = normalizeInspectionForm(formState)
      const draftMap =
        normalized.inspectionTypeDrafts && typeof normalized.inspectionTypeDrafts === 'object'
          ? { ...normalized.inspectionTypeDrafts }
          : {}
      delete draftMap[typeKey]
      if (Object.keys(draftMap).length === 0) {
        const emptyForm = normalizeInspectionForm(defaultInspectionForm)
        pendingDraftSnapshotRef.current = null
        setFormState(emptyForm)
        clearWorkspace(user.id)
        void clearInspectionDraft(user.id)
        setDraftStatus('')
        setDraftSyncState({
          status: 'idle',
          lastSyncedAt: '',
          lastError: '',
          pendingReason: '',
          pendingType: '',
          scope: 'type',
        })
        return emptyForm
      }
      const activeTypeKey = getPendingSubmissionTypeKey(normalized.inspectionType)
      const nextForm =
        activeTypeKey === typeKey
          ? normalizeInspectionForm({
              ...defaultInspectionForm,
              inspectionTypeDrafts: draftMap,
            })
          : normalizeInspectionForm({
              ...normalized,
              inspectionTypeDrafts: draftMap,
            })
      setFormState(nextForm)
      saveWorkspace(user.id, {
        mode: routeMode,
        recordId: routeRecordId,
        form: nextForm,
      })
      const nextVersion = draftSyncVersionRef.current + 1
      draftSyncVersionRef.current = nextVersion
      const snapshot = {
        form: nextForm,
        mode: routeMode,
        recordId: routeRecordId,
        reason: 'type-submitted',
        source: 'type-submitted',
        inspectionType: String(nextForm.inspectionType || '').trim(),
        scope: 'all',
        version: nextVersion,
      }
      pendingDraftSnapshotRef.current = snapshot
      setDraftStatus(DRAFT_STATUS_LABELS.syncing)
      setDraftSyncState((current) => ({
        ...current,
        status: 'syncing',
        lastError: '',
        pendingReason: snapshot.reason,
        pendingType: snapshot.inspectionType,
        scope: snapshot.scope,
      }))
      void runDraftSnapshotSync(snapshot)
      return nextForm
    },
    [formState, routeMode, routeRecordId, runDraftSnapshotSync, user?.id],
  )

  useEffect(() => {
    if (activeSection !== 'form') return undefined
    const retryPendingDraft = () => {
      if (!pendingDraftSnapshotRef.current || draftSyncInFlightRef.current) return
      void runDraftSnapshotSync(pendingDraftSnapshotRef.current)
    }
    const intervalId = window.setInterval(retryPendingDraft, 60 * 1000)
    window.addEventListener?.('online', retryPendingDraft)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener?.('online', retryPendingDraft)
    }
  }, [activeSection, runDraftSnapshotSync])

  const requestReviewForForm = useCallback(
    (nextForm) => {
      commitDraftSnapshot(nextForm, {
        source: 'review-submissions',
        reason: 'review-submissions-open',
        scope: 'all',
      })
      requestInspectionReview({
        nextForm,
        applySessionInspector,
        user,
        setFormState,
        saveWorkspace,
        userId: user?.id,
        routeMode,
        routeRecordId,
        navigate,
        reportBasePath,
      })
      return true
    },
    [commitDraftSnapshot, navigate, reportBasePath, routeMode, routeRecordId, user],
  )

  return {
    clearContinuationState,
    clearWorkingState,
    continuationPrompt,
    continueToInspectionLocation: continueToInspectionLocationFromPrompt,
    draftStatus,
    draftSyncState,
    formState,
    isFormDirty,
    isFormReady,
    openSavedDraft,
    prepareContinuationPrompt: prepareContinuationPromptForRecord,
    recoverLocalDraft,
    requestReview: requestReviewForForm,
    retryDraftSync: runDraftSnapshotSync,
    saveDraft: saveDraftForForm,
    commitDraftSnapshot,
    clearInspectionTypeDraft,
    setContinuationPrompt,
    setDraftStatus,
    setFormState,
    setIsFormDirty,
    setShowMobileRecords,
    showMobileRecords,
    startBlankReport,
    startNew,
    startNewWithType,
  }
}

export default useInspectionModuleFormRuntime
