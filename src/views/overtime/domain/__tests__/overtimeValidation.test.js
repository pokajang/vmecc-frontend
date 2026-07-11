import { describe, expect, it } from 'vitest'
import { findOvertimeWindowConflict, validateOvertimeSubmission } from '../overtimeValidation'

const baseForm = {
  overtimeType: 'weekday',
  overtimeTypeConfirmed: true,
  claimDate: '2026-04-13',
  startTime: '09:00',
  endTime: '10:00',
  isOvernight: false,
  isOvernightConfirmed: false,
  reason: 'Completed documented shift handover.',
}

describe('overtimeValidation', () => {
  it('accepts a valid normal window and allows adjacent claims', () => {
    const result = validateOvertimeSubmission({
      form: baseForm,
      records: [
        {
          id: 'OT-1',
          serverId: 1,
          claimDate: '2026-04-13',
          startTime: '10:00',
          endTime: '11:00',
          isOvernight: false,
          status: 'Pending',
        },
      ],
    })
    expect(result.errors).toEqual({})
  })

  it('requires explicit overnight confirmation and rejects excessive windows', () => {
    expect(
      validateOvertimeSubmission({ form: { ...baseForm, startTime: '18:00', endTime: '02:00' } })
        .errors.window,
    ).toContain('Confirm')
    expect(
      validateOvertimeSubmission({
        form: { ...baseForm, startTime: '08:00', endTime: '01:00', isOvernightConfirmed: true },
      }).errors.window,
    ).toContain('16 hours')
  })

  it('detects normal and overnight overlaps while excluding cancelled claims', () => {
    const records = [
      {
        id: 'OT-overnight',
        serverId: 1,
        claimDate: '2026-04-13',
        startTime: '22:00',
        endTime: '02:00',
        isOvernight: true,
        status: 'Pending',
      },
      {
        id: 'OT-cancelled',
        serverId: 2,
        claimDate: '2026-04-13',
        startTime: '09:00',
        endTime: '12:00',
        isOvernight: false,
        status: 'Cancelled',
      },
    ]
    expect(
      findOvertimeWindowConflict({
        claimDate: '2026-04-14',
        startTime: '01:00',
        endTime: '03:00',
        isOvernight: false,
        records,
      })?.id,
    ).toBe('OT-overnight')
    expect(
      findOvertimeWindowConflict({
        claimDate: '2026-04-13',
        startTime: '10:00',
        endTime: '11:00',
        isOvernight: false,
        records,
      }),
    ).toBeNull()
  })
})
