import React, { Fragment, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
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
import { useNavigate } from 'react-router-dom'
import ApprovalGates from 'src/components/ApprovalGates'
import RowActions from 'src/components/RowActions'
import TableLoader from 'src/components/TableLoader'

const formatContributionList = (contributions = {}, formatCurrency) => {
  const entries = Object.entries(contributions || {}).filter(([, amount]) => Number(amount) !== 0)
  if (!entries.length) return '-'
  return entries
    .map(([key, amount]) => `${key}: ${formatCurrency(Number(amount) || 0)}`)
    .join(' | ')
}

const formatAllowanceList = (allowanceItems = [], formatCurrency) => {
  if (!Array.isArray(allowanceItems) || allowanceItems.length === 0) return '-'
  return allowanceItems
    .map((entry) => `${entry.label || entry.key}: ${formatCurrency(Number(entry.amount) || 0)}`)
    .join(' | ')
}

const formatBaselineSource = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  if (normalized === 'hybrid') return 'Claim Snapshot + Salary Record'
  if (normalized === 'claim_snapshot') return 'Claim Snapshot'
  if (normalized === 'salary_record') return 'Salary Record'
  return 'Unavailable'
}

const toContributionPairs = (employee = {}, employer = {}) => {
  const keys = Array.from(
    new Set([
      ...Object.keys(employee || {}).map((key) =>
        String(key || '')
          .trim()
          .toLowerCase(),
      ),
      ...Object.keys(employer || {}).map((key) =>
        String(key || '')
          .trim()
          .toLowerCase(),
      ),
    ]),
  ).filter(Boolean)
  return keys.map((key) => {
    const employeeAmount = Number(employee?.[key] || 0) || 0
    const employerAmount = Number(employer?.[key] || 0) || 0
    return {
      key,
      label: key.toUpperCase(),
      employeeAmount,
      employerAmount,
    }
  })
}

const formatAdjustmentItems = (rows = [], formatCurrency) =>
  rows.length > 0
    ? rows
        .map((entry) => {
          const amountLabel = formatCurrency(Number(entry?.signedAmount || 0))
          const label = String(
            entry?.title || entry?.itemType || `Line ${entry?.lineNo || '-'}`,
          ).trim()
          return `${label}: ${amountLabel}`
        })
        .join(' | ')
    : '-'

const toIdentifier = (row = {}, index = 0) =>
  String(row.id || row.payslipId || row.reference || `payslip-${index}`).trim() ||
  `payslip-${index}`

const hasDetailData = (row = {}) =>
  Boolean(
    row?.salaryRecord ||
      (Array.isArray(row?.adjustments) && row.adjustments.length > 0) ||
      (Array.isArray(row?.overtime?.rows) && row.overtime.rows.length > 0) ||
      row?.baselineSource,
  )

const resolvePaymentDateLabel = (row = {}) => {
  const status = String(row?.status || '').trim()
  const paymentDate = String(row?.paymentDate || '').trim()
  if (status === 'Paid') return paymentDate || '-'
  if (status === 'Approved' && !paymentDate) return 'Pending payment'
  return paymentDate || '-'
}

const PAYROLL_GATES = [
  { action: 'Checked', label: 'Checked' },
  { action: 'Reviewed', label: 'Reviewed' },
  { action: 'Approved', label: 'Approved' },
]

