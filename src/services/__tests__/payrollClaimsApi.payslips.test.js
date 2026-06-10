import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/config/featureFlags', () => ({
  default: {
    apiOtPayrollReadsPrimary: true,
    apiOtPayrollWritesPrimary: true,
  },
}))

const fetchPayrollPayslips = vi.fn()

vi.mock('../apiClient', () => ({
  fetchPayrollClaims: vi.fn(),
  createPayrollClaim: vi.fn(),
  updatePayrollClaim: vi.fn(),
  cancelPayrollClaim: vi.fn(),
  deletePayrollClaimApi: vi.fn(),
  fetchStaffPayrollClaims: vi.fn(),
  checkStaffPayrollClaim: vi.fn(),
  reviewStaffPayrollClaim: vi.fn(),
  approveStaffPayrollClaim: vi.fn(),
  rejectStaffPayrollClaim: vi.fn(),
  cancelStaffPayrollClaim: vi.fn(),
  markStaffPayrollClaimPaid: vi.fn(),
  unmarkStaffPayrollClaimPaid: vi.fn(),
  bulkMarkStaffPayrollClaimsPaid: vi.fn(),
  bulkUnmarkStaffPayrollClaimsPaid: vi.fn(),
  fetchPayrollClaimDrafts: vi.fn(),
  fetchPayrollPayslips: (...args) => fetchPayrollPayslips(...args),
  downloadPayrollPayslip: vi.fn(),
  savePayrollClaimDraftApi: vi.fn(),
  deletePayrollClaimDraftApi: vi.fn(),
}))

describe('payrollClaimsApi payslip mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps salary-record-backed payslip payload into detailed UI shape', async () => {
    fetchPayrollPayslips.mockResolvedValue({
      data: [
        {
          id: 17,
          payslip_id: 17,
          reference: 'CLM-2026-017',
          period_value: '2026-03',
          issued_at: '2026-03-31T10:00:00Z',
          payment_date: '2026-04-07',
          status: 'Approved',
          downloadable: true,
          baseline_source: 'hybrid',
          salary_record: {
            id: 88,
            referenceId: 'SAL-2026-009',
            status: 'Active',
            effectiveFrom: '2026-03-01',
            basicSalary: 3200,
            allowanceTotal: 450,
            allowanceItems: [{ key: 'transport', label: 'Transport', amount: 250 }],
            employeeContributions: { epf: 352, perkeso: 23.8 },
            employerContributions: { epf: 384 },
          },
          baseline: {
            basicSalary: 3200,
            allowanceTotal: 450,
            grossSalary: 3650,
            employeeDeductionsTotal: 375.8,
            netSalary: 3274.2,
          },
          adjustments: [
            {
              lineNo: 1,
              itemType: 'Addition',
              title: 'Performance Bonus',
              amount: 100,
              signedAmount: 100,
            },
          ],
          overtime: {
            approvedHours: 6,
            approvedPayout: 120,
            rows: [{ overtimeId: 'OT-1', hours: 6, isApproved: true, payoutUsed: 120 }],
          },
          totals: {
            baselineNetSalary: 3274.2,
            adjustmentsTotal: 100,
            approvedOvertimePayout: 120,
            netPayable: 3494.2,
          },
        },
      ],
    })

    const { loadMyPayrollPayslipsApiFirst } = await import('../payrollClaimsApi')
    const result = await loadMyPayrollPayslipsApiFirst()

    expect(result.ok).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({
      payslipId: 17,
      reference: 'CLM-2026-017',
      paymentDate: '2026-04-07',
      baselineSource: 'hybrid',
      baselineNetSalary: 3274.2,
      adjustmentsTotal: 100,
      approvedOvertimePayout: 120,
      netPayable: 3494.2,
      salaryRecord: {
        id: 88,
        referenceId: 'SAL-2026-009',
        basicSalary: 3200,
      },
      baseline: {
        basicSalary: 3200,
        allowanceTotal: 450,
      },
      overtime: {
        approvedHours: 6,
        approvedPayout: 120,
      },
    })
  })

  it('does not mark payslip as downloadable when backend downloadable flag is false', async () => {
    fetchPayrollPayslips.mockResolvedValue({
      data: [
        {
          id: 29,
          payslip_id: 29,
          reference: 'CLM-2026-029',
          period_value: '2026-04',
          status: 'Pending',
          downloadable: false,
          download_reason: 'Payslip is only available for approved or paid salary claims.',
        },
      ],
    })

    const { loadMyPayrollPayslipsApiFirst } = await import('../payrollClaimsApi')
    const result = await loadMyPayrollPayslipsApiFirst()

    expect(result.ok).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({
      payslipId: 29,
      downloadable: false,
      downloadReason: 'Payslip is only available for approved or paid salary claims.',
    })
  })
})
