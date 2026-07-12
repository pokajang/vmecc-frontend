// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RosterManagement from '../RosterManagement'

vi.mock('react-redux', () => ({
  useSelector: () => ({ name: 'Admin', permissions: ['rosters.manage'] }),
}))

vi.mock('../RosterStat', () => ({
  default: () => <div>Roster overview</div>,
}))

vi.mock('../RosterFilter', () => ({
  default: () => <div>Roster filters</div>,
}))

vi.mock('../RosterCard', () => ({
  default: () => <div>Desktop roster matrix</div>,
}))

vi.mock('../RosterMobileDayList', () => ({
  default: () => <div>Mobile roster days</div>,
}))

vi.mock('../useRosterState', () => ({
  default: () => ({
    state: {
      stats: {},
      monthlyStats: [],
      teams: [{ id: 1, name: 'Alpha' }],
      allShifts: [{ slug: 'day', name: 'Day' }],
      teamStatuses: {},
      loading: false,
      rangeType: 'month',
      dateFilter: '2026-06-11',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      teamFilter: 'All',
      search: '',
      selectedMonths: ['2026-06'],
      editMode: false,
      isSavingDraft: false,
      isPublishing: false,
      isDirty: false,
      statusMessage: null,
      error: null,
      monthOptions: [{ value: '2026-06', label: 'June 2026' }],
      monthWeekGroups: [{ month: 'June 2026', weeks: [{ rows: [] }] }],
      filteredRows: [],
      scopeLabel: 'June 2026',
      viewPublishStatus: 'published',
    },
    actions: {
      setDateFilter: vi.fn(),
      setStartDate: vi.fn(),
      setEndDate: vi.fn(),
      setTeamFilter: vi.fn(),
      setSearch: vi.fn(),
      setEditMode: vi.fn(),
      handleRangeChange: vi.fn(),
      handleClear: vi.fn(),
      handleAssign: vi.fn(),
      handleSaveDraft: vi.fn(),
      handlePublish: vi.fn(),
      handleCancelEdit: vi.fn(),
      handlePrev: vi.fn(),
      handleNext: vi.fn(),
      onMonthToggle: vi.fn(),
    },
  }),
}))

afterEach(() => cleanup())

it('uses route-backed nav tabs without tab roles and marks the active route current', () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/roster/schedule']}>
      <RosterManagement />
    </MemoryRouter>,
  )

  expect(container.querySelector('[role="tablist"]')).toBeNull()
  expect(container.querySelector('[role="presentation"]')).toBeNull()
  const setRosterNav = screen
    .getAllByText('Roster Schedule')
    .find((element) => element.getAttribute('aria-current') === 'page')
  expect(setRosterNav).toBeTruthy()
  expect(screen.getByText('Overview').getAttribute('aria-current')).toBeNull()

  fireEvent.click(screen.getByText('Overview'))
  expect(screen.getByText('Overview').getAttribute('aria-current')).toBe('page')
})
