import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CNav,
  CNavItem,
  CNavLink,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { hasPermission } from 'src/utils/authz'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import TableLoader from 'src/components/TableLoader'
import { SORT_OPTIONS } from './constants'
import { FORM_REGISTRY } from './formRegistry'
import { loadErcoDraft } from './reportStorage'
import ReportDetailSection from './components/ReportDetailSection'
import ReportRecordsSection from './components/ReportRecordsSection'
import ReportWorkflowActionModal from './components/ReportWorkflowActionModal'
import useReportMetadata from './hooks/useReportMetadata'
import useReportRecords from './hooks/useReportRecords'
import useUnsavedChangesGuard from './hooks/useUnsavedChangesGuard'
import useActiveReportDraftRows from './hooks/useActiveReportDraftRows'
import useReportRouteActions from './hooks/useReportRouteActions'
import { formatDateTime, normalizeReportTypeSlug } from './utils'

import {
  REPORT_WORKFLOW_DECLARATION_LABEL,
  buildChangeSummary,
  recordToDraft,
  statusToneMap,
} from './reportDraftDomain'
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

  const [toast, addToast] = useState(0)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [formSessionKey, setFormSessionKey] = useState(0)
  const [draftVersion, setDraftVersion] = useState(0)
  const toaster = useRef()

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
    selectedRecord,
    typeOptions,
    statusOptions,
    recordsInScopeCount,
    rowsToShow,
    setRowsToShow,
    visibleRows,
    clearFilters,
    persistRecords,
    reloadRecords,
  } = useReportRecords({
    userId: user?.id,
    reportTypeSlug,
    reportId,
    draftRows: activeDraftRows,
  })
  const nextReportSequence = useMemo(() => {
    const matchingRows = records.filter(
      (row) => String(row?.reportType || '').toLowerCase() === activeFormSlug,
    )
    return matchingRows.length + 1
  }, [activeFormSlug, records])
  const editingReportId = useMemo(() => {
    const fromQuery = new URLSearchParams(location.search).get('edit')
    const fallback = location.state?.editReportId
    return String(fromQuery || fallback || '').trim()
  }, [location.search, location.state?.editReportId])

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

  const ActiveFormComponent = formComponent || FORM_REGISTRY[activeFormSlug] || null
  const supportsNewForm = typeof ActiveFormComponent === 'function'
  const selectedEditingRecord =
    records.find((row) => String(row.id || '').trim() === editingReportId) || null
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

  const handleSaveReviewDraft = () => saveReviewDraft({ reviewRecord, selectedEditingRecord })
  const handleBackFromReview = () => backFromReview({ reviewBackSection, reviewRecord })
  const handleConfirmReviewSubmit = () => confirmReviewSubmit(reviewRecord)

  return (
    <CContainer fluid>
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />
      {downloadingId || isDeleting || isSubmitting ? (
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
            <TableLoader
              message={
                isSubmitting
                  ? 'Submitting report...'
                  : isDeleting
                    ? 'Deleting report...'
                    : 'Generating PDF...'
              }
            />
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
          void removeDraft()
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

      <CNav variant="underline" role="tablist" className="mb-3 flex-nowrap overflow-auto pb-1">
        <CNavItem role="presentation">
          <CNavLink
            active={activeSection === 'records' || activeSection === 'detail'}
            onClick={() => runGuardedAction(() => navigate(reportBasePath))}
            style={{ cursor: 'pointer' }}
            className={`${activeSection === 'records' || activeSection === 'detail' ? 'text-primary' : ''} text-nowrap`.trim()}
          >
            {reportTypeLabel} Records
          </CNavLink>
        </CNavItem>
        <CNavItem role="presentation">
          <CNavLink
            active={activeSection === 'new' || activeSection === 'review'}
            onClick={() => runGuardedAction(startNew)}
            style={{ cursor: 'pointer' }}
            className={`${activeSection === 'new' || activeSection === 'review' ? 'text-primary' : ''} text-nowrap`.trim()}
          >
            New {reportTypeLabel} Report
          </CNavLink>
        </CNavItem>
      </CNav>
      <div className="small text-body-secondary d-md-none mb-2">Swipe to view more tabs.</div>

      {activeSection === 'records' ? (
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
        />
      ) : null}

      {activeSection === 'detail' ? (
        <ReportDetailSection
          selectedRecord={selectedRecord}
          onBack={() => navigate(reportBasePath)}
          formatDateTime={formatDateTime}
          renderStatusBadge={renderStatusBadge}
          onDownloadRecord={downloadRecord}
          downloadingId={downloadingId}
          onReviewRecord={transitionReview}
          onApproveRecord={transitionApprove}
          onRejectRecord={transitionReject}
          isActionBusy={isActionBusy}
        />
      ) : null}

      {activeSection === 'review' ? (
        <ReportDetailSection
          selectedRecord={reviewRecord}
          mode="review"
          reviewBannerText="Review Mode - not submitted yet."
          reviewActions={{
            onBackToEdit: handleBackFromReview,
            onSaveDraft: handleSaveReviewDraft,
            onConfirm: handleConfirmReviewSubmit,
            confirmLabel: selectedEditingRecord ? 'Confirm Update' : 'Confirm Submit',
          }}
          isSubmittingReview={isSubmitting}
          changeSummary={reviewChangeSummary}
          formatDateTime={formatDateTime}
          renderStatusBadge={renderStatusBadge}
        />
      ) : null}

      {activeSection === 'new' ? (
        supportsNewForm ? (
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
        )
      ) : null}
    </CContainer>
  )
}

export default Reports
