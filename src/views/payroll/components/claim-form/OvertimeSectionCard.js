import React from 'react'
import {
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
import TableLoader from 'src/components/TableLoader'
import { OVERTIME_BASE_HOUR_MODES } from 'src/views/staff/salary-claims-management/utils'
import { formatCurrency, formatDate } from './utils/claimFormUtils'

const OvertimeSectionCard = ({
  period,
  monthLabel,
  overtimeEligibilityResolved,
  isOvertimeEligible,
  isSysAdmin,
  hasOvertimeEligibilityError,
  isOvertimeRowsLoading,
  overtimeBaseMode,
  overtimeAutoHourlyBaseRate,
  salaryBasic,
  overtimeMonthlyDivisor,
  overtimePreviewHoursPerDay,
  overtimeHourlySourceSummary,
  overtimeRowsForPeriod,
  overtimeTotals,
}) => (
  <CCard>
    <CCardHeader>Overtime Records ({monthLabel || period})</CCardHeader>
    <CCardBody className="d-grid gap-3">
      {overtimeEligibilityResolved && !isOvertimeEligible ? (
        <div className="text-body-secondary">
          Overtime contribution is disabled for your current role based on OT applicability
          settings.
        </div>
      ) : !isSysAdmin && hasOvertimeEligibilityError ? (
        <div className="text-warning">
          Overtime records are unavailable because eligibility could not be verified. Please retry
          later or contact HR/Admin.
        </div>
      ) : !isSysAdmin && !overtimeEligibilityResolved ? (
        <div className="text-body-secondary">Checking overtime eligibility...</div>
      ) : isOvertimeRowsLoading ? (
        <TableLoader />
      ) : (
        <>
          {overtimeBaseMode === OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY &&
            overtimeAutoHourlyBaseRate !== null && (
              <div className="small text-info">
                {`Using statutory hourly base rate (RM/hour): (${formatCurrency(salaryBasic)} / ${overtimeMonthlyDivisor} days) / ${overtimePreviewHoursPerDay} hours/day = ${formatCurrency(overtimeAutoHourlyBaseRate)}.`}
              </div>
            )}
          {overtimeBaseMode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION && (
            <div className="small text-info">
              Month days division mode enabled. Hourly base uses calendar days of each overtime
              record month: (basic salary / days in month) / normal hours/day.
            </div>
          )}
          {overtimeHourlySourceSummary.missing > 0 && (
            <div className="small text-warning">
              {overtimeHourlySourceSummary.missing} overtime record(s) could not resolve hourly base
              rate. Their payout is treated as MYR 0.00.
            </div>
          )}
          {overtimeRowsForPeriod.length === 0 ? (
            <div className="text-body-secondary">
              No overtime records found for this payroll month.
            </div>
          ) : (
            <div className="rounded-3 shadow-sm overflow-hidden bg-white">
              <CTable align="middle" className="mb-0" responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell>Overtime ID</CTableHeaderCell>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Duration</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Rate</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Payout Used</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {overtimeRowsForPeriod.map((row, index) => (
                    <React.Fragment key={row.id}>
                      <CTableRow>
                        <CTableDataCell className="text-center text-body-secondary">
                          {index + 1}
                        </CTableDataCell>
                        <CTableDataCell className="fw-semibold">{row.overtimeId}</CTableDataCell>
                        <CTableDataCell>{row.overtimeTypeLabel}</CTableDataCell>
                        <CTableDataCell>{formatDate(row.claimDate)}</CTableDataCell>
                        <CTableDataCell>
                          {row.durationLabel}
                          <span className="small text-body-secondary ms-1">
                            ({row.durationHours}h)
                          </span>
                        </CTableDataCell>
                        <CTableDataCell>{row.statusLabel || row.status || '-'}</CTableDataCell>
                        <CTableDataCell className="text-end">{row.multiplier}x</CTableDataCell>
                        <CTableDataCell className="text-end fw-semibold">
                          {formatCurrency(row.payablePayout)}
                        </CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell colSpan={8} className="small text-body-secondary">
                          {`Detail: Hourly base = (${formatCurrency(salaryBasic)} / ${row.monthlyDivisorUsed || '-'} days) / ${row.normalHoursPerDay} h/day = ${formatCurrency(row.hourlyBaseRate)}/h. Payout = ${row.durationHours} h x ${formatCurrency(row.hourlyBaseRate)}/h x ${row.multiplier}x = ${formatCurrency(row.calculatedPayout)}${row.isApproved ? '' : ' (not approved, payout used is RM 0.00).'}`}
                        </CTableDataCell>
                      </CTableRow>
                    </React.Fragment>
                  ))}
                  <CTableRow className="table-light">
                    <CTableDataCell colSpan={7} className="fw-semibold">
                      Total OT Hours (All Status)
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {overtimeTotals.totalHoursAll}h
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    <CTableDataCell colSpan={7} className="fw-semibold">
                      Total OT Hours (Approved)
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {overtimeTotals.totalHoursApproved}h
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    <CTableDataCell colSpan={7} className="fw-semibold">
                      Total OT Payout (Approved)
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {formatCurrency(overtimeTotals.totalPayoutApproved)}
                    </CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>
            </div>
          )}
        </>
      )}
    </CCardBody>
  </CCard>
)

export default OvertimeSectionCard
