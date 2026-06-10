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
import { parseAmount } from '../payrollUtils'
import AttachmentPreviewModal from 'src/views/staff/salary-claims-management/components/AttachmentPreviewModal'

const asArray = (value) => (Array.isArray(value) ? value : [])
const normalizeHourlyBaseSource = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
const normalizeOvertimeTypeKey = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (!raw) return ''
  if (raw === 'publicholiday' || raw === 'public_holiday' || raw === 'public-holiday') {
    return 'publicHoliday'
  }
  if (raw === 'weekend') return 'weekend'
  if (raw === 'weekday') return 'weekday'
  return raw
}
const resolveOvertimeTypeLabel = (row = {}) => {
  if (String(row?.overtimeTypeLabel || '').trim()) return row.overtimeTypeLabel
  if (String(row?.typeLabel || '').trim()) return row.typeLabel
  const normalizedType = normalizeOvertimeTypeKey(row?.overtimeType || row?.type)
  if (normalizedType === 'publicHoliday') return 'Public Holiday'
  if (normalizedType === 'weekend') return 'Weekend'
  if (normalizedType === 'weekday') return 'Weekday'
  return String(row?.overtimeType || row?.type || '-')
}
const resolveOvertimeDurationHours = (row = {}) => {
  if (row?.durationHours !== null && typeof row?.durationHours !== 'undefined') {
    return parseAmount(row.durationHours)
  }
  const fromMinutes = parseAmount(row?.durationMinutes)
  if (fromMinutes > 0) return fromMinutes / 60
  return parseAmount(row?.hours)
}
const resolveOvertimePayout = (row = {}) => {
  if (row?.payablePayout !== null && typeof row?.payablePayout !== 'undefined') {
    return parseAmount(row.payablePayout)
  }
  if (row?.payoutUsed !== null && typeof row?.payoutUsed !== 'undefined') {
    return parseAmount(row.payoutUsed)
  }
  return parseAmount(row?.calculatedPayout)
}
const truncateAttachmentLabel = (value) => {
  const name = String(value || '').trim()
  if (!name) return ''
  return name.length > 18 ? `${name.slice(0, 12)}...${name.slice(-4)}` : name
}
const resolveOvertimeMultiplier = ({
  row = {},
  snapshot = {},
  durationHours = 0,
  hourlyBaseRate = 0,
  payoutUsed = 0,
}) => {
  const direct = parseAmount(row?.multiplier)
  if (direct > 0) return { value: direct, source: 'row' }

  const normalizedType = normalizeOvertimeTypeKey(row?.overtimeType || row?.type)
  if (normalizedType === 'weekday') {
    const fallback = parseAmount(snapshot?.weekdayMultiplier)
    if (fallback > 0) return { value: fallback, source: 'snapshot' }
  }
  if (normalizedType === 'weekend') {
    const fallback = parseAmount(snapshot?.weekendMultiplier)
    if (fallback > 0) return { value: fallback, source: 'snapshot' }
  }
  if (normalizedType === 'publicHoliday') {
    const fallback = parseAmount(snapshot?.publicHolidayMultiplier)
    if (fallback > 0) return { value: fallback, source: 'snapshot' }
  }

  if (durationHours > 0 && hourlyBaseRate > 0 && payoutUsed > 0) {
    return {
      value: Math.round((payoutUsed / (durationHours * hourlyBaseRate)) * 100) / 100,
      source: 'derived',
    }
  }

  return { value: 0, source: 'missing' }
}

