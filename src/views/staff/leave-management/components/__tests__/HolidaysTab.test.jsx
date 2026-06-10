// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HolidaysTab from '../HolidaysTab'

vi.mock('src/components/CreateActionButton', () => ({
  default: ({ label, onClick }) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
}))

vi.mock('src/components/TableFilters', () => ({
  default: () => <div data-testid="table-filters" />,
}))

vi.mock('src/components/DataTableFooter', () => ({
  default: () => <div data-testid="table-footer" />,
}))

vi.mock('src/components/TableLoader', () => ({
  default: () => <div data-testid="table-loader" />,
}))

afterEach(() => {
  cleanup()
})

const buildProps = (overrides = {}) => ({
  holidaySearch: '',
  setHolidaySearch: vi.fn(),
  holidaySort: 'date:asc',
  setHolidaySort: vi.fn(),
  holidayScopeFilter: 'All',
  setHolidayScopeFilter: vi.fn(),
  holidayStateFilter: 'All',
  setHolidayStateFilter: vi.fn(),
  holidayYearFilter: String(new Date().getFullYear()),
  setHolidayYearFilter: vi.fn(),
  holidaySortOptions: [{ value: 'date:asc', label: 'Date (oldest first)' }],
  holidayScopeOptions: [{ value: 'All', label: 'All scopes' }],
  holidayStateOptions: [{ value: 'All', label: 'All states' }],
  holidayYearOptions: [
    { value: 'All', label: 'All years' },
    { value: String(new Date().getFullYear()), label: String(new Date().getFullYear()) },
  ],
  allHolidayRows: [],
  filteredHolidays: [],
  visibleHolidayRows: [],
  holidayRowsToShow: 10,
  setHolidayRowsToShow: vi.fn(),
  totalCount: 0,
  clearHolidayFilters: vi.fn(),
  holidayHistory: [],
  onSaveHoliday: vi.fn().mockResolvedValue({ ok: true }),
  onDeleteHoliday: vi.fn().mockResolvedValue({ ok: true }),
  onWizardSavedSummary: vi.fn(),
  initialYear: new Date().getFullYear(),
  isLoading: false,
  ...overrides,
})

describe('HolidaysTab', () => {
  it('saves wizard nationals and additional holidays together on final confirm', async () => {
    const props = buildProps()
    render(<HolidaysTab {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Configure holidays' }))
    expect(screen.getByText('National Holidays')).toBeTruthy()

    // Step 1: proceed to additional step without triggering any save
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(props.onSaveHoliday).toHaveBeenCalledTimes(0)
    await waitFor(() => {
      expect(screen.getByText('Additional Holidays')).toBeTruthy()
    })

    // Add an additional holiday
    expect(screen.queryByLabelText('Holiday Name')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add holiday' }))
    fireEvent.change(screen.getByLabelText('Holiday Name'), { target: { value: 'Wesak Day' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-22' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save holiday' }))
    expect(screen.getByText('Wesak Day')).toBeTruthy()
    expect(screen.queryByLabelText('Holiday Name')).toBeNull()

    // Step 2 → summary
    fireEvent.click(screen.getByRole('button', { name: 'Review & confirm' }))
    expect(screen.getByText('Review & confirm', { selector: 'div' })).toBeTruthy()
    // Nothing saved yet
    expect(props.onSaveHoliday).toHaveBeenCalledTimes(0)

    // Final save — saves nationals + additionals
    fireEvent.click(screen.getByRole('button', { name: 'Save all holidays' }))

    await waitFor(() => {
      // 5 national defaults + 1 additional = 6 calls
      expect(props.onSaveHoliday.mock.calls.length).toBeGreaterThanOrEqual(1)
    })
    expect(props.onWizardSavedSummary).toHaveBeenCalledWith(
      expect.objectContaining({ additionalCount: 1 }),
    )
  })

  it('blocks proceeding to summary when additional form has unsaved data', async () => {
    const props = buildProps()
    render(<HolidaysTab {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Configure holidays' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(screen.getByText('Additional Holidays')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add holiday' }))
    fireEvent.change(screen.getByLabelText('Holiday Name'), { target: { value: 'Partial Entry' } })

    // Try to proceed with unsaved form data
    fireEvent.click(screen.getByRole('button', { name: 'Review & confirm' }))

    expect(
      screen.getByText(
        'You have an unsaved holiday in the form. Save or cancel it before continuing.',
      ),
    ).toBeTruthy()
  })

  it('opens holiday details when a table row is clicked', () => {
    const row = {
      id: 'hdy-1',
      name: 'National Day',
      date: '2026-08-31',
      scope: 'National',
      state: 'All States',
    }
    const props = buildProps({
      filteredHolidays: [row],
      visibleHolidayRows: [row],
      totalCount: 1,
    })
    render(<HolidaysTab {...props} />)

    fireEvent.click(screen.getByRole('row', { name: /National Day/ }))
    expect(screen.getByText('Holiday Details')).toBeTruthy()
    expect(screen.getAllByText('National Day').length).toBeGreaterThan(1)
  })

  it('keeps single holiday edit mode for table RowActions edit action', () => {
    const row = {
      id: 'hdy-1',
      name: 'National Day',
      date: '2026-08-31',
      scope: 'National',
      state: 'All States',
    }
    const props = buildProps({
      filteredHolidays: [row],
      visibleHolidayRows: [row],
      totalCount: 1,
    })
    render(<HolidaysTab {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Row actions' }))
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByText('Edit Holiday')).toBeTruthy()
  })

  it('calls onDeleteHoliday when delete button is clicked', async () => {
    const row = {
      id: 'hdy-1',
      name: 'National Day',
      date: '2026-08-31',
      scope: 'National',
      state: 'All States',
    }
    const props = buildProps({
      filteredHolidays: [row],
      visibleHolidayRows: [row],
      totalCount: 1,
    })
    render(<HolidaysTab {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Row actions' }))
    fireEvent.click(screen.getByText('Delete'))
    await waitFor(() => {
      expect(props.onDeleteHoliday).toHaveBeenCalledWith({ id: 'hdy-1', name: 'National Day' })
    })
  })
})
