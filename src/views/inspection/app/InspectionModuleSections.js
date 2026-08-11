import React, { useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import TableLoader from 'src/components/TableLoader'
import InspectionRecordsSection from 'src/views/inspection/InspectionRecordsSection'
import InspectionDetailSection from 'src/views/inspection/InspectionDetailSection'
import InspectionReviewSection from 'src/views/inspection/InspectionReviewSection'
import AllExtinguishersSection from 'src/views/inspection/records/AllExtinguishersSection'
import FireExtinguisherDetailPage from 'src/views/inspection/records/FireExtinguisherDetailPage'
import {
  buildFireExtinguisherCatalogLocation,
  parseFireExtinguisherCatalogViewState,
  serializeFireExtinguisherCatalogViewState,
} from 'src/views/inspection/records/fireExtinguisherCatalogViewState'
import InspectionReviewDashboard from 'src/views/inspection/records/InspectionReviewDashboard'
import { refreshInspectionOfflineAssets } from 'src/views/inspection/inspectionOfflineHealth'
import { hasPermission } from 'src/utils/authz'
import InspectionForm from '../InspectionForm'
import { buildInspectionSubmittedRecord } from '../inspectionFormHelpers'

export const InspectionRecordsView = ({
  showMobileRecords,
  InspectionMobileHome,
  activeDraftRows,
  homeTypeOptions,
  recentRecords,
  scopedSubmittedRecords,
  queueSummary,
  isQueueSyncing,
  recordScope,
  setRecordScope,
  isLoading,
  runGuardedAction,
  startNewWithType,
  homeIncident,
  openSavedDraft,
  setDeleteTarget,
  navigate,
  setShowMobileRecords,
  syncQueuedSubmissions,
  search,
  setSearch,
  period,
  setPeriod,
  sort,
  setSort,
  typeFilter,
  setTypeFilter,
  typeOptions,
  statusFilter,
  setStatusFilter,
  checklistFilter,
  setChecklistFilter,
  hasChecklistFilter,
  setHasChecklistFilter,
  statusOptions,
  checklistOptions,
  INSPECTION_SORT_OPTIONS,
  clearFilters,
  filteredRecords,
  visibleRows,
  downloadRecord,
  downloadingId,
  editRecord,
  setQueuedDeleteTarget,
  openWorkflowActionModal,
  canReviewRecord,
  canApproveRecord,
  canRejectRecord,
  canEditRecord,
  canDeleteRecord,
  formatDateTime,
  rowsToShow,
  setRowsToShow,
  recordsInScopeCount,
  queuedRecordRows,
  setQueueConflictTarget,
  saveQueuedAsDraft,
  offlineHealth,
  isOfflineHealthLoading,
  isRefreshingOfflineAssets,
  setIsRefreshingOfflineAssets,
  refreshOfflineHealth,
  pushToast,
  recoverLocalDraft,
  startNew,
  buildRecordDetailPath,
}) => {
  const [queueDetailsOpen, setQueueDetailsOpen] = useState(false)

  return (
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
          onContinueDraft={() => runGuardedAction(() => openSavedDraft(activeDraftRows[0]))}
          onDeleteDraft={() => setDeleteTarget(activeDraftRows[0])}
          onOpenRecord={(row) => (row?.id ? navigate(buildRecordDetailPath(row.id)) : null)}
          onViewQueueDetails={() => {
            setShowMobileRecords(true)
            setQueueDetailsOpen(true)
          }}
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
          onViewRecord={(id) => navigate(buildRecordDetailPath(id))}
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
          queueDetailsOpen={queueDetailsOpen}
          onQueueDetailsOpenChange={setQueueDetailsOpen}
        />
      </div>
    </>
  )
}

const ALL_EXTINGUISHERS_PATH = '/inspection/all-extinguishers'
const ADD_EXTINGUISHER_PATH = `${ALL_EXTINGUISHERS_PATH}/new`

export const AllExtinguishersView = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { extinguisherId } = useParams()
  const user = useSelector((state) => state.authUser)
  const isCreateOpen = location.pathname.toLowerCase() === ADD_EXTINGUISHER_PATH
  const canManageReports = hasPermission(user, 'reports.manage')
  const canManageCatalog =
    canManageReports || hasPermission(user, 'reports.inspection.extinguishers.manage')
  const canManageIssues =
    canManageReports || hasPermission(user, 'reports.inspection.issues.manage')
  const canVerifyIssues =
    canManageReports || hasPermission(user, 'reports.inspection.issues.verify')

  if (extinguisherId) {
    return (
      <FireExtinguisherDetailPage
        currentUser={user}
        canManageCatalog={canManageCatalog}
        canManageIssues={canManageIssues}
        canVerifyIssues={canVerifyIssues}
      />
    )
  }

  const queryViewState = parseFireExtinguisherCatalogViewState(location.search)
  const initialViewState = {
    ...queryViewState,
    ...(location.state?.catalogViewState || {}),
  }

  return (
    <AllExtinguishersSection
      currentUser={user}
      canManageCatalog={canManageCatalog}
      canManageIssues={canManageIssues}
      canVerifyIssues={canVerifyIssues}
      isCreateOpen={isCreateOpen}
      initialViewState={initialViewState}
      initialSuccessMessage={location.state?.catalogSuccessMessage || ''}
      onViewStateChange={(viewState) => {
        const search = serializeFireExtinguisherCatalogViewState(viewState)
        if (search === location.search) return
        navigate(`${location.pathname}${search}`, {
          replace: true,
          state: { ...(location.state || {}), catalogViewState: viewState },
        })
      }}
      onViewDetails={(row, viewState) => {
        const catalogLocation = buildFireExtinguisherCatalogLocation(viewState)
        const state = {
          catalogViewState: viewState,
          catalogSearch: serializeFireExtinguisherCatalogViewState(viewState),
        }
        navigate(catalogLocation, { replace: true, state })
        navigate(`${ALL_EXTINGUISHERS_PATH}/${encodeURIComponent(row.catalogId || row.id)}`, {
          state: { ...state, returnTo: catalogLocation },
        })
      }}
      onRequestCreate={(viewState) => {
        const search = serializeFireExtinguisherCatalogViewState(viewState)
        const state = { catalogViewState: viewState, catalogSearch: search }
        navigate(`${ALL_EXTINGUISHERS_PATH}${search}`, { replace: true, state })
        navigate(`${ADD_EXTINGUISHER_PATH}${search}`, { state })
      }}
      onRequestCloseCreate={({ replace = false, viewState, successMessage = '' } = {}) =>
        navigate(buildFireExtinguisherCatalogLocation(viewState || initialViewState), {
          replace,
          state: {
            catalogViewState: viewState || location.state?.catalogViewState || null,
            catalogSuccessMessage: successMessage,
          },
        })
      }
    />
  )
}

