import React from 'react'
import { CAlert, CButton } from '@coreui/react'
import { Plus } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
import WorkflowRecordsSectionShell from 'src/components/workflow/WorkflowRecordsSectionShell'
import ClaimListTable from 'src/views/payroll/components/ClaimListTable'

const ClaimsSection = ({
  search,
  onSearchChange,
  period,
  onPeriodChange,
  sort,
  onSortChange,
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  onClearFilters,
  claimSortOptions,
  categoryOptions,
  statusOptions,
  filteredClaims,
  visibleClaims,
  rowsToShow,
  onRowsToShowChange,
  totalCount,
  onOpenClaim,
  onEditClaim,
  onCancelClaim,
  onDownloadAttachment,
  onDeleteClaim,
  formatCurrency,
  formatDate,
  onCreateClaim,
  isLoading = false,
  groupByPeriod = true,
  errorMessage = '',
  onRetry = () => {},
  showPrimaryAction = true,
}) => (
  <WorkflowRecordsSectionShell
    sectionTitle="Claim Records"
    showHeader
    recordsTestId="payroll-claims"
    headerActions={
      showPrimaryAction ? (
        <CreateActionButton
          label="Apply Claim"
          importance="section-primary"
          onClick={onCreateClaim}
          icon={<Plus size={13} />}
        />
      ) : null
    }
    filters={
      <div data-testid="payroll-claims-filters">
        <TableFilters
          searchValue={search}
          onSearchChange={onSearchChange}
          searchLabel="Search claims by ID, period, type, detail, or status"
          searchPlaceholder="Search claims"
          periodValue={period}
          onPeriodChange={onPeriodChange}
          filters={[
            {
              key: 'sort',
              value: sort,
              onChange: onSortChange,
              options: claimSortOptions,
            },
            {
              key: 'category',
              value: categoryFilter,
              onChange: onCategoryChange,
              options: categoryOptions,
            },
            {
              key: 'status',
              value: statusFilter,
              onChange: onStatusChange,
              options: statusOptions,
            },
          ]}
          onClear={onClearFilters}
          rowClassName="flex-md-nowrap"
          searchColMd={3}
          periodColMd={2}
          filterColMd={2}
          clearColMd="auto"
        />
      </div>
    }
  >
    {errorMessage ? (
      <CAlert
        color="danger"
        className="d-flex flex-wrap justify-content-between align-items-center gap-2"
      >
        <span>{errorMessage}</span>
        <CButton color="danger" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </CButton>
      </CAlert>
    ) : null}
    {isLoading ? (
      <TableLoader />
    ) : filteredClaims.length === 0 ? (
      <div className="text-body-secondary">No claim records match the current filters.</div>
    ) : (
      <>
        <ClaimListTable
          claims={visibleClaims}
          groupByPeriod={groupByPeriod}
          onOpenClaim={onOpenClaim}
          onEditClaim={onEditClaim}
          onCancelClaim={onCancelClaim}
          onDownloadAttachment={onDownloadAttachment}
          onDeleteClaim={onDeleteClaim}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
        <DataTableFooter
          rowsToShow={rowsToShow}
          onRowsToShowChange={onRowsToShowChange}
          filteredCount={filteredClaims.length}
          totalCount={totalCount}
        />
      </>
    )}
  </WorkflowRecordsSectionShell>
)

export default ClaimsSection
