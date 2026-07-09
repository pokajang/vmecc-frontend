import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { INSPECTION_SORT_OPTIONS } from 'src/views/inspection/constants'
import useIncidentTypeManager, {
  INCIDENT_TYPE_TOGGLE_VALUE,
} from 'src/views/inspection/useIncidentTypeManager'
import useInspectionDraftRows from 'src/views/inspection/state/useInspectionDraftRows'
import useInspectionOfflineHealthController from 'src/views/inspection/state/useInspectionOfflineHealthController'
import useInspectionQueueController from 'src/views/inspection/state/useInspectionQueueController'
import useInspectionRecords from 'src/views/inspection/state/useInspectionRecords'
import useInspectionUnsavedChangesGuard from 'src/views/inspection/state/useInspectionUnsavedChangesGuard'
import useInspectionWorkflowActions from 'src/views/inspection/state/useInspectionWorkflowActions'
import { getActiveSection, loadWorkspace } from 'src/views/inspection/inspectionWorkspace'
import { formatDateTime } from 'src/views/inspection/inspectionSharedUtils'
import {
  applySessionInspector,
  buildInspectionReviewRecord,
  normalizeInspectionForm,
} from '../inspectionFormHelpers'
import InspectionModuleLayout, {
  buildInspectionHeaderActions,
  buildInspectionPageTitle,
  renderInspectionStatusBadge,
} from './InspectionModuleLayout'
import {
  buildInspectionReviewContext,
  DRAFT_STATUS_LABELS,
  MOBILE_HOME_RECENT_RECORD_LIMIT,
} from './inspectionModuleFlow'
import { handleInspectionMobileBack } from './inspectionModuleUiFlow'
import {
  buildInspectionDetailViewProps,
  buildInspectionFormViewProps,
  buildInspectionModalProps,
  buildInspectionRecordsViewProps,
  buildInspectionReviewViewProps,
} from './inspectionModuleLayoutProps'
import { buildQueueConflictFields } from './inspectionModuleUtils'
import {
  buildPendingSubmissionSummary,
  getPendingSubmissionTypeKey,
} from '../form/pendingSubmissionSummary'
import { countFireExtinguisherSessionRetryQueue } from '../form/hooks/fireExtinguisherSessionRetryQueue'
import useInspectionModuleFormRuntime from './useInspectionModuleFormRuntime'
import useInspectionModuleRecordActions from './useInspectionModuleRecordActions'

