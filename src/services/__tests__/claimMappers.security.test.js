import { describe, expect, it } from 'vitest'
import { toUiClaimRow } from '../payrollClaims/claimMappers'

describe('payroll claim mapper security defaults', () => {
  it('fails closed when the backend omits action capabilities', () => {
    const row = toUiClaimRow({
      id: 10,
      public_id: '01JTESTPAYROLLPUBLICID001',
      display_id: 'CLM-2026-001',
      user_id: 22,
      claim_type: 'salary',
      status: 'Approved',
    })

    expect(row.actionPermissions.edit.enabled).toBe(false)
    expect(row.actionPermissions.cancel.enabled).toBe(false)
    expect(row.actionPermissions.delete.enabled).toBe(false)
    expect(row.actionPermissions.downloadAttachment.enabled).toBe(false)
    expect(row.actionPermissions.markPaid.enabled).toBe(false)
    expect(row.actionPermissions.unmarkPaid.enabled).toBe(false)
  })

  it('uses the opaque backend route key when supplied', () => {
    const row = toUiClaimRow({
      id: 10,
      record_key: '01JTESTPAYROLLPUBLICID001',
      public_id: '01JTESTPAYROLLPUBLICID001',
      display_id: 'CLM-2026-001',
      user_id: 22,
      claim_type: 'salary',
    })

    expect(row.recordKey).toBe('01JTESTPAYROLLPUBLICID001')
  })
})
