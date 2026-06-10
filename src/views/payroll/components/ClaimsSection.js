import React from 'react'
import { CAlert, CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import { Plus } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
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
}) => (
  <CCard>
    <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
      <span>Claim Records</span>
      <CreateActionButton
        label="Apply Claim"
        onClick={onCreateClaim}
        icon={<Plus size={13} className="me-1 align-text-bottom" />}
      />
    </CCardHeader>
    <CCardBody>
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
      <TableFilters
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search claim ID, period, type, detail, or status"
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
    </CCardBody>
  </CCard>
)

export default ClaimsSection
