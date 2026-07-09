import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import { hasPermission } from 'src/utils/authz'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import CreateActionButton from 'src/components/CreateActionButton'
import InlineFeedbackMessage from 'src/components/InlineFeedbackMessage'
import ModuleNavTabs from 'src/components/ModuleNavTabs'
import ModulePageHeader from 'src/components/ModulePageHeader'
import TableLoader from 'src/components/TableLoader'
import { SORT_OPTIONS } from './constants'
import { FORM_REGISTRY } from './formRegistry'
import ReportDetailSection from './components/ReportDetailSection'
import ReportRecordsSection from './components/ReportRecordsSection'
import ReportReviewSection from './components/ReportReviewSection'
import ReportWorkflowActionModal from './components/ReportWorkflowActionModal'
import { refreshReportRecord } from './reportApi'
import useReportMetadata from './hooks/useReportMetadata'
import useReportRecords from './hooks/useReportRecords'
import useUnsavedChangesGuard from './hooks/useUnsavedChangesGuard'
import useActiveReportDraftRows from './hooks/useActiveReportDraftRows'
import useReportRouteActions from './hooks/useReportRouteActions'
import { formatDateTime, normalizeReportRecord, normalizeReportTypeSlug } from './utils'
import DrillMobileHome from './drill/DrillMobileHome'
import ErcoMobileHome from './erco/ErcoMobileHome'
import FitnessTestMobileHome from './fitness-test/FitnessTestMobileHome'

import {
  REPORT_WORKFLOW_DECLARATION_LABEL,
  buildChangeSummary,
  recordToDraft,
  statusToneMap,
} from './reportDraftDomain'

const initialRouteDetailState = {
  status: 'idle',
  record: null,
  errorStatus: null,
  routeKey: '',
}

