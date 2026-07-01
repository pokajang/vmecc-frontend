import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CBadge, CContainer, CToast, CToastBody, CToastHeader, CToaster } from '@coreui/react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ChevronDown, ChevronUp } from 'lucide-react'
import ModuleNavTabs from 'src/components/ModuleNavTabs'
import ModulePageHeader from 'src/components/ModulePageHeader'
import TableLoader from 'src/components/TableLoader'
import InspectionWorkflowActionModal from 'src/views/inspection/components/InspectionWorkflowActionModal'
import InspectionRecordsSection from 'src/views/inspection/InspectionRecordsSection'
import InspectionDetailSection from 'src/views/inspection/InspectionDetailSection'
import InspectionReviewSection from 'src/views/inspection/InspectionReviewSection'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import { INSPECTION_SORT_OPTIONS } from 'src/views/inspection/constants'
import useIncidentTypeManager, {
  INCIDENT_TYPE_TOGGLE_VALUE,
} from 'src/views/inspection/useIncidentTypeManager'
import {
  downloadInspectionReportPdf,
  persistInspectionRecord,
} from 'src/views/inspection/inspectionApi'
import {
  enqueueInspectionSubmission,
  isInspectionQueueableError,
  makeInspectionSubmissionKey,
} from 'src/views/inspection/inspectionOfflineQueue'
import { clearInspectionDraft, saveInspectionDraft } from 'src/views/inspection/inspectionStorage'
import { loadOfflineDraftSync } from 'src/views/inspection/inspectionOfflineStore'
import { refreshInspectionOfflineAssets } from 'src/views/inspection/inspectionOfflineHealth'
import useInspectionDraftRows from 'src/views/inspection/hooks/useInspectionDraftRows'
import useInspectionOfflineHealthController from 'src/views/inspection/hooks/useInspectionOfflineHealthController'
import useInspectionQueueController from 'src/views/inspection/hooks/useInspectionQueueController'
import useInspectionRecords from 'src/views/inspection/hooks/useInspectionRecords'
import useInspectionUnsavedChangesGuard from 'src/views/inspection/hooks/useInspectionUnsavedChangesGuard'
import useInspectionWorkflowActions from 'src/views/inspection/hooks/useInspectionWorkflowActions'
import {
  buildDraftRow,
  clearWorkspace,
  getActiveSection,
  loadWorkspace,
  saveWorkspace,
} from 'src/views/inspection/inspectionWorkspace'
import { formatDateTime, toDateTime } from 'src/views/inspection/inspectionSharedUtils'
import InspectionForm from './InspectionForm'
import {
  buildInspectionDraftPayload,
  buildInspectionReviewRecord,
  buildInspectionSubmittedRecord,
  createInspectionFormSignature,
  defaultInspectionForm,
  getInspectionDraftMeta,
  normalizeInspectionForm,
  selectInspectionInitialForm,
} from './inspectionFormHelpers'
import {
  INSPECTION_TOUR_SOURCE_REPLAY,
  TRT_INSPECTION_TOUR_REPLAY_EVENT,
} from 'src/onboarding/inspectionOnboardingContract'
import { getTrtInspectionTourEligibility } from 'src/onboarding/trtInspectionTour'
import InspectionMobileHome from './module/InspectionMobileHome'
import InspectionConfirmModals from './module/InspectionConfirmModals'
import InspectionContinuationModal from './module/InspectionContinuationModal'
import InspectionModuleHeaderActions from './module/InspectionModuleHeaderActions'
import InspectionQueueConflictModal from './module/InspectionQueueConflictModal'
import {
  REPORT_WORKFLOW_DECLARATION_LABEL,
  buildInspectionPdfFilename,
  buildQueueConflictFields,
  copyTextToClipboard,
  formatSelectedChecklistLabels,
  statusToneMap,
} from './module/inspectionModuleUtils'
import {
  buildInspectionContinuationForm,
  buildInspectionContinuationPrompt,
} from './inspectionContinuation'

const MOBILE_HOME_RECENT_RECORD_LIMIT = 3

