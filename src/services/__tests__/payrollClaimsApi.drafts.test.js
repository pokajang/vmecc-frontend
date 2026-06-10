/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/config/featureFlags', () => ({
  default: {
    apiOtPayrollReadsPrimary: true,
    apiOtPayrollWritesPrimary: true,
  },
}))

const createPayrollClaim = vi.fn()
const updatePayrollClaim = vi.fn()
const savePayrollClaimDraftApi = vi.fn()

vi.mock('../apiClient', () => ({
  fetchPayrollClaims: vi.fn(),
  createPayrollClaim: (...args) => createPayrollClaim(...args),
  updatePayrollClaim: (...args) => updatePayrollClaim(...args),
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
  fetchPayrollPayslips: vi.fn(),
  downloadPayrollPayslip: vi.fn(),
  savePayrollClaimDraftApi: (...args) => savePayrollClaimDraftApi(...args),
  deletePayrollClaimDraftApi: vi.fn(),
}))

describe('payrollClaimsApi draft reliability helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const store = new Map()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        get length() {
          return store.size
        },
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => {
          store.set(String(key), String(value))
        },
        removeItem: (key) => {
          store.delete(String(key))
        },
        clear: () => {
          store.clear()
        },
        key: (index) => Array.from(store.keys())[index] || null,
      },
    })
  })

  it('includes source draft fields in submit payload', async () => {
    createPayrollClaim.mockResolvedValue({
      data: {
        id: 99,
        display_id: 'CLM-2026-099',
        claim_type: 'salary',
        status: 'Pending',
      },
    })

    const { submitMyPayrollClaimApiFirst } = await import('../payrollClaimsApi')
    await submitMyPayrollClaimApiFirst({
      type: 'salary',
      period: 'April 2026',
      periodValue: '2026-04',
      sourceDraftId: 'DRAFT-SALARY-20260419',
      sourceDraftType: 'salary',
      payrollBaselineConfirmed: true,
      adjustmentsTotal: 250,
      approvedOvertimePayout: 120,
      projectedNetPayout: 4120,
      overtimeRows: [{ overtimeId: 'OT-1', payablePayout: 120 }],
      overtimeRateSnapshot: { weekdayMultiplier: 1.5 },
      items: [],
    })

    expect(createPayrollClaim).toHaveBeenCalledTimes(1)
    expect(createPayrollClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        source_draft_id: 'DRAFT-SALARY-20260419',
        source_draft_type: 'salary',
        payroll_baseline_confirmed: true,
        adjustments_total: 250,
        approved_overtime_payout: 120,
        projected_net_payout: 4120,
        overtime_rows: [{ overtimeId: 'OT-1', payablePayout: 120 }],
        overtime_rate_snapshot: { weekdayMultiplier: 1.5 },
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Idempotency-Key': expect.any(String),
        }),
      }),
    )
  })

  it('includes strict salary fields for update payload as well', async () => {
    updatePayrollClaim.mockResolvedValue({
      data: {
        id: 108,
        display_id: 'CLM-2026-108',
        claim_type: 'salary',
        status: 'Pending',
      },
    })

    const { submitMyPayrollClaimApiFirst } = await import('../payrollClaimsApi')
    await submitMyPayrollClaimApiFirst(
      {
        type: 'salary',
        period: 'April 2026',
        periodValue: '2026-04',
        payrollBaselineConfirmed: false,
        adjustmentsTotal: 0,
        approvedOvertimePayout: 0,
        projectedNetPayout: 3800,
        overtimeRows: [],
        overtimeRateSnapshot: null,
        items: [],
      },
      108,
    )

    expect(updatePayrollClaim).toHaveBeenCalledWith(
      108,
      expect.objectContaining({
        payroll_baseline_confirmed: false,
        adjustments_total: 0,
        approved_overtime_payout: 0,
        projected_net_payout: 3800,
        overtime_rows: [],
        overtime_rate_snapshot: null,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Idempotency-Key': expect.any(String),
        }),
      }),
    )
  })

  it('does not include salary-only strict fields for expense claims', async () => {
    createPayrollClaim.mockResolvedValue({
      data: {
        id: 201,
        display_id: 'CLM-2026-201',
        claim_type: 'expense',
        status: 'Pending',
      },
    })

    const { submitMyPayrollClaimApiFirst } = await import('../payrollClaimsApi')
    await submitMyPayrollClaimApiFirst({
      type: 'expense',
      period: 'April 2026',
      periodValue: '2026-04',
      items: [],
    })

    const payload = createPayrollClaim.mock.calls[0][0]
    expect(payload).not.toHaveProperty('payroll_baseline_confirmed')
    expect(payload).not.toHaveProperty('adjustments_total')
    expect(payload).not.toHaveProperty('approved_overtime_payout')
    expect(payload).not.toHaveProperty('projected_net_payout')
    expect(payload).not.toHaveProperty('overtime_rows')
    expect(payload).not.toHaveProperty('overtime_rate_snapshot')
  })

  it('preserves expense line-item context fields in submit payload', async () => {
    createPayrollClaim.mockResolvedValue({
      data: {
        id: 301,
        display_id: 'CLM-2026-301',
        claim_type: 'expense',
        status: 'Pending',
      },
    })

    const { submitMyPayrollClaimApiFirst } = await import('../payrollClaimsApi')
    await submitMyPayrollClaimApiFirst({
      type: 'expense',
      period: 'April 2026',
      periodValue: '2026-04',
      amount: 120.5,
      attachmentAvailable: true,
      attachmentName: 'master.pdf',
      attachmentMimeType: 'application/pdf',
      attachmentSizeBytes: 1024,
      attachmentId: 21,
      items: [
        {
          category: 'Mileage',
          expenseDate: '2026-04-15',
          amount: '120.50',
          lineNotes: 'Client visit route',
          fromLocation: 'HQ',
          toLocation: 'Site A',
          distanceKm: '40',
          ratePerKm: '0.85',
          destination: 'Site A',
          tripDateFrom: '2026-04-15',
          tripDateTo: '2026-04-15',
          billedPeriod: 'Apr 2026',
          claimant: 'Self',
          approvalNote: 'Approved by manager',
          attachmentId: 22,
          attachmentName: 'mileage.pdf',
          attachmentMimeType: 'application/pdf',
          attachmentSizeBytes: 2048,
        },
      ],
    })

    expect(createPayrollClaim).toHaveBeenCalledTimes(1)
    expect(createPayrollClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 120.5,
        attachment_available: true,
        attachment_name: 'master.pdf',
        attachment_mime_type: 'application/pdf',
        attachment_size_bytes: 1024,
        attachment_id: 21,
        items: [
          expect.objectContaining({
            from_location: 'HQ',
            to_location: 'Site A',
            distance_km: '40',
            rate_per_km: '0.85',
            destination: 'Site A',
            trip_date_from: '2026-04-15',
            trip_date_to: '2026-04-15',
            billed_period: 'Apr 2026',
            claimant: 'Self',
            approval_note: 'Approved by manager',
          }),
        ],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Idempotency-Key': expect.any(String),
        }),
      }),
    )
  })

  it('sanitizes free-text fields and clamps attachment metadata in submit payload', async () => {
    createPayrollClaim.mockResolvedValue({
      data: {
        id: 302,
        display_id: 'CLM-2026-302',
        claim_type: 'expense',
        status: 'Pending',
      },
    })

    const longText = 'a'.repeat(5000)
    const longMime = 'x'.repeat(200)
    const { submitMyPayrollClaimApiFirst } = await import('../payrollClaimsApi')
    await submitMyPayrollClaimApiFirst({
      type: 'expense',
      period: ' April 2026 ',
      periodValue: ' 2026-04 ',
      notes: `  ${longText}  `,
      attachmentName: `  ${'b'.repeat(400)}  `,
      attachmentMimeType: `  ${longMime}  `,
      attachmentSizeBytes: 999999999,
      attachmentId: -5,
      items: [
        {
          category: 'Mileage',
          expenseDate: '2026-04-15',
          amount: '10.5',
          lineNotes: `  ${'c'.repeat(5000)}  `,
          fromLocation: `  ${'d'.repeat(300)}  `,
          attachmentName: `  ${'e'.repeat(300)}  `,
          attachmentMimeType: `  ${'f'.repeat(300)}  `,
          attachmentSizeBytes: 999999999,
          attachmentId: 11.8,
        },
      ],
    })

    const payload = createPayrollClaim.mock.calls[0][0]
    expect(payload.period).toBe('April 2026')
    expect(payload.period_value).toBe('2026-04')
    expect(payload.notes.length).toBe(4000)
    expect(payload.attachment_name.length).toBe(255)
    expect(payload.attachment_mime_type.length).toBe(127)
    expect(payload.attachment_size_bytes).toBe(26214400)
    expect(payload.attachment_id).toBeNull()
    expect(payload.items[0].notes.length).toBe(4000)
    expect(payload.items[0].from_location.length).toBe(255)
    expect(payload.items[0].attachment_name.length).toBe(255)
    expect(payload.items[0].attachment_mime_type.length).toBe(127)
    expect(payload.items[0].attachment_size_bytes).toBe(26214400)
    expect(payload.items[0].attachment_id).toBe(11)
  })

  it('loads local autosave drafts as local-only entries', async () => {
    localStorage.setItem(
      'payroll-claim-autosave:3:salary',
      JSON.stringify({
        id: 'DRAFT-SALARY-20260419',
        claimType: 'salary',
        period: '2026-04',
        periodConfirmed: true,
        updatedAt: '2026-04-19T01:00:00.000Z',
      }),
    )

    const { loadLocalPayrollAutosaveDrafts } = await import('../payrollClaimsApi')
    const drafts = loadLocalPayrollAutosaveDrafts(3)

    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({
      id: 'DRAFT-SALARY-20260419',
      claimType: 'salary',
      localOnly: true,
      backendId: null,
    })
  })

  it('flushes queued draft retries and clears pending queue on success', async () => {
    savePayrollClaimDraftApi.mockResolvedValue({
      data: {
        id: 10,
        draft_id: 'DRAFT-EXPENSE-20260419',
        claim_type: 'expense',
        payload: { id: 'DRAFT-EXPENSE-20260419', claimType: 'expense' },
      },
    })

    const { enqueuePayrollDraftRetry, flushPayrollDraftRetryQueue } = await import(
      '../payrollClaimsApi'
    )

    enqueuePayrollDraftRetry(3, 'expense', {
      id: 'DRAFT-EXPENSE-20260419',
      claimType: 'expense',
      period: '2026-04',
    })

    const result = await flushPayrollDraftRetryQueue(3)
    expect(result).toMatchObject({ synced: 1, pending: 0 })
    expect(savePayrollClaimDraftApi).toHaveBeenCalledTimes(1)
    expect(savePayrollClaimDraftApi).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotency_key: expect.any(String),
        payload: expect.not.objectContaining({
          payrollSnapshot: expect.anything(),
        }),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Idempotency-Key': expect.any(String),
        }),
      }),
    )
    expect(localStorage.getItem('payroll-claim-autosave-retry:3')).toBeNull()
  })
})
