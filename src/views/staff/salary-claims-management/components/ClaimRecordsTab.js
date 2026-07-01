import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CFormCheck,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import ApprovalGates from 'src/components/ApprovalGates'
import BulkSelectionActionBar from 'src/components/BulkSelectionActionBar'
import DataTableFooter from 'src/components/DataTableFooter'
import GroupedTableHeaderRow, {
  GroupTotalBadge,
  UserGroupLabel,
} from 'src/components/GroupedTableHeader'
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import RowActionCell from 'src/components/RowActionCell'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import WorkflowStatusSummary from 'src/components/WorkflowStatusSummary'
import BulkActionButton from 'src/views/staff/components/BulkActionButton'

const CLAIM_GATES = [
  { action: 'Checked', label: 'Checked' },
  { action: 'Reviewed', label: 'Reviewed' },
  { action: 'Approved', label: 'Approved' },
]

const resolveRowAmount = (row = {}) => {
  if (String(row?.type || '').trim() === 'salary') {
    if (row?.projectedNetPayout !== null && typeof row?.projectedNetPayout !== 'undefined') {
      return row.projectedNetPayout
    }
    return 0
  }
  return row?.amount
}

const ClaimRecordsTab = ({ vm, handlers }) => {
  const {
    search,
    period,
    sort,
    typeFilter,
    statusFilter,
    claimSortOptions,
    claimTypeOptions,
    claimStatusOptions,
    filteredClaimRows,
    groupedVisibleClaimRows,
    rowsToShow,
    totalCount,
    formatCurrency,
    formatDate,
    toTypeLabel,
    isLoading = false,
  } = vm
  const {
    setSearch,
    setPeriod,
    setSort,
    setTypeFilter,
    setStatusFilter,
    clearClaimFilters,
    clearSelection,
    openBulkActionModal,
    canBulkActOnClaim,
    getClaimKey,
    isClaimKeySelected,
    toggleClaimGroupSelection,
    openClaimDetail,
    buildClaimRowActionItems,
    setRowsToShow,
  } = handlers

  const selectedVisibleCount = groupedVisibleClaimRows.reduce(
    (total, periodGroup) =>
      total +
      periodGroup.ownerGroups.reduce(
        (ownerTotal, ownerGroup) =>
          ownerTotal +
          ownerGroup.rows.filter(
            (row) => canBulkActOnClaim(row) && isClaimKeySelected(getClaimKey(row)),
          ).length,
        0,
      ),
    0,
  )

  const buildMobileClaimItem = (row) => ({
    key: `${row.id}-${row.ownerId || 'owner'}`,
    title: row.id || '-',
    subtitle: row.ownerLabel || '-',
    eyebrow: toTypeLabel(row.type),
    status: (
      <WorkflowStatusSummary
        statusLabel={row.status || '-'}
        gates={CLAIM_GATES}
        approvalHistory={row.approvalHistory}
        isCancelled={row.status === 'Cancelled'}
      />
    ),
    fields: [
      { key: 'period', label: 'Period', value: row.period || '-' },
      { key: 'category', label: 'Category', value: row.category || '-' },
      { key: 'amount', label: 'Amount', value: formatCurrency(resolveRowAmount(row)) },
      { key: 'submitted', label: 'Submitted', value: formatDate(row.submittedAt) },
    ],
    ariaLabel: `Open claim record ${row.id || '-'}`,
    onOpen: () => openClaimDetail(row, 'claimRecords'),
    actions: <RowActions items={buildClaimRowActionItems(row)} />,
  })

  const mobileClaimSections = groupedVisibleClaimRows.flatMap((periodGroup) =>
    periodGroup.ownerGroups.map((ownerGroup) => {
      const eligibleKeys = ownerGroup.rows
        .filter((row) => canBulkActOnClaim(row))
        .map((row) => getClaimKey(row))
      const selectedCount = eligibleKeys.filter((key) => isClaimKeySelected(key)).length
      const allSelected = eligibleKeys.length > 0 && selectedCount === eligibleKeys.length

      return {
        key: `mobile-claim-${periodGroup.key}-${ownerGroup.key}`,
        label: (
          <span className="d-inline-flex align-items-center gap-2">
            <CFormCheck
              id={`mobile-claim-group-select-${ownerGroup.key}`}
              aria-label={`Select actionable claims for ${periodGroup.periodLabel || 'Unknown period'} | ${ownerGroup.ownerLabel || 'Unknown'}`}
              disabled={eligibleKeys.length === 0}
              checked={allSelected}
              onChange={() => toggleClaimGroupSelection(ownerGroup)}
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            />
            <span>
              {periodGroup.periodLabel ? `${periodGroup.periodLabel} | ` : ''}
              {ownerGroup.ownerLabel || 'Unknown'}
            </span>
          </span>
        ),
        summary: formatCurrency(ownerGroup.totalAmount),
        items: ownerGroup.rows.map(buildMobileClaimItem),
      }
    }),
  )

  const selectedBar =
    selectedVisibleCount > 0 ? (
      <BulkSelectionActionBar
        label={`${selectedVisibleCount} claim${selectedVisibleCount === 1 ? '' : 's'} selected`}
        actions={
          <>
            <BulkActionButton label="Clear selection" intent="neutral" onClick={clearSelection} />
            <BulkActionButton
              label="Reject selected"
              intent="reject"
              onClick={() => openBulkActionModal('reject')}
            />
            <BulkActionButton
              label="Approve selected"
              intent="approve"
              onClick={() => openBulkActionModal('approve')}
            />
          </>
        }
      />
    ) : null

  const renderDesktopTable = () => (
    <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-white">
      <CTable align="middle" className="mb-0" hover responsive>
        <CTableHead color="light">
          <CTableRow>
            <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
              #
            </CTableHeaderCell>
            <CTableHeaderCell>Claim ID</CTableHeaderCell>
            <CTableHeaderCell>Employee</CTableHeaderCell>
            <CTableHeaderCell>Type</CTableHeaderCell>
            <CTableHeaderCell>Period</CTableHeaderCell>
            <CTableHeaderCell>Category</CTableHeaderCell>
            <CTableHeaderCell>Amount</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
            <CTableHeaderCell>Submitted On</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {(() => {
            let rowIndex = 0
            return groupedVisibleClaimRows.flatMap((periodGroup) => {
              const rows = []
              rows.push(
                <GroupedTableHeaderRow
                  key={`claim-period-${periodGroup.key}`}
                  colSpan={10}
                  label={periodGroup.periodLabel}
                  count={periodGroup.rows.length}
                  className="table-secondary"
                  cellClassName="fw-semibold text-body"
                  testId={`claim-period-group-${periodGroup.key}`}
                >
                  <GroupTotalBadge label="Total" value={formatCurrency(periodGroup.totalAmount)} />
                </GroupedTableHeaderRow>,
              )

              periodGroup.ownerGroups.forEach((ownerGroup) => {
                const eligibleKeys = ownerGroup.rows
                  .filter((row) => canBulkActOnClaim(row))
                  .map((row) => getClaimKey(row))
                const selectedCount = eligibleKeys.filter((key) => isClaimKeySelected(key)).length
                const allSelected = eligibleKeys.length > 0 && selectedCount === eligibleKeys.length

                rows.push(
                  <CTableRow key={`claim-owner-${ownerGroup.key}`} className="table-light">
                    <CTableDataCell colSpan={10} className="fw-semibold text-body-secondary">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <CFormCheck
                            id={`group-select-${ownerGroup.key}`}
                            aria-label={`Select actionable claims for ${periodGroup.periodLabel || 'Unknown period'} | ${ownerGroup.ownerLabel || 'Unknown'}`}
                            disabled={eligibleKeys.length === 0}
                            checked={allSelected}
                            onChange={() => toggleClaimGroupSelection(ownerGroup)}
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                          />
                          <UserGroupLabel
                            ownerLabel={ownerGroup.ownerLabel}
                            count={ownerGroup.rows.length}
                          />
                        </div>
                        <GroupTotalBadge
                          label="Subtotal"
                          value={formatCurrency(ownerGroup.totalAmount)}
                        />
                      </div>
                    </CTableDataCell>
                  </CTableRow>,
                )

                ownerGroup.rows.forEach((row) => {
                  rowIndex += 1
                  rows.push(
                    <CTableRow
                      key={`${row.id}-${row.ownerId || 'owner'}`}
                      className="cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => openClaimDetail(row, 'claimRecords')}
                    >
                      <CTableDataCell className="text-center text-body-secondary">
                        {rowIndex}
                      </CTableDataCell>
                      <CTableDataCell className="fw-semibold">{row.id || '-'}</CTableDataCell>
                      <CTableDataCell>{row.ownerLabel || '-'}</CTableDataCell>
                      <CTableDataCell>{toTypeLabel(row.type)}</CTableDataCell>
                      <CTableDataCell>{row.period || '-'}</CTableDataCell>
                      <CTableDataCell>{row.category || '-'}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(resolveRowAmount(row))}</CTableDataCell>
                      <CTableDataCell>
                        <ApprovalGates
                          gates={CLAIM_GATES}
                          approvalHistory={row.approvalHistory}
                          isCancelled={row.status === 'Cancelled'}
                        />
                      </CTableDataCell>
                      <CTableDataCell>{formatDate(row.submittedAt)}</CTableDataCell>
                      <RowActionCell>
                        <RowActions items={buildClaimRowActionItems(row)} />
                      </RowActionCell>
                    </CTableRow>,
                  )
                })
              })

              return rows
            })
          })()}
        </CTableBody>
      </CTable>
    </div>
  )

  return (
    <CCard data-tour-id="salary-claims-management-claims">
      <CCardHeader>Claim Records</CCardHeader>
      <CCardBody>
        <div data-tour-id="salary-claims-management-claims-filters">
          <TableFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search claim ID, employee, claim type, status, period"
            periodValue={period}
            onPeriodChange={setPeriod}
            filters={[
              {
                key: 'sort',
                label: 'Sort',
                value: sort,
                defaultValue: claimSortOptions?.[0]?.value,
                onChange: setSort,
                options: claimSortOptions,
              },
              {
                key: 'type',
                label: 'Type',
                value: typeFilter,
                defaultValue: claimTypeOptions?.[0]?.value,
                onChange: setTypeFilter,
                options: claimTypeOptions,
              },
              {
                key: 'status',
                label: 'Status',
                value: statusFilter,
                defaultValue: claimStatusOptions?.[0]?.value,
                onChange: setStatusFilter,
                options: claimStatusOptions,
              },
            ]}
            onClear={clearClaimFilters}
            rowClassName="flex-md-nowrap align-items-md-end"
            searchColMd={3}
            periodColMd={2}
            filterColMd={2}
            clearColMd="auto"
            showDesktopLabels
          />
        </div>

        <ResponsiveRecordCollection
          isLoading={isLoading}
          isEmpty={filteredClaimRows.length === 0}
          emptyMessage={
            <div className="text-body-secondary">No claim records match the current filters.</div>
          }
          mobileSections={mobileClaimSections}
          mobileVariant="list-group"
          renderDesktop={renderDesktopTable}
          footer={
            <DataTableFooter
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              filteredCount={filteredClaimRows.length}
              totalCount={totalCount}
            />
          }
        >
          {selectedBar}
        </ResponsiveRecordCollection>
      </CCardBody>
    </CCard>
  )
}

export default ClaimRecordsTab
