import React, { useMemo, useState } from 'react'
import {
  CBadge,
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
import AttachmentPreviewModal from 'src/views/staff/salary-claims-management/components/AttachmentPreviewModal'
import {
  buildOvertimeDetailText,
  buildPayrollBreakdown,
  formatAdjustmentItems,
  formatAllowanceList,
  formatContributionList,
} from './payrollBreakdownViewModel'

const truncateAttachmentLabel = (value) => {
  const name = String(value || '').trim()
  if (!name) return ''
  return name.length > 18 ? `${name.slice(0, 12)}...${name.slice(-4)}` : name
}

const SalaryClaimReadonlyView = ({ claim, formatCurrency, formatDate }) => {
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const breakdown = useMemo(
    () => buildPayrollBreakdown(claim, { sourceType: 'salaryClaim' }),
    [claim],
  )
  const { summary, baseline, adjustments, overtime, contributions, status } = breakdown

  const openAttachmentPreview = (item, source = 'salary-readonly') => {
    const payload =
      item && typeof item === 'object'
        ? {
            attachmentId: Number(item?.attachmentId || item?.attachment_id || 0) || null,
            attachmentName: String(
              item?.attachmentName || item?.attachment?.original_name || '',
            ).trim(),
            attachmentDataUrl: String(item?.attachmentDataUrl || '').trim(),
            attachmentMimeType: String(
              item?.attachmentMimeType || item?.attachment?.mime_type || '',
            ).trim(),
            attachmentSizeBytes:
              Number(item?.attachmentSizeBytes || item?.attachment?.size || 0) || 0,
            source,
          }
        : null
    if (!payload?.attachmentId && !payload?.attachmentDataUrl) return
    setPreviewAttachment(payload)
    setPreviewVisible(true)
  }

  const renderStackedSection = (title, rows) => (
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

  const renderAdjustmentStack = (title, rows, source) => (
    <section className="border rounded-3 bg-body p-3">
      <div className="fw-semibold small text-body mb-2">{title}</div>
      {rows.length === 0 ? (
        <div className="small text-body-secondary">No adjustment rows.</div>
      ) : (
        <div className="d-grid gap-2">
          {rows.map((item) => (
            <div key={item.key} className="d-flex flex-wrap justify-content-between gap-2 small">
              <div className="min-w-0">
                <div className="fw-semibold">{item.label}</div>
                {item.claimDate ? (
                  <div className="text-body-secondary">{formatDate(item.claimDate)}</div>
                ) : null}
              </div>
              <div className="d-flex align-items-center gap-2">
                {item.attachmentName ? (
                  <CBadge
                    as="button"
                    type="button"
                    color="light"
                    className="text-body-secondary"
                    style={{ cursor: 'pointer' }}
                    title="Preview attachment"
                    onClick={() => openAttachmentPreview(item, source)}
                  >
                    {truncateAttachmentLabel(item.attachmentName)}
                  </CBadge>
                ) : null}
                <span className="fw-semibold">{formatCurrency(item.signedAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )

  const renderMobileBreakdown = () => (
    <div className="d-md-none d-grid gap-2 mt-3">
      {renderStackedSection('Net Pay Summary', [
        { label: 'Baseline net', value: formatCurrency(summary.baselineNet) },
        { label: 'Adjusted gross', value: formatCurrency(summary.adjustedGrossSalary) },
        {
          label: 'Adjusted deductions',
          value: formatCurrency(-Math.abs(summary.adjustedTotalDeductions)),
        },
        { label: 'Net before OT', value: formatCurrency(summary.adjustedNetBeforeOvertime) },
        { label: 'Total adjustments', value: formatCurrency(summary.adjustmentsTotal) },
        { label: 'OT payout', value: formatCurrency(summary.approvedOvertimePayout) },
        { label: 'Final payable', value: formatCurrency(summary.finalPayable) },
      ])}

      {renderStackedSection('Salary Baseline', [
        { label: 'Baseline source', value: baseline.sourceLabel },
        { label: 'Basic salary', value: formatCurrency(summary.basicSalary) },
        { label: 'Gross salary', value: formatCurrency(summary.grossSalary) },
        { label: 'Total allowances', value: formatCurrency(baseline.allowanceTotal) },
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

      {renderStackedSection('Deductions & Contributions', [
        {
          label: 'Baseline deductions',
          value: formatCurrency(-Math.abs(summary.baselineTotalDeductions)),
        },
        {
          label: 'Adjusted deductions',
          value: formatCurrency(-Math.abs(summary.adjustedTotalDeductions)),
        },
        {
          label: 'Employee contributions',
          value: formatContributionList(contributions.employeeContributions, formatCurrency),
        },
        {
          label: 'Employer contributions',
          value: formatContributionList(contributions.employerContributions, formatCurrency),
        },
      ])}

      {renderStackedSection('Overtime Records', [
        { label: 'Overtime rows', value: overtime.rows.length },
        { label: 'Approved hours', value: Number(overtime.approvedHours).toFixed(2) },
        { label: 'Approved payout', value: formatCurrency(overtime.approvedPayout) },
        { label: 'Rate mode', value: overtime.hourlyBaseModeNote || '-' },
        {
          label: 'Rows',
          value:
            overtime.rows.length > 0
              ? overtime.rows
                  .map(
                    (row) =>
                      `${row.overtimeId}: ${row.overtimeTypeLabel}, ${row.durationHours}h, ${formatCurrency(row.payoutUsed)}`,
                  )
                  .join(' | ')
              : 'No overtime rows were captured for this claim.',
        },
      ])}

      {renderAdjustmentStack(
        'Addition Adjustments',
        adjustments.additionRows,
        'salary-readonly-addition',
      )}
      {renderAdjustmentStack(
        'Deduction Adjustments',
        adjustments.deductionRows,
        'salary-readonly-deduction',
      )}
      {renderStackedSection('Adjustment Items', [
        {
          label: 'All adjustments',
          value: formatAdjustmentItems(adjustments.displayRows, formatCurrency),
        },
      ])}
    </div>
  )

  return (
    <div className="d-grid gap-3">
      <CCard>
        <CCardHeader>Salary Claim (View Only)</CCardHeader>
        <CCardBody>
          <div className="border rounded-3 bg-body p-3 mb-3">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <div className="small text-body-secondary">Final payable</div>
                <div className="fs-5 fw-semibold">{formatCurrency(summary.finalPayable)}</div>
                <div className="small text-body-secondary mt-1">
                  {status.statusLabel || '-'}
                  {status.paymentDateLabel && status.paymentDateLabel !== '-'
                    ? ` | Payment date: ${status.paymentDateLabel}`
                    : ''}
                </div>
              </div>
              <div className="d-flex flex-wrap gap-3 small">
                <div>
                  <div className="text-body-secondary">Baseline net</div>
                  <div className="fw-semibold">{formatCurrency(summary.baselineNet)}</div>
                </div>
                <div>
                  <div className="text-body-secondary">Adjustments</div>
                  <div className="fw-semibold">{formatCurrency(summary.adjustmentsTotal)}</div>
                </div>
                <div>
                  <div className="text-body-secondary">Approved OT</div>
                  <div className="fw-semibold">
                    {formatCurrency(summary.approvedOvertimePayout)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {renderMobileBreakdown()}

          <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-body">
            <CTable align="middle" className="mb-0" responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                    #
                  </CTableHeaderCell>
                  <CTableHeaderCell>Item</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                <CTableRow>
                  <CTableDataCell className="text-center text-body-secondary">1</CTableDataCell>
                  <CTableDataCell>Basic Salary</CTableDataCell>
                  <CTableDataCell className="text-end">
                    {formatCurrency(summary.basicSalary)}
                  </CTableDataCell>
                </CTableRow>
                {baseline.allowanceItems.map((allowanceItem, index) => (
                  <CTableRow key={allowanceItem.key || `allowance-${index}`}>
                    <CTableDataCell className="text-center text-body-secondary">
                      {2 + index}
                    </CTableDataCell>
                    <CTableDataCell>{allowanceItem.label || 'Allowance'}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatCurrency(Number(allowanceItem.amount) || 0)}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {adjustments.additionRows.map((item, index) => (
                  <CTableRow key={`addition-adjustment-${index}`}>
                    <CTableDataCell className="text-center text-body-secondary">
                      {2 + baseline.allowanceItems.length + index}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                        <span
                          className="rounded-circle flex-shrink-0 bg-success"
                          style={{ width: 8, height: 8 }}
                          title={item.claimType || 'Addition'}
                        />
                        <span className="fw-semibold text-success text-truncate">
                          {item.lineNotes?.trim() || item.notes?.trim() || 'No description'}
                        </span>
                        {item.claimDate && (
                          <span className="small text-body-secondary flex-shrink-0">
                            {formatDate(item.claimDate)}
                          </span>
                        )}
                        {item.attachmentName && (
                          <CBadge
                            as="button"
                            type="button"
                            color="light"
                            className="text-body-secondary flex-shrink-0"
                            style={{ cursor: 'pointer' }}
                            title="Preview attachment"
                            onClick={() => openAttachmentPreview(item, 'salary-readonly-addition')}
                          >
                            {truncateAttachmentLabel(item.attachmentName)}
                          </CBadge>
                        )}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold text-success">
                      {formatCurrency(item.signedAmount)}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                <CTableRow>
                  <CTableDataCell className="text-center text-body-secondary">
                    {2 + baseline.allowanceItems.length + adjustments.additionRows.length}
                  </CTableDataCell>
                  <CTableDataCell>Gross Salary (Baseline)</CTableDataCell>
                  <CTableDataCell className="text-end">
                    {formatCurrency(summary.grossSalary)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Adjusted Gross Salary</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold text-success">
                    {formatCurrency(summary.adjustedGrossSalary)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Deductions</CTableDataCell>
                  <CTableDataCell></CTableDataCell>
                </CTableRow>
                {baseline.deductionItems.map((deductionItem, index) => (
                  <CTableRow
                    key={deductionItem.key || `deduction-${index}`}
                    className="table-danger"
                  >
                    <CTableDataCell className="text-center text-body-secondary">
                      {3 + baseline.allowanceItems.length + adjustments.additionRows.length + index}
                    </CTableDataCell>
                    <CTableDataCell>{deductionItem.label || 'Deduction'}</CTableDataCell>
                    <CTableDataCell className="text-end text-danger-emphasis">
                      {formatCurrency(-Math.abs(Number(deductionItem.amount) || 0))}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {adjustments.deductionRows.map((item, index) => (
                  <CTableRow key={`deduction-adjustment-${index}`} className="table-danger">
                    <CTableDataCell className="text-center text-body-secondary">
                      {3 +
                        baseline.allowanceItems.length +
                        adjustments.additionRows.length +
                        baseline.deductionItems.length +
                        index}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                        <span
                          className="rounded-circle flex-shrink-0 bg-danger"
                          style={{ width: 8, height: 8 }}
                          title={item.claimType || 'Deduction'}
                        />
                        <span className="fw-semibold text-danger text-truncate">
                          {item.lineNotes?.trim() || item.notes?.trim() || 'No description'}
                        </span>
                        {item.claimDate && (
                          <span className="small text-body-secondary flex-shrink-0">
                            {formatDate(item.claimDate)}
                          </span>
                        )}
                        {item.attachmentName && (
                          <CBadge
                            as="button"
                            type="button"
                            color="light"
                            className="text-body-secondary flex-shrink-0"
                            style={{ cursor: 'pointer' }}
                            title="Preview attachment"
                            onClick={() => openAttachmentPreview(item, 'salary-readonly-deduction')}
                          >
                            {truncateAttachmentLabel(item.attachmentName)}
                          </CBadge>
                        )}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold text-danger">
                      {formatCurrency(item.signedAmount)}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                <CTableRow className="table-danger">
                  <CTableDataCell className="text-center text-body-secondary">
                    {3 +
                      baseline.allowanceItems.length +
                      adjustments.additionRows.length +
                      baseline.deductionItems.length +
                      adjustments.deductionRows.length}
                  </CTableDataCell>
                  <CTableDataCell className="fw-semibold">
                    Total Deductions (Baseline)
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold text-danger-emphasis">
                    {formatCurrency(-Math.abs(summary.baselineTotalDeductions))}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Adjusted Total Deductions</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold text-danger-emphasis">
                    {formatCurrency(-Math.abs(summary.adjustedTotalDeductions))}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Salary Payable (Baseline)</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {formatCurrency(summary.baselineNet)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">
                    Net Salary (Adjusted, before OT)
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {formatCurrency(summary.adjustedNetBeforeOvertime)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Total Adjustments</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {formatCurrency(summary.adjustmentsTotal)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Approved Overtime Payout</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {formatCurrency(summary.approvedOvertimePayout)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Final Payable</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {formatCurrency(summary.finalPayable)}
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>

      <CCard className="d-none d-md-block">
        <CCardHeader>Overtime Records</CCardHeader>
        <CCardBody>
          {overtime.rows.length === 0 ? (
            <div className="text-body-secondary">
              No overtime rows were captured for this claim.
            </div>
          ) : (
            <div className="d-grid gap-2">
              {overtime.hourlyBaseModeNote ? (
                <div className="small text-info">{overtime.hourlyBaseModeNote}</div>
              ) : null}
              <div className="rounded-3 shadow-sm overflow-hidden bg-body">
                <CTable align="middle" className="mb-0" responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                        #
                      </CTableHeaderCell>
                      <CTableHeaderCell>OT ID</CTableHeaderCell>
                      <CTableHeaderCell>Type</CTableHeaderCell>
                      <CTableHeaderCell>Date</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Hours</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Rate</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Payout Used</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {overtime.rows.map((row, index) => (
                      <React.Fragment key={row.key}>
                        <CTableRow>
                          <CTableDataCell className="text-center text-body-secondary">
                            {index + 1}
                          </CTableDataCell>
                          <CTableDataCell>{row.overtimeId}</CTableDataCell>
                          <CTableDataCell>{row.overtimeTypeLabel}</CTableDataCell>
                          <CTableDataCell>{formatDate(row.claimDate)}</CTableDataCell>
                          <CTableDataCell>{row.statusLabel}</CTableDataCell>
                          <CTableDataCell className="text-end">{row.durationHours}</CTableDataCell>
                          <CTableDataCell className="text-end">
                            {row.multiplier > 0 ? `${row.multiplier}x` : '-'}
                            {row.multiplierSource !== 'row' && (
                              <span className="small text-body-secondary ms-1">
                                ({row.multiplierSource})
                              </span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-end fw-semibold">
                            {formatCurrency(row.payoutUsed)}
                          </CTableDataCell>
                        </CTableRow>
                        <CTableRow>
                          <CTableDataCell colSpan={8} className="small text-body-secondary">
                            {buildOvertimeDetailText(row, formatCurrency)}
                          </CTableDataCell>
                        </CTableRow>
                      </React.Fragment>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
            </div>
          )}
        </CCardBody>
      </CCard>
      <AttachmentPreviewModal
        visible={previewVisible}
        attachment={previewAttachment}
        onClose={() => {
          setPreviewVisible(false)
          setPreviewAttachment(null)
        }}
      />
    </div>
  )
}

export default SalaryClaimReadonlyView
