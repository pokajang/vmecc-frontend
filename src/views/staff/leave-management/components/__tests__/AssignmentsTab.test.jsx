// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import AssignmentsTab from '../AssignmentsTab'

afterEach(() => {
  cleanup()
})

vi.mock('src/components/RowActions', () => ({
  default: ({ items = [] }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.key || item.label}
          type="button"
          disabled={Boolean(item.disabled)}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../AssignmentCreateModal', () => ({
  default: ({ visible, selectedStaff, selectedYear }) =>
    visible ? (
      <div data-testid="assignment-create-modal">
        {selectedStaff?.name || 'No staff'} - {selectedYear}
      </div>
    ) : null,
}))

const assignmentRows = [
  {
    id: 'asg-1',
    employee: 'Jang',
    team: 'Alpha',
    year: 2026,
    leaveType: 'Annual Leave',
    entitlement: 12,
    used: 3,
    pending: 1,
  },
  {
    id: 'asg-2',
    employee: 'Jang',
    team: 'Alpha',
    year: 2026,
    leaveType: 'Medical Leave',
    entitlement: 14,
    used: 2,
    pending: 0,
  },
]

const defaultProps = {
  assignmentSearch: '',
  setAssignmentSearch: vi.fn(),
  assignmentSort: 'employee:asc',
  setAssignmentSort: vi.fn(),
  assignmentTypeFilter: 'All',
  setAssignmentTypeFilter: vi.fn(),
  assignmentTeamFilter: 'All',
  setAssignmentTeamFilter: vi.fn(),
  assignmentSortOptions: [{ value: 'employee:asc', label: 'Employee A-Z' }],
  assignmentTypeOptions: [{ value: 'All', label: 'All leave types' }],
  assignmentTeamOptions: [{ value: 'All', label: 'All teams' }],
  filteredAssignments: assignmentRows,
  visibleAssignmentRows: assignmentRows,
  assignmentRowsToShow: 5,
  setAssignmentRowsToShow: vi.fn(),
  totalCount: assignmentRows.length,
  clearAssignmentFilters: vi.fn(),
  staffOptions: [{ key: 'staff-1', name: 'Jang', team: 'Alpha', isActive: true }],
  staffLoading: false,
  existingAssignments: assignmentRows,
  assignmentHistory: assignmentRows,
  onCreateAssignment: vi.fn(async () => ({ ok: true })),
}

describe('AssignmentsTab mobile entitlement cards', () => {
  it('renders phone-only employee summary cards and keeps desktop tables available', () => {
    const { container } = render(<AssignmentsTab {...defaultProps} />)

    expect(screen.getByText('Entitlement assignments')).toBeTruthy()
    expect(screen.getAllByText('Jang').length).toBeGreaterThan(0)
    expect(screen.getByText('Annual Leave balance')).toBeTruthy()
    expect(screen.getByText('Annual Leave used')).toBeTruthy()
    expect(container.querySelector('.d-none.d-md-block table')).toBeTruthy()
  })

  it('opens assignment detail from the mobile card open region', () => {
    render(<AssignmentsTab {...defaultProps} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: /Open leave assignment details for Jang/i,
      })[0],
    )

    expect(screen.getByText('Leave Assignment Details')).toBeTruthy()
    expect(screen.getAllByText('Medical Leave').length).toBeGreaterThan(0)
  })

  it('opens the existing edit modal from the card action without opening detail', () => {
    render(<AssignmentsTab {...defaultProps} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])

    expect(screen.getByTestId('assignment-create-modal').textContent).toContain('Jang - 2026')
    expect(screen.queryByText('Leave Assignment Details')).toBeNull()
  })
})