const InspectionModule = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { reportId } = useParams()
  const user = useSelector((state) => state.authUser)
  const submitLockRef = useRef(false)
  const queueSyncLockRef = useRef(false)
  const reloadRecordsRef = useRef(null)
  const offlineWarningShownRef = useRef(false)

  const [feedback, setFeedback] = useState(null)
  const [showDiscard, setShowDiscard] = useState(false)
  const [showDraftChoice, setShowDraftChoice] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [queuedDeleteTarget, setQueuedDeleteTarget] = useState(null)
  const [queueConflictTarget, setQueueConflictTarget] = useState(null)
  const [homeTypeDeleteTarget, setHomeTypeDeleteTarget] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

  const reportBasePath = '/inspection'
  const reportTypeLabel = 'Inspection'
  const reportTypeIdPrefix = 'INS'
  const localWorkspaceStatus = DRAFT_STATUS_LABELS.localSaved
  const activeSection = useMemo(() => getActiveSection(location.pathname), [location.pathname])
  const isEditRoute =
    activeSection === 'form' && /\/inspection\/[^/]+\/edit$/i.test(location.pathname)
  const routeMode = isEditRoute ? 'edit' : 'new'
  const routeRecordId = isEditRoute ? String(reportId || '').trim() : ''

  const pushToast = useCallback((message, { title, color = 'light', delay = 5000 } = {}) => {
    setFeedback((current) => ({
      id: Number(current?.id || 0) + 1,
      message,
      title,
      color,
      delay,
    }))
  }, [])

  useEffect(() => {
    if (!feedback?.message || !feedback.delay) return undefined
    const timerId = window.setTimeout(() => {
      setFeedback((current) => (current?.id === feedback.id ? null : current))
    }, feedback.delay)
    return () => window.clearTimeout(timerId)
  }, [feedback])

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

  useEffect(() => {
    reloadRecordsRef.current = reloadRecords
  }, [reloadRecords])

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

  const {
    clearContinuationState,
    clearInspectionTypeDraft,
    clearWorkingState,
    continuationPrompt,
    continueToInspectionLocation,
    draftStatus,
    draftSyncState,
    formState,
    isFormDirty,
    isFormReady,
    openSavedDraft,
    prepareContinuationPrompt,
    recoverLocalDraft,
    requestReview,
    retryDraftSync,
    saveDraft,
    commitDraftSnapshot,
    setContinuationPrompt,
    setDraftStatus,
    setFormState,
    setIsFormDirty,
    setShowMobileRecords,
    showMobileRecords,
    startBlankReport,
    startNew,
    startNewWithType,
  } = useInspectionModuleFormRuntime({
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
  })

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

  useEffect(() => {
    if (!loadError) return
    const timerId = window.setTimeout(() => {
      pushToast(loadError?.message || 'Unable to load inspection records. Please try again.', {
        title: 'Load failed',
        color: 'danger',
      })
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [loadError, pushToast])

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

  const { reviewWorkspace, sessionReviewForm, reviewRecord } = buildInspectionReviewContext({
    activeSection,
    currentWorkspace: activeSection === 'review' ? loadWorkspace(user?.id) : currentWorkspace,
    formState,
    user,
    records,
    reportTypeIdPrefix,
    nextReportSequence,
    normalizeInspectionForm,
    applySessionInspector,
    buildInspectionReviewRecord,
  })
  const isUpdatingExistingRecord =
    (activeSection === 'form' && routeMode === 'edit' && Boolean(routeRecordId)) ||
    (activeSection === 'review' &&
      reviewWorkspace?.mode === 'edit' &&
      Boolean(reviewWorkspace?.recordId))
  const fireExtinguisherDraft =
    sessionReviewForm?.inspectionTypeDrafts?.[
      getPendingSubmissionTypeKey('Fire Extinguisher Inspection')
    ] || {}
  const fireExtinguisherSessionUid = String(
    fireExtinguisherDraft.inspectionSessionUid || sessionReviewForm?.inspectionSessionUid || '',
  ).trim()
  const pendingSubmissionSummary = buildPendingSubmissionSummary({
    form: sessionReviewForm,
    draftSyncState,
    fireExtinguisherSessionRetryCount: countFireExtinguisherSessionRetryQueue({
      userId: user?.id,
      sessionUid: fireExtinguisherSessionUid,
    }),
  })
  const buildPendingReviewRecord = (pendingItem) =>
    pendingItem?.form
      ? buildInspectionReviewRecord({
          form: pendingItem.form,
          mode: reviewWorkspace?.mode || 'new',
          editingRecord:
            reviewWorkspace?.mode === 'edit'
              ? records.find(
                  (row) =>
                    String(row.id || '').trim() === String(reviewWorkspace?.recordId || '').trim(),
                ) || editingRecord
              : null,
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

  const {
    backFromReview,
    canDeleteRecord,
    canEditRecord,
    confirmDeleteRecord,
    downloadRecord,
    editRecord,
    submit,
  } = useInspectionModuleRecordActions({
    clearWorkingState,
    deleteRecord,
    deleteTarget,
    editingRecord,
    loadWorkspace,
    navigate,
    prepareContinuationPrompt,
    pushToast,
    records,
    refreshQueueRows,
    reloadRecords,
    reportBasePath,
    reportId,
    reportTypeLabel,
    setDeleteTarget,
    setDraftVersion,
    setDownloadingId,
    setIsDeleting,
    setIsSubmitting,
    setContinuationPrompt,
    submitLockRef,
    user,
  })

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

  if (!user) {
    return (
      <div className="my-4 text-danger">Unable to load inspection page. Please sign in again.</div>
    )
  }

  const isCreateSection = activeSection === 'form' || activeSection === 'review'
  const recordsSectionActive = activeSection === 'records' || activeSection === 'detail'

  const showMobileBackAction =
    activeSection === 'form' ||
    activeSection === 'review' ||
    activeSection === 'detail' ||
    activeSection === 'extinguishers' ||
    (activeSection === 'records' && showMobileRecords)

  const handleMobileBack = () => {
    handleInspectionMobileBack({
      activeSection,
      showMobileRecords,
      setShowMobileRecords,
      backFromReview,
      navigate,
      reportBasePath,
      runGuardedAction,
      clearContinuationState,
    })
  }

  const headerActions = buildInspectionHeaderActions({
    isCreateSection,
    onMobileBack: handleMobileBack,
    onStartNew: () => runGuardedAction(startNew),
    showMobileBackAction,
  })
  const pageTitle = buildInspectionPageTitle({
    activeSection,
    isUpdatingExistingRecord,
    recordsSectionActive,
    showMobileRecords,
  })
  const conflictFields = buildQueueConflictFields(queueConflictTarget)

  return (
    <InspectionModuleLayout
      activeSection={activeSection}
      clearContinuationState={clearContinuationState}
      detailViewProps={buildInspectionDetailViewProps({
        canEditRecord,
        downloadRecord,
        downloadingId,
        editRecord,
        formatDateTime,
        isActionBusy,
        navigate,
        openWorkflowActionModal,
        renderStatusBadge: renderInspectionStatusBadge,
        reportBasePath,
        selectedRecord,
      })}
      formViewProps={buildInspectionFormViewProps({
        clearInspectionTypeDraft,
        draftStatus,
        draftSyncState,
        formState,
        isUpdatingExistingRecord,
        isFormReady,
        pushToast,
        requestReview,
        retryDraftSync,
        saveDraft,
        commitDraftSnapshot,
        setDraftStatus,
        setFormState,
        user,
      })}
      headerActions={headerActions}
      isDeleting={isDeleting}
      isSubmitting={isSubmitting}
      modalProps={buildInspectionModalProps({
        clearContinuationState,
        closeWorkflowActionModal,
        confirmDeleteRecord,
        conflictFields,
        continueToInspectionLocation,
        continuationPrompt,
        deleteQueuedSubmission,
        deleteTarget,
        formatDateTime,
        handleWorkflowDeclarationChange,
        handleWorkflowRemarksChange,
        homeIncident,
        homeTypeDeleteTarget,
        isActionBusy,
        keepServerConflict,
        openSavedDraft,
        pendingAction,
        pushToast,
        queueConflictTarget,
        queuedDeleteTarget,
        renderStatusBadge: renderInspectionStatusBadge,
        retryConflictWithLatest,
        saveQueuedAsDraft,
        setDeleteTarget,
        setHomeTypeDeleteTarget,
        setIsFormDirty,
        setPendingAction,
        setQueueConflictTarget,
        setQueuedDeleteTarget,
        setShowDiscard,
        showDiscard,
        showDraftChoice,
        startBlankReport,
        submitWorkflowAction,
        workflowActionState,
        workflowDeclarationChecked,
        workflowDeclarationError,
        workflowRejectError,
        workflowRemarks,
      })}
      navigate={navigate}
      pageTitle={pageTitle}
      recordsSectionActive={recordsSectionActive}
      recordsViewProps={buildInspectionRecordsViewProps({
        activeDraftRows,
        canApproveRecord,
        canDeleteRecord,
        canEditRecord,
        canRejectRecord,
        canReviewRecord,
        checklistFilter,
        checklistOptions,
        clearFilters,
        downloadRecord,
        downloadingId,
        editRecord,
        filteredRecords,
        formatDateTime,
        hasChecklistFilter,
        homeIncident,
        homeTypeOptions,
        inspectionSortOptions: INSPECTION_SORT_OPTIONS,
        isLoading,
        isOfflineHealthLoading,
        isQueueSyncing,
        isRefreshingOfflineAssets,
        navigate,
        offlineHealth,
        openSavedDraft,
        openWorkflowActionModal,
        period,
        pushToast,
        queueSummary,
        queuedRecordRows,
        recentRecords,
        recordScope,
        reportBasePath,
        recordsInScopeCount,
        recoverLocalDraft,
        refreshOfflineHealth,
        rowsToShow,
        runGuardedAction,
        saveQueuedAsDraft,
        scopedSubmittedRecords,
        search,
        setChecklistFilter,
        setDeleteTarget,
        setHasChecklistFilter,
        setIsRefreshingOfflineAssets,
        setPeriod,
        setQueueConflictTarget,
        setQueuedDeleteTarget,
        setRecordScope,
        setRowsToShow,
        setSearch,
        setShowMobileRecords,
        setSort,
        setStatusFilter,
        setTypeFilter,
        showMobileRecords,
        sort,
        startNew,
        startNewWithType,
        statusFilter,
        statusOptions,
        syncQueuedSubmissions,
        typeFilter,
        typeOptions,
        visibleRows,
      })}
      reportBasePath={reportBasePath}
      reviewViewProps={buildInspectionReviewViewProps({
        backFromReview,
        buildPendingReviewRecord,
        clearInspectionTypeDraft,
        isSubmitting,
        isUpdatingExistingRecord,
        pendingSubmissionSummary,
        renderStatusBadge: renderInspectionStatusBadge,
        reviewMayQueue,
        reviewRecord,
        reviewWorkspace,
        saveDraft,
        sessionReviewForm,
        submit,
        user,
      })}
      runGuardedAction={runGuardedAction}
      startNew={startNew}
      feedback={feedback}
    />
  )
}

export default InspectionModule
