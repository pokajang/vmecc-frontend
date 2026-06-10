// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import FormActionGroup from 'src/components/FormActionGroup'
import GroupedTableHeaderRow, { GroupTotalBadge } from 'src/components/GroupedTableHeader'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('UI debt shared primitives', () => {
  it('renders leading form actions before primary actions in the split action row', () => {
    render(
      <FormActionGroup leading={<button type="button">Back</button>}>
        <button type="button">Save</button>
      </FormActionGroup>,
    )

    const group = screen.getByRole('group', { name: 'Form actions' })
    expect(group.className).toContain('action-row-thumb--split')
    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Back', 'Save'])
  })

  it('keeps search inline while exposing structured filters through a mobile drawer trigger', () => {
    vi.useFakeTimers()
    const handleSearchChange = vi.fn()

    render(
      <TableFilters
        searchValue=""
        onSearchChange={handleSearchChange}
        periodValue="30"
        periodOptions={[
          { value: 'all', label: 'All time' },
          { value: '30', label: 'Last 30 days' },
        ]}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: 'approved',
            onChange: vi.fn(),
            options: [
              { value: 'all', label: 'All statuses' },
              { value: 'approved', label: 'Approved' },
            ],
          },
        ]}
      />,
    )

    const openFiltersButton = screen.getByRole('button', { name: 'Open filters' })
    expect(openFiltersButton.textContent).toContain('2')

    fireEvent.change(screen.getAllByPlaceholderText('Search')[0], {
      target: { value: 'allowance' },
    })
    vi.advanceTimersByTime(260)
    expect(handleSearchChange).toHaveBeenCalledWith('allowance')

    fireEvent.click(openFiltersButton)
    expect(screen.getByText('Filters')).toBeTruthy()
    expect(screen.getByText('Period')).toBeTruthy()
    expect(screen.getByText('Status')).toBeTruthy()
  })

  it('keeps disabled row actions focusable and exposes disabled reasons', () => {
    const handleDelete = vi.fn()
    const disabledReason = 'Please cancel this claim before deleting it.'

    render(
      <RowActions
        items={[
          {
            key: 'delete',
            label: 'Delete',
            disabled: true,
            disabledReason,
            onClick: handleDelete,
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Row actions' }))

    const deleteAction = screen.getByText('Delete').closest('[aria-disabled]')
    expect(deleteAction.getAttribute('aria-disabled')).toBe('true')
    expect(deleteAction.getAttribute('aria-label')).toBe(`Delete. ${disabledReason}`)
    expect(deleteAction.getAttribute('title')).toBe(disabledReason)
    expect(deleteAction.className).not.toContain('disabled')
    expect(deleteAction.getAttribute('tabindex')).toBe('0')

    fireEvent.click(deleteAction)
    expect(handleDelete).not.toHaveBeenCalled()
  })

  it('renders grouped table headers with count and total badges', () => {
    render(
      <table>
        <tbody>
          <GroupedTableHeaderRow colSpan={4} label="April 2026" count={3} testId="month-group">
            <GroupTotalBadge label="Total" value="12h" title="Total approved hours" />
          </GroupedTableHeaderRow>
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('month-group-month').textContent).toBe('APRIL 2026')
    expect(screen.getByText('3 records')).toBeTruthy()
    expect(screen.getByText('12h')).toBeTruthy()
    expect(screen.getByTitle('Total approved hours')).toBeTruthy()
    expect(screen.getByRole('cell').getAttribute('colspan')).toBe('4')
  })
})
