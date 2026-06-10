import React from 'react'
import {
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
import ApprovalGates from 'src/components/ApprovalGates'
import DataTableFooter from 'src/components/DataTableFooter'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
import { getDateRangeLabel, formatDate } from '../utils'

const resolveLeaveGates = (row) => {
  const requireRecommendation = row?.workflowSnapshot?.requireRecommendation !== false
  return [
    { action: 'Reviewed', label: 'Reviewed' },
    ...(requireRecommendation ? [{ action: 'Recommended', label: 'Recommended' }] : []),
    { action: 'Approved', label: 'Approved' },
  ]
}

const RecordsTab = ({
  search,
  setSearch,
  period,
  setPeriod,
  sort,
  setSort,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  typeOptions,
  statusOptions,
  leaveSortOptions,
  filteredRecords,
  visibleRows,
  rowsToShow,
  setRowsToShow,
  totalCount,
  statusColorMap,
  clearFilters,
  openRecord,
  copyLeaveId,
  downloadAttachment,
  isLoading = false,
}) => {
  return (
    <CCard>
      <CCardHeader>All Leaves</CCardHeader>
      <CCardBody>
        <TableFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search leave ID, employee, leave type, status, or team"
          periodValue={period}
          onPeriodChange={setPeriod}
          filters={[
            {
              key: 'sort',
              value: sort,
              onChange: setSort,
              options: leaveSortOptions,
            },
            {
              key: 'type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: typeOptions,
            },
            {
              key: 'status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: statusOptions,
            },
          ]}
          onClear={clearFilters}
          rowClassName="flex-md-nowrap"
          searchColMd={3}
          periodColMd={2}
          filterColMd={2}
          clearColMd="auto"
        />

        {isLoading ? (
          <TableLoader />
        ) : filteredRecords.length === 0 ? (
          <div className="text-body-secondary">No leave records match the current filters.</div>
        ) : (
          <>
            <div className="rounded-3 shadow-sm overflow-hidden bg-white">
              <CTable align="middle" className="mb-0" hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Leave ID</CTableHeaderCell>
                    <CTableHeaderCell>Employee</CTableHeaderCell>
                    <CTableHeaderCell>Team</CTableHeaderCell>
                    <CTableHeaderCell>Leave Type</CTableHeaderCell>
                    <CTableHeaderCell>Period</CTableHeaderCell>
                    <CTableHeaderCell>Days</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Applied On</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {visibleRows.map((row) => (
                    <CTableRow key={row.id}>
                      <CTableDataCell className="fw-semibold">{row.id}</CTableDataCell>
                      <CTableDataCell>{row.employee || '-'}</CTableDataCell>
                      <CTableDataCell>{row.team || '-'}</CTableDataCell>
                      <CTableDataCell>{row.leaveType}</CTableDataCell>
                      <CTableDataCell>{getDateRangeLabel(row)}</CTableDataCell>
                      <CTableDataCell>{row.days}</CTableDataCell>
                      <CTableDataCell>
                        <ApprovalGates
                          gates={resolveLeaveGates(row)}
                          approvalHistory={row.approvalHistory}
                          isCancelled={row.status === 'Cancelled'}
                        />
                      </CTableDataCell>
                      <CTableDataCell>{formatDate(row.appliedAt)}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        <div className="d-flex justify-content-end gap-2 flex-wrap">
                          <CButton color="light" size="sm" onClick={() => openRecord(row)}>
                            View
                          </CButton>
                          <CButton color="light" size="sm" onClick={() => copyLeaveId(row)}>
                            Copy ID
                          </CButton>
                          <CButton
                            color="light"
                            size="sm"
                            onClick={() => downloadAttachment(row)}
                            disabled={!row.attachmentAvailable}
                          >
                            Attachment
                          </CButton>
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
            <DataTableFooter
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              filteredCount={filteredRecords.length}
              totalCount={totalCount}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default RecordsTab
