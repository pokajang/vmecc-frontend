import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { Eye, EyeOff } from 'lucide-react'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import GroupedTableHeaderRow from 'src/components/GroupedTableHeader'
import MobileRecordList from 'src/components/MobileRecordList'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
import { ASSIGNMENT_DRAFT_STATUS } from '../constants'

const resolveAllowanceTotal = (row) => row?.allowanceTotal ?? row?.fixedAllowances ?? 0

const AssignmentPreviewRow = memo(
  ({ row, formatCurrency, epf, perkeso, sip, totalDeductions, netAssigned, allowances }) => (
    <CTableRow className="table-light">
      <CTableDataCell colSpan={9}>
        <div className="row g-3">
          <div className="col-md-6">
            <div className="small fw-semibold text-body-secondary mb-1">Pay Components</div>
            <div className="d-grid gap-1 small">
              <div className="d-flex justify-content-between gap-2">
                <span>Basic</span>
                <span>{formatCurrency(row.basicSalary)}</span>
              </div>
              {allowances.length > 0 ? (
                allowances.map((item, i) => (
                  <div key={item.id ?? i} className="d-flex justify-content-between gap-2">
                    <span>{item.name || '-'}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="text-body-secondary">No allowances.</div>
              )}
              <div className="d-flex justify-content-between gap-2 fw-semibold pt-1 border-top">
                <span>Total Allowance</span>
                <span>{formatCurrency(resolveAllowanceTotal(row))}</span>
              </div>
              <div className="d-flex justify-content-between gap-2 fw-semibold">
                <span>Total Payable</span>
                <span>{formatCurrency(netAssigned)}</span>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="small fw-semibold text-body-secondary mb-1">Deductions</div>
            <div className="d-grid gap-1 small">
              <div className="d-flex justify-content-between gap-2">
                <span>EPF</span>
                <span>{formatCurrency(epf)}</span>
              </div>
              <div className="d-flex justify-content-between gap-2">
                <span>PERKESO</span>
                <span>{formatCurrency(perkeso)}</span>
              </div>
              <div className="d-flex justify-content-between gap-2">
                <span>SIP</span>
                <span>{formatCurrency(sip)}</span>
              </div>
              <div className="d-flex justify-content-between gap-2 fw-semibold pt-1 border-top">
                <span>Total Deductions</span>
                <span>{formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>
      </CTableDataCell>
    </CTableRow>
  ),
)
AssignmentPreviewRow.displayName = 'AssignmentPreviewRow'

const AssignmentTableRow = memo(
  ({
    row,
    rowIndex,
    isExpanded,
    formatCurrency,
    formatMonth,
    getAssignmentNetAssigned,
    onRowClick,
    onEdit,
    onDelete,
    actionTestId = '',
  }) => {
    const isDraft = String(row?.status || '') === ASSIGNMENT_DRAFT_STATUS
    const employeeContributions = row?.employeeContributions || {}
    const epf = Number(employeeContributions?.epf ?? row?.epf ?? 0)
    const perkeso = Number(employeeContributions?.perkeso ?? row?.perkeso ?? 0)
    const sip = Number(employeeContributions?.sip ?? row?.sip ?? 0)
    const totalDeductions = epf + perkeso + sip
    const allowances = Array.isArray(row?.allowances) ? row.allowances : []
    const netAssigned = getAssignmentNetAssigned(row)

    return (
      <>
        <CTableRow
          role="button"
          tabIndex={0}
          className="cursor-pointer"
          aria-label={`Open salary assignment ${row.id || row.name || 'details'}`}
          onClick={() => onRowClick(row, isDraft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onRowClick(row, isDraft)
            }
          }}
        >
          <CTableDataCell className="text-center text-body-secondary">{rowIndex}</CTableDataCell>
          <CTableDataCell className="fw-semibold">
            {isDraft ? row.name || row.id || '-' : row.id || '-'}
          </CTableDataCell>
          <CTableDataCell>{row.employee || '-'}</CTableDataCell>
          <CTableDataCell>{formatMonth(row.effectiveFrom)}</CTableDataCell>
          <CTableDataCell>{formatCurrency(row.basicSalary)}</CTableDataCell>
          <CTableDataCell>{formatCurrency(resolveAllowanceTotal(row))}</CTableDataCell>
          <CTableDataCell>{formatCurrency(totalDeductions)}</CTableDataCell>
          <CTableDataCell className="fw-semibold">{formatCurrency(netAssigned)}</CTableDataCell>
          <CTableDataCell className="text-end">
            <RowActions
              testId={actionTestId}
              items={[
                { key: 'edit', label: 'Edit', onClick: () => onEdit(row, isDraft) },
                {
                  key: 'delete',
                  label: 'Delete',
                  className: 'text-danger',
                  onClick: () => onDelete(row),
                },
              ]}
            />
          </CTableDataCell>
        </CTableRow>
        {isExpanded && (
          <AssignmentPreviewRow
            row={row}
            formatCurrency={formatCurrency}
            epf={epf}
            perkeso={perkeso}
            sip={sip}
            totalDeductions={totalDeductions}
            netAssigned={netAssigned}
            allowances={allowances}
          />
        )}
      </>
    )
  },
)
AssignmentTableRow.displayName = 'AssignmentTableRow'

const SalarySettingsTab = ({ vm, handlers }) => {
  const {
    assignmentSearch,
    assignmentSort,
    assignmentSortOptions,
    assignmentTeamFilter,
    assignmentTeamOptions,
    filteredAssignmentRows,
    groupedVisibleAssignmentRows,
    assignmentRowsToShow,
    totalCount,
    assignmentHistory,
    isLoading,
    loadError,
    formatCurrency,
    formatDate,
    formatMonth,
    getAssignmentNetAssigned,
  } = vm

  const {
    setAssignmentSearch,
    setAssignmentSort,
    setAssignmentTeamFilter,
    clearAssignmentFilters,
    openCreateAssignment,
    openEditAssignment,
    openAssignmentDetail,
    resumeAssignmentDraft,
    deleteAssignmentRow,
    setAssignmentRowsToShow,
    retryLoadAssignments,
  } = handlers

  const [expandedGroupKeys, setExpandedGroupKeys] = useState(() => new Set())
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [retryCoolingDown, setRetryCoolingDown] = useState(false)
  const retryTimerRef = useRef(null)
  const flattenedAssignmentRows = useMemo(
    () => groupedVisibleAssignmentRows.flatMap((group) => group.rows || []),
    [groupedVisibleAssignmentRows],
  )
  const firstDraftAssignmentId = String(
    flattenedAssignmentRows.find((row) => String(row?.status || '') === ASSIGNMENT_DRAFT_STATUS)
      ?.id || '',
  ).trim()
  const firstDeleteAssignmentId = String(flattenedAssignmentRows[0]?.id || '').trim()

  const handleRetry = useCallback(() => {
    if (retryCoolingDown || typeof retryLoadAssignments !== 'function') return
    setRetryCoolingDown(true)
    retryLoadAssignments()
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    retryTimerRef.current = setTimeout(() => {
      setRetryCoolingDown(false)
      retryTimerRef.current = null
    }, 5000)
  }, [retryCoolingDown, retryLoadAssignments])

  useEffect(
    () => () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    },
    [],
  )

  const { historyRows, hiddenHistoryCount } = useMemo(() => {
    const all = Array.isArray(assignmentHistory) ? assignmentHistory : []
    return {
      historyRows: showFullHistory ? all : all.slice(0, 5),
      hiddenHistoryCount: showFullHistory ? 0 : Math.max(0, all.length - 5),
    }
  }, [assignmentHistory, showFullHistory])

  const toggleGroupExpanded = useCallback((groupKey) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }, [])

  const handleRowClick = useCallback(
    (row, isDraft) => {
      if (isDraft) {
        resumeAssignmentDraft(row)
      } else {
        openAssignmentDetail(row)
      }
    },
    [openAssignmentDetail, resumeAssignmentDraft],
  )

  const handleEdit = useCallback(
    (row, isDraft) => {
      if (isDraft) {
        resumeAssignmentDraft(row)
      } else {
        openEditAssignment(row)
      }
    },
    [openEditAssignment, resumeAssignmentDraft],
  )

  const handleDelete = useCallback(
    (row) => {
      deleteAssignmentRow(row)
    },
    [deleteAssignmentRow],
  )

  const toggleShowFullHistory = useCallback(() => setShowFullHistory((prev) => !prev), [])

  const tableRows = useMemo(() => {
    return groupedVisibleAssignmentRows.reduce(
      (acc, group) => {
        const isGroupExpanded = expandedGroupKeys.has(group.key)
        const groupRow = (
          <GroupedTableHeaderRow
            key={`assignment-group-${group.key}`}
            colSpan={9}
            label={`${group.periodLabel || 'Unknown period'} | ${group.ownerLabel || 'Unknown'}`}
            count={group.rows.length}
            countNoun={group.rows.length === 1 ? 'record' : 'records'}
            testId={`assignment-group-${group.key}`}
          >
            <CreateActionButton
              label={isGroupExpanded ? 'Hide Preview' : 'Preview'}
              ariaExpanded={isGroupExpanded}
              icon={isGroupExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
              onClick={() => toggleGroupExpanded(group.key)}
            />
          </GroupedTableHeaderRow>
        )

        const dataRows = group.rows.map((row, i) => {
          const rowIndex = acc.nextRowIndex + i + 1
          return (
            <AssignmentTableRow
              key={row.id ?? `${group.key}-${i}`}
              row={row}
              rowIndex={rowIndex}
              isExpanded={isGroupExpanded}
              formatCurrency={formatCurrency}
              formatMonth={formatMonth}
              getAssignmentNetAssigned={getAssignmentNetAssigned}
              onRowClick={handleRowClick}
              onEdit={handleEdit}
              onDelete={handleDelete}
              actionTestId={
                String(row?.status || '') === ASSIGNMENT_DRAFT_STATUS &&
                firstDraftAssignmentId === String(row?.id || '').trim()
                  ? 'salary-claims-management-assignment-draft-resume-action'
                  : firstDeleteAssignmentId === String(row?.id || '').trim()
                    ? 'salary-claims-management-assignment-delete-action'
                    : ''
              }
            />
          )
        })

        return {
          rows: [...acc.rows, groupRow, ...dataRows],
          nextRowIndex: acc.nextRowIndex + group.rows.length,
        }
      },
      { rows: [], nextRowIndex: 0 },
    ).rows
  }, [
    groupedVisibleAssignmentRows,
    expandedGroupKeys,
    toggleGroupExpanded,
    formatCurrency,
    formatMonth,
    firstDeleteAssignmentId,
    firstDraftAssignmentId,
    getAssignmentNetAssigned,
    handleRowClick,
    handleEdit,
    handleDelete,
  ])

  const mobileAssignmentSections = useMemo(
    () =>
      groupedVisibleAssignmentRows.map((group) => {
        const isGroupExpanded = expandedGroupKeys.has(group.key)
        return {
          key: `assignment-mobile-group-${group.key}`,
          label: `${group.periodLabel || 'Unknown period'} | ${group.ownerLabel || 'Unknown'}`,
          summary: `${group.rows.length} ${group.rows.length === 1 ? 'record' : 'records'}`,
          items: group.rows.map((row, index) => {
            const isDraft = String(row?.status || '') === ASSIGNMENT_DRAFT_STATUS
            const employeeContributions = row?.employeeContributions || {}
            const epf = Number(employeeContributions?.epf ?? row?.epf ?? 0)
            const perkeso = Number(employeeContributions?.perkeso ?? row?.perkeso ?? 0)
            const sip = Number(employeeContributions?.sip ?? row?.sip ?? 0)
            const totalDeductions = epf + perkeso + sip
            const allowances = Array.isArray(row?.allowances) ? row.allowances : []
            const netAssigned = getAssignmentNetAssigned(row)

            return {
              key: row.id ?? `${group.key}-${index}`,
              title: row.employee || '-',
              eyebrow: isDraft ? row.name || row.id || 'Draft assignment' : row.id || '-',
              subtitle: `Effective ${formatMonth(row.effectiveFrom)}`,
              status: isDraft ? (
                <span className="badge bg-warning-subtle text-warning-emphasis">Draft</span>
              ) : null,
              fields: [
                { key: 'basic', label: 'Basic', value: formatCurrency(row.basicSalary) },
                {
                  key: 'allowance',
                  label: 'Allowance',
                  value: formatCurrency(resolveAllowanceTotal(row)),
                },
                {
                  key: 'deductions',
                  label: 'Deductions',
                  value: formatCurrency(totalDeductions),
                },
                { key: 'net', label: 'Net Payable', value: formatCurrency(netAssigned) },
              ],
              detail: group.ownerLabel ? `Owner: ${group.ownerLabel}` : null,
              expanded: isGroupExpanded,
              expandedContent: (
                <div className="row g-3 small">
                  <div className="col-12">
                    <div className="fw-semibold text-body-secondary mb-1">Pay Components</div>
                    <div className="d-grid gap-1">
                      <div className="d-flex justify-content-between gap-2">
                        <span>Basic</span>
                        <span>{formatCurrency(row.basicSalary)}</span>
                      </div>
                      {allowances.length > 0 ? (
                        allowances.map((item, i) => (
                          <div key={item.id ?? i} className="d-flex justify-content-between gap-2">
                            <span>{item.name || '-'}</span>
                            <span>{formatCurrency(item.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-body-secondary">No allowances.</div>
                      )}
                      <div className="d-flex justify-content-between gap-2 fw-semibold pt-1 border-top">
                        <span>Total Allowance</span>
                        <span>{formatCurrency(resolveAllowanceTotal(row))}</span>
                      </div>
                      <div className="d-flex justify-content-between gap-2 fw-semibold">
                        <span>Total Payable</span>
                        <span>{formatCurrency(netAssigned)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="fw-semibold text-body-secondary mb-1">Deductions</div>
                    <div className="d-grid gap-1">
                      <div className="d-flex justify-content-between gap-2">
                        <span>EPF</span>
                        <span>{formatCurrency(epf)}</span>
                      </div>
                      <div className="d-flex justify-content-between gap-2">
                        <span>PERKESO</span>
                        <span>{formatCurrency(perkeso)}</span>
                      </div>
                      <div className="d-flex justify-content-between gap-2">
                        <span>SIP</span>
                        <span>{formatCurrency(sip)}</span>
                      </div>
                      <div className="d-flex justify-content-between gap-2 fw-semibold pt-1 border-top">
                        <span>Total Deductions</span>
                        <span>{formatCurrency(totalDeductions)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ),
              ariaLabel: `Open salary assignment ${row.id || row.employee || index + 1}`,
              onOpen: () => handleRowClick(row, isDraft),
              actions: (
                <RowActions
                  toggleAriaLabel="Mobile row actions"
                  testId={
                    isDraft && firstDraftAssignmentId === String(row?.id || '').trim()
                      ? 'salary-claims-management-assignment-draft-resume-action'
                      : firstDeleteAssignmentId === String(row?.id || '').trim()
                        ? 'salary-claims-management-assignment-delete-action'
                        : ''
                  }
                  items={[
                    { key: 'edit', label: 'Edit', onClick: () => handleEdit(row, isDraft) },
                    {
                      key: 'delete',
                      label: 'Delete',
                      className: 'text-danger',
                      onClick: () => handleDelete(row),
                    },
                  ]}
                />
              ),
            }
          }),
        }
      }),
    [
      groupedVisibleAssignmentRows,
      expandedGroupKeys,
      firstDeleteAssignmentId,
      firstDraftAssignmentId,
      formatCurrency,
      formatMonth,
      getAssignmentNetAssigned,
      handleRowClick,
      handleEdit,
      handleDelete,
    ],
  )

  return (
    <>
      <CCard data-testid="salary-claims-management-assignment-list">
        <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>Salary Assignments</span>
          <div data-testid="salary-claims-management-assignment-create-action">
            <CreateActionButton
              label="Assign Salary"
              importance="section-primary"
              onClick={openCreateAssignment}
            />
          </div>
        </CCardHeader>
        <CCardBody className="d-grid gap-3">
          <TableFilters
            searchValue={assignmentSearch}
            onSearchChange={setAssignmentSearch}
            searchLabel="Search salary assignments by ID, employee, team, or month"
            searchPlaceholder="Search assignments"
            showPeriod={false}
            filters={[
              {
                key: 'sort',
                value: assignmentSort,
                onChange: setAssignmentSort,
                options: assignmentSortOptions,
              },
              {
                key: 'team',
                value: assignmentTeamFilter,
                onChange: setAssignmentTeamFilter,
                options: assignmentTeamOptions,
              },
            ]}
            onClear={clearAssignmentFilters}
            rowClassName="flex-md-nowrap"
            searchColMd={4}
            filterColMd={2}
            clearColMd="auto"
          />

          {loadError && !isLoading && (
            <CAlert color="danger" className="mb-0" role="alert">
              Failed to load salary assignments.{' '}
              <CButton
                type="button"
                color="link"
                className="p-0 align-baseline text-decoration-underline"
                style={{
                  cursor: retryCoolingDown ? 'not-allowed' : 'pointer',
                  opacity: retryCoolingDown ? 0.5 : 1,
                }}
                onClick={handleRetry}
                disabled={retryCoolingDown}
              >
                {retryCoolingDown ? 'Retrying...' : 'Retry'}
              </CButton>
            </CAlert>
          )}

          {isLoading ? (
            <TableLoader message="Loading salary assignments..." />
          ) : filteredAssignmentRows.length === 0 ? (
            <div className="text-body-secondary">
              {assignmentSearch || (assignmentTeamFilter && assignmentTeamFilter !== 'All') ? (
                <>
                  No salary assignments match the current filters.{' '}
                  <CButton
                    type="button"
                    color="link"
                    className="p-0 align-baseline text-decoration-underline"
                    onClick={clearAssignmentFilters}
                  >
                    Clear filters
                  </CButton>
                </>
              ) : (
                'No salary assignments yet. Click "Assign Salary" to get started.'
              )}
            </div>
          ) : (
            <>
              <MobileRecordList sections={mobileAssignmentSections} variant="list-group" />
              <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-body">
                <CTable align="middle" className="mb-0" hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                        #
                      </CTableHeaderCell>
                      <CTableHeaderCell>Assignment ID</CTableHeaderCell>
                      <CTableHeaderCell>Employee</CTableHeaderCell>
                      <CTableHeaderCell>Effective</CTableHeaderCell>
                      <CTableHeaderCell>Basic</CTableHeaderCell>
                      <CTableHeaderCell>Allowance</CTableHeaderCell>
                      <CTableHeaderCell>Total Deductions</CTableHeaderCell>
                      <CTableHeaderCell>Net Payable</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>{tableRows}</CTableBody>
                </CTable>
              </div>
              <DataTableFooter
                rowsToShow={assignmentRowsToShow}
                onRowsToShowChange={setAssignmentRowsToShow}
                filteredCount={filteredAssignmentRows.length}
                totalCount={totalCount}
              />
            </>
          )}
        </CCardBody>
      </CCard>

      <div className="mt-3 d-grid gap-2">
        {isLoading ? (
          <CCard data-testid="salary-claims-management-assignment-history">
            <CCardHeader>History</CCardHeader>
            <CCardBody>
              <TableLoader />
            </CCardBody>
          </CCard>
        ) : (
          <div data-testid="salary-claims-management-assignment-history">
            <AuditHistoryPanel
              title={
                hiddenHistoryCount > 0
                  ? `History (showing 5 of ${
                      (Array.isArray(assignmentHistory) ? assignmentHistory : []).length
                    })`
                  : 'History'
              }
              entries={historyRows}
              emptyMessage="No history yet."
              formatDateTime={formatDate}
            />
          </div>
        )}
        {(Array.isArray(assignmentHistory) ? assignmentHistory : []).length > 5 && (
          <div className="d-flex justify-content-end">
            <CreateActionButton
              label={showFullHistory ? 'Collapse' : 'Expand'}
              icon={showFullHistory ? <EyeOff size={13} /> : <Eye size={13} />}
              onClick={toggleShowFullHistory}
            />
          </div>
        )}
      </div>
    </>
  )
}

export default SalarySettingsTab
