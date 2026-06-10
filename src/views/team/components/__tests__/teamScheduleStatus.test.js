import { describe, expect, it } from 'vitest'
import { resolveTeamScheduleStatus } from '../teamScheduleStatus'

const shiftWindows = {
  day_start: '07:00',
  day_end: '19:00',
  night_start: '19:00',
  night_end: '07:00',
}

describe('resolveTeamScheduleStatus', () => {
  it('labels an active published roster shift as on duty with shift and date', () => {
    const status = resolveTeamScheduleStatus({
      team: { id: 1, name: 'Alpha' },
      shiftWindows,
      now: new Date(2026, 3, 22, 8, 0, 0),
      rosterRows: [
        {
          date: '2026-04-22',
          shifts: {
            day: { team_id: 1, team: 'Alpha' },
          },
        },
      ],
    })

    expect(status).toBe('On Duty - Day 22-04-2026')
  })

  it('labels a later same-day assignment as next shift', () => {
    const status = resolveTeamScheduleStatus({
      team: { id: 1, name: 'Alpha' },
      shiftWindows,
      now: new Date(2026, 3, 22, 5, 0, 0),
      rosterRows: [
        {
          date: '2026-04-22',
          shifts: {
            day: { team_id: 1, team: 'Alpha' },
          },
        },
      ],
    })

    expect(status).toBe('Next Shift - Day 22-04-2026')
  })

  it('labels an overnight shift from the previous roster date as on duty after midnight', () => {
    const status = resolveTeamScheduleStatus({
      team: { id: 1, name: 'Alpha' },
      shiftWindows,
      now: new Date(2026, 3, 22, 1, 30, 0),
      rosterRows: [
        {
          date: '2026-04-21',
          shifts: {
            night: { team_id: 1, team: 'Alpha' },
          },
        },
      ],
    })

    expect(status).toBe('On Duty - Night 21-04-2026')
  })

  it('labels the first future assignment as upcoming shift', () => {
    const status = resolveTeamScheduleStatus({
      team: { id: 1, name: 'Alpha' },
      shiftWindows,
      now: new Date(2026, 3, 22, 20, 0, 0),
      rosterRows: [
        {
          date: '2026-04-23',
          shifts: {
            night: { team_id: 1, team: 'Alpha' },
          },
        },
      ],
    })

    expect(status).toBe('Upcoming Shift - Night 23-04-2026')
  })
})
