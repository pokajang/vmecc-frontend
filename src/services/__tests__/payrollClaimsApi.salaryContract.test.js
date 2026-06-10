import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/config/featureFlags', () => ({
  default: {
    apiOtPayrollReadsPrimary: true,
    apiOtPayrollWritesPrimary: true,
  },
}))

const fetchStaffPayrollClaims = vi.fn()

vi.mock('../apiClient', () => ({
  fetchPayrollClaims: vi.fn(),
  createPayrollClaim: vi.fn(),
  updatePayrollClaim: vi.fn(),
  cancelPayrollClaim: vi.fn(),
  deletePayrollClaimApi: vi.fn(),
  fetchStaffPayrollClaims: (...args) => fetchStaffPayrollClaims(...args),
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
  fetchPayrollPayslips: vi.fn(),
  downloadPayrollPayslip: vi.fn(),
  savePayrollClaimDraftApi: vi.fn(),
  deletePayrollClaimDraftApi: vi.fn(),
}))

describe('payrollClaimsApi salary contract read mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('flags salary rows as contract-incomplete when required salary fields are missing', async () => {
    fetchStaffPayrollClaims.mockResolvedValue({
      data: [
        {
          id: 10,
          display_id: 'CLM-2026-010',
          claim_type: 'salary',
          status: 'Pending',
          period: 'April 2026',
          period_value: '2026-04',
          payroll_snapshot: { net: 3000 },
          items: [],
        },
      ],
    })

    const { loadStaffPayrollClaimsApiFirst } = await import('../payrollClaimsApi')
    const result = await loadStaffPayrollClaimsApiFirst()

    expect(result.ok).toBe(true)
    expect(result.data[0]).toMatchObject({
      id: 'CLM-2026-010',
      salaryContractIncomplete: true,
    })
    expect(result.data[0].salaryContractMissingFields).toEqual(
      expect.arrayContaining([
        'payrollBaselineConfirmed',
        'adjustmentsTotal',
        'approvedOvertimePayout',
        'projectedNetPayout',
        'overtimeRows',
        'overtimeRateSnapshot',
      ]),
    )
  })

  it('does not flag salary rows when strict salary fields are present', async () => {
    fetchStaffPayrollClaims.mockResolvedValue({
      data: [
        {
          id: 11,
          display_id: 'CLM-2026-011',
          claim_type: 'salary',
          status: 'Pending Review',
          period: 'April 2026',
          period_value: '2026-04',
          payroll_snapshot: { net: 3500 },
          payroll_baseline_confirmed: true,
          adjustments_total: 200,
          approved_overtime_payout: 80,
          projected_net_payout: 3780,
          overtime_rows: [],
          overtime_rate_snapshot: { weekdayMultiplier: 1.5 },
          items: [],
        },
      ],
    })

    const { loadStaffPayrollClaimsApiFirst } = await import('../payrollClaimsApi')
    const result = await loadStaffPayrollClaimsApiFirst()

    expect(result.ok).toBe(true)
    expect(result.data[0]).toMatchObject({
      id: 'CLM-2026-011',
      salaryContractIncomplete: false,
      salaryContractMissingFields: [],
      adjustmentsTotal: 200,
      approvedOvertimePayout: 80,
      projectedNetPayout: 3780,
      payrollBaselineConfirmed: true,
    })
  })

  it('maps expense item context fields from snake_case to camelCase', async () => {
    fetchStaffPayrollClaims.mockResolvedValue({
      data: [
        {
          id: 12,
          display_id: 'CLM-2026-012',
          claim_type: 'expense',
          status: 'Pending',
          period: 'April 2026',
          period_value: '2026-04',
          attachment_mime_type: 'application/pdf',
          attachment_size_bytes: 2048,
          items: [
            {
              item_type: 'Mileage',
              claim_date: '2026-04-20',
              amount: 33,
              notes: 'Route claim',
              from_location: 'HQ',
              to_location: 'Site B',
              distance_km: '12',
              rate_per_km: '0.85',
              destination: 'Site B',
              trip_date_from: '2026-04-20',
              trip_date_to: '2026-04-20',
              billed_period: 'Apr 2026',
              claimant: 'Self',
              approval_note: 'Approved',
            },
          ],
        },
      ],
    })

    const { loadStaffPayrollClaimsApiFirst } = await import('../payrollClaimsApi')
    const result = await loadStaffPayrollClaimsApiFirst()

    expect(result.ok).toBe(true)
    expect(result.data[0]).toMatchObject({
      id: 'CLM-2026-012',
      attachmentMimeType: 'application/pdf',
      attachmentSizeBytes: 2048,
    })
    expect(result.data[0].items[0]).toMatchObject({
      claimType: 'Mileage',
      claimDate: '2026-04-20',
      lineNotes: 'Route claim',
      fromLocation: 'HQ',
      toLocation: 'Site B',
      distanceKm: '12',
      ratePerKm: '0.85',
      destination: 'Site B',
      tripDateFrom: '2026-04-20',
      tripDateTo: '2026-04-20',
      billedPeriod: 'Apr 2026',
      claimant: 'Self',
      approvalNote: 'Approved',
    })
  })
})
