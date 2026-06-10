import React, { useMemo, useState } from 'react'
import {
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
import useTableRows from 'src/hooks/useTableRows'
import { defaultEntitlementByType, leaveTypeCatalog } from '../data'
import { getAvailableDays } from '../utils'
import AssignmentCreateModal from './AssignmentCreateModal'

const buildDraftFor = (existingAssignments, staffName, year) => {
  const yearNumber = Number(year)
  return leaveTypeCatalog.reduce((acc, leaveType) => {
    const existing = existingAssignments.find(
      (row) =>
        row.employee === staffName &&
        Number(row.year) === yearNumber &&
        row.leaveType === leaveType,
    )

    acc[leaveType] = {
      entitlement: existing
        ? Number(existing.entitlement || 0)
        : Number(defaultEntitlementByType[leaveType] || 0),
    }
    return acc
  }, {})
}

const getEmployeeKey = (row) => `${row.employee || '-'}::${row.team || '-'}`

const AssignmentsTab = ({
  assignmentSearch,
  setAssignmentSearch,
  assignmentSort,
  setAssignmentSort,
  assignmentTypeFilter,
  setAssignmentTypeFilter,
  assignmentTeamFilter,
  setAssignmentTeamFilter,
  assignmentSortOptions,
  assignmentTypeOptions,
  assignmentTeamOptions,
  filteredAssignments,
  visibleAssignmentRows,
  assignmentRowsToShow,
  setAssignmentRowsToShow,
  totalCount,
  clearAssignmentFilters,
  staffOptions,
  staffLoading,
  existingAssignments,
  assignmentHistory,
  onCreateAssignment,
  isLoading = false,
}) => {
  const currentYear = String(new Date().getFullYear())
  const [isAssigning, setIsAssigning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [selectedStaffKey, setSelectedStaffKey] = useState('')
  const [includeInactiveStaff, setIncludeInactiveStaff] = useState(false)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [draftRows, setDraftRows] = useState({})
  const [tableView, setTableView] = useState('matrix')
  const [detailRows, setDetailRows] = useState(null)

  const yearOptions = useMemo(() => {
    const year = new Date().getFullYear()
    return [year - 1, year, year + 1, year + 2]
  }, [])

  const selectedStaff = useMemo(
    () => staffOptions.find((option) => option.key === selectedStaffKey) || null,
    [selectedStaffKey, staffOptions],
  )
  const selectedStaffHistory = useMemo(
    () =>
      (assignmentHistory || []).filter(
        (entry) => String(entry.employee || '').trim() === String(selectedStaff?.name || '').trim(),
      ),
    [assignmentHistory, selectedStaff?.name],
  )
  const matrixLeaveTypes = useMemo(() => {
    if (assignmentTypeFilter !== 'All') return [assignmentTypeFilter]
    const extras = Array.from(
      new Set(
        filteredAssignments
          .map((row) => row.leaveType)
          .filter((type) => !leaveTypeCatalog.includes(type)),
      ),
    )
    return [...leaveTypeCatalog, ...extras]
  }, [assignmentTypeFilter, filteredAssignments])
  const matrixRows = useMemo(() => {
    const grouped = filteredAssignments.reduce((acc, row) => {
      const key = getEmployeeKey(row)
      const leaveType = row.leaveType || '-'
      const summary = acc.get(key) || {
        key,
        employee: row.employee || '-',
        team: row.team || '-',
        leaves: {},
        sourceRows: [],
      }

      summary.leaves[leaveType] = {
        balance: getAvailableDays(row),
        used: Number(row.used || 0),
      }
      summary.sourceRows.push(row)
      acc.set(key, summary)
      return acc
    }, new Map())

    return Array.from(grouped.values()).sort((a, b) =>
      (a.employee || '').localeCompare(b.employee || '', undefined, { sensitivity: 'base' }),
    )
  }, [filteredAssignments])
  const groupedListRows = useMemo(() => {
    const groups = []
    const indexByKey = new Map()

    visibleAssignmentRows.forEach((row) => {
      const key = getEmployeeKey(row)
      const foundIndex = indexByKey.get(key)

      if (foundIndex === undefined) {
        const nextGroup = {
          key,
          employee: row.employee || '-',
          team: row.team || '-',
          rows: [row],
        }
        indexByKey.set(key, groups.length)
        groups.push(nextGroup)
        return
      }

      groups[foundIndex].rows.push(row)
    })

    return groups
  }, [visibleAssignmentRows])
  const matrixTotalCount = useMemo(() => {
    const unique = new Set(existingAssignments.map((row) => getEmployeeKey(row)))
    return unique.size
  }, [existingAssignments])
  const {
    rowsToShow: matrixRowsToShow,
    setRowsToShow: setMatrixRowsToShow,
    visibleRows: visibleMatrixRows,
  } = useTableRows(matrixRows)

  const openAssignmentForm = () => {
    setIsAssigning(true)
    setSelectedStaffKey('')
    setIncludeInactiveStaff(false)
    setSelectedYear(currentYear)
    setDraftRows({})
  }

  const closeAssignmentForm = () => {
    setIsAssigning(false)
    setIsSaving(false)
    setSaveError(null)
    setSelectedStaffKey('')
    setIncludeInactiveStaff(false)
    setSelectedYear(currentYear)
    setDraftRows({})
  }

  const openEditAssignmentForm = (row) => {
    if (!row?.employee) return
    const nextYear = String(row.year || currentYear)
    setIsAssigning(true)
    const matchedStaff = staffOptions.find(
      (option) =>
        String(option?.name || '').trim() === String(row.employee || '').trim() &&
        String(option?.team || '').trim() === String(row.team || '').trim(),
    )
    setSelectedStaffKey(matchedStaff?.key || '')
    setIncludeInactiveStaff(Boolean(matchedStaff && matchedStaff.isActive === false))
    setSelectedYear(nextYear)
    setDraftRows(buildDraftFor(existingAssignments, row.employee, nextYear))
  }

  const openAssignmentDetail = (rows) => {
    const normalizedRows = Array.isArray(rows) ? rows : [rows].filter(Boolean)
    if (!normalizedRows.length) return
    setDetailRows(normalizedRows)
  }

  const closeAssignmentDetail = () => {
    setDetailRows(null)
  }

  const handleStaffChange = (nextStaffKey) => {
    setSelectedStaffKey(nextStaffKey)
    const selected = staffOptions.find((option) => option.key === nextStaffKey)
    const nextStaffName = selected?.name || selected?.employee || ''
    setDraftRows(buildDraftFor(existingAssignments, nextStaffName, selectedYear))
  }

  const handleYearChange = (event) => {
    const nextYear = event.target.value
    setSelectedYear(nextYear)
    if (selectedStaff?.name) {
      setDraftRows(buildDraftFor(existingAssignments, selectedStaff.name, nextYear))
    }
  }

  const updateDraft = (leaveType, key, value) => {
    const numeric = Number(value)
    setDraftRows((prev) => ({
      ...prev,
      [leaveType]: {
        ...(prev[leaveType] || { entitlement: 0 }),
        [key]: Number.isNaN(numeric) ? 0 : numeric,
      },
    }))
  }

  const handleSubmitAssignment = async () => {
    if (!selectedStaff || isSaving) return

    const entries = leaveTypeCatalog.map((leaveType) => {
      const row = draftRows[leaveType] || { entitlement: 0 }
      return {
        leaveType,
        entitlement: Number(row.entitlement || 0),
      }
    })

    setIsSaving(true)
    setSaveError(null)
    const result = await onCreateAssignment({
      staff: selectedStaff,
      year: Number(selectedYear),
      entries,
    })
    setIsSaving(false)

    if (result?.ok) {
      closeAssignmentForm()
    } else {
      setSaveError(result?.error || 'Unable to save assignments. Please retry.')
    }
  }

  const detailPrimaryRow = detailRows?.[0] || null

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
        <span>Set Leaves</span>
        <CreateActionButton label="Assign entitlement" onClick={openAssignmentForm} />
      </CCardHeader>
      <CCardBody>
        <AssignmentCreateModal
          visible={isAssigning}
          onClose={closeAssignmentForm}
          staffOptions={staffOptions}
          staffLoading={staffLoading}
          selectedStaff={selectedStaff}
          selectedStaffKey={selectedStaffKey}
          onStaffChange={handleStaffChange}
          includeInactiveStaff={includeInactiveStaff}
          onIncludeInactiveChange={setIncludeInactiveStaff}
          yearOptions={yearOptions}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          draftRows={draftRows}
          onUpdateDraft={updateDraft}
          assignmentHistory={selectedStaffHistory}
          onSave={handleSubmitAssignment}
          isSaving={isSaving}
          saveError={saveError}
        />
        <CModal visible={Boolean(detailRows)} alignment="center" onClose={closeAssignmentDetail}>
          <CModalHeader onClose={closeAssignmentDetail}>
            <CModalTitle>Leave Assignment Details</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {detailPrimaryRow ? (
              <div className="d-grid gap-3">
                <div>
                  <div className="fw-semibold">{detailPrimaryRow.employee || '-'}</div>
                  <div className="text-body-secondary">
                    {detailPrimaryRow.team || '-'} - {detailPrimaryRow.year || '-'}
                  </div>
                </div>
                <div className="rounded-3 border overflow-hidden">
                  <CTable align="middle" className="mb-0" responsive>
                    <CTableHead color="light">
                      <CTableRow>
                        <CTableHeaderCell>Leave Type</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Entitlement</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Used</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Pending</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Available</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {detailRows.map((row) => (
                        <CTableRow key={row.id}>
                          <CTableDataCell>{row.leaveType || '-'}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            {row.entitlement ?? '-'}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">{row.used ?? '-'}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            {row.pending ?? '-'}
                          </CTableDataCell>
                          <CTableDataCell className="text-center fw-semibold">
                            {getAvailableDays(row)}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              </div>
            ) : null}
          </CModalBody>
          <CModalFooter>
            <CButton color="light" onClick={closeAssignmentDetail}>
              Close
            </CButton>
          </CModalFooter>
        </CModal>

        <TableFilters
          searchValue={assignmentSearch}
          onSearchChange={setAssignmentSearch}
          searchPlaceholder="Search assignment ID, employee, leave type, or team"
          showPeriod={false}
          filters={[
            {
              key: 'sort',
              value: assignmentSort,
              onChange: setAssignmentSort,
              options: assignmentSortOptions,
            },
            {
              key: 'type',
              value: assignmentTypeFilter,
              onChange: setAssignmentTypeFilter,
              options: assignmentTypeOptions,
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
        {isLoading ? (
          <TableLoader />
        ) : filteredAssignments.length === 0 ? (
          <div className="text-body-secondary">
            No entitlement assignments match the current filters.
          </div>
        ) : (
          <>
            <div className="d-flex justify-content-end mb-3">
              <CButtonGroup size="sm" role="group" aria-label="Assignments table view">
                <CButton
                  color={tableView === 'matrix' ? 'primary' : 'light'}
                  onClick={() => setTableView('matrix')}
                >
                  Matrix
                </CButton>
                <CButton
                  color={tableView === 'list' ? 'primary' : 'light'}
                  onClick={() => setTableView('list')}
                >
                  List
                </CButton>
              </CButtonGroup>
            </div>
            <div className="rounded-3 shadow-sm overflow-hidden bg-white">
              {tableView === 'matrix' ? (
                <CTable align="middle" className="mb-0" hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell rowSpan={2} className="align-middle text-start">
                        Employee
                      </CTableHeaderCell>
                      <CTableHeaderCell rowSpan={2} className="align-middle text-center">
                        Team
                      </CTableHeaderCell>
                      {matrixLeaveTypes.map((leaveType) => (
                        <CTableHeaderCell
                          key={`head-${leaveType}`}
                          colSpan={2}
                          className="text-start"
                        >
                          {leaveType}
                        </CTableHeaderCell>
                      ))}
                      <CTableHeaderCell rowSpan={2} className="text-center align-middle">
                        Action
                      </CTableHeaderCell>
                    </CTableRow>
                    <CTableRow>
                      {matrixLeaveTypes.flatMap((leaveType) => [
                        <CTableHeaderCell key={`${leaveType}-bal`} className="text-center">
                          Bal.
                        </CTableHeaderCell>,
                        <CTableHeaderCell key={`${leaveType}-used`} className="text-center">
                          Used
                        </CTableHeaderCell>,
                      ])}
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {visibleMatrixRows.map((employeeRow) => {
                      const sortedSourceRows = [...employeeRow.sourceRows].sort((a, b) => {
                        if (assignmentTypeFilter !== 'All') {
                          if (a.leaveType === assignmentTypeFilter) return -1
                          if (b.leaveType === assignmentTypeFilter) return 1
                        }
                        const ai = leaveTypeCatalog.indexOf(a.leaveType)
                        const bi = leaveTypeCatalog.indexOf(b.leaveType)
                        return (
                          (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) -
                          (bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
                        )
                      })
                      const primaryRow = sortedSourceRows[0]

                      return (
                        <CTableRow
                          key={employeeRow.key}
                          className="cursor-pointer"
                          onClick={() => openAssignmentDetail(sortedSourceRows)}
                        >
                          <CTableDataCell className="fw-semibold text-start">
                            {employeeRow.employee}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {employeeRow.team}
                          </CTableDataCell>
                          {matrixLeaveTypes.flatMap((leaveType) => {
                            const stats = employeeRow.leaves[leaveType]
                            return [
                              <CTableDataCell
                                key={`${employeeRow.key}-${leaveType}-bal`}
                                className="text-center"
                              >
                                {stats ? stats.balance : '-'}
                              </CTableDataCell>,
                              <CTableDataCell
                                key={`${employeeRow.key}-${leaveType}-used`}
                                className="text-center"
                              >
                                {stats ? stats.used : '-'}
                              </CTableDataCell>,
                            ]
                          })}
                          <CTableDataCell className="text-center">
                            <RowActions
                              items={[
                                {
                                  key: 'edit',
                                  label: 'Edit',
                                  onClick: () => openEditAssignmentForm(primaryRow),
                                },
                              ]}
                            />
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              ) : (
                <CTable align="middle" className="mb-0" hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell className="text-start">Leave Type</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Entitlement</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Used</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Pending</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Available</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {groupedListRows.flatMap((group) => [
                      <CTableRow key={`${group.key}-divider`} className="table-light">
                        <CTableDataCell
                          colSpan={6}
                          className="fw-semibold text-body-secondary text-start"
                        >
                          {group.employee} ({group.team})
                        </CTableDataCell>
                      </CTableRow>,
                      ...group.rows.map((row) => (
                        <CTableRow
                          key={row.id}
                          className="cursor-pointer"
                          onClick={() => openAssignmentDetail(row)}
                        >
                          <CTableDataCell className="text-start">{row.leaveType}</CTableDataCell>
                          <CTableDataCell className="text-center">{row.entitlement}</CTableDataCell>
                          <CTableDataCell className="text-center">{row.used}</CTableDataCell>
                          <CTableDataCell className="text-center">{row.pending}</CTableDataCell>
                          <CTableDataCell className="text-center fw-semibold">
                            {getAvailableDays(row)}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <RowActions
                              items={[
                                {
                                  key: 'edit',
                                  label: 'Edit',
                                  onClick: () => openEditAssignmentForm(row),
                                },
                              ]}
                            />
                          </CTableDataCell>
                        </CTableRow>
                      )),
                    ])}
                  </CTableBody>
                </CTable>
              )}
            </div>
            <DataTableFooter
              rowsToShow={tableView === 'matrix' ? matrixRowsToShow : assignmentRowsToShow}
              onRowsToShowChange={
                tableView === 'matrix' ? setMatrixRowsToShow : setAssignmentRowsToShow
              }
              filteredCount={
                tableView === 'matrix' ? matrixRows.length : filteredAssignments.length
              }
              totalCount={tableView === 'matrix' ? matrixTotalCount : totalCount}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default AssignmentsTab
