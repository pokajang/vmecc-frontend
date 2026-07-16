import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import TableLoader from 'src/components/TableLoader'
import RecordScopeSegmentedControl from 'src/components/report-workflow/RecordScopeSegmentedControl'

import InspectionMobileRecordsList from './InspectionMobileRecordsList'
import InspectionQueueBanner from './InspectionQueueBanner'
import InspectionQueueDetailsModal from './InspectionQueueDetailsModal'
import InspectionRecordsFilters from './InspectionRecordsFilters'
import InspectionRecordsTable from './InspectionRecordsTable'
import { buildInspectionRowActionItems } from './inspectionRecordActions'

const InspectionRecordsSection = ({
  startNew,
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
  typeOptions,
  statusFilter,
  setStatusFilter,
  checklistFilter = 'All',
  setChecklistFilter = () => {},
  hasChecklistFilter = 'All',
  setHasChecklistFilter = () => {},
  statusOptions,
  checklistOptions = [{ value: 'All', label: 'All checklist items' }],
  sortOptions,
  clearFilters,
  isLoading,
  filteredRecords,
  visibleRows,
  onViewRecord,
  onDownloadRecord,
  downloadingId,
  onEditRecord,
  onDeleteRecord,
  onReviewTransition,
  onApproveTransition,
  onRejectTransition,
  canReviewRecord,
  canApproveRecord,
  canRejectRecord,
  canEditRecord,
  canDeleteRecord,
  formatDateTime,
  rowsToShow,
  setRowsToShow,
  totalCount,
  showPrimaryAction = true,
  queueSummary = null,
  queueRows = [],
  isQueueSyncing = false,
  onRetryQueue,
  onOpenQueueConflict,
  onSaveQueuedAsDraft,
  offlineHealth = null,
  isOfflineHealthLoading = false,
  onRefreshOfflineAssets,
  isRefreshingOfflineAssets = false,
  onRecoverLocalDraft,
  canRecoverLocalDraft = false,
  queueDetailsOpen: controlledQueueDetailsOpen,
  onQueueDetailsOpenChange,
}) => {
  const [localQueueDetailsOpen, setLocalQueueDetailsOpen] = React.useState(false)
  const queueDetailsOpen =
    typeof controlledQueueDetailsOpen === 'boolean'
      ? controlledQueueDetailsOpen
      : localQueueDetailsOpen
  const setQueueDetailsOpen = (nextOpen) => {
    if (typeof controlledQueueDetailsOpen !== 'boolean') setLocalQueueDetailsOpen(nextOpen)
    onQueueDetailsOpenChange?.(nextOpen)
  }
  const emptyMessage = (
    <div className="text-body-secondary">No inspection reports match the current filters.</div>
  )
  const footer = (
    <DataTableFooter
      rowsToShow={rowsToShow}
      onRowsToShowChange={setRowsToShow}
      filteredCount={filteredRecords.length}
      totalCount={totalCount}
    />
  )
  const buildActions = (row) =>
    buildInspectionRowActionItems(row, {
      onEditRecord,
      onReviewTransition:
        row?.recordKind === 'queued' ? () => onRetryQueue?.(row) : onReviewTransition,
      onApproveTransition,
      onRejectTransition,
      onDownloadRecord,
      onDeleteRecord,
      onOpenQueueConflict,
      onSaveQueuedAsDraft,
      canEditRecord,
      canReviewRecord,
      canApproveRecord,
      canRejectRecord,
      canDeleteRecord,
      downloadingId,
    })
  const commonQueueBanner = (
    <InspectionQueueBanner
      summary={queueSummary}
      isSyncing={isQueueSyncing}
      onRetry={() => onRetryQueue?.()}
      onOpenDetails={() => setQueueDetailsOpen(true)}
    />
  )
  const filters = (
    <InspectionRecordsFilters
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
      hasChecklistFilter={hasChecklistFilter}
      setHasChecklistFilter={setHasChecklistFilter}
      checklistFilter={checklistFilter}
      setChecklistFilter={setChecklistFilter}
      checklistOptions={checklistOptions}
      sortOptions={sortOptions}
      clearFilters={clearFilters}
    />
  )

  return (
    <>
      <InspectionQueueDetailsModal
        visible={queueDetailsOpen}
        onClose={() => setQueueDetailsOpen(false)}
        queueRows={queueRows}
        offlineHealth={offlineHealth}
        isOfflineHealthLoading={isOfflineHealthLoading}
        isRefreshingOfflineAssets={isRefreshingOfflineAssets}
        onRefreshOfflineAssets={onRefreshOfflineAssets}
        canRecoverLocalDraft={canRecoverLocalDraft}
        onRecoverLocalDraft={onRecoverLocalDraft}
        isQueueSyncing={isQueueSyncing}
        onRetryQueue={onRetryQueue}
        onOpenQueueConflict={onOpenQueueConflict}
        onSaveQueuedAsDraft={onSaveQueuedAsDraft}
        onDeleteRecord={onDeleteRecord}
      />

      <div className="inspection-mobile-section d-md-none" data-testid="inspection-records">
        {commonQueueBanner}
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
          <RecordScopeSegmentedControl
            value={recordScope}
            onChange={setRecordScope}
            data-testid="inspection-scope"
          />
          <div className="d-flex align-items-center gap-2">
            {showPrimaryAction ? (
              <CreateActionButton label="New" onClick={startNew} data-testid="inspection-new" />
            ) : null}
          </div>
        </div>
        {filters}
        {isLoading ? null : filteredRecords.length === 0 ? (
          emptyMessage
        ) : (
          <InspectionMobileRecordsList
            visibleRows={visibleRows}
            downloadingId={downloadingId}
            buildActions={buildActions}
            onEditRecord={onEditRecord}
            onViewRecord={onViewRecord}
          />
        )}
        {isLoading ? (
          <div className="border rounded-3 bg-body">
            <TableLoader message="Loading records..." minHeight={144} />
          </div>
        ) : filteredRecords.length > 0 ? (
          footer
        ) : null}
      </div>

      <CCard className="d-none d-md-block" data-testid="inspection-records">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <RecordScopeSegmentedControl
            value={recordScope}
            onChange={setRecordScope}
            data-testid="inspection-scope"
          />
          <div className="d-flex align-items-center gap-2">
            {showPrimaryAction ? (
              <CreateActionButton label="New" onClick={startNew} data-testid="inspection-new" />
            ) : null}
          </div>
        </CCardHeader>
        <CCardBody>
          {commonQueueBanner}
          {filters}
          <ResponsiveRecordCollection
            isLoading={isLoading}
            isEmpty={filteredRecords.length === 0}
            emptyMessage={emptyMessage}
            mobileSections={[]}
            renderDesktop={() => (
              <InspectionRecordsTable
                visibleRows={visibleRows}
                downloadingId={downloadingId}
                buildActions={buildActions}
                formatDateTime={formatDateTime}
                onEditRecord={onEditRecord}
                onViewRecord={onViewRecord}
              />
            )}
            footer={footer}
          />
        </CCardBody>
      </CCard>
    </>
  )
}

export default InspectionRecordsSection
