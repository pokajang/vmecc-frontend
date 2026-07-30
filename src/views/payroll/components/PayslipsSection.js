import React, { Fragment, useMemo, useState } from 'react'
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
import { useNavigate } from 'react-router-dom'
import ApprovalGates from 'src/components/ApprovalGates'
import MobileRecordList from 'src/components/MobileRecordList'
import RowActions from 'src/components/RowActions'
import TableLoader from 'src/components/TableLoader'
import ResponsiveWorkflowActionDialog from 'src/components/workflow/ResponsiveWorkflowActionDialog'
import {
  buildPayrollBreakdown,
  formatAdjustmentItems,
  formatAllowanceList,
  formatContributionList,
} from './payrollBreakdownViewModel'

const toIdentifier = (row = {}, index = 0) =>
  String(row.id || row.payslipId || row.reference || `payslip-${index}`).trim() ||
  `payslip-${index}`

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
  const firstDownloadableRowId = String(
    rows.find((row) => row?.payslipId || row?.id)?.payslipId ||
      rows.find((row) => row?.payslipId || row?.id)?.id ||
      '',
  ).trim()

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

  const renderDownloadActions = (row) => (
    <RowActions
      testId={
        firstDownloadableRowId === String(row?.payslipId || row?.id || '').trim()
          ? 'payroll-payslip-download-action'
          : ''
      }
      items={[
        {
          key: 'download-payslip',
          label: 'Download payslip',
          onClick: () => handleDownloadAction(row),
          disabled: !row.payslipId,
        },
      ]}
    />
  )

  const renderApprovalStatus = (row, approvalHistory) =>
    approvalHistory.length > 0 ? (
      <ApprovalGates
        gates={PAYROLL_GATES}
        approvalHistory={approvalHistory}
        isCancelled={row.status === 'Cancelled'}
      />
    ) : (
      <span className="small text-body-secondary">{row.status || '-'}</span>
    )

  const renderMobileDetailSection = (title, rows) => (
    <section className="border rounded-3 bg-body p-3">
      <div className="fw-semibold small text-body mb-2">{title}</div>
      <div className="d-grid gap-2">
        {rows.map((item) => (
          <div
            key={item.label}
            className="d-flex justify-content-between gap-3 small"
            style={{ overflowWrap: 'anywhere' }}
          >
            <span className="text-body-secondary">{item.label}</span>
            <span className="fw-semibold text-end">{item.value ?? '-'}</span>
          </div>
        ))}
      </div>
    </section>
  )

  const renderMobileDetails = (breakdown) => {
    const { summary, baseline, contributions, adjustments, overtime, status } = breakdown

    return (
      <div className="d-grid gap-2 mt-3">
        {renderMobileDetailSection('Net Pay Summary', [
          { label: 'Baseline net', value: formatCurrency(summary.baselineNet) },
          { label: 'Total adjustments', value: formatCurrency(summary.adjustmentsTotal) },
          { label: 'OT payout', value: formatCurrency(summary.approvedOvertimePayout) },
          { label: 'Net payable', value: formatCurrency(summary.finalPayable) },
        ])}

        {renderMobileDetailSection('Deductions & Contributions', [
          {
            label: 'Total deductions',
            value: formatCurrency(summary.baselineTotalDeductions),
          },
          {
            label: 'Employer total',
            value: formatCurrency(contributions.employerContributionTotal),
          },
          {
            label: 'Employee contributions',
            value: formatContributionList(contributions.employeeContributions, formatCurrency),
          },
          {
            label: 'Employer contributions',
            value: formatContributionList(contributions.employerContributions, formatCurrency),
          },
          ...contributions.contributionPairs.map((entry) => ({
            label: entry.label,
            value: `${formatCurrency(entry.employeeAmount)} / ${formatCurrency(
              entry.employerAmount,
            )}`,
          })),
        ])}

        {renderMobileDetailSection('Salary Baseline', [
          { label: 'Baseline source', value: baseline.sourceLabel },
          {
            label: 'Salary record',
            value: baseline.salaryRecord
              ? `${baseline.salaryRecord.referenceId || '-'} | Effective ${
                  baseline.salaryRecord.effectiveFrom || '-'
                } | ${baseline.salaryRecord.status || '-'}`
              : 'No salary record linked',
          },
          { label: 'Payment date', value: status.paymentDateLabel },
          {
            label: 'Basic salary',
            value: formatCurrency(summary.basicSalary),
          },
          {
            label: 'Total allowances',
            value: formatCurrency(baseline.allowanceTotal),
          },
          {
            label: 'Allowance breakdown',
            value: formatAllowanceList(baseline.allowanceItems, formatCurrency),
          },
          {
            label: 'Deduction items',
            value:
              baseline.deductionItems.length > 0
                ? baseline.deductionItems
                    .map((entry) => {
                      const label = String(entry?.label || entry?.key || 'Deduction').trim()
                      return `${label}: ${formatCurrency(entry?.amount || 0)}`
                    })
                    .join(' | ')
                : '-',
          },
        ])}

        {renderMobileDetailSection('Overtime Records', [
          { label: 'Overtime rows', value: overtime.rows.length },
          {
            label: 'Approved hours',
            value: Number(overtime.approvedHours).toFixed(2),
          },
          {
            label: 'Approved payout',
            value: formatCurrency(overtime.approvedPayout),
          },
        ])}

        {renderMobileDetailSection('Adjustment Items', [
          {
            label: 'Adjustment items',
            value: formatAdjustmentItems(adjustments.rows, formatCurrency),
          },
        ])}
      </div>
    )
  }

  const mobilePayslipSections = [
    {
      key: 'payslips',
      items: rows.map((row, index) => {
        const rowId = rowIds[index]
        const detailVisible = expandedId === rowId
        const breakdown = buildPayrollBreakdown(row, { sourceType: 'payslip' })
        const detailAvailable = breakdown.hasDetails

        return {
          key: rowId,
          title: row.month || '-',
          eyebrow: `Payment date: ${breakdown.status.paymentDateLabel}`,
          subtitle: row.reference || '-',
          status: renderApprovalStatus(row, breakdown.status.approvalHistory),
          fields: [
            {
              key: 'baseline',
              label: 'Baseline net',
              value: formatCurrency(breakdown.summary.baselineNet),
            },
            {
              key: 'adjustments',
              label: 'Adjustments',
              value: formatCurrency(breakdown.summary.adjustmentsTotal),
            },
            {
              key: 'overtime',
              label: 'OT payout',
              value: formatCurrency(breakdown.summary.approvedOvertimePayout),
            },
            {
              key: 'payable',
              label: 'Net payable',
              value: formatCurrency(breakdown.summary.finalPayable),
            },
          ],
          expanded: detailVisible,
          onToggle: detailAvailable ? () => toggleDetails(rowId) : undefined,
          ariaLabel: `Toggle payslip details for ${row.reference || row.month || rowId}`,
          expandedContent: detailVisible ? renderMobileDetails(breakdown) : null,
          actions: renderDownloadActions(row),
        }
      }),
    },
  ]

  return (
    <CCard data-testid="payroll-payslips">
      <CCardHeader>Payslips</CCardHeader>
      <CCardBody>
        {errorMessage && (
          <CAlert color="danger" className="mb-3">
            {errorMessage}
          </CAlert>
        )}
        <p className="text-body-secondary">
          Payslips include approved payroll claims and salary assignments.
        </p>
        <div className="d-md-none d-grid gap-3">
          {isLoading ? (
            <div className="border rounded-3 bg-body p-3">
              <TableLoader />
            </div>
          ) : rows.length === 0 ? (
            <div className="border rounded-3 bg-body p-4 text-center text-body-secondary">
              No payslips available yet.
            </div>
          ) : (
            <MobileRecordList sections={mobilePayslipSections} variant="list-group" />
          )}
        </div>
        <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-body">
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
                <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
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
                  const breakdown = buildPayrollBreakdown(row, { sourceType: 'payslip' })
                  const detailAvailable = breakdown.hasDetails

                  return (
                    <Fragment key={rowId}>
                      <CTableRow
                        role={detailAvailable ? 'button' : undefined}
                        tabIndex={detailAvailable ? 0 : -1}
                        aria-label={
                          detailAvailable
                            ? `${detailVisible ? 'Collapse' : 'Expand'} payslip details for ${row.month}`
                            : undefined
                        }
                        aria-expanded={detailAvailable ? detailVisible : undefined}
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
                            Payment date: {breakdown.status.paymentDateLabel}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="fw-semibold">
                          {row.reference || '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          {formatCurrency(breakdown.summary.baselineNet)}
                        </CTableDataCell>
                        <CTableDataCell>
                          {formatCurrency(breakdown.summary.adjustmentsTotal)}
                        </CTableDataCell>
                        <CTableDataCell>
                          {formatCurrency(breakdown.summary.approvedOvertimePayout)}
                        </CTableDataCell>
                        <CTableDataCell className="fw-semibold">
                          {formatCurrency(breakdown.summary.finalPayable)}
                        </CTableDataCell>
                        <CTableDataCell>
                          {breakdown.status.approvalHistory.length > 0 ? (
                            <ApprovalGates
                              gates={PAYROLL_GATES}
                              approvalHistory={breakdown.status.approvalHistory}
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
                            testId={
                              firstDownloadableRowId ===
                              String(row?.payslipId || row?.id || '').trim()
                                ? 'payroll-payslip-download-action'
                                : ''
                            }
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
                            <div className="rounded-3 shadow-sm overflow-hidden bg-body border">
                              <div className="row g-3 p-3">
                                <div className="col-12 col-lg-6">
                                  <div className="rounded-3 shadow-sm overflow-hidden bg-body border h-100">
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
                                            {formatCurrency(breakdown.summary.baselineNet)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Total adjustments
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(breakdown.summary.adjustmentsTotal)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            OT payout
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(
                                              breakdown.summary.approvedOvertimePayout,
                                            )}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow className="table-light">
                                          <CTableDataCell className="text-body-secondary small fw-semibold">
                                            Net payable
                                          </CTableDataCell>
                                          <CTableDataCell className="fw-semibold">
                                            {formatCurrency(breakdown.summary.finalPayable)}
                                          </CTableDataCell>
                                        </CTableRow>
                                      </CTableBody>
                                    </CTable>
                                  </div>
                                </div>

                                <div className="col-12 col-lg-6">
                                  <div className="rounded-3 shadow-sm overflow-hidden bg-body border h-100">
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
                                              breakdown.summary.baselineTotalDeductions,
                                            )}
                                          </CTableDataCell>
                                          <CTableDataCell className="text-end">
                                            {formatCurrency(
                                              breakdown.contributions.employerContributionTotal,
                                            )}
                                          </CTableDataCell>
                                        </CTableRow>
                                        {breakdown.contributions.contributionPairs.length > 0 ? (
                                          breakdown.contributions.contributionPairs.map((entry) => (
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
                                  <div className="rounded-3 shadow-sm overflow-hidden bg-body border">
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
                                            {breakdown.baseline.sourceLabel}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Salary record
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {breakdown.baseline.salaryRecord
                                              ? `${breakdown.baseline.salaryRecord.referenceId || '-'} | Effective ${breakdown.baseline.salaryRecord.effectiveFrom || '-'} | ${breakdown.baseline.salaryRecord.status || '-'}`
                                              : 'No salary record linked'}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Payment date
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {breakdown.status.paymentDateLabel}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Basic salary
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(breakdown.summary.basicSalary)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Total allowances
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(breakdown.baseline.allowanceTotal)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Allowance breakdown
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatAllowanceList(
                                              breakdown.baseline.allowanceItems,
                                              formatCurrency,
                                            )}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Deduction items
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {breakdown.baseline.deductionItems.length > 0
                                              ? breakdown.baseline.deductionItems
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
                                            {formatAdjustmentItems(
                                              breakdown.adjustments.rows,
                                              formatCurrency,
                                            )}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Overtime rows
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {breakdown.overtime.rows.length}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Approved hours
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {Number(breakdown.overtime.approvedHours).toFixed(2)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Approved payout
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatCurrency(breakdown.overtime.approvedPayout)}
                                          </CTableDataCell>
                                        </CTableRow>
                                        <CTableRow>
                                          <CTableDataCell className="text-body-secondary small">
                                            Employee contributions
                                          </CTableDataCell>
                                          <CTableDataCell>
                                            {formatContributionList(
                                              breakdown.contributions.employeeContributions,
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
                                              breakdown.contributions.employerContributions,
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
      <ResponsiveWorkflowActionDialog
        visible={Boolean(downloadNoticeRow)}
        onClose={() => setDownloadNoticeRow(null)}
        title="Download unavailable"
        body={
          <>
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
          </>
        }
        footer={
          <>
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
          </>
        }
      />
    </CCard>
  )
}

export default PayslipsSection
