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
import DataTableFooter from 'src/components/DataTableFooter'
import GroupedTableHeaderRow, {
  GroupTotalBadge,
  UserGroupLabel,
} from 'src/components/GroupedTableHeader'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
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

  return (
    <CCard>
      <CCardHeader>Claim Records</CCardHeader>
      <CCardBody>
        <TableFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search claim ID, employee, claim type, status, period"
          periodValue={period}
          onPeriodChange={setPeriod}
          filters={[
            { key: 'sort', value: sort, onChange: setSort, options: claimSortOptions },
            {
              key: 'type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: claimTypeOptions,
            },
            {
              key: 'status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: claimStatusOptions,
            },
          ]}
          onClear={clearClaimFilters}
          rowClassName="flex-md-nowrap"
          searchColMd={3}
          periodColMd={2}
          filterColMd={2}
          clearColMd="auto"
        />

        {isLoading ? (
          <TableLoader />
        ) : filteredClaimRows.length === 0 ? (
          <div className="text-body-secondary">No claim records match the current filters.</div>
        ) : (
          <>
            {selectedVisibleCount > 0 && (
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 border rounded-3 p-2 bg-light">
                <div className="fw-semibold">
                  {selectedVisibleCount} claim{selectedVisibleCount === 1 ? '' : 's'} selected
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <BulkActionButton
                    label="Clear selection"
                    intent="neutral"
                    onClick={clearSelection}
                  />
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
                </div>
              </div>
            )}
            <div className="rounded-3 shadow-sm overflow-hidden bg-white">
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
                          <GroupTotalBadge
                            label="Total"
                            value={formatCurrency(periodGroup.totalAmount)}
                          />
                        </GroupedTableHeaderRow>,
                      )

                      periodGroup.ownerGroups.forEach((ownerGroup) => {
                        const eligibleKeys = ownerGroup.rows
                          .filter((row) => canBulkActOnClaim(row))
                          .map((row) => getClaimKey(row))
                        const selectedCount = eligibleKeys.filter((key) =>
                          isClaimKeySelected(key),
                        ).length
                        const allSelected =
                          eligibleKeys.length > 0 && selectedCount === eligibleKeys.length

                        rows.push(
                          <CTableRow key={`claim-owner-${ownerGroup.key}`} className="table-light">
                            <CTableDataCell
                              colSpan={10}
                              className="fw-semibold text-body-secondary"
                            >
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
                              <CTableDataCell className="fw-semibold">
                                {row.id || '-'}
                              </CTableDataCell>
                              <CTableDataCell>{row.ownerLabel || '-'}</CTableDataCell>
                              <CTableDataCell>{toTypeLabel(row.type)}</CTableDataCell>
                              <CTableDataCell>{row.period || '-'}</CTableDataCell>
                              <CTableDataCell>{row.category || '-'}</CTableDataCell>
                              <CTableDataCell>
                                {formatCurrency(resolveRowAmount(row))}
                              </CTableDataCell>
                              <CTableDataCell>
                                <ApprovalGates
                                  gates={CLAIM_GATES}
                                  approvalHistory={row.approvalHistory}
                                  isCancelled={row.status === 'Cancelled'}
                                />
                              </CTableDataCell>
                              <CTableDataCell>{formatDate(row.submittedAt)}</CTableDataCell>
                              <CTableDataCell
                                className="text-center"
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                <RowActions items={buildClaimRowActionItems(row)} />
                              </CTableDataCell>
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
            <DataTableFooter
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              filteredCount={filteredClaimRows.length}
              totalCount={totalCount}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ClaimRecordsTab
