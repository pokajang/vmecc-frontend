import React from 'react'
import {
  CAlert,
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

const SALARY_GATES = [
  { action: 'Checked', label: 'Checked' },
  { action: 'Reviewed', label: 'Reviewed' },
  { action: 'Approved', label: 'Approved' },
]

const renderMoneyValue = (value, formatCurrency) =>
  value === null || typeof value === 'undefined' ? '-' : formatCurrency(value)

const SalaryRecordsTab = ({ vm, handlers }) => {
  const {
    salarySearch,
    salaryPeriod,
    salarySort,
    salaryStatusFilter,
    salarySortOptions,
    salaryStatusOptions,
    filteredSalaryRows,
    groupedVisibleSalaryRows,
    salaryRowsToShow,
    totalCount,
    formatCurrency,
    formatDate,
    parseAmount,
    getSalaryAdjustmentsTotal,
    getSalaryProjectedNet,
    isLoading = false,
  } = vm
  const {
    setSalarySearch,
    setSalaryPeriod,
    setSalarySort,
    setSalaryStatusFilter,
    clearSalaryFilters,
    clearSelection,
    openBulkActionModal,
    openBulkPaymentModal,
    canBulkActOnSalaryClaim,
    getClaimKey,
    isClaimKeySelected,
    toggleSalaryGroupSelection,
    openClaimDetail,
    buildClaimRowActionItems,
    setSalaryRowsToShow,
  } = handlers
  const selectedVisibleCount = groupedVisibleSalaryRows.reduce(
    (total, periodGroup) =>
      total +
      periodGroup.ownerGroups.reduce(
        (ownerTotal, ownerGroup) =>
          ownerTotal +
          ownerGroup.rows.filter(
            (row) => canBulkActOnSalaryClaim(row) && isClaimKeySelected(getClaimKey(row)),
          ).length,
        0,
      ),
    0,
  )
  const contractIncompleteCount = filteredSalaryRows.filter(
    (row) => row?.salaryContractIncomplete === true,
  ).length

  return (
    <CCard>
      <CCardHeader>Salary Records</CCardHeader>
      <CCardBody>
        <TableFilters
          searchValue={salarySearch}
          onSearchChange={setSalarySearch}
          searchPlaceholder="Search claim ID, employee, payroll month, status"
          periodValue={salaryPeriod}
          onPeriodChange={setSalaryPeriod}
          filters={[
            {
              key: 'sort',
              value: salarySort,
              onChange: setSalarySort,
              options: salarySortOptions,
            },
            {
              key: 'status',
              value: salaryStatusFilter,
              onChange: setSalaryStatusFilter,
              options: salaryStatusOptions,
            },
          ]}
          onClear={clearSalaryFilters}
          rowClassName="flex-md-nowrap"
          searchColMd={4}
          periodColMd={2}
          filterColMd={2}
          clearColMd="auto"
        />

        {isLoading ? (
          <TableLoader />
        ) : filteredSalaryRows.length === 0 ? (
          <div className="text-body-secondary">No salary records match the current filters.</div>
        ) : (
          <>
            {contractIncompleteCount > 0 && (
              <CAlert color="warning" className="mb-3 py-2">
                {contractIncompleteCount} salary record{contractIncompleteCount === 1 ? '' : 's'}{' '}
                contain incomplete backend contract fields. Group totals are shown as partial totals
                for complete records only.
              </CAlert>
            )}
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
                  <BulkActionButton
                    label="Mark selected paid"
                    intent="approve"
                    onClick={() => openBulkPaymentModal('mark')}
                  />
                  <BulkActionButton
                    label="Unmark selected paid"
                    intent="reject"
                    onClick={() => openBulkPaymentModal('unmark')}
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
                    <CTableHeaderCell>Payroll Month</CTableHeaderCell>
                    <CTableHeaderCell>Salary Payable (Baseline)</CTableHeaderCell>
                    <CTableHeaderCell>Total Adjustments</CTableHeaderCell>
                    <CTableHeaderCell>Approved Overtime Payout</CTableHeaderCell>
                    <CTableHeaderCell>Final Payable</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Submitted On</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {(() => {
                    let rowIndex = 0
                    return groupedVisibleSalaryRows.flatMap((periodGroup) => {
                      const rows = []
                      const periodIncompleteCount = periodGroup.rows.filter(
                        (row) => row?.salaryContractIncomplete === true,
                      ).length
                      const periodCompleteTotal = periodGroup.rows.reduce((sum, row) => {
                        if (row?.salaryContractIncomplete === true) return sum
                        return sum + parseAmount(getSalaryProjectedNet(row))
                      }, 0)
                      rows.push(
                        <GroupedTableHeaderRow
                          key={`salary-period-${periodGroup.key}`}
                          colSpan={10}
                          label={periodGroup.periodLabel}
                          count={periodGroup.rows.length}
                          className="table-secondary"
                          cellClassName="fw-semibold text-body"
                          testId={`salary-period-group-${periodGroup.key}`}
                        >
                          <GroupTotalBadge
                            label={periodIncompleteCount > 0 ? 'Partial total' : 'Total'}
                            value={formatCurrency(
                              periodIncompleteCount > 0
                                ? periodCompleteTotal
                                : periodGroup.totalAmount,
                            )}
                            title={
                              periodIncompleteCount > 0
                                ? `${periodIncompleteCount} incomplete row${
                                    periodIncompleteCount === 1 ? '' : 's'
                                  } excluded from total.`
                                : ''
                            }
                          />
                        </GroupedTableHeaderRow>,
                      )
                      periodGroup.ownerGroups.forEach((ownerGroup) => {
                        const eligibleKeys = ownerGroup.rows
                          .filter((row) => canBulkActOnSalaryClaim(row))
                          .map((row) => getClaimKey(row))
                        const selectedCount = eligibleKeys.filter((key) =>
                          isClaimKeySelected(key),
                        ).length
                        const allSelected =
                          eligibleKeys.length > 0 && selectedCount === eligibleKeys.length
                        const ownerIncompleteCount = ownerGroup.rows.filter(
                          (row) => row?.salaryContractIncomplete === true,
                        ).length
                        const ownerCompleteTotal = ownerGroup.rows.reduce((sum, row) => {
                          if (row?.salaryContractIncomplete === true) return sum
                          return sum + parseAmount(getSalaryProjectedNet(row))
                        }, 0)

                        rows.push(
                          <CTableRow key={`salary-owner-${ownerGroup.key}`} className="table-light">
                            <CTableDataCell
                              colSpan={10}
                              className="fw-semibold text-body-secondary"
                            >
                              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                                <div className="d-flex flex-wrap align-items-center gap-2">
                                  <CFormCheck
                                    id={`salary-group-select-${ownerGroup.key}`}
                                    aria-label={`Select actionable salary claims for ${periodGroup.periodLabel || 'Unknown period'} | ${ownerGroup.ownerLabel || 'Unknown'}`}
                                    disabled={eligibleKeys.length === 0}
                                    checked={allSelected}
                                    onChange={() => toggleSalaryGroupSelection(ownerGroup)}
                                    onClick={(event) => event.stopPropagation()}
                                    onMouseDown={(event) => event.stopPropagation()}
                                  />
                                  <UserGroupLabel
                                    ownerLabel={ownerGroup.ownerLabel}
                                    count={ownerGroup.rows.length}
                                  />
                                </div>
                                <GroupTotalBadge
                                  label={ownerIncompleteCount > 0 ? 'Partial subtotal' : 'Subtotal'}
                                  value={formatCurrency(
                                    ownerIncompleteCount > 0
                                      ? ownerCompleteTotal
                                      : ownerGroup.totalAmount,
                                  )}
                                  title={
                                    ownerIncompleteCount > 0
                                      ? `${ownerIncompleteCount} incomplete row${
                                          ownerIncompleteCount === 1 ? '' : 's'
                                        } excluded from subtotal.`
                                      : ''
                                  }
                                />
                              </div>
                            </CTableDataCell>
                          </CTableRow>,
                        )

                        ownerGroup.rows.forEach((row) => {
                          rowIndex += 1
                          const assignedNetRaw = row?.payrollSnapshot?.net
                          const assignedNet =
                            assignedNetRaw === null || typeof assignedNetRaw === 'undefined'
                              ? null
                              : parseAmount(assignedNetRaw)
                          const adjustmentsTotal = getSalaryAdjustmentsTotal(row)
                          const approvedOvertimeRaw = row?.approvedOvertimePayout
                          const approvedOvertime =
                            approvedOvertimeRaw === null ||
                            typeof approvedOvertimeRaw === 'undefined'
                              ? null
                              : parseAmount(approvedOvertimeRaw)
                          const projectedNet = getSalaryProjectedNet(row)
                          const contractMissingFields = Array.isArray(
                            row?.salaryContractMissingFields,
                          )
                            ? row.salaryContractMissingFields
                            : []
                          const contractWarningTitle =
                            contractMissingFields.length > 0
                              ? `Missing fields: ${contractMissingFields.join(', ')}`
                              : 'Missing salary contract fields from backend response.'

                          rows.push(
                            <CTableRow
                              key={`${row.id}-${row.ownerId || 'owner'}`}
                              className="cursor-pointer"
                              style={{ cursor: 'pointer' }}
                              onClick={() => openClaimDetail(row, 'salaryRecords')}
                            >
                              <CTableDataCell className="text-center text-body-secondary">
                                {rowIndex}
                              </CTableDataCell>
                              <CTableDataCell className="fw-semibold">
                                <div>{row.id || '-'}</div>
                                {row?.salaryContractIncomplete === true && (
                                  <div
                                    className="small text-warning mt-1"
                                    title={contractWarningTitle}
                                  >
                                    Incomplete backend salary data
                                  </div>
                                )}
                              </CTableDataCell>
                              <CTableDataCell>{row.period || '-'}</CTableDataCell>
                              <CTableDataCell>
                                {renderMoneyValue(assignedNet, formatCurrency)}
                              </CTableDataCell>
                              <CTableDataCell>
                                {renderMoneyValue(adjustmentsTotal, formatCurrency)}
                              </CTableDataCell>
                              <CTableDataCell>
                                {renderMoneyValue(approvedOvertime, formatCurrency)}
                              </CTableDataCell>
                              <CTableDataCell>
                                {renderMoneyValue(projectedNet, formatCurrency)}
                              </CTableDataCell>
                              <CTableDataCell>
                                <ApprovalGates
                                  gates={SALARY_GATES}
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
              rowsToShow={salaryRowsToShow}
              onRowsToShowChange={setSalaryRowsToShow}
              filteredCount={filteredSalaryRows.length}
              totalCount={totalCount}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default SalaryRecordsTab
