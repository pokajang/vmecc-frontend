import { describe, expect, it } from 'vitest'
import { resolveClaimListDisplayAmount, toDraftRecord } from '../payrollUtils'

describe('payrollUtils salary no-fallback resolvers', () => {
  it('uses explicit projected net payout for salary claim list display', () => {
    expect(
      resolveClaimListDisplayAmount({
        type: 'salary',
        amount: 9999,
        projectedNetPayout: 1888.4,
      }),
    ).toBe(1888.4)
  })

  it('returns zero for salary claim list display when projected net payout is missing', () => {
    expect(
      resolveClaimListDisplayAmount({
        type: 'salary',
        amount: 2500,
        payrollSnapshot: { net: 2100 },
      }),
    ).toBe(0)
  })

  it('does not apply salary fallback math for salary draft display amount', () => {
    const draft = toDraftRecord(
      {
        id: 'draft-salary-1',
        claimType: 'salary',
        period: '2026-04',
        periodConfirmed: true,
        payrollSnapshot: { net: 2100 },
        savedItems: [
          {
            claimType: 'Addition',
            amount: '125.5',
            claimDate: '2026-04-15',
          },
        ],
        draftItem: {},
      },
      'salary',
    )

    expect(draft).toBeTruthy()
    expect(draft.displayAmount).toBe(0)
  })
})
