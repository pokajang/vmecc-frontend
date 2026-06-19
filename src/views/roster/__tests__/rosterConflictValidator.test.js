import { describe, expect, it } from 'vitest'
import { validateRosterAssignment } from '../rosterConflictValidator'

describe('validateRosterAssignment', () => {
  const roster = [
    {
      date: '2026-06-11',
      shifts: {
        day: { team_id: 1, team: 'Alpha' },
        night: { team_id: 2, team: 'Bravo' },
      },
    },
  ]

  it('rejects assigning the same team to another shift on the same date', () => {
    expect(
      validateRosterAssignment({
        roster,
        date: '2026-06-11',
        shiftSlug: 'night',
        teamId: 1,
      }),
    ).toMatchObject({
      ok: false,
      field: '2026-06-11:night',
      conflictShift: 'day',
    })
  })

  it('allows unassignment and different-team assignments', () => {
    expect(
      validateRosterAssignment({
        roster,
        date: '2026-06-11',
        shiftSlug: 'night',
        teamId: null,
      }).ok,
    ).toBe(true)
    expect(
      validateRosterAssignment({
        roster,
        date: '2026-06-11',
        shiftSlug: 'night',
        teamId: 3,
      }).ok,
    ).toBe(true)
  })
})
