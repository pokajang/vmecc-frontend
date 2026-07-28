import React, { useMemo, useState } from 'react'
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
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import RowActionCell from 'src/components/RowActionCell'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import WorkflowStatusSummary from 'src/components/WorkflowStatusSummary'
import { buildBulkSelectionSummary } from '../helpers/bulkSelectionSummary'
import SalaryBulkModeBar from './SalaryBulkModeBar'
import { activateOnEnterOrSpace } from 'src/utils/uiAccessibility'

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
    canBulkActOnSalaryClaim = () => false,
    canBulkActOnClaim = () => false,
    canMarkClaimPaid = () => false,
    canUnmarkClaimPaid = () => false,
    getClaimKey,
    isClaimKeySelected,
    toggleSalaryGroupSelection,
    openClaimDetail,
    buildClaimRowActionItems,
    setSalaryRowsToShow,
  } = handlers
  const [bulkIntent, setBulkIntent] = useState('approval')
  const [paymentMode, setPaymentMode] = useState('mark')
  const selectedSalaryRows = useMemo(
    () =>
      groupedVisibleSalaryRows
        .flatMap((periodGroup) => periodGroup.ownerGroups.flatMap((ownerGroup) => ownerGroup.rows))
        .filter((row) => canBulkActOnSalaryClaim(row) && isClaimKeySelected(getClaimKey(row))),
    [canBulkActOnSalaryClaim, getClaimKey, groupedVisibleSalaryRows, isClaimKeySelected],
  )
  const selectedVisibleCount = selectedSalaryRows.length
  const workflowSummary = useMemo(
    () =>
      buildBulkSelectionSummary(selectedSalaryRows, {
        predicate: canBulkActOnClaim,
        getAmount: getSalaryProjectedNet,
        formatCurrency,
      }),
    [canBulkActOnClaim, formatCurrency, getSalaryProjectedNet, selectedSalaryRows],
  )
  const markPaidSummary = useMemo(
    () =>
      buildBulkSelectionSummary(selectedSalaryRows, {
        predicate: canMarkClaimPaid,
        getAmount: getSalaryProjectedNet,
        formatCurrency,
      }),
    [canMarkClaimPaid, formatCurrency, getSalaryProjectedNet, selectedSalaryRows],
  )
  const unmarkPaidSummary = useMemo(
    () =>
      buildBulkSelectionSummary(selectedSalaryRows, {
        predicate: canUnmarkClaimPaid,
        getAmount: getSalaryProjectedNet,
        formatCurrency,
      }),
    [canUnmarkClaimPaid, formatCurrency, getSalaryProjectedNet, selectedSalaryRows],
  )
  const workflowAvailable = workflowSummary.count > 0
  const paymentAvailable = markPaidSummary.count > 0 || unmarkPaidSummary.count > 0
  const resolvedBulkIntent =
    workflowAvailable && paymentAvailable
      ? bulkIntent
      : workflowAvailable
        ? 'approval'
        : paymentAvailable
          ? 'payment'
          : bulkIntent
  const resolvedPaymentMode =
    markPaidSummary.count > 0 && unmarkPaidSummary.count > 0
      ? paymentMode
      : unmarkPaidSummary.count > 0
        ? 'unmark'
        : 'mark'

  const contractIncompleteCount = filteredSalaryRows.filter(
    (row) => row?.salaryContractIncomplete === true,
  ).length

  const buildMobileSalaryItem = (row) => {
    const assignedNetRaw = row?.payrollSnapshot?.net
    const assignedNet =
      assignedNetRaw === null || typeof assignedNetRaw === 'undefined'
        ? null
        : parseAmount(assignedNetRaw)
    const adjustmentsTotal = getSalaryAdjustmentsTotal(row)
    const approvedOvertimeRaw = row?.approvedOvertimePayout
    const approvedOvertime =
      approvedOvertimeRaw === null || typeof approvedOvertimeRaw === 'undefined'
        ? null
        : parseAmount(approvedOvertimeRaw)
    const projectedNet = getSalaryProjectedNet(row)

    return {
      key: `${row.id}-${row.ownerId || 'owner'}`,
      title: row.id || '-',
      subtitle: row.ownerLabel || '-',
      eyebrow: row.period || 'Salary',
      status: (
        <WorkflowStatusSummary
          statusLabel={row.status || '-'}
          gates={SALARY_GATES}
          approvalHistory={row.approvalHistory}
          isCancelled={row.status === 'Cancelled'}
        />
      ),
      fields: [
        {
          key: 'baseline',
          label: 'Baseline',
          value: renderMoneyValue(assignedNet, formatCurrency),
        },
        {
          key: 'adjustments',
          label: 'Adjustments',
          value: renderMoneyValue(adjustmentsTotal, formatCurrency),
        },
        {
          key: 'overtime',
          label: 'OT payout',
          value: renderMoneyValue(approvedOvertime, formatCurrency),
        },
        {
          key: 'payable',
          label: 'Final payable',
          value: renderMoneyValue(projectedNet, formatCurrency),
        },
        { key: 'submitted', label: 'Submitted', value: formatDate(row.submittedAt) },
      ],
      detail: row?.salaryContractIncomplete === true ? 'Incomplete backend salary data' : '',
      ariaLabel: `Open salary record ${row.id || '-'}`,
      onOpen: () => openClaimDetail(row, 'salaryRecords'),
      actions: <RowActions items={buildClaimRowActionItems(row)} />,
    }
  }

  const mobileSalarySections = groupedVisibleSalaryRows.flatMap((periodGroup) =>
    periodGroup.ownerGroups.map((ownerGroup) => {
      const eligibleKeys = ownerGroup.rows
        .filter((row) => canBulkActOnSalaryClaim(row))
        .map((row) => getClaimKey(row))
      const selectedCount = eligibleKeys.filter((key) => isClaimKeySelected(key)).length
      const allSelected = eligibleKeys.length > 0 && selectedCount === eligibleKeys.length
      const ownerIncompleteCount = ownerGroup.rows.filter(
        (row) => row?.salaryContractIncomplete === true,
      ).length
      const ownerCompleteTotal = ownerGroup.rows.reduce((sum, row) => {
        if (row?.salaryContractIncomplete === true) return sum
        return sum + parseAmount(getSalaryProjectedNet(row))
      }, 0)

      return {
        key: `mobile-salary-${periodGroup.key}-${ownerGroup.key}`,
        label: (
          <span className="d-inline-flex align-items-center gap-2">
            <CFormCheck
              id={`mobile-salary-group-select-${ownerGroup.key}`}
              aria-label={`Select actionable salary claims for ${periodGroup.periodLabel || 'Unknown period'} | ${ownerGroup.ownerLabel || 'Unknown'}`}
              disabled={eligibleKeys.length === 0}
              checked={allSelected}
              onChange={() => toggleSalaryGroupSelection(ownerGroup)}
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
        summary: formatCurrency(
          ownerIncompleteCount > 0 ? ownerCompleteTotal : ownerGroup.totalAmount,
        ),
        items: ownerGroup.rows.map(buildMobileSalaryItem),
      }
    }),
  )

  const renderDesktopTable = () => (
    <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-body">
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
            <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
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
                      periodIncompleteCount > 0 ? periodCompleteTotal : periodGroup.totalAmount,
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
                const selectedCount = eligibleKeys.filter((key) => isClaimKeySelected(key)).length
                const allSelected = eligibleKeys.length > 0 && selectedCount === eligibleKeys.length
                const ownerIncompleteCount = ownerGroup.rows.filter(
                  (row) => row?.salaryContractIncomplete === true,
                ).length
                const ownerCompleteTotal = ownerGroup.rows.reduce((sum, row) => {
                  if (row?.salaryContractIncomplete === true) return sum
                  return sum + parseAmount(getSalaryProjectedNet(row))
                }, 0)

                rows.push(
                  <CTableRow key={`salary-owner-${ownerGroup.key}`} className="table-light">
                    <CTableDataCell colSpan={10} className="fw-semibold text-body-secondary">
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
                            ownerIncompleteCount > 0 ? ownerCompleteTotal : ownerGroup.totalAmount,
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
                    approvedOvertimeRaw === null || typeof approvedOvertimeRaw === 'undefined'
                      ? null
                      : parseAmount(approvedOvertimeRaw)
                  const projectedNet = getSalaryProjectedNet(row)
                  const contractMissingFields = Array.isArray(row?.salaryContractMissingFields)
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
                      role="button"
                      tabIndex={0}
                      aria-label={`Open salary record ${row.id || rowIndex}`}
                      onClick={() => openClaimDetail(row, 'salaryRecords')}
                      onKeyDown={(event) =>
                        activateOnEnterOrSpace(event, () => openClaimDetail(row, 'salaryRecords'))
                      }
                    >
                      <CTableDataCell className="text-center text-body-secondary">
                        {rowIndex}
                      </CTableDataCell>
                      <CTableDataCell className="fw-semibold">
                        <div>{row.id || '-'}</div>
                        {row?.salaryContractIncomplete === true && (
                          <div className="small text-warning mt-1" title={contractWarningTitle}>
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
    <CCard data-testid="salary-claims-management-salary">
      <CCardHeader>Salary Records</CCardHeader>
      <CCardBody>
        <div data-testid="salary-claims-management-salary-filters">
          <TableFilters
            searchValue={salarySearch}
            onSearchChange={setSalarySearch}
            searchLabel="Search salary records by claim ID, employee, payroll month, or status"
            searchPlaceholder="Search salary records"
            periodValue={salaryPeriod}
            onPeriodChange={setSalaryPeriod}
            filters={[
              {
                key: 'sort',
                label: 'Sort',
                value: salarySort,
                defaultValue: salarySortOptions?.[0]?.value,
                onChange: setSalarySort,
                options: salarySortOptions,
              },
              {
                key: 'status',
                label: 'Status',
                value: salaryStatusFilter,
                defaultValue: salaryStatusOptions?.[0]?.value,
                onChange: setSalaryStatusFilter,
                options: salaryStatusOptions,
              },
            ]}
            onClear={clearSalaryFilters}
            rowClassName="flex-md-nowrap align-items-md-end"
            searchColMd={4}
            periodColMd={2}
            filterColMd={2}
            clearColMd="auto"
            showDesktopLabels
          />
        </div>

        <ResponsiveRecordCollection
          isLoading={isLoading}
          isEmpty={filteredSalaryRows.length === 0}
          emptyMessage={
            <div className="text-body-secondary">No salary records match the current filters.</div>
          }
          mobileSections={mobileSalarySections}
          mobileVariant="list-group"
          renderDesktop={renderDesktopTable}
          footer={
            <DataTableFooter
              rowsToShow={salaryRowsToShow}
              onRowsToShowChange={setSalaryRowsToShow}
              filteredCount={filteredSalaryRows.length}
              totalCount={totalCount}
            />
          }
        >
          {contractIncompleteCount > 0 && (
            <CAlert color="warning" className="mb-3 py-2">
              {contractIncompleteCount} salary record{contractIncompleteCount === 1 ? '' : 's'} have
              missing payroll details. Group totals include complete records only.
            </CAlert>
          )}
          {selectedVisibleCount > 0 && (
            <SalaryBulkModeBar
              totalSelectedCount={selectedVisibleCount}
              intent={resolvedBulkIntent}
              onIntentChange={setBulkIntent}
              paymentMode={resolvedPaymentMode}
              onPaymentModeChange={setPaymentMode}
              workflowSummary={workflowSummary}
              markPaidSummary={markPaidSummary}
              unmarkPaidSummary={unmarkPaidSummary}
              onClear={clearSelection}
              onReject={() => openBulkActionModal('reject')}
              onApprove={() => openBulkActionModal('approve')}
              onMarkPaid={() => openBulkPaymentModal('mark')}
              onUnmarkPaid={() => openBulkPaymentModal('unmark')}
            />
          )}
        </ResponsiveRecordCollection>
      </CCardBody>
    </CCard>
  )
}

export default SalaryRecordsTab
