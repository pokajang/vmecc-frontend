import { describe, expect, it } from 'vitest'
import { buildOvertimeDetailText, buildPayrollBreakdown } from '../payrollBreakdownViewModel'

describe('payrollBreakdownViewModel', () => {
  it('normalizes payslip rows without changing displayed values', () => {
    const breakdown = buildPayrollBreakdown(
      {
        month: 'April 2026',
        reference: 'CLM-1',
        status: 'Approved',
        paymentDate: '',
        baselineNetSalary: 1200,
        adjustmentsTotal: 50,
        approvedOvertimePayout: 75,
        netPayable: 1325,
        baselineSource: 'salary_record',
        salaryRecord: {
          referenceId: 'SAL-1',
          effectiveFrom: '2026-04-01',
          status: 'Active',
          basicSalary: 1500,
          allowanceTotal: 200,
          allowanceItems: [{ key: 'meal', label: 'Meal', amount: 100 }],
        },
        baseline: {
          employeeDeductionsTotal: 300,
          employeeContributions: { epf: 120 },
          employerContributions: { epf: 150 },
          deductionItems: [{ key: 'pcb', label: 'PCB', amount: 50 }],
        },
        adjustments: [{ title: 'Allowance correction', signedAmount: 50 }],
        overtime: { rows: [{ id: 'OT-1' }], approvedHours: 2, approvedPayout: 75 },
        approvalHistory: [{ action: 'Approved' }],
      },
      { sourceType: 'payslip' },
    )

    expect(breakdown.summary.baselineNet).toBe(1200)
    expect(breakdown.summary.adjustmentsTotal).toBe(50)
    expect(breakdown.summary.approvedOvertimePayout).toBe(75)
    expect(breakdown.summary.finalPayable).toBe(1325)
    expect(breakdown.status.paymentDateLabel).toBe('Pending payment')
    expect(breakdown.baseline.sourceLabel).toBe('Salary Record')
    expect(breakdown.baseline.salaryRecord.referenceId).toBe('SAL-1')
    expect(breakdown.contributions.contributionPairs[0]).toMatchObject({
      key: 'epf',
      employeeAmount: 120,
      employerAmount: 150,
    })
    expect(breakdown.overtime.approvedHours).toBe(2)
    expect(breakdown.overtime.rows).toHaveLength(1)
    expect(breakdown.hasDetails).toBe(true)
  })

  it('preserves salary claim fallback math for read-only details', () => {
    const breakdown = buildPayrollBreakdown(
      {
        status: 'Pending',
        payrollSnapshot: {
          basic: 2000,
          gross: 2300,
          net: 1800,
          totalDeductions: 500,
          allowanceTotal: 300,
          allowanceItems: [{ key: 'transport', label: 'Transport', amount: 300 }],
          deductionItems: [{ key: 'epf', label: 'EPF', amount: 220 }],
        },
        items: [
          { claimType: 'Addition', amount: 100, lineNotes: 'Allowance top-up' },
          { claimType: 'Deduction', amount: 40, lineNotes: 'Correction' },
        ],
        approvedOvertimePayout: 80,
        overtimeRows: [
          {
            id: 'OT-9',
            type: 'weekday',
            durationMinutes: 120,
            hourlyBaseRate: 20,
            multiplier: 1.5,
          },
        ],
      },
      { sourceType: 'salaryClaim' },
    )

    expect(breakdown.summary.basicSalary).toBe(2000)
    expect(breakdown.summary.grossSalary).toBe(2300)
    expect(breakdown.summary.baselineNet).toBe(1800)
    expect(breakdown.summary.adjustedGrossSalary).toBe(2400)
    expect(breakdown.summary.adjustedTotalDeductions).toBe(540)
    expect(breakdown.summary.adjustedNetBeforeOvertime).toBe(1860)
    expect(breakdown.summary.adjustmentsTotal).toBe(60)
    expect(breakdown.summary.approvedOvertimePayout).toBe(80)
    expect(breakdown.summary.finalPayable).toBe(1940)
    expect(breakdown.adjustments.additionRows[0].signedAmount).toBe(100)
    expect(breakdown.adjustments.deductionRows[0].signedAmount).toBe(-40)
  })

  it('normalizes overtime rows and detail text', () => {
    const breakdown = buildPayrollBreakdown(
      {
        payrollSnapshot: {},
        overtimeRateSnapshot: {
          hourlyBaseMode: 'statutory',
          monthlyDivisorUsed: 26,
          globalNormalHoursPerDayUsed: 8,
        },
        overtimeRows: [
          {
            overtimeId: 'OT-10',
            overtimeType: 'public_holiday',
            claimDate: '2026-04-10',
            status: 'Approved',
            durationMinutes: 180,
            hourlyBaseRateUsed: 30,
            payablePayout: 270,
          },
        ],
      },
      { sourceType: 'salaryClaim' },
    )

    const row = breakdown.overtime.rows[0]
    expect(row.overtimeTypeLabel).toBe('Public Holiday')
    expect(row.durationHours).toBe(3)
    expect(row.hourlyBaseRate).toBe(30)
    expect(row.payoutUsed).toBe(270)
    expect(row.multiplierSource).toBe('derived')
    expect(row.monthlyDivisorUsed).toBe(26)
    expect(buildOvertimeDetailText(row, (value) => `RM ${value}`)).toContain(
      'Payout = 3 h x RM 30/h x 3x = RM 270',
    )
  })

  it('returns safe empty defaults for missing optional payroll data', () => {
    const breakdown = buildPayrollBreakdown(null, { sourceType: 'payslip' })

    expect(breakdown.summary.finalPayable).toBe(0)
    expect(breakdown.baseline.allowanceItems).toEqual([])
    expect(breakdown.baseline.deductionItems).toEqual([])
    expect(breakdown.contributions.contributionPairs).toEqual([])
    expect(breakdown.adjustments.rows).toEqual([])
    expect(breakdown.overtime.rows).toEqual([])
    expect(breakdown.status.paymentDateLabel).toBe('-')
    expect(breakdown.hasDetails).toBe(false)
  })
})