const PayslipsSection = ({
  rows = [],
  isLoading = false,
  errorMessage = '',
  onDownloadPayslip = () => {},
  formatCurrency = (value) => String(value || 0),
}) => {
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState('')
  const [downloadNoticeRow, setDownloadNoticeRow] = useState(null)
  const rowIds = useMemo(() => rows.map((row, index) => toIdentifier(row, index)), [rows])

  const toggleDetails = (nextId) => {
    setExpandedId((prev) => (prev === nextId ? '' : nextId))
  }

  const handleDownloadAction = (row) => {
    const payslipId = Number(row?.payslipId || row?.id || 0) || 0
    if (!payslipId) return
    if (row?.downloadable) {
      onDownloadPayslip(row)
      return
    }
    setDownloadNoticeRow(row)
  }

  const missingFieldLabelByKey = {
    name: 'Name',
    ic_number: 'IC number',
    email: 'Email',
    phone: 'Contact number',
    role: 'Role',
    epf_number: 'EPF number',
  }
  const missingFields = Array.isArray(downloadNoticeRow?.employeeProfileMissingFields)
    ? downloadNoticeRow.employeeProfileMissingFields
    : []
  const isProfileIncomplete =
    missingFields.length > 0 ||
    String(downloadNoticeRow?.downloadReason || '').includes('Personal information missing:')
  const missingFieldsLabel =
    missingFields.length > 0
      ? missingFields.map((key) => missingFieldLabelByKey[key] || String(key)).join(', ')
      : ''

  return (
    <CCard>
      <CCardHeader>Payslips</CCardHeader>
      <CCardBody>
        {errorMessage && (
          <CAlert color="danger" className="mb-3">
            {errorMessage}
          </CAlert>
        )}
        <p className="text-body-secondary">
          Payslip details are composed from approved payroll claims and salary assignment records.
        </p>
        <div className="rounded-3 shadow-sm overflow-hidden bg-white">
          <CTable align="middle" className="mb-0" hover responsive>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                  #
                </CTableHeaderCell>
                <CTableHeaderCell>Month</CTableHeaderCell>
                <CTableHeaderCell>Reference</CTableHeaderCell>
                <CTableHeaderCell>Baseline Net</CTableHeaderCell>
                <CTableHeaderCell>Adjustments</CTableHeaderCell>
                <CTableHeaderCell>OT Payout</CTableHeaderCell>
                <CTableHeaderCell>Net Payable</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {isLoading ? (
                <CTableRow>
                  <CTableDataCell colSpan={9}>
                    <TableLoader />
                  </CTableDataCell>
                </CTableRow>
              ) : rows.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={9} className="text-center text-muted py-4">
                    No payslips available yet.
                  </CTableDataCell>
                </CTableRow>
              ) : (
                rows.map((row, index) => {
                  const rowId = rowIds[index]
                  const detailVisible = expandedId === rowId
                  const detailAvailable = hasDetailData(row)
                  const salaryRecord = row?.salaryRecord || null
                  const adjustmentRows = Array.isArray(row?.adjustments) ? row.adjustments : []
                  const overtimeRows = Array.isArray(row?.overtime?.rows) ? row.overtime.rows : []
                  const employeeContributions =
                    row?.baseline?.employeeContributions ||
                    salaryRecord?.employeeContributions ||
                    {}
                  const employerContributions =
                    row?.baseline?.employerContributions ||
                    salaryRecord?.employerContributions ||
                    {}
                  const contributionPairs = toContributionPairs(
                    employeeContributions,
                    employerContributions,
                  )
                  const employerContributionTotal = contributionPairs.reduce(
                    (sum, entry) => sum + (Number(entry?.employerAmount || 0) || 0),
                    0,
                  )
                  const deductionItems = Array.isArray(row?.baseline?.deductionItems)
                    ? row.baseline.deductionItems
                    : []
                  const approvalHistory = Array.isArray(row?.approvalHistory)
                    ? row.approvalHistory
                    : []

                  return (
                    <Fragment key={rowId}>
                      <CTableRow
                        role="button"
                        tabIndex={detailAvailable ? 0 : -1}
                        className={detailAvailable ? 'cursor-pointer' : ''}
                        style={detailAvailable ? { cursor: 'pointer' } : undefined}
                        onClick={() => {
                          if (!detailAvailable) return
                          toggleDetails(rowId)
                        }}
                        onKeyDown={(event) => {
                          if (!detailAvailable) return
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            toggleDetails(rowId)
                          }
                        }}
                      >
                        <CTableDataCell className="text-center text-muted">
                          {index + 1}
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="fw-semibold">{row.month}</div>
                          <div className="small text-body-secondary">
                            Payment date: {resolvePaymentDateLabel(row)}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="fw-semibold">
                          {row.reference || '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          {formatCurrency(row.baselineNetSalary ?? 0)}
                        </CTableDataCell>
                        <CTableDataCell>{formatCurrency(row.adjustmentsTotal ?? 0)}</CTableDataCell>
                        <CTableDataCell>
                          {formatCurrency(row.approvedOvertimePayout ?? 0)}
                        </CTableDataCell>
                        <CTableDataCell className="fw-semibold">
                          {formatCurrency(row.netPayable ?? 0)}
                        </CTableDataCell>
                        <CTableDataCell>
                          {approvalHistory.length > 0 ? (
                            <ApprovalGates
                              gates={PAYROLL_GATES}
                              approvalHistory={approvalHistory}
                              isCancelled={row.status === 'Cancelled'}
                            />
                          ) : (
                            <span className="small text-body-secondary">{row.status || '-'}</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell
                          className="text-center align-middle"
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <RowActions
                            items={[
                              {
                                key: 'download-payslip',
                                label: 'Download payslip',
                                onClick: () => handleDownloadAction(row),
                                disabled: !row.payslipId,
                              },
                            ]}
                          />
                        </CTableDataCell>
                      </CTableRow>
                      {detailVisible && (
                        <CTableRow>
                          <CTableDataCell colSpan={9} className="bg-body-tertiary p-3">
                            <div className="rounded-3 shadow-sm overflow-hidden bg-white border">
                              <div className="row g-3 p-3">
                                <div className="col-12 col-lg-6">
                                  <div className="rounded-3 shadow-sm overflow-hidden bg-white border h-100">
                                    <CTable align="middle" className="mb-0" responsive>
                                      <CTableBody>
                                        <CTableRow
                                          className="table-secondary"
                                          style={{
                                            background:
                                              'linear-gradient(90deg, rgba(228, 236, 244, 0.7) 0%, rgba(228, 236, 244, 0.35) 100%)',
                                          }}
                                        >
                                          <CTableDataCell
                                            colSpan={2}
                                            className="fw-semibold text-body"
                                          >
                                            Net Pay Summary
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Baseline net
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(row.baselineNetSalary ?? 0)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Total adjustments
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(row.adjustmentsTotal ?? 0)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            OT payout
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(row.approvedOvertimePayout ?? 0)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow className="table-light">
                                          <CTableDataCell className="text-body-secondary small fw-semibold">
                                            Net payable
                                          </CTableDataCell>
                                          <CTableDataCell className="fw-semibold">
                                            {formatCurrency(row.netPayable ?? 0)}
                                          </CTableDataCell>
                                        </CTableRow>
                                      </CTableBody>
                                    </CTable>
                                  </div>
                                </div>

                                <div className="col-12 col-lg-6">
                                  <div className="rounded-3 shadow-sm overflow-hidden bg-white border h-100">
                                    <CTable align="middle" className="mb-0" responsive>
                                      <CTableBody>
                                        <CTableRow
                                          className="table-secondary"
                                          style={{
                                            background:
                                              'linear-gradient(90deg, rgba(228, 236, 244, 0.7) 0%, rgba(228, 236, 244, 0.35) 100%)',
                                          }}
                                        >
                                          <CTableDataCell
                                            colSpan={3}
                                            className="fw-semibold text-body"
                                          >
                                            Deductions & Contributions
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow className="table-light">
                                          <CTableHeaderCell className="small text-body-secondary">
                                            Item
                                          </CTableHeaderCell>
                                          <CTableHeaderCell className="small text-end text-body-secondary">
                                            Employee
                                          </CTableHeaderCell>
                                          <CTableHeaderCell className="small text-end text-body-secondary">
                                            Employer
                                          </CTableHeaderCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Total deductions
                                          </CTableDataCell>
                                          <CTableDataCell className="text-end">
                                            {formatCurrency(
                                              row?.baseline?.employeeDeductionsTotal ?? 0,
                                            )}
                                          </CTableDataCell>
                                          <CTableDataCell className="text-end">
                                            {formatCurrency(employerContributionTotal)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        {contributionPairs.length > 0 ? (
                                          contributionPairs.map((entry) => (
                                            <CTableRow key={entry.key}>
                                              <CTableDataCell className="text-body-secondary small">
                                                {entry.label}
                                              </CTableDataCell>
                                              <CTableDataCell className="text-end">
                                                {formatCurrency(entry.employeeAmount)}
                                              </CTableDataCell>
                                              <CTableDataCell className="text-end">
                                                {formatCurrency(entry.employerAmount)}
                                              </CTableDataCell>
                                            </CTableRow>
                                          ))
                                        ) : (
                                          <CTableRow>
                                            <CTableDataCell
                                              colSpan={3}
                                              className="text-center text-body-secondary small"
                                            >
                                              No contribution data.
                                            </CTableDataCell>
                                          </CTableRow>
                                        )}
                                      </CTableBody>
                                    </CTable>
                                  </div>
                                </div>
                              </div>

                              <details className="px-3 pb-3 mt-1">
                                <summary
                                  className="small text-primary fw-semibold"
                                  style={{ cursor: 'pointer' }}
                                >
                                  Show full breakdown
                                </summary>
                                <div className="pt-2">
                                  <div className="rounded-3 shadow-sm overflow-hidden bg-white border">
                                    <CTable align="middle" className="mb-0" responsive>
                                      <CTableBody>
                                        <CTableRow
                                          className="table-secondary"
                                          style={{
                                            background:
                                              'linear-gradient(90deg, rgba(228, 236, 244, 0.7) 0%, rgba(228, 236, 244, 0.35) 100%)',
                                          }}
                                        >
                                          <CTableDataCell
                                            colSpan={2}
                                            className="fw-semibold text-body"
                                          >
                                            Additional Details
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Baseline source
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatBaselineSource(row.baselineSource)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Salary record
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {salaryRecord
                                              ? `${salaryRecord.referenceId || '-'} | Effective ${salaryRecord.effectiveFrom || '-'} | ${salaryRecord.status || '-'}`
                                              : 'No salary record linked'}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Payment date
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {resolvePaymentDateLabel(row)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Basic salary
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(
                                              row?.baseline?.basicSalary ??
                                                salaryRecord?.basicSalary ??
                                                0,
                                            )}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Total allowances
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(
                                              row?.baseline?.allowanceTotal ??
                                                salaryRecord?.allowanceTotal ??
                                                0,
                                            )}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Allowance breakdown
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatAllowanceList(
                                              row?.baseline?.allowanceItems ||
                                                salaryRecord?.allowanceItems ||
                                                [],
                                              formatCurrency,
                                            )}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Deduction items
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {deductionItems.length > 0
                                              ? deductionItems
                                                  .map((entry) => {
                                                    const label = String(
                                                      entry?.label || entry?.key || 'Deduction',
                                                    ).trim()
                                                    return `${label}: ${formatCurrency(entry?.amount || 0)}`
                                                  })
                                                  .join(' | ')
                                              : '-'}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Adjustment items
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatAdjustmentItems(adjustmentRows, formatCurrency)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Overtime rows
                                          </CTableDataCell>
                                          <CTableDataCell>{overtimeRows.length}</CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Approved hours
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {Number(row?.overtime?.approvedHours ?? 0).toFixed(2)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Approved payout
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(row?.overtime?.approvedPayout ?? 0)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Employee contributions
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatContributionList(
                                              employeeContributions,
                                              formatCurrency,
                                            )}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Employer contributions
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatContributionList(
                                              employerContributions,
                                              formatCurrency,
                                            )}
                                          </CTableDataCell>
                                        </CTableRow>
                                      </CTableBody>
                                    </CTable>
                                  </div>
                                </div>
                              </details>
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </Fragment>
                  )
                })
              )}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
      <CModal
        visible={Boolean(downloadNoticeRow)}
        onClose={() => setDownloadNoticeRow(null)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Download unavailable</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="text-body-secondary">
            {downloadNoticeRow?.downloadReason ||
              'Payslip download is currently unavailable for this record.'}
          </div>
          {isProfileIncomplete ? (
            <div className="mt-2">
              {missingFieldsLabel
                ? `Missing profile fields: ${missingFieldsLabel}.`
                : 'Please complete your profile before downloading the payslip.'}
            </div>
          ) : null}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setDownloadNoticeRow(null)}>
            Close
          </CButton>
          {isProfileIncomplete ? (
            <CButton
              color="primary"
              onClick={() => {
                setDownloadNoticeRow(null)
                navigate('/profile')
              }}
            >
              Complete Profile
            </CButton>
          ) : null}
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

export default PayslipsSection