const SalaryClaimReadonlyView = ({ claim, formatCurrency, formatDate }) => {
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const payrollSnapshot =
    claim?.payrollSnapshot && typeof claim.payrollSnapshot === 'object' ? claim.payrollSnapshot : {}
  const allowanceItems = asArray(payrollSnapshot?.allowanceItems)
  const deductionItems = asArray(payrollSnapshot?.deductionItems)
  const adjustmentItems = asArray(claim?.items)
  const additionAdjustments = adjustmentItems.filter(
    (item) => String(item?.claimType || item?.itemType || '').trim() !== 'Deduction',
  )
  const deductionAdjustments = adjustmentItems.filter(
    (item) => String(item?.claimType || item?.itemType || '').trim() === 'Deduction',
  )
  const basicSalary = parseAmount(payrollSnapshot?.basic)
  const grossSalary = parseAmount(payrollSnapshot?.gross)
  const baselineNet = parseAmount(payrollSnapshot?.net)
  const baselineTotalDeductions = parseAmount(payrollSnapshot?.totalDeductions)
  const additionAdjustmentsTotal = additionAdjustments.reduce(
    (sum, item) => sum + Math.abs(parseAmount(item?.amount)),
    0,
  )
  const deductionAdjustmentsTotal = deductionAdjustments.reduce(
    (sum, item) => sum + Math.abs(parseAmount(item?.amount)),
    0,
  )
  const adjustedGrossSalary = grossSalary + additionAdjustmentsTotal
  const adjustedTotalDeductions = baselineTotalDeductions + deductionAdjustmentsTotal
  const adjustedNetBeforeOvertime = adjustedGrossSalary - adjustedTotalDeductions
  const adjustmentsTotal =
    claim?.adjustmentsTotal !== null && typeof claim?.adjustmentsTotal !== 'undefined'
      ? parseAmount(claim?.adjustmentsTotal)
      : additionAdjustmentsTotal - deductionAdjustmentsTotal
  const approvedOvertimePayout = parseAmount(claim?.approvedOvertimePayout)
  const finalPayable =
    claim?.projectedNetPayout !== null && typeof claim?.projectedNetPayout !== 'undefined'
      ? parseAmount(claim?.projectedNetPayout)
      : adjustedNetBeforeOvertime + approvedOvertimePayout
  const overtimeRows = asArray(claim?.overtimeRows)
  const overtimeRateSnapshot =
    claim?.overtimeRateSnapshot && typeof claim.overtimeRateSnapshot === 'object'
      ? claim.overtimeRateSnapshot
      : {}
  const overtimeHourlyBaseMode = String(overtimeRateSnapshot?.hourlyBaseMode || '').trim()
  const overtimeMonthlyDivisorUsed = overtimeRateSnapshot?.monthlyDivisorUsed
  const overtimeGlobalNormalHoursPerDayUsed = parseAmount(
    overtimeRateSnapshot?.globalNormalHoursPerDayUsed,
  )
  const overtimeRowsNormalized = overtimeRows.map((row, index) => {
    const durationHours = resolveOvertimeDurationHours(row)
    const hourlyBaseRate = parseAmount(row?.hourlyBaseRateUsed || row?.hourlyBaseRate)
    const payoutUsed = resolveOvertimePayout(row)
    const multiplierResolved = resolveOvertimeMultiplier({
      row,
      snapshot: overtimeRateSnapshot,
      durationHours,
      hourlyBaseRate,
      payoutUsed,
    })
    const multiplier = multiplierResolved.value
    const multiplierSource = multiplierResolved.source
    const calculatedPayoutRaw = parseAmount(row?.calculatedPayout)
    const calculatedPayout =
      calculatedPayoutRaw > 0
        ? calculatedPayoutRaw
        : Math.round(durationHours * hourlyBaseRate * multiplier * 100) / 100
    const hourlyBaseSource = normalizeHourlyBaseSource(
      row?.hourlyBaseSource || overtimeRateSnapshot?.hourlyBaseSource,
    )
    const monthlyDivisorUsed =
      row?.monthlyDivisorUsed !== null && typeof row?.monthlyDivisorUsed !== 'undefined'
        ? row.monthlyDivisorUsed
        : overtimeMonthlyDivisorUsed
    const overtimeId = row?.overtimeId || row?.id || `OT-${index + 1}`

    return {
      key: `${overtimeId}-${index}`,
      overtimeId,
      overtimeTypeLabel: resolveOvertimeTypeLabel(row),
      claimDate: row?.claimDate || row?.date || '',
      statusLabel: row?.statusLabel || row?.status || '-',
      durationHours,
      hourlyBaseRate,
      multiplier,
      multiplierSource,
      calculatedPayout,
      payoutUsed,
      hourlyBaseSource,
      monthlyDivisorUsed,
      isApproved: row?.isApproved !== false,
    }
  })

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

  return (
    <div className="d-grid gap-3">
      <CCard>
        <CCardHeader>Salary Claim (View Only)</CCardHeader>
        <CCardBody>
          <div className="rounded-3 shadow-sm overflow-hidden bg-white">
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
                    {formatCurrency(basicSalary)}
                  </CTableDataCell>
                </CTableRow>
                {allowanceItems.map((allowanceItem, index) => (
                  <CTableRow key={allowanceItem.key || `allowance-${index}`}>
                    <CTableDataCell className="text-center text-body-secondary">
                      {2 + index}
                    </CTableDataCell>
                    <CTableDataCell>{allowanceItem.label || 'Allowance'}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatCurrency(parseAmount(allowanceItem.amount))}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {additionAdjustments.map((item, index) => (
                  <CTableRow key={`addition-adjustment-${index}`}>
                    <CTableDataCell className="text-center text-body-secondary">
                      {2 + allowanceItems.length + index}
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
                            color="light"
                            className="text-body-secondary flex-shrink-0"
                            role="button"
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
                      {formatCurrency(Math.abs(parseAmount(item.amount)))}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                <CTableRow>
                  <CTableDataCell className="text-center text-body-secondary">
                    {2 + allowanceItems.length + additionAdjustments.length}
                  </CTableDataCell>
                  <CTableDataCell>Gross Salary (Baseline)</CTableDataCell>
                  <CTableDataCell className="text-end">
                    {formatCurrency(grossSalary)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Adjusted Gross Salary</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold text-success">
                    {formatCurrency(adjustedGrossSalary)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Deductions</CTableDataCell>
                  <CTableDataCell></CTableDataCell>
                </CTableRow>
                {deductionItems.map((deductionItem, index) => (
                  <CTableRow
                    key={deductionItem.key || `deduction-${index}`}
                    className="table-danger"
                  >
                    <CTableDataCell className="text-center text-body-secondary">
                      {3 + allowanceItems.length + additionAdjustments.length + index}
                    </CTableDataCell>
                    <CTableDataCell>{deductionItem.label || 'Deduction'}</CTableDataCell>
                    <CTableDataCell className="text-end text-danger-emphasis">
                      {formatCurrency(-Math.abs(parseAmount(deductionItem.amount)))}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {deductionAdjustments.map((item, index) => (
                  <CTableRow key={`deduction-adjustment-${index}`} className="table-danger">
                    <CTableDataCell className="text-center text-body-secondary">
                      {3 +
                        allowanceItems.length +
                        additionAdjustments.length +
                        deductionItems.length +
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
                            color="light"
                            className="text-body-secondary flex-shrink-0"
                            role="button"
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
                      {formatCurrency(-Math.abs(parseAmount(item.amount)))}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                <CTableRow className="table-danger">
                  <CTableDataCell className="text-center text-body-secondary">
                    {3 +
                      allowanceItems.length +
                      additionAdjustments.length +
                      deductionItems.length +
                      deductionAdjustments.length}
                  </CTableDataCell>
                  <CTableDataCell className="fw-semibold">
                    Total Deductions (Baseline)
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold text-danger-emphasis">
                    {formatCurrency(-Math.abs(baselineTotalDeductions))}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Adjusted Total Deductions</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold text-danger-emphasis">
                    {formatCurrency(-Math.abs(adjustedTotalDeductions))}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Salary Payable (Baseline)</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {formatCurrency(baselineNet)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">
                    Net Salary (Adjusted, before OT)
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {formatCurrency(adjustedNetBeforeOvertime)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Total Adjustments</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {formatCurrency(adjustmentsTotal)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Approved Overtime Payout</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {formatCurrency(approvedOvertimePayout)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Final Payable</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {formatCurrency(finalPayable)}
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader>Overtime Records</CCardHeader>
        <CCardBody>
          {overtimeRowsNormalized.length === 0 ? (
            <div className="text-body-secondary">
              No overtime rows were captured for this claim.
            </div>
          ) : (
            <div className="d-grid gap-2">
              {overtimeHourlyBaseMode && (
                <div className="small text-info">
                  {overtimeHourlyBaseMode === 'month_days_division'
                    ? 'Month days division mode was used for this claim: hourly base = (basic salary / days in month) / normal hours/day.'
                    : `Statutory divisor mode was used for this claim${overtimeMonthlyDivisorUsed ? `: monthly divisor ${overtimeMonthlyDivisorUsed}` : ''}${overtimeGlobalNormalHoursPerDayUsed > 0 ? `, normal hours/day ${overtimeGlobalNormalHoursPerDayUsed}` : ''}.`}
                </div>
              )}
              <div className="rounded-3 shadow-sm overflow-hidden bg-white">
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
                    {overtimeRowsNormalized.map((row, index) => (
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
                            {`Detail: Hourly base = ${formatCurrency(row.hourlyBaseRate)}/h${
                              row.monthlyDivisorUsed
                                ? ` (monthly divisor used: ${row.monthlyDivisorUsed})`
                                : ''
                            }. Rate source: ${row.multiplierSource}. Payout = ${row.durationHours} h x ${formatCurrency(
                              row.hourlyBaseRate,
                            )}/h x ${row.multiplier > 0 ? `${row.multiplier}x` : '-'} = ${formatCurrency(row.calculatedPayout)}${
                              row.isApproved ? '' : ' (not approved, payout used may be RM 0.00).'
                            }${
                              row.hourlyBaseSource === 'missing'
                                ? ' Hourly base source was missing for this row.'
                                : ''
                            }`}
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