const Reports = ({ overrideReportType, overrideBasePath, formComponent, reportTypeMeta } = {}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { reportType: routeReportType, reportId, newSection } = useParams()
  const reportType = overrideReportType || routeReportType
  const user = useSelector((state) => state.authUser)
  const routeReportTypeSlug = normalizeReportTypeSlug(reportType)
  const routePermissionMap = {
    erco: 'reports.erco.view',
    drill: 'reports.drill.view',
    'fitness-test': 'reports.fitness.view',
  }
  const requiredRoutePermission = routePermissionMap[routeReportTypeSlug] || ''
  const canAccessReportRoute = requiredRoutePermission
    ? hasPermission(user, requiredRoutePermission)
    : false

  const [feedback, setFeedback] = useState(null)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [formSessionKey, setFormSessionKey] = useState(0)
  const [draftVersion, setDraftVersion] = useState(0)
  const [showMobileRecords, setShowMobileRecords] = useState(false)
  const [routeDetailState, setRouteDetailState] = useState(initialRouteDetailState)

  const {
    reportTypeSlug,
    isKnownType,
    activeSection,
    reportTypeLabel,
    reportTypeIdPrefix,
    reportBasePath,
    datePresetOptions,
    timePresetOptions,
  } = useReportMetadata({
    reportType,
    reportId,
    pathname: location.pathname,
    basePath: overrideBasePath,
    reportTypeMeta,
  })
  const activeFormSlug = String(reportTypeSlug || '').toLowerCase()
  const queryDraftId = useMemo(() => {
    const fromQuery = new URLSearchParams(location.search).get('draft')
    return String(fromQuery || '').trim()
  }, [location.search])
  const { activeDraftRows, setActiveDraftRows } = useActiveReportDraftRows({
    activeFormSlug,
    draftVersion,
    reportTypeLabel,
    user,
  })
  const routeDetailKey =
    activeSection === 'detail' && reportId
      ? `${activeFormSlug}:${String(reportId || '').trim()}`
      : ''
  const isRouteDetailStateCurrent =
    Boolean(routeDetailKey) && routeDetailState.routeKey === routeDetailKey
  const routeDetailRecord = isRouteDetailStateCurrent ? routeDetailState.record : null
  const routeDetailStatus = isRouteDetailStateCurrent ? routeDetailState.status : 'idle'

  const {
    records,
    isLoading,
    search,
    setSearch,
    period,
    setPeriod,
    sort,
    setSort,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    filteredRecords,
    submittedRecordsInScope,
    selectedRecord,
    typeOptions,
    statusOptions,
    recordScope,
    setRecordScope,
    recordsInScopeCount,
    rowsToShow,
    setRowsToShow,
    visibleRows,
    clearFilters,
    persistRecords,
    reloadRecords,
  } = useReportRecords({
    user,
    userId: user?.id,
    reportTypeSlug,
    reportId,
    draftRows: activeDraftRows,
  })
  const nextReportSequence = useMemo(() => {
    if (isLoading) return null
    const matchingRows = records.filter(
      (row) => String(row?.reportType || '').toLowerCase() === activeFormSlug,
    )
    return matchingRows.length + 1
  }, [activeFormSlug, isLoading, records])
  const editingReportId = useMemo(() => {
    const fromQuery = new URLSearchParams(location.search).get('edit')
    const fallback = location.state?.editReportId
    return String(fromQuery || fallback || '').trim()
  }, [location.search, location.state?.editReportId])

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
  const {
    backFromReview,
    canApproveRecord,
    canDeleteRecord,
    canEditRecord,
    canRejectRecord,
    canReviewRecord,
    closeWorkflowActionModal,
    confirmDeleteRecord,
    confirmReviewSubmit,
    continueEditWithDraft,
    deleteTarget,
    discardEditDraftAndLoadOriginal,
    downloadRecord,
    downloadingId,
    editRecord,
    isActionBusy,
    isDeleting,
    isSubmitting,
    pendingEditRow,
    openSavedDraft,
    pendingAction,
    pendingReviewBackSection,
    pendingReviewRecord,
    requestDeleteRecord,
    requestReview,
    runGuardedAction,
    saveReviewDraft,
    setDeleteTarget,
    setPendingAction,
    setShowDiscard,
    setShowDraftChoice,
    setShowEditDraftChoice,
    setWorkflowDeclarationChecked,
    setWorkflowRemarks,
    showDiscard,
    showDraftChoice,
    showEditDraftChoice,
    startBlankReport,
    startNew,
    submit,
    submitWorkflowAction,
    transitionApprove,
    transitionReject,
    transitionReview,
    workflowActionState,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    workflowRemarks,
  } = useReportRouteActions({
    activeFormSlug,
    activeSection,
    isFormDirty,
    location,
    navigate,
    persistRecords,
    pushToast,
    queryDraftId,
    recordFallbacks: routeDetailRecord ? [routeDetailRecord] : [],
    records,
    reloadRecords,
    reportBasePath,
    reportId,
    reportTypeLabel,
    setActiveDraftRows,
    setDraftVersion,
    setFormSessionKey,
    setIsFormDirty,
    user,
  })

  const checkDirty = useCallback(
    () => activeSection === 'new' && isFormDirty,
    [activeSection, isFormDirty],
  )
  useUnsavedChangesGuard(checkDirty)

  const renderStatusBadge = (status) => {
    const label = String(status || 'Unknown').trim() || 'Unknown'
    const tone = statusToneMap[label.toLowerCase()] || 'secondary'
    return <CBadge color={tone}>{label}</CBadge>
  }

  const ActiveFormComponent = formComponent || FORM_REGISTRY[activeFormSlug] || null
  const supportsNewForm = typeof ActiveFormComponent === 'function'
  const isErcoReport = activeFormSlug === 'erco'
  const isDrillReport = activeFormSlug === 'drill'
  const isFitnessTestReport = activeFormSlug === 'fitness-test'
  const isWorkFirstReport = isErcoReport || isDrillReport || isFitnessTestReport
  const testAnchorPrefix = activeFormSlug ? `${activeFormSlug}-report` : ''
  const selectedEditingRecord =
    records.find((row) => String(row.id || '').trim() === editingReportId) || null
  const routeDetailRecordMatches =
    activeSection === 'detail' &&
    String(routeDetailRecord?.id || '') === String(reportId || '') &&
    String(routeDetailRecord?.reportType || '').toLowerCase() === activeFormSlug
  const selectedDetailRecord =
    selectedRecord || (routeDetailRecordMatches ? routeDetailRecord : null)
  const shouldShowRouteDetailLoading =
    activeSection === 'detail' &&
    !selectedDetailRecord &&
    ['idle', 'loading'].includes(routeDetailStatus)
  const routeDetailErrorMessage =
    activeSection === 'detail' &&
    !selectedDetailRecord &&
    (routeDetailStatus === 'not-found'
      ? 'Report not found.'
      : routeDetailStatus === 'error'
        ? 'Unable to load report. Please try again.'
        : '')
  const editingDraftSeed = selectedEditingRecord
    ? recordToDraft(selectedEditingRecord, activeFormSlug)
    : null
  const reviewRecord = pendingReviewRecord || location.state?.reviewRecord || null
  const reviewBackSection =
    pendingReviewBackSection ||
    location.state?.reviewBackSection ||
    (activeFormSlug === 'erco' ? 'analysis' : '')
  const reviewChangeSummary =
    selectedEditingRecord && reviewRecord
      ? buildChangeSummary(selectedEditingRecord, reviewRecord)
      : []
  const displayReviewChangeSummary =
    isDrillReport || isFitnessTestReport
      ? reviewChangeSummary.map((entry) => ({
          ...entry,
          label:
            entry.label === 'Incident Type'
              ? isFitnessTestReport
                ? 'Fitness Test Type'
                : 'Drill Type'
              : entry.label === 'Title'
                ? isFitnessTestReport
                  ? 'Test Details'
                  : 'Drill Scenario'
                : entry.label === 'Summary'
                  ? isFitnessTestReport
                    ? 'Test Summary'
                    : 'Outcome Summary'
                  : entry.label,
        }))
      : reviewChangeSummary
  const reviewReturnDraft =
    location.state?.returnFromReview && location.state?.reviewRecord
      ? recordToDraft(location.state.reviewRecord, activeFormSlug)
      : null
  const shouldSkipDraftLoad =
    location.state?.skipReportDraft === activeFormSlug || location.state?.returnFromReview === true
  const activeDraftRow =
    activeFormSlug === 'erco' && queryDraftId
      ? activeDraftRows.find((row) => String(row?.draftId || '').trim() === queryDraftId) || null
      : null

  useEffect(() => {
    const routeReportId = String(reportId || '').trim()
    if (activeSection !== 'detail' || !routeReportId) {
      return undefined
    }
    const nextRouteKey = `${activeFormSlug}:${routeReportId}`
    let cancelled = false
    const loadRouteDetailRecord = async () => {
      setRouteDetailState({
        status: 'loading',
        record: null,
        errorStatus: null,
        routeKey: nextRouteKey,
      })
      try {
        const row = normalizeReportRecord(await refreshReportRecord(routeReportId))
        if (cancelled) {
          return
        }
        const isMatchingRouteRecord =
          row &&
          String(row.id || '').trim() === routeReportId &&
          String(row.reportType || '').toLowerCase() === activeFormSlug

        setRouteDetailState(
          isMatchingRouteRecord
            ? { status: 'loaded', record: row, errorStatus: null, routeKey: nextRouteKey }
            : { status: 'not-found', record: null, errorStatus: null, routeKey: nextRouteKey },
        )
      } catch (error) {
        if (!cancelled) {
          const status = Number(error?.status || error?.payload?.status || 0) || null
          setRouteDetailState({
            status: status === 403 || status === 404 ? 'not-found' : 'error',
            record: null,
            errorStatus: status,
            routeKey: nextRouteKey,
          })
        }
      }
    }
    loadRouteDetailRecord()
    return () => {
      cancelled = true
    }
  }, [activeFormSlug, activeSection, reportId])

  const recentMobileRecords = useMemo(
    () => submittedRecordsInScope.slice(0, 5),
    [submittedRecordsInScope],
  )
  const recentMobileDrafts = useMemo(() => activeDraftRows.slice(0, 3), [activeDraftRows])
  const handleSaveReviewDraft = useCallback(
    () => saveReviewDraft({ reviewRecord, selectedEditingRecord }),
    [reviewRecord, saveReviewDraft, selectedEditingRecord],
  )
  const handleBackFromReview = useCallback(
    () => backFromReview({ reviewBackSection, reviewRecord }),
    [backFromReview, reviewBackSection, reviewRecord],
  )
  const handleConfirmReviewSubmit = useCallback(
    () => confirmReviewSubmit(reviewRecord),
    [confirmReviewSubmit, reviewRecord],
  )
  const isCreateSection = activeSection === 'new' || activeSection === 'review'
  const recordsSectionActive = activeSection === 'records' || activeSection === 'detail'
  const shouldRenderRecordsSection = activeSection === 'records'
  const createSectionActive = isCreateSection

  const navigateToMobileHome = useCallback(() => {
    setShowMobileRecords(false)
    navigate(reportBasePath)
  }, [navigate, reportBasePath])

  const openDraftRow = useCallback(
    (row) => {
      if (!row) return
      const query = new URLSearchParams()
      if (row.draftId) query.set('draft', String(row.draftId))
      if (row.sourceReportUid) query.set('edit', String(row.sourceReportUid))
      const directDraftSeed = activeFormSlug === 'erco' ? null : row
      setIsFormDirty(false)
      setFormSessionKey((prev) => prev + 1)
      navigate(`${reportBasePath}/new${query.toString() ? `?${query.toString()}` : ''}`, {
        state: {
          skipReportDraft: directDraftSeed ? activeFormSlug : '',
          initialFormSeed: directDraftSeed,
        },
      })
    },
    [activeFormSlug, navigate, reportBasePath],
  )

  const startNewWithIncidentType = useCallback(
    (incidentType) => {
      const value = String(incidentType || '').trim()
      if (!value) return
      setIsFormDirty(false)
      setFormSessionKey((prev) => prev + 1)
      navigate(`${reportBasePath}/new/setup`, {
        state: {
          skipReportDraft: activeFormSlug,
          initialFormSeed: { incidentType: value },
        },
      })
    },
    [activeFormSlug, navigate, reportBasePath],
  )

  const handleMobileBack = useCallback(() => {
    if (activeSection === 'records' && showMobileRecords) {
      setShowMobileRecords(false)
      return
    }
    if (activeSection === 'detail') {
      navigateToMobileHome()
      return
    }
    if (activeSection === 'review') {
      handleBackFromReview()
      return
    }
    if (activeSection === 'new') {
      runGuardedAction(navigateToMobileHome)
    }
  }, [
    activeSection,
    handleBackFromReview,
    navigateToMobileHome,
    runGuardedAction,
    showMobileRecords,
  ])

  const showMobileBack =
    isWorkFirstReport &&
    (activeSection === 'detail' ||
      activeSection === 'review' ||
      activeSection === 'new' ||
      (activeSection === 'records' && showMobileRecords))
  const mobileTitle =
    isWorkFirstReport && activeSection === 'records' && !showMobileRecords
      ? `Conduct ${reportTypeLabel}`
      : isWorkFirstReport && (activeSection === 'new' || activeSection === 'review')
        ? `Conduct ${reportTypeLabel}`
        : isWorkFirstReport && activeSection === 'records' && showMobileRecords
          ? `${reportTypeLabel} Records`
          : reportTypeLabel
  const pageTitle = isWorkFirstReport ? (
    <>
      <span className="d-md-none">{mobileTitle}</span>
      <span className="d-none d-md-inline">{reportTypeLabel}</span>
    </>
  ) : (
    reportTypeLabel
  )

  const renderReportDetailContent = () => {
    if (shouldShowRouteDetailLoading) {
      return <TableLoader message="Loading report..." />
    }
    if (routeDetailErrorMessage) {
      return (
        <div className={routeDetailStatus === 'not-found' ? 'text-warning' : 'text-danger'}>
          {routeDetailErrorMessage}
        </div>
      )
    }
    return (
      <ReportDetailSection
        selectedRecord={selectedDetailRecord}
        onBack={() => navigate(reportBasePath)}
        formatDateTime={formatDateTime}
        renderStatusBadge={renderStatusBadge}
        onDownloadRecord={downloadRecord}
        onEditRecord={editRecord}
        onDeleteRecord={requestDeleteRecord}
        canEditRecord={canEditRecord}
        canDeleteRecord={canDeleteRecord}
        downloadingId={downloadingId}
        onReviewRecord={transitionReview}
        onApproveRecord={transitionApprove}
        onRejectRecord={transitionReject}
        isActionBusy={isActionBusy}
        testAnchorPrefix={testAnchorPrefix}
        typeLabel={
          isFitnessTestReport ? 'Fitness Test Type' : isDrillReport ? 'Drill Type' : 'Incident Type'
        }
        conditionLabel={isDrillReport || isFitnessTestReport ? 'Condition' : 'Weather'}
        detailsLabel={
          isFitnessTestReport ? 'Test Details' : isDrillReport ? 'Drill Scenario' : 'Incident Title'
        }
        summaryLabel={
          isFitnessTestReport ? 'Test Summary' : isDrillReport ? 'Outcome Summary' : 'Summary'
        }
      />
    )
  }

  if (!user) {
    return (
      <div className="my-4 text-danger">Unable to load reports page. Please sign in again.</div>
    )
  }

  if (!canAccessReportRoute) {
    return (
      <CContainer className="my-4 text-danger">
        You do not have permission to access this report page.
      </CContainer>
    )
  }

  if (!isKnownType) {
    return (
      <div className="my-4 text-danger">
        Unknown report type{reportTypeSlug ? ` "${reportTypeSlug}"` : ''}. Please use a valid report
        link.
      </div>
    )
  }

  return (
    <CContainer
      fluid
      className={isWorkFirstReport ? 'inspection-module-page' : undefined}
      {...(testAnchorPrefix ? { 'data-testid': `${testAnchorPrefix}-module` } : {})}
    >
      <ModulePageHeader
        title={pageTitle}
        subtitle={isWorkFirstReport ? '' : 'Review records, manage drafts, and submit new reports.'}
        actions={
          <>
            {showMobileBack ? (
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                className="inspection-header-back-btn inspection-compact-action-btn d-md-none d-inline-flex align-items-center gap-1"
                onClick={handleMobileBack}
              >
                <ArrowLeft size={14} />
                Back
              </CButton>
            ) : null}
            {isCreateSection ? null : (
              <CreateActionButton
                label={`New ${reportTypeLabel} Report`}
                importance="primary"
                className={isWorkFirstReport ? 'd-none d-md-inline-flex' : ''}
                onClick={() => runGuardedAction(startNew)}
              />
            )}
          </>
        }
      />
      <InlineFeedbackMessage feedback={feedback} className="mb-3" />
      {isDeleting || isSubmitting ? (
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
              borderRadius: '12px',
              padding: '28px 36px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            }}
          >
            <TableLoader message={isSubmitting ? 'Submitting report...' : 'Deleting report...'} />
          </div>
        </div>
      ) : null}
      <ActionConfirmModal
        visible={showDiscard}
        title="Discard Unsaved Changes"
        message="You have unsaved changes. Discard them and continue?"
        confirmLabel="Discard"
        confirmColor="warning"
        onClose={() => {
          setShowDiscard(false)
          setPendingAction(null)
        }}
        onConfirm={() => {
          setShowDiscard(false)
          const action = pendingAction
          setPendingAction(null)
          setIsFormDirty(false)
          setFormSessionKey((prev) => prev + 1)
          if (typeof action === 'function') action()
        }}
      />
      <ActionConfirmModal
        visible={showDraftChoice}
        title="Saved Draft Found"
        message={`A saved ${reportTypeLabel.toLowerCase()} draft exists. Continue the draft, or start a blank report without deleting it.`}
        cancelLabel="Continue Draft"
        confirmLabel="Start Blank"
        confirmColor="primary"
        onClose={openSavedDraft}
        onConfirm={startBlankReport}
      />
      <ActionConfirmModal
        visible={showEditDraftChoice}
        title="Saved Draft Available"
        message={`A saved edit draft exists for ${pendingEditRow?.displayId || 'this report'}. Continue with draft changes, or discard and load the latest submitted data?`}
        cancelLabel="Continue Draft"
        confirmLabel="Discard Draft"
        confirmColor="warning"
        onClose={continueEditWithDraft}
        onConfirm={discardEditDraftAndLoadOriginal}
      />
      <ActionConfirmModal
        visible={Boolean(deleteTarget)}
        testId={testAnchorPrefix ? `${testAnchorPrefix}-delete-modal` : ''}
        title={deleteTarget?.recordKind === 'draft' ? 'Delete Draft' : 'Delete Report'}
        message={
          deleteTarget?.recordKind === 'draft'
            ? 'Delete this saved draft? This cannot be undone.'
            : `Delete ${deleteTarget?.displayId || 'this report'}? This cannot be undone.`
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteRecord}
      />
      <ReportWorkflowActionModal
        visible={workflowActionState.visible}
        actionType={workflowActionState.actionType}
        record={workflowActionState.record}
        remarks={workflowRemarks}
        onRemarksChange={(value) => {
          setWorkflowRemarks(value)
          if (workflowRejectError && String(value || '').trim()) setWorkflowRejectError('')
        }}
        declarationChecked={workflowDeclarationChecked}
        onDeclarationChange={(checked) => {
          setWorkflowDeclarationChecked(Boolean(checked))
          if (checked && workflowDeclarationError) setWorkflowDeclarationError('')
        }}
        declarationLabel={REPORT_WORKFLOW_DECLARATION_LABEL}
        declarationError={workflowDeclarationError}
        rejectError={workflowRejectError}
        actionDisabled={isActionBusy}
        renderStatusBadge={renderStatusBadge}
        formatDateTime={formatDateTime}
        onClose={closeWorkflowActionModal}
        onSubmit={submitWorkflowAction}
      />

      <div
        className="d-none d-md-block"
        {...(testAnchorPrefix ? { 'data-testid': `${testAnchorPrefix}-nav` } : {})}
      >
        <ModuleNavTabs
          items={[
            {
              key: 'records',
              label: `${reportTypeLabel} Records`,
              active: recordsSectionActive,
              onClick: () => runGuardedAction(() => navigate(reportBasePath)),
            },
            {
              key: 'new',
              label: `New ${reportTypeLabel} Report`,
              active: createSectionActive,
              onClick: () => runGuardedAction(startNew),
            },
          ]}
        />
      </div>

      {activeSection === 'records' && isErcoReport && !showMobileRecords ? (
        <ErcoMobileHome
          user={user}
          draftRows={recentMobileDrafts}
          recentRecords={recentMobileRecords}
          recordsCount={recordsInScopeCount}
          recordScope={recordScope}
          onRecordScopeChange={setRecordScope}
          isRecordsLoading={isLoading}
          onSelectType={(incidentType) =>
            runGuardedAction(() => startNewWithIncidentType(incidentType))
          }
          onContinueDraft={(row) => runGuardedAction(() => openDraftRow(row))}
          onDeleteDraft={(row) => setDeleteTarget(row)}
          onOpenRecord={(row) =>
            navigate(`${reportBasePath}/${encodeURIComponent(String(row?.id || ''))}`)
          }
          onViewRecords={() => setShowMobileRecords(true)}
          pushToast={pushToast}
        />
      ) : null}

      {activeSection === 'records' && isDrillReport && !showMobileRecords ? (
        <DrillMobileHome
          user={user}
          draftRows={recentMobileDrafts}
          recentRecords={recentMobileRecords}
          recordsCount={recordsInScopeCount}
          recordScope={recordScope}
          onRecordScopeChange={setRecordScope}
          isRecordsLoading={isLoading}
          onSelectType={(incidentType) =>
            runGuardedAction(() => startNewWithIncidentType(incidentType))
          }
          onContinueDraft={(row) => runGuardedAction(() => openDraftRow(row))}
          onDeleteDraft={(row) => setDeleteTarget(row)}
          onOpenRecord={(row) =>
            navigate(`${reportBasePath}/${encodeURIComponent(String(row?.id || ''))}`)
          }
          onViewRecords={() => setShowMobileRecords(true)}
          pushToast={pushToast}
        />
      ) : null}

      {activeSection === 'records' && isFitnessTestReport && !showMobileRecords ? (
        <FitnessTestMobileHome
          draftRows={recentMobileDrafts}
          recentRecords={recentMobileRecords}
          recordsCount={recordsInScopeCount}
          recordScope={recordScope}
          onRecordScopeChange={setRecordScope}
          isRecordsLoading={isLoading}
          onSelectType={(incidentType) =>
            runGuardedAction(() => startNewWithIncidentType(incidentType))
          }
          onContinueDraft={(row) => runGuardedAction(() => openDraftRow(row))}
          onDeleteDraft={(row) => setDeleteTarget(row)}
          onOpenRecord={(row) =>
            navigate(`${reportBasePath}/${encodeURIComponent(String(row?.id || ''))}`)
          }
          onViewRecords={() => setShowMobileRecords(true)}
        />
      ) : null}

      {shouldRenderRecordsSection ? (
        <div
          className={
            isWorkFirstReport && activeSection === 'records' && !showMobileRecords
              ? 'd-none d-md-block'
              : ''
          }
        >
          <ReportRecordsSection
            reportTypeLabel={reportTypeLabel}
            startNew={startNew}
            search={search}
            setSearch={setSearch}
            period={period}
            setPeriod={setPeriod}
            sort={sort}
            setSort={setSort}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            typeOptions={typeOptions}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusOptions={statusOptions}
            recordScope={recordScope}
            setRecordScope={setRecordScope}
            sortOptions={SORT_OPTIONS}
            clearFilters={clearFilters}
            isLoading={isLoading}
            filteredRecords={filteredRecords}
            visibleRows={visibleRows}
            onViewRecord={(id) => navigate(`${reportBasePath}/${encodeURIComponent(id)}`)}
            onDownloadRecord={downloadRecord}
            downloadingId={downloadingId}
            onEditRecord={editRecord}
            onDeleteRecord={requestDeleteRecord}
            onReviewTransition={transitionReview}
            onApproveTransition={transitionApprove}
            onRejectTransition={transitionReject}
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
            isMobileCardless={isWorkFirstReport}
            moduleContextLabel={isDrillReport ? 'Drill' : isErcoReport ? 'ERCO' : reportTypeLabel}
            typeLabel={
              isFitnessTestReport
                ? 'Fitness Test Type'
                : isDrillReport
                  ? 'Drill Type'
                  : 'Incident Type'
            }
            testAnchorPrefix={testAnchorPrefix}
          />
        </div>
      ) : null}

      {activeSection === 'detail' ? (
        <div {...(testAnchorPrefix ? { 'data-testid': `${testAnchorPrefix}-detail` } : {})}>
          {isWorkFirstReport ? (
            <COffcanvas
              visible
              placement="end"
              onHide={() => navigate(reportBasePath)}
              className="inspection-detail-drawer report-detail-drawer"
              backdrop
              scroll
            >
              <COffcanvasHeader className="inspection-detail-drawer__header">
                <COffcanvasTitle>{reportTypeLabel} Details</COffcanvasTitle>
                <CButton
                  type="button"
                  color="link"
                  className="inspection-detail-drawer__close p-1 text-body-secondary"
                  aria-label="Close report details"
                  onClick={() => navigate(reportBasePath)}
                >
                  <X size={18} />
                </CButton>
              </COffcanvasHeader>
              <COffcanvasBody className="inspection-detail-drawer__body">
                {renderReportDetailContent()}
              </COffcanvasBody>
            </COffcanvas>
          ) : (
            renderReportDetailContent()
          )}
        </div>
      ) : null}

      {activeSection === 'review' ? (
        <div {...(testAnchorPrefix ? { 'data-testid': `${testAnchorPrefix}-review` } : {})}>
          <ReportReviewSection
            selectedRecord={reviewRecord}
            reviewActions={{
              onBackToEdit: handleBackFromReview,
              onSaveDraft: handleSaveReviewDraft,
              onConfirm: handleConfirmReviewSubmit,
              confirmLabel: selectedEditingRecord ? 'Confirm Update' : 'Confirm Submit',
            }}
            isSubmittingReview={isSubmitting}
            changeSummary={displayReviewChangeSummary}
            formatDateTime={formatDateTime}
            renderStatusBadge={renderStatusBadge}
            testAnchorPrefix={testAnchorPrefix}
            typeLabel={
              isFitnessTestReport
                ? 'Fitness Test Type'
                : isDrillReport
                  ? 'Drill Type'
                  : 'Incident Type'
            }
            conditionLabel={isDrillReport || isFitnessTestReport ? 'Condition' : 'Weather'}
            detailsLabel={
              isFitnessTestReport
                ? 'Test Details'
                : isDrillReport
                  ? 'Drill Scenario'
                  : 'Incident Title'
            }
            summaryLabel={
              isFitnessTestReport ? 'Test Summary' : isDrillReport ? 'Outcome Summary' : 'Summary'
            }
          />
        </div>
      ) : null}

      {activeSection === 'new' ? (
        <div {...(testAnchorPrefix ? { 'data-testid': `${testAnchorPrefix}-form` } : {})}>
          {supportsNewForm ? (
            <ActiveFormComponent
              key={`${activeFormSlug}-${formSessionKey}`}
              user={user}
              reportTypeSlug={activeFormSlug}
              reportTypeIdPrefix={reportTypeIdPrefix}
              nextReportSequence={nextReportSequence}
              reportTypeLabel={reportTypeLabel}
              reportBasePath={reportBasePath}
              newSection={newSection}
              datePresetOptions={datePresetOptions}
              timePresetOptions={timePresetOptions}
              pushToast={pushToast}
              onSubmitted={submit}
              onDirtyChange={setIsFormDirty}
              skipDraftLoad={shouldSkipDraftLoad}
              editingRecord={selectedEditingRecord}
              editingDraftSeed={editingDraftSeed}
              preferSavedEditDraft={location.state?.preferSavedEditDraft === true}
              activeDraftId={queryDraftId}
              showEditSourceBanner={!(activeDraftRow && activeDraftRow.recordKind === 'draft')}
              reviewReturnRecord={reviewReturnDraft}
              initialFormSeed={location.state?.initialFormSeed || null}
              onRequestReview={requestReview}
              onDraftSaved={() => setDraftVersion((prev) => prev + 1)}
            />
          ) : (
            <CCard className="mb-3">
              <CCardHeader>Create {reportTypeLabel} Report</CCardHeader>
              <CCardBody>
                <div className="text-body-secondary">
                  This form is intentionally empty for now. We will define the {reportTypeLabel}{' '}
                  report fields next.
                </div>
              </CCardBody>
            </CCard>
          )}
        </div>
      ) : null}
    </CContainer>
  )
}

export default Reports