export const InspectionDetailView = ({
  selectedRecord,
  navigate,
  reportBasePath,
  recordsReturnPath,
  formatDateTime,
  renderStatusBadge,
  editRecord,
  canEditRecord,
  requestDeleteRecord,
  canDeleteRecord,
  downloadRecord,
  downloadingId,
  openWorkflowActionModal,
  isActionBusy,
  isDeleting,
}) => (
  <InspectionDetailSection
    selectedRecord={selectedRecord}
    onBack={() => navigate(recordsReturnPath || reportBasePath)}
    formatDateTime={formatDateTime}
    renderStatusBadge={renderStatusBadge}
    onEditRecord={editRecord}
    canEditRecord={canEditRecord}
    onDeleteRecord={requestDeleteRecord}
    canDeleteRecord={canDeleteRecord}
    onDownloadRecord={downloadRecord}
    downloadingId={downloadingId}
    onReviewRecord={(row) => openWorkflowActionModal(row, 'review')}
    onApproveRecord={(row) => openWorkflowActionModal(row, 'approve')}
    onRejectRecord={(row) => openWorkflowActionModal(row, 'reject')}
    isActionBusy={isActionBusy}
    isDeleting={isDeleting}
  />
)

export const InspectionReviewView = ({
  reviewRecord,
  backFromReview,
  buildPendingReviewRecord,
  clearInspectionTypeDraft,
  retryDraftSync,
  retryFireExtinguisherSessionSync,
  saveDraft,
  sessionReviewForm,
  reviewWorkspace,
  submit,
  user,
  pendingSubmissionSummary,
  reviewMayQueue,
  isSubmitting,
  isUpdatingExistingRecord = false,
  renderStatusBadge,
}) => {
  const [isRetryingSync, setIsRetryingSync] = useState(false)
  const retrySyncInFlightRef = useRef(false)
  const items = Array.isArray(pendingSubmissionSummary?.items) ? pendingSubmissionSummary.items : []
  const queueWarning = reviewMayQueue
    ? 'You appear to be offline or local sync is pending. This report will be queued on this device until sync succeeds.'
    : ''
  const retrySync = async (item, blocker = {}) => {
    if (retrySyncInFlightRef.current) return null
    retrySyncInFlightRef.current = true
    setIsRetryingSync(true)
    try {
      const blockers = Array.isArray(item?.blockers) ? item.blockers : [blocker]
      const retrySession = blockers.some(
        (candidate) => candidate?.key === 'fire-extinguisher-session-sync',
      )
      const retryDraft = blockers.some((candidate) => candidate?.key === 'draft-sync-failed')
      const results = {}
      if (retrySession) {
        results.session = await retryFireExtinguisherSessionSync?.()
      }
      if (retryDraft || !retrySession) {
        results.draft = retryDraftSync
          ? await retryDraftSync()
          : (await saveDraft?.(sessionReviewForm, reviewWorkspace)) || null
      }
      return results
    } finally {
      retrySyncInFlightRef.current = false
      setIsRetryingSync(false)
    }
  }

  if (items.length > 0) {
    return (
      <InspectionReviewDashboard
        items={items}
        isUpdateMode={isUpdatingExistingRecord}
        isRetryingSync={isRetryingSync}
        mayQueue={reviewMayQueue}
        queueWarning={queueWarning}
        onRetrySync={retrySync}
        onSubmit={(item) => {
          const selectedReviewRecord = buildPendingReviewRecord?.(item)
          if (!selectedReviewRecord) return null
          return submit(buildInspectionSubmittedRecord(selectedReviewRecord, user), {
            clearWorkingStateOnSuccess: items.length <= 1,
            navigateOnSuccess: items.length <= 1,
            onSubmitted: () => {
              clearInspectionTypeDraft?.(item.inspectionType)
            },
          })
        }}
        isSubmitting={isSubmitting}
      />
    )
  }

  return (
    <InspectionReviewSection
      selectedRecord={reviewRecord}
      reviewActions={{
        onBackToEdit: backFromReview,
        onSaveDraft: () => saveDraft(sessionReviewForm, reviewWorkspace),
        onConfirm: () => reviewRecord && submit(buildInspectionSubmittedRecord(reviewRecord, user)),
        confirmLabel: reviewMayQueue
          ? isUpdatingExistingRecord
            ? 'Queue update'
            : 'Queue for sync'
          : isUpdatingExistingRecord
            ? 'Confirm Update'
            : 'Confirm Submit',
        isUpdateMode: isUpdatingExistingRecord,
      }}
      queueWarning={queueWarning}
      isSubmittingReview={isSubmitting}
      renderStatusBadge={renderStatusBadge}
    />
  )
}

export const InspectionFormView = ({
  clearInspectionTypeDraft,
  isFormReady,
  isUpdatingExistingRecord = false,
  user,
  formState,
  pushToast,
  draftStatus,
  draftSyncState,
  setDraftStatus,
  setFormState,
  commitDraftSnapshot,
  resolveDraftConflict,
  retryDraftSync,
  saveDraft,
  requestReview,
}) =>
  isFormReady ? (
    <InspectionForm
      user={user}
      value={formState}
      isUpdateMode={isUpdatingExistingRecord}
      pushToast={pushToast}
      draftStatus={draftStatus}
      draftSyncState={draftSyncState}
      onChange={(nextForm) => {
        setDraftStatus('Unsaved changes')
        setFormState(nextForm)
      }}
      onCommitDraftSnapshot={commitDraftSnapshot}
      onClearInspectionTypeDraft={clearInspectionTypeDraft}
      onResolveDraftConflict={resolveDraftConflict}
      onRetryDraftSync={retryDraftSync}
      onSaveDraft={saveDraft}
      onRequestReview={requestReview}
    />
  ) : (
    <TableLoader />
  )
