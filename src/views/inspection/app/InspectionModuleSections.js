import React from 'react'
import TableLoader from 'src/components/TableLoader'
import InspectionRecordsSection from 'src/views/inspection/InspectionRecordsSection'
import InspectionDetailSection from 'src/views/inspection/InspectionDetailSection'
import InspectionReviewSection from 'src/views/inspection/InspectionReviewSection'
import AllExtinguishersSection from 'src/views/inspection/records/AllExtinguishersSection'
import InspectionReviewDashboard from 'src/views/inspection/records/InspectionReviewDashboard'
import { refreshInspectionOfflineAssets } from 'src/views/inspection/inspectionOfflineHealth'
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
  reportBasePath,
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
}) => (
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
        onSelectType={(inspectionType) => runGuardedAction(() => startNewWithType(inspectionType))}
        onToggleTypes={() => homeIncident.setShowAllIncidentTypes((prev) => !prev)}
        onAddType={homeIncident.openAddModal}
        onContinueDraft={() => runGuardedAction(() => openSavedDraft(activeDraftRows[0]))}
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
)

export const AllExtinguishersView = () => <AllExtinguishersSection />

export const InspectionDetailView = ({
  selectedRecord,
  navigate,
  reportBasePath,
  formatDateTime,
  renderStatusBadge,
  editRecord,
  canEditRecord,
  downloadRecord,
  downloadingId,
  openWorkflowActionModal,
  isActionBusy,
}) => (
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
)

export const InspectionReviewView = ({
  reviewRecord,
  backFromReview,
  buildPendingReviewRecord,
  clearInspectionTypeDraft,
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
  const items = Array.isArray(pendingSubmissionSummary?.items) ? pendingSubmissionSummary.items : []
  const retryDraftSync = () => saveDraft?.(sessionReviewForm, reviewWorkspace)

  if (items.length > 0) {
    return (
      <InspectionReviewDashboard
        items={items}
        isUpdateMode={isUpdatingExistingRecord}
        onRetrySync={retryDraftSync}
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
      queueWarning={
        reviewMayQueue
          ? 'You appear to be offline or local sync is pending. This report will be queued on this device until sync succeeds.'
          : ''
      }
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
      onRetryDraftSync={retryDraftSync}
      onSaveDraft={saveDraft}
      onRequestReview={requestReview}
    />
  ) : (
    <TableLoader />
  )