const InspectionModule = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { reportId } = useParams()
  const user = useSelector((state) => state.authUser)
  const toaster = useRef()
  const submitLockRef = useRef(false)
  const queueSyncLockRef = useRef(false)
  const reloadRecordsRef = useRef(null)
  const initRouteKeyRef = useRef('')
  const lastPersistedSignatureRef = useRef('')
  const offlineWarningShownRef = useRef(false)
  const continuationCompletedKeysRef = useRef(new Set())

  const [toast, addToast] = useState(0)
  const [showDiscard, setShowDiscard] = useState(false)
  const [showDraftChoice, setShowDraftChoice] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [queuedDeleteTarget, setQueuedDeleteTarget] = useState(null)
  const [queueConflictTarget, setQueueConflictTarget] = useState(null)
  const [continuationPrompt, setContinuationPrompt] = useState(null)
  const [homeTypeDeleteTarget, setHomeTypeDeleteTarget] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [showMobileRecords, setShowMobileRecords] = useState(false)
  const [formState, setFormState] = useState(defaultInspectionForm)
  const [isFormReady, setIsFormReady] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [draftStatus, setDraftStatus] = useState('')

  const reportBasePath = '/inspection'
  const reportTypeLabel = 'Inspection'
  const reportTypeIdPrefix = 'INS'
  const localWorkspaceStatus = 'Saved locally. Keep browser data to recover later.'
  const activeSection = useMemo(() => getActiveSection(location.pathname), [location.pathname])
  const isEditRoute =
    activeSection === 'form' && /\/inspection\/[^/]+\/edit$/i.test(location.pathname)
  const routeMode = isEditRoute ? 'edit' : 'new'
  const routeRecordId = isEditRoute ? String(reportId || '').trim() : ''

  const pushToast = useCallback((message, { title, color = 'light', delay = 5000 } = {}) => {
    addToast(
      <CToast autohide delay={delay} color={color}>
        {title ? (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        ) : null}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  const { setDraftVersion, activeDraftRows, setActiveDraftRows, activeDraftPayload } =
    useInspectionDraftRows(user)

  const {
    queueRows,
    queuedRecordRows,
    queueSummary,
    isQueueSyncing,
    refreshQueueRows,
    syncQueuedSubmissions,
    deleteQueuedSubmission,
    saveQueuedAsDraft,
    keepServerConflict,
    retryConflictWithLatest,
  } = useInspectionQueueController({
    userId: user?.id,
    queueSyncLockRef,
    isLoading: false,
    pushToast,
    reloadRecordsRef,
    setDraftVersion,
    setQueueConflictTarget,
  })

  const draftRecordRows = useMemo(
    () => [...activeDraftRows, ...queuedRecordRows],
    [activeDraftRows, queuedRecordRows],
  )

  const {
    records,
    loadError,
    isLoading,
    search,
    setSearch,
    recordScope,
    setRecordScope,
    period,
    setPeriod,
    sort,
    setSort,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    checklistFilter,
    setChecklistFilter,
    hasChecklistFilter,
    setHasChecklistFilter,
    scopedRecords,
    filteredRecords,
    selectedRecord,
    typeOptions,
    statusOptions,
    checklistOptions,
    recordsInScopeCount,
    rowsToShow,
    setRowsToShow,
    visibleRows,
    clearFilters,
    deleteRecord,
    reloadRecords,
  } = useInspectionRecords({
    user,
    userId: user?.id,
    reportId,
    draftRows: draftRecordRows,
  })
  reloadRecordsRef.current = reloadRecords

  const nextReportSequence = useMemo(() => {
    const inspectionRecords = records.filter(
      (row) => String(row?.reportType || '').toLowerCase() === 'inspection',
    )
    return inspectionRecords.length + 1
  }, [records])

  const homeIncident = useIncidentTypeManager({
    userId: user?.id,
    selectedType: '',
    updateSetupField: () => {},
    pushToast,
  })
  const homeTypeOptions = useMemo(() => {
    const toggleIcon = homeIncident.showAllIncidentTypes ? ChevronUp : ChevronDown
    return homeIncident.visibleTypeOptions.map((option) =>
      option?.value === INCIDENT_TYPE_TOGGLE_VALUE ? { ...option, icon: toggleIcon } : option,
    )
  }, [homeIncident.showAllIncidentTypes, homeIncident.visibleTypeOptions])

  const editingRecord = records.find((row) => String(row.id || '').trim() === routeRecordId) || null
  const scopedSubmittedRecords = useMemo(
    () =>
      scopedRecords.filter((row) => row?.recordKind !== 'draft' && row?.recordKind !== 'queued'),
    [scopedRecords],
  )
  const recentRecords = useMemo(
    () => scopedSubmittedRecords.slice(0, MOBILE_HOME_RECENT_RECORD_LIMIT),
    [scopedSubmittedRecords],
  )

  const currentWorkspace = useMemo(() => loadWorkspace(user?.id), [user?.id])

  const {
    offlineHealth,
    isOfflineHealthLoading,
    isRefreshingOfflineAssets,
    setIsRefreshingOfflineAssets,
    refreshOfflineHealth,
  } = useInspectionOfflineHealthController({
    userId: user?.id,
    queueRowsCount: queueRows.length,
    warningShownRef: offlineWarningShownRef,
    pushToast,
  })

  const downloadRecord = useCallback(
    async (id) => {
      const record = records.find((row) => String(row.id || '') === String(id || ''))
      if (!record) return
      setDownloadingId(id)
      const downloadFilename = buildInspectionPdfFilename(record, user)
      try {
        const { blob } = await downloadInspectionReportPdf(record)
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = downloadFilename
        a.click()
        URL.revokeObjectURL(a.href)
      } catch (err) {
        if (err?.status === 409 || String(err?.code || '') === 'REPORT_VERSION_CONFLICT') {
          try {
            const { blob } = await downloadInspectionReportPdf({
              id: record.id,
              displayId: record.displayId,
            })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = downloadFilename
            a.click()
            URL.revokeObjectURL(a.href)
            return
          } catch {
            // Fall through to default error toast below.
          }
        }
        pushToast(err.message || 'Unable to download PDF. Please try again.', {
          title: 'Download failed',
          color: 'danger',
        })
      } finally {
        setDownloadingId(null)
      }
    },
    [records, pushToast, user],
  )

  useEffect(() => {
    if (!loadError) return
    pushToast(loadError?.message || 'Unable to load inspection records. Please try again.', {
      title: 'Load failed',
      color: 'danger',
    })
  }, [loadError, pushToast])

  useEffect(() => {
    if (activeSection !== 'form') {
      setIsFormReady(false)
      initRouteKeyRef.current = ''
      return
    }
    if (!user?.id) return
    if (routeMode === 'edit' && !editingRecord && isLoading) return

    const routeKey = `${routeMode}:${routeRecordId || 'new'}`
    if (initRouteKeyRef.current === routeKey) return

    const next = selectInspectionInitialForm({
      routeMode,
      routeRecordId,
      workspace: loadWorkspace(user.id),
      draftPayload: activeDraftPayload,
      record: editingRecord,
    })

    initRouteKeyRef.current = routeKey
    setFormState(next.form)
    setIsFormReady(true)
    setIsFormDirty(false)
    lastPersistedSignatureRef.current = createInspectionFormSignature(next.form)
    if (next.source === 'draft') {
      const syncStatus = String(activeDraftPayload?.__offlineSyncStatus || '').trim()
      setDraftStatus(
        syncStatus === 'synced'
          ? 'Draft synced'
          : syncStatus === 'failed'
            ? 'Draft sync failed'
            : syncStatus === 'waiting'
              ? 'Waiting to sync'
              : 'Draft saved',
      )
      pushToast('Draft restored.', { title: 'Draft loaded', color: 'info' })
    } else if (next.source === 'workspace') {
      setDraftStatus(localWorkspaceStatus)
    } else {
      setDraftStatus('')
    }
  }, [
    activeDraftPayload,
    activeSection,
    editingRecord,
    isLoading,
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
  }, [activeSection, formState, isFormReady, routeMode, routeRecordId, user?.id])

  const runGuardedAction = (action) => {
    if (activeSection === 'form' && isFormDirty) {
      setPendingAction(() => action)
      setShowDiscard(true)
      return
    }
    action()
  }

  useInspectionUnsavedChangesGuard(
    useCallback(() => activeSection === 'form' && isFormDirty, [activeSection, isFormDirty]),
  )

  useEffect(() => {
    if (activeSection !== 'records') setShowMobileRecords(false)
  }, [activeSection])

  const clearWorkingState = useCallback(() => {
    setFormState(defaultInspectionForm)
    setIsFormReady(false)
    setIsFormDirty(false)
    setDraftStatus('')
    initRouteKeyRef.current = ''
    lastPersistedSignatureRef.current = ''
    clearWorkspace(user?.id)
  }, [user?.id])

  const clearContinuationState = useCallback(() => {
    continuationCompletedKeysRef.current.clear()
    setContinuationPrompt(null)
  }, [])

  const prepareContinuationPrompt = useCallback((record) => {
    const prompt = buildInspectionContinuationPrompt({
      record,
      completedKeys: Array.from(continuationCompletedKeysRef.current),
      isNewReport: Number(record?.version || 0) <= 0,
    })
    if (prompt?.completedKey) {
      continuationCompletedKeysRef.current.add(prompt.completedKey)
    }
    return prompt
  }, [])

  const continueToInspectionLocation = useCallback(
    (option) => {
      const prompt = continuationPrompt
      const nextLocation = String(option?.value || option?.title || '').trim()
      const inspectionType = String(prompt?.inspectionType || '').trim()
      if (!inspectionType || !nextLocation) return

      const nextForm = normalizeInspectionForm(
        buildInspectionContinuationForm({
          inspectionType,
          mainLocation: nextLocation,
        }),
      )
      saveWorkspace(user?.id, {
        mode: 'new',
        recordId: '',
        form: nextForm,
      })
      setContinuationPrompt(null)
      navigate(`${reportBasePath}/new`)
    },
    [continuationPrompt, navigate, user?.id],
  )

  const startNew = () => {
    clearContinuationState()
    const hasSavedDraft = activeDraftRows.some((row) => row?.recordKind === 'draft')
    if (activeSection !== 'form' && hasSavedDraft) {
      setShowDraftChoice(true)
      return
    }
    clearWorkingState()
    navigate(`${reportBasePath}/new`)
  }

  const openSavedDraft = () => {
    clearContinuationState()
    setShowDraftChoice(false)
    clearWorkingState()
    navigate(`${reportBasePath}/new`)
  }

  const startBlankReport = async () => {
    clearContinuationState()
    setShowDraftChoice(false)
    await clearInspectionDraft(user?.id)
    setDraftVersion((prev) => prev + 1)
    clearWorkingState()
    navigate(`${reportBasePath}/new`)
  }

  const recoverLocalDraft = useCallback(() => {
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
    navigate(
      meta.mode === 'edit' && meta.editReportId
        ? `${reportBasePath}/${encodeURIComponent(meta.editReportId)}/edit`
        : `${reportBasePath}/new`,
    )
    pushToast('Local draft recovered on this device.', {
      title: 'Draft recovered',
      color: 'success',
    })
  }, [navigate, pushToast, setActiveDraftRows, setDraftVersion, user?.email, user?.id, user?.name])

  const startNewWithType = (inspectionType) => {
    clearContinuationState()
    const normalizedType = String(inspectionType || '').trim()
    if (!normalizedType) return
    clearWorkingState()
    saveWorkspace(user?.id, {
      mode: 'new',
      recordId: '',
      form: normalizeInspectionForm({
        ...defaultInspectionForm,
        inspectionType: normalizedType,
      }),
    })
    navigate(`${reportBasePath}/new`)
  }

  const saveDraft = async (nextForm = formState, context = null) => {
    const workspace = context || loadWorkspace(user?.id)
    const mode = workspace?.mode || routeMode
    const editReportId = workspace?.recordId || routeRecordId
    const payload = buildInspectionDraftPayload({
      form: nextForm,
      mode,
      editReportId,
    })
    let result = { saved: false, synced: false }
    try {
      result = await saveInspectionDraft(user?.id, payload)
    } catch (error) {
      setDraftStatus('Draft save failed')
      pushToast(error?.message || 'Unable to save draft. Please try again.', {
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
    lastPersistedSignatureRef.current = createInspectionFormSignature(nextForm)
    setIsFormDirty(false)
    setDraftVersion((prev) => prev + 1)
    setDraftStatus(result.synced ? 'Draft synced' : 'Waiting to sync')
    pushToast(result.synced ? 'Draft synced.' : 'Offline draft saved and waiting to sync.', {
      title: result.synced ? 'Draft synced' : 'Offline draft saved',
      color: result.synced ? 'success' : 'warning',
    })
    return true
  }

  const requestReview = (nextForm) => {
    const normalized = normalizeInspectionForm(nextForm)
    setFormState(normalized)
    saveWorkspace(user?.id, {
      mode: routeMode,
      recordId: routeRecordId,
      form: normalized,
    })
    navigate(`${reportBasePath}/review`)
  }

  const reviewWorkspace = activeSection === 'review' ? loadWorkspace(user?.id) : currentWorkspace
  const reviewForm = normalizeInspectionForm(
    activeSection === 'review' ? reviewWorkspace?.form || formState : formState,
  )
  const reviewEditingRecord =
    reviewWorkspace?.mode === 'edit'
      ? records.find(
          (row) => String(row.id || '').trim() === String(reviewWorkspace?.recordId || '').trim(),
        ) || null
      : null
  const reviewRecord =
    activeSection === 'review' && reviewWorkspace?.form
      ? buildInspectionReviewRecord({
          form: reviewForm,
          mode: reviewWorkspace.mode,
          editingRecord: reviewEditingRecord,
          reportTypeSlug: 'inspection',
          reportTypeIdPrefix,
          sequence: nextReportSequence,
          user,
        })
      : null
  const reviewMayQueue =
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    Number(queueSummary?.count || 0) > 0 ||
    Boolean(offlineHealth?.warnings?.length)

  const backFromReview = () => {
    const workspace = loadWorkspace(user?.id)
    if (!workspace) return
    if (workspace.mode === 'edit' && workspace.recordId) {
      navigate(`${reportBasePath}/${encodeURIComponent(workspace.recordId)}/edit`)
      return
    }
    navigate(`${reportBasePath}/new`)
  }

  const submit = async (record) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setIsSubmitting(true)
    const submissionKey = makeInspectionSubmissionKey(user?.id, record)
    try {
      const saved = await persistInspectionRecord(user?.id, record, { submissionKey })
      if (!saved) throw new Error('Unable to save this report in database/API. Please try again.')
      const nextContinuationPrompt = prepareContinuationPrompt(record)
      await reloadRecords()
      await clearInspectionDraft(user?.id)
      setDraftVersion((prev) => prev + 1)
      clearWorkingState()
      pushToast(`${reportTypeLabel} report ${record.displayId} submitted.`, {
        title: 'Submitted',
        color: 'success',
      })
      navigate(reportBasePath)
      if (nextContinuationPrompt) setContinuationPrompt(nextContinuationPrompt)
    } catch (error) {
      if (isInspectionQueueableError(error)) {
        const queued = enqueueInspectionSubmission({
          userId: user?.id,
          record: { ...record, submissionKey },
          submissionKey,
          operation: Number(record?.version || 0) > 0 ? 'update' : 'create',
          baseServerSnapshot: Number(record?.version || 0) > 0 ? editingRecord : null,
        })
        if (queued) {
          refreshQueueRows()
          clearWorkingState()
          pushToast('Report saved to this device and queued for sync.', {
            title: 'Queued for sync',
            color: 'warning',
          })
          navigate(reportBasePath)
          return
        }
      }
      pushToast(error?.message || 'Unable to save this report. Please try again.', {
        title: 'Save failed',
        color: 'danger',
      })
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  const confirmDeleteRecord = async () => {
    const target = deleteTarget
    setDeleteTarget(null)
    if (!target) return
    setIsDeleting(true)
    try {
      if (target.recordKind === 'draft') {
        await clearInspectionDraft(user?.id)
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

  const canEditRecord = useCallback(
    (row) => {
      if (!row) return false
      if (row.recordKind === 'draft') return true
      const ownerUserId = String(row.ownerUserId ?? '').trim()
      if (ownerUserId && String(ownerUserId) !== String(user?.id ?? '').trim()) return false
      return ['Submitted', 'Rejected'].includes(String(row.status || '').trim())
    },
    [user?.id],
  )

  const canDeleteRecord = useCallback(
    (row) => {
      if (!row) return false
      const ownerUserId = String(row.ownerUserId ?? '').trim()
      return !ownerUserId || ownerUserId === String(user?.id ?? '').trim()
    },
    [user?.id],
  )

  const {
    workflowActionState,
    workflowRemarks,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    isActionBusy,
    canReviewRecord,
    canApproveRecord,
    canRejectRecord,
    closeWorkflowActionModal,
    openWorkflowActionModal,
    handleWorkflowRemarksChange,
    handleWorkflowDeclarationChange,
    submitWorkflowAction,
  } = useInspectionWorkflowActions({ reloadRecords, pushToast })

  const editRecord = (row) => {
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

  if (!user) {
    return (
      <div className="my-4 text-danger">Unable to load inspection page. Please sign in again.</div>
    )
  }

  const isCreateSection = activeSection === 'form' || activeSection === 'review'
  const recordsSectionActive = activeSection === 'records' || activeSection === 'detail'
  const tourEligibility = getTrtInspectionTourEligibility(user)

  const startReplayTour = () => {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
    window.dispatchEvent(
      new CustomEvent(TRT_INSPECTION_TOUR_REPLAY_EVENT, {
        detail: { source: INSPECTION_TOUR_SOURCE_REPLAY, userId: user?.id },
      }),
    )
  }

  const renderStatusBadge = (status) => {
    const label = String(status || 'Unknown').trim() || 'Unknown'
    const tone = statusToneMap[label.toLowerCase()] || 'secondary'
    return <CBadge color={tone}>{label}</CBadge>
  }

  const showMobileBackAction =
    activeSection === 'form' ||
    activeSection === 'review' ||
    activeSection === 'detail' ||
    (activeSection === 'records' && showMobileRecords)

  const handleMobileBack = () => {
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

  const headerActions = (
    <InspectionModuleHeaderActions
      showMobileBackAction={showMobileBackAction}
      onMobileBack={handleMobileBack}
      tourEligible={tourEligibility.eligible}
      isCreateSection={isCreateSection}
      onStartTutorial={startReplayTour}
      onStartNew={() => runGuardedAction(startNew)}
    />
  )
  const pageTitle =
    activeSection === 'records' && !showMobileRecords ? (
      <>
        <span className="d-md-none">Conduct Inspection</span>
        <span className="d-none d-md-inline">Inspection Records</span>
      </>
    ) : recordsSectionActive ? (
      'Inspection Records'
    ) : (
      'Conduct Inspection'
    )

  const conflictFields = buildQueueConflictFields(queueConflictTarget)

  return (
    <CContainer fluid className="inspection-module-page" data-tour-id="inspection-module">
      <ModulePageHeader title={pageTitle} actions={headerActions} />
      <CToaster
        ref={toaster}
        push={toast}
        placement="top-end"
        className="inspection-toaster mt-3 me-3"
      />
      {(isDeleting || isSubmitting) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.18)',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '28px 36px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            }}
          >
            <TableLoader message={isSubmitting ? 'Submitting report...' : 'Please wait...'} />
          </div>
        </div>
      )}

      <InspectionConfirmModals
        showDiscard={showDiscard}
        onCloseDiscard={() => {
          setShowDiscard(false)
          setPendingAction(null)
        }}
        onConfirmDiscard={() => {
          setShowDiscard(false)
          setIsFormDirty(false)
          const action = pendingAction
          setPendingAction(null)
          action?.()
        }}
        showDraftChoice={showDraftChoice}
        onCloseDraftChoice={openSavedDraft}
        onConfirmDraftChoice={startBlankReport}
        deleteTarget={deleteTarget}
        onCloseDeleteTarget={() => setDeleteTarget(null)}
        onConfirmDeleteTarget={confirmDeleteRecord}
        queuedDeleteTarget={queuedDeleteTarget}
        onCloseQueuedDeleteTarget={() => setQueuedDeleteTarget(null)}
        onConfirmQueuedDeleteTarget={() => {
          const target = queuedDeleteTarget
          setQueuedDeleteTarget(null)
          if (target) deleteQueuedSubmission(target)
        }}
        homeTypeDeleteTarget={homeTypeDeleteTarget}
        onCloseHomeTypeDeleteTarget={() => setHomeTypeDeleteTarget(null)}
        onConfirmHomeTypeDeleteTarget={() => {
          if (homeTypeDeleteTarget?.value) homeIncident.removeType(homeTypeDeleteTarget.value)
          setHomeTypeDeleteTarget(null)
        }}
      />
      <InspectionContinuationModal
        prompt={continuationPrompt}
        onSelectLocation={continueToInspectionLocation}
        onDismiss={clearContinuationState}
      />
      <InspectionQueueConflictModal
        target={queueConflictTarget}
        fields={conflictFields}
        onClose={() => setQueueConflictTarget(null)}
        onCopyLocalNotes={async (target) => {
          try {
            const localNotes = [
              target?.description || '',
              formatSelectedChecklistLabels(target)
                .split('\n')
                .filter((line) => line && line !== '--')
                .join('\n'),
            ]
              .filter(Boolean)
              .join('\n')
            await copyTextToClipboard(localNotes)
            pushToast('Local notes copied.', { title: 'Copied', color: 'success' })
          } catch {
            pushToast('Unable to copy local notes.', { title: 'Copy failed', color: 'danger' })
          }
        }}
        onKeepServer={keepServerConflict}
        onSaveLocalAsDraft={saveQueuedAsDraft}
        onRetryWithLatest={retryConflictWithLatest}
      />

      <TypeManagerModal
        visible={homeIncident.showAddTypeModal}
        onClose={homeIncident.closeAddModal}
        editMode={homeIncident.incidentEditMode}
        onSetEditMode={homeIncident.setIncidentEditMode}
        editTitle="Edit Inspection Types"
        addTitle="Add Inspection Type"
        options={homeIncident.typeOptions}
        onStartEdit={homeIncident.startEditType}
        onRequestDelete={({ value, label }) => setHomeTypeDeleteTarget({ value, label })}
        nameLabel="Inspection Type Name"
        nameValue={homeIncident.newTypeName}
        onChangeName={(nextValue) => {
          homeIncident.setNewTypeName(nextValue)
          if (homeIncident.addTypeError) homeIncident.setAddTypeError('')
        }}
        namePlaceholder="e.g. Pump House"
        descriptionLabel="Inspection Type Details (Optional)"
        descriptionValue={homeIncident.newTypeDescription}
        onChangeDescription={homeIncident.setNewTypeDescription}
        descriptionPlaceholder="Subtext shown below type name."
        error={homeIncident.addTypeError}
        editingKey={homeIncident.editingIncidentTypeKey}
        editingLabel="Editing type"
        editButtonLabel="Edit Types"
        onSave={homeIncident.saveType}
        saveLabel="Save Type"
        updateLabel="Update Type"
        iconOptions={homeIncident.iconOptions}
        iconValue={homeIncident.newTypeIconKey}
        onChangeIcon={homeIncident.setNewTypeIconKey}
        showIconPicker
      />

      <InspectionWorkflowActionModal
        visible={workflowActionState.visible}
        actionType={workflowActionState.actionType}
        record={workflowActionState.record}
        remarks={workflowRemarks}
        onRemarksChange={handleWorkflowRemarksChange}
        declarationChecked={workflowDeclarationChecked}
        onDeclarationChange={handleWorkflowDeclarationChange}
        declarationLabel={REPORT_WORKFLOW_DECLARATION_LABEL}
        declarationError={workflowDeclarationError}
        rejectError={workflowRejectError}
        actionDisabled={isActionBusy}
        renderStatusBadge={renderStatusBadge}
        formatDateTime={formatDateTime}
        onClose={closeWorkflowActionModal}
        onSubmit={submitWorkflowAction}
      />

      <ModuleNavTabs
        className="d-none d-md-flex"
        items={[
          {
            key: 'records',
            label: 'Records',
            active: recordsSectionActive,
            onClick: () =>
              runGuardedAction(() => {
                clearContinuationState()
                navigate(reportBasePath)
              }),
          },
          {
            key: 'new',
            label: 'New',
            active: isCreateSection,
            onClick: () => runGuardedAction(startNew),
            dataTourId: 'inspection-new',
          },
        ]}
      />

      {activeSection === 'records' ? (
        <>
          {!showMobileRecords ? (
            <InspectionMobileHome
              draftRow={activeDraftRows[0] || null}
              typeOptions={homeTypeOptions}
              recentRecords={recentRecords}
              recordsCount={scopedSubmittedRecords.length}
              queueSummary={recordScope === 'mine' ? queueSummary : null}
              isQueueSyncing={isQueueSyncing}
              recordScope={recordScope}
              onRecordScopeChange={setRecordScope}
              isRecordsLoading={isLoading}
              onSelectType={(inspectionType) =>
                runGuardedAction(() => startNewWithType(inspectionType))
              }
              onToggleTypes={() => homeIncident.setShowAllIncidentTypes((prev) => !prev)}
              onAddType={homeIncident.openAddModal}
              onContinueDraft={() => runGuardedAction(openSavedDraft)}
              onDeleteDraft={() => setDeleteTarget(activeDraftRows[0])}
              onOpenRecord={(row) =>
                row?.id ? navigate(`${reportBasePath}/${encodeURIComponent(row.id)}`) : null
              }
              onViewRecords={() => setShowMobileRecords(true)}
              onRetryQueue={() => syncQueuedSubmissions({ silent: false, force: true })}
            />
          ) : null}

          <div className={showMobileRecords ? '' : 'd-none d-md-block'}>
            <InspectionRecordsSection
              startNew={startNew}
              search={search}
              setSearch={setSearch}
              recordScope={recordScope}
              setRecordScope={setRecordScope}
              period={period}
              setPeriod={setPeriod}
              sort={sort}
              setSort={setSort}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              typeOptions={typeOptions}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              checklistFilter={checklistFilter}
              setChecklistFilter={setChecklistFilter}
              hasChecklistFilter={hasChecklistFilter}
              setHasChecklistFilter={setHasChecklistFilter}
              statusOptions={statusOptions}
              checklistOptions={checklistOptions}
              sortOptions={INSPECTION_SORT_OPTIONS}
              clearFilters={clearFilters}
              isLoading={isLoading}
              filteredRecords={filteredRecords}
              visibleRows={visibleRows}
              onViewRecord={(id) => navigate(`${reportBasePath}/${encodeURIComponent(id)}`)}
              onDownloadRecord={downloadRecord}
              downloadingId={downloadingId}
              onEditRecord={editRecord}
              onDeleteRecord={(row) =>
                row?.recordKind === 'queued' ? setQueuedDeleteTarget(row) : setDeleteTarget(row)
              }
              onReviewTransition={(row) => openWorkflowActionModal(row, 'review')}
              onApproveTransition={(row) => openWorkflowActionModal(row, 'approve')}
              onRejectTransition={(row) => openWorkflowActionModal(row, 'reject')}
              canReviewRecord={canReviewRecord}
              canApproveRecord={canApproveRecord}
              canRejectRecord={canRejectRecord}
              canEditRecord={canEditRecord}
              canDeleteRecord={canDeleteRecord}
              formatDateTime={formatDateTime}
              rowsToShow={rowsToShow}
              setRowsToShow={setRowsToShow}
              totalCount={recordsInScopeCount}
              showPrimaryAction={false}
              queueSummary={recordScope === 'mine' ? queueSummary : null}
              queueRows={queuedRecordRows}
              isQueueSyncing={isQueueSyncing}
              onRetryQueue={(row) =>
                syncQueuedSubmissions({
                  silent: false,
                  force: true,
                  queueId: row?.queueId || '',
                })
              }
              onOpenQueueConflict={(row) => setQueueConflictTarget(row)}
              onSaveQueuedAsDraft={saveQueuedAsDraft}
              offlineHealth={offlineHealth}
              isOfflineHealthLoading={isOfflineHealthLoading}
              isRefreshingOfflineAssets={isRefreshingOfflineAssets}
              onRefreshOfflineAssets={async () => {
                setIsRefreshingOfflineAssets(true)
                try {
                  await refreshInspectionOfflineAssets()
                  await refreshOfflineHealth()
                  pushToast('Offline assets refreshed.', {
                    title: 'Offline ready',
                    color: 'success',
                  })
                } catch (error) {
                  pushToast(error?.message || 'Unable to refresh offline assets.', {
                    title: 'Offline refresh failed',
                    color: 'danger',
                  })
                } finally {
                  setIsRefreshingOfflineAssets(false)
                }
              }}
              onRecoverLocalDraft={() => recoverLocalDraft()}
              canRecoverLocalDraft={Boolean(
                offlineHealth?.localDraftExists && activeDraftRows.length === 0,
              )}
            />
          </div>
        </>
      ) : null}

      {activeSection === 'detail' ? (
        <InspectionDetailSection
          selectedRecord={selectedRecord}
          onBack={() => navigate(reportBasePath)}
          formatDateTime={formatDateTime}
          renderStatusBadge={renderStatusBadge}
          onEditRecord={editRecord}
          canEditRecord={canEditRecord}
          onDownloadRecord={downloadRecord}
          downloadingId={downloadingId}
          onReviewRecord={(row) => openWorkflowActionModal(row, 'review')}
          onApproveRecord={(row) => openWorkflowActionModal(row, 'approve')}
          onRejectRecord={(row) => openWorkflowActionModal(row, 'reject')}
          isActionBusy={isActionBusy}
        />
      ) : null}

      {activeSection === 'review' ? (
        <InspectionReviewSection
          selectedRecord={reviewRecord}
          reviewActions={{
            onBackToEdit: backFromReview,
            onSaveDraft: () => saveDraft(reviewForm, reviewWorkspace),
            onConfirm: () =>
              reviewRecord && submit(buildInspectionSubmittedRecord(reviewRecord, user)),
            confirmLabel: reviewMayQueue ? 'Queue for sync' : 'Confirm Submit',
          }}
          queueWarning={
            reviewMayQueue
              ? 'You appear to be offline or local sync is pending. This report will be queued on this device until sync succeeds.'
              : ''
          }
          isSubmittingReview={isSubmitting}
          renderStatusBadge={renderStatusBadge}
        />
      ) : null}

      {activeSection === 'form' ? (
        isFormReady ? (
          <InspectionForm
            user={user}
            value={formState}
            pushToast={pushToast}
            draftStatus={draftStatus}
            onChange={(nextForm) => {
              setDraftStatus('Unsaved changes')
              setFormState(nextForm)
            }}
            onSaveDraft={saveDraft}
            onRequestReview={requestReview}
          />
        ) : (
          <TableLoader />
        )
      ) : null}
    </CContainer>
  )
}

export default InspectionModule
