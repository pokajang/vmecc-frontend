// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RosterMobileDayList from '../RosterMobileDayList'

afterEach(() => cleanup())

const monthWeekGroups = [
  {
    month: 'June 2026',
    weeks: [
      {
        rows: [
          {
            date: '2026-06-11',
            dayName: 'Thursday',
            shifts: {
              day: { team: 'Alpha', team_id: 1, status: 'published' },
              night: { status: 'draft' },
            },
          },
        ],
      },
    ],
  },
]

const shifts = [
  { slug: 'day', name: 'Day' },
  { slug: 'night', name: 'Night', builtin: false },
]

it('renders mobile roster days with month, date, shifts, assigned teams, and draft state', () => {
  render(<RosterMobileDayList monthWeekGroups={monthWeekGroups} allShifts={shifts} />)

  expect(screen.getByText('June 2026')).toBeTruthy()
  expect(screen.getByText('Thursday')).toBeTruthy()
  expect(screen.getByText('2026-06-11')).toBeTruthy()
  expect(screen.getByText('Day')).toBeTruthy()
  expect(screen.getByText('Night')).toBeTruthy()
  expect(screen.getByText('Alpha')).toBeTruthy()
  expect(screen.getByText('Unassigned')).toBeTruthy()
  expect(screen.getByText('Draft')).toBeTruthy()
})

it('uses the existing assignment handler through the mobile editor in edit mode', () => {
  const handleAssign = vi.fn()

  render(
    <RosterMobileDayList
      monthWeekGroups={monthWeekGroups}
      allShifts={shifts}
      editMode
      teams={[
        { id: 1, name: 'Alpha' },
        { id: 2, name: 'Bravo' },
      ]}
      onAssign={handleAssign}
    />,
  )

  fireEvent.click(screen.getAllByRole('button', { name: 'Change' })[1])
  fireEvent.change(screen.getByLabelText('Assign 2026-06-11 Night'), {
    target: { value: '2' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

  expect(handleAssign).toHaveBeenCalledWith('2026-06-11', 'night', '2')
})
