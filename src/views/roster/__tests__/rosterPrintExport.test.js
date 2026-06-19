import { describe, expect, it, vi } from 'vitest'
import { exportRosterSchedule, getRosterShiftDefs } from '../rosterPrintExport'

describe('rosterPrintExport', () => {
  it('uses fallback shift definitions when no shift setup is available', () => {
    expect(getRosterShiftDefs([])).toEqual([
      { slug: 'day', name: 'Day' },
      { slug: 'night', name: 'Night' },
    ])
  })

  it('exports schedule and monthly summary sheets without changing row data', () => {
    const exportWorkbookFn = vi.fn()

    exportRosterSchedule({
      filteredRows: [
        {
          date: '2026-06-11',
          dayName: 'Thursday',
          status: 'published',
          shifts: {
            day: { team: 'Alpha' },
            night: null,
          },
        },
      ],
      allShifts: [
        { slug: 'day', name: 'Day' },
        { slug: 'night', name: 'Night' },
      ],
      teams: [
        { id: 1, name: 'Alpha' },
        { id: 2, name: 'Bravo' },
      ],
      scopeLabel: 'June 2026',
      exportedBy: 'Admin',
      exportWorkbookFn,
    })

    expect(exportWorkbookFn).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringMatching(/^roster-schedule-\d{4}-\d{2}-\d{2}\.csv$/),
        sheets: expect.arrayContaining([
          expect.objectContaining({ name: 'Schedule' }),
          expect.objectContaining({ name: 'Monthly Summary' }),
        ]),
      }),
    )
    const scheduleSheet = exportWorkbookFn.mock.calls[0][0].sheets[0]
    expect(scheduleSheet.rows).toContainEqual([
      '2026-06-11',
      'Thursday',
      'Alpha',
      'Published',
      '-',
      '-',
    ])
  })
})
