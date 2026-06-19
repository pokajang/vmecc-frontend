// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RosterFilter from '../RosterFilter'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const baseProps = {
  rangeType: 'week',
  onRangeChange: vi.fn(),
  dateFilter: '2026-06-11',
  onDateChange: vi.fn(),
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  onStartDateChange: vi.fn(),
  onEndDateChange: vi.fn(),
  teamFilter: 'All',
  onTeamChange: vi.fn(),
  search: '',
  onSearchChange: vi.fn(),
  monthOptions: [],
  selectedMonths: [],
  onMonthToggle: vi.fn(),
  onClear: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
  teams: [{ id: 1, name: 'Alpha' }],
}

const renderFilter = (props = {}) => render(<RosterFilter {...baseProps} {...props} />)

it('renders visible labels for roster filter controls and preserves callbacks', () => {
  renderFilter()

  expect(screen.getByText('Range')).toBeTruthy()
  expect(screen.getByText('Date')).toBeTruthy()
  expect(screen.getByText('Team')).toBeTruthy()
  expect(screen.getByText('Search')).toBeTruthy()
  expect(screen.getByText('Active filters:')).toBeTruthy()

  fireEvent.click(screen.getByLabelText('Previous roster period'))
  fireEvent.click(screen.getByLabelText('Next roster period'))
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  fireEvent.change(screen.getByPlaceholderText('Search team or date'), {
    target: { value: 'Alpha' },
  })

  expect(baseProps.onPrev).toHaveBeenCalledTimes(1)
  expect(baseProps.onNext).toHaveBeenCalledTimes(1)
  expect(baseProps.onClear).toHaveBeenCalledTimes(1)
  expect(baseProps.onSearchChange).toHaveBeenCalledWith('Alpha')
})

it('clears active roster filter chips through existing setters', () => {
  renderFilter({ search: 'alpha', teamFilter: 'Alpha' })

  fireEvent.click(screen.getByRole('button', { name: 'Clear Search filter' }))
  fireEvent.click(screen.getByRole('button', { name: 'Clear Team filter' }))

  expect(baseProps.onSearchChange).toHaveBeenCalledWith('')
  expect(baseProps.onTeamChange).toHaveBeenCalledWith('All')
})

it('renders custom date labels and callbacks', () => {
  renderFilter({ rangeType: 'custom' })

  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-06-03' } })
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-06-21' } })

  expect(baseProps.onStartDateChange).toHaveBeenCalledWith('2026-06-03')
  expect(baseProps.onEndDateChange).toHaveBeenCalledWith('2026-06-21')
})
