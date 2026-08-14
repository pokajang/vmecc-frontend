import React from 'react'

import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import ReportingRecordsSectionShell from 'src/components/report-workflow/ReportingRecordsSectionShell'

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
      compactMobile
    />
  )
  const buildActions = (row) =>
    buildInspectionRowActionItems(row, {
      onViewRecord,
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

      <ReportingRecordsSectionShell
        recordScope={recordScope}
        onRecordScopeChange={setRecordScope}
        compactPresentation
        scopeTestId="inspection-scope"
        recordsTestId="inspection-records"
        mobileBefore={commonQueueBanner}
        desktopBefore={commonQueueBanner}
        mobilePrimaryAction={
          showPrimaryAction ? (
            <CreateActionButton label="New" onClick={startNew} data-testid="inspection-new" />
          ) : null
        }
        desktopPrimaryAction={
          showPrimaryAction ? (
            <CreateActionButton label="New" onClick={startNew} data-testid="inspection-new" />
          ) : null
        }
        filters={filters}
        isLoading={isLoading}
        isEmpty={filteredRecords.length === 0}
        emptyMessage={emptyMessage}
        mobileRecords={
          <InspectionMobileRecordsList
            visibleRows={visibleRows}
            downloadingId={downloadingId}
            buildActions={buildActions}
            onEditRecord={onEditRecord}
            onViewRecord={onViewRecord}
          />
        }
        desktopRecords={
          <InspectionRecordsTable
            visibleRows={visibleRows}
            downloadingId={downloadingId}
            buildActions={buildActions}
            formatDateTime={formatDateTime}
            onEditRecord={onEditRecord}
            onViewRecord={onViewRecord}
          />
        }
        footer={footer}
      />
    </>
  )
}

export default InspectionRecordsSection
