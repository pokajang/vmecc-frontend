// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CreateActionButton from 'src/components/CreateActionButton'
import FormActionGroup from 'src/components/FormActionGroup'
import GroupedTableHeaderRow, { GroupTotalBadge } from 'src/components/GroupedTableHeader'
import MobileRecordList from 'src/components/MobileRecordList'
import ModuleNavTabs from 'src/components/ModuleNavTabs'
import BulkSelectionActionBar from 'src/components/BulkSelectionActionBar'
import RecordCard from 'src/components/RecordCard'
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import RouteNavTabs from 'src/components/RouteNavTabs'
import RowActionCell from 'src/components/RowActionCell'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import WorkflowStatusSummary from 'src/components/WorkflowStatusSummary'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('UI debt shared primitives', () => {
  it('keeps create actions inline by default and supports page-level primary actions', () => {
    render(
      <>
        <CreateActionButton label="Inline add" onClick={vi.fn()} />
        <CreateActionButton label="Primary add" importance="primary" onClick={vi.fn()} />
      </>,
    )

    expect(screen.getByRole('button', { name: 'Inline add' }).className).toContain('bg-transparent')
    expect(screen.getByRole('button', { name: 'Primary add' }).className).toContain('btn-primary')
  })

  it('renders mobile record cards with keyboard activation and action slots', () => {
    const handleOpen = vi.fn()

    render(
      <MobileRecordList
        sections={[
          {
            key: 'april',
            label: 'April 2026',
            summary: '2 records',
            items: [
              {
                key: 'LV-001',
                title: 'LV-001',
                eyebrow: 'Annual Leave',
                subtitle: 'Family event',
                status: <span>Pending</span>,
                ariaLabel: 'Open leave record LV-001 summary',
                onOpen: handleOpen,
                fields: [
                  { key: 'start', label: 'Start', value: '15 Apr 2026' },
                  { key: 'days', label: 'Days', value: '1' },
                ],
                actions: <button type="button">Actions</button>,
              },
            ],
          },
        ]}
      />,
    )

    const card = screen.getByRole('button', { name: 'Open leave record LV-001 summary' })
    expect(screen.getByText('April 2026')).toBeTruthy()
    expect(screen.getByText('Annual Leave')).toBeTruthy()
    expect(screen.getByText('15 Apr 2026')).toBeTruthy()

    fireEvent.keyDown(card, { key: 'Enter' })
    fireEvent.keyDown(card, { key: ' ' })
    expect(handleOpen).toHaveBeenCalledTimes(2)
  })

  it('renders field-rich mobile records as list-group rows', () => {
    render(
      <MobileRecordList
        variant="list-group"
        sections={[
          {
            key: 'records',
            items: [
              {
                key: 'REC-1',
                title: 'REC-1',
                subtitle: 'Detailed record',
                fields: [
                  { key: 'status', label: 'Status', value: 'Pending' },
                  { key: 'amount', label: 'Amount', value: 'RM 10.00' },
                ],
              },
            ],
          },
        ]}
      />,
    )

    expect(document.querySelector('.list-group')).toBeTruthy()
    expect(document.querySelectorAll('.list-group-item')).toHaveLength(1)
    expect(screen.getByText('RM 10.00')).toBeTruthy()
  })

  it('keeps record card action slots separate from the open region', () => {
    const handleOpen = vi.fn()
    const handleAction = vi.fn()

    render(
      <RecordCard
        variant="list-group"
        item={{
          key: 'REC-1',
          title: 'REC-1',
          ariaLabel: 'Open record REC-1',
          onOpen: handleOpen,
          actions: (
            <button type="button" onClick={handleAction}>
              Delete
            </button>
          ),
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(handleAction).toHaveBeenCalledTimes(1)
    expect(handleOpen).not.toHaveBeenCalled()
  })

  it('toggles expandable list-group rows by pointer and keyboard without action leakage', () => {
    const handleToggle = vi.fn()
    const handleAction = vi.fn()

    const { rerender } = render(
      <RecordCard
        variant="list-group"
        item={{
          key: 'REC-1',
          title: 'REC-1',
          ariaLabel: 'Toggle record REC-1 details',
          expanded: false,
          onToggle: handleToggle,
          expandedContent: <div>Expanded details</div>,
          actions: (
            <button type="button" onClick={handleAction}>
              Download
            </button>
          ),
        }}
      />,
    )

    const row = screen.getByRole('button', { name: 'Toggle record REC-1 details' })
    expect(row.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(row)
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.keyDown(row, { key: ' ' })
    expect(handleToggle).toHaveBeenCalledTimes(3)

    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(handleAction).toHaveBeenCalledTimes(1)
    expect(handleToggle).toHaveBeenCalledTimes(3)

    rerender(
      <RecordCard
        variant="list-group"
        item={{
          key: 'REC-1',
          title: 'REC-1',
          ariaLabel: 'Toggle record REC-1 details',
          expanded: true,
          onToggle: handleToggle,
          expandedContent: <div>Expanded details</div>,
        }}
      />,
    )
    expect(
      screen
        .getByRole('button', { name: 'Toggle record REC-1 details' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    expect(screen.getByText('Expanded details')).toBeTruthy()
  })

  it('stops row action cell events from opening the parent row', () => {
    const handleRowOpen = vi.fn()
    const handleAction = vi.fn()

    render(
      <table>
        <tbody>
          <tr onClick={handleRowOpen}>
            <td>REC-1</td>
            <RowActionCell>
              <button type="button" onClick={handleAction}>
                Edit
              </button>
            </RowActionCell>
          </tr>
        </tbody>
      </table>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(handleAction).toHaveBeenCalledTimes(1)
    expect(handleRowOpen).not.toHaveBeenCalled()
    expect(screen.getAllByRole('cell')[1].className).toContain('row-action-cell')
  })

  it('renders bulk selection action bars with summary, controls, actions, and mobile tray class', () => {
    render(
      <BulkSelectionActionBar
        label="2 records selected"
        controls={<button type="button">Approval</button>}
        summary={<div>2 eligible records</div>}
        actions={<button type="button">Approve selected</button>}
        mobileSticky
      />,
    )

    expect(screen.getByText('2 records selected')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approval' })).toBeTruthy()
    expect(screen.getByText('2 eligible records')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approve selected' })).toBeTruthy()
    expect(document.querySelector('.bulk-selection-action-bar-spacer')).toBeTruthy()
    expect(document.querySelector('.bulk-selection-action-bar--mobile-sticky')).toBeTruthy()
  })

  it('composes responsive record collections from mobile sections, desktop render, and footer', () => {
    render(
      <ResponsiveRecordCollection
        mobileSections={[
          {
            key: 'records',
            items: [{ key: 'REC-1', title: 'REC-1' }],
          },
        ]}
        mobileVariant="list-group"
        renderDesktop={<div className="d-none d-md-block">Desktop table</div>}
        footer={<div>10 total records</div>}
      >
        <div>Selected bar</div>
      </ResponsiveRecordCollection>,
    )

    expect(screen.getByText('Selected bar')).toBeTruthy()
    expect(screen.getByText('REC-1')).toBeTruthy()
    expect(screen.getByText('Desktop table')).toBeTruthy()
    expect(screen.getByText('10 total records')).toBeTruthy()
    expect(document.querySelector('.list-group')).toBeTruthy()
  })

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

  it('renders compact sticky form actions with a mobile status message', () => {
    render(
      <FormActionGroup
        leading={<button type="button">Reset</button>}
        mobileVariant="compact-sticky"
        statusMessage="Saved locally. Backend sync pending"
      >
        <button type="button">Save Draft</button>
        <button type="button">Review Inspections</button>
      </FormActionGroup>,
    )

    const group = screen.getByRole('group', { name: 'Form actions' })
    expect(group.className).toContain('action-row-thumb--compact-sticky')
    expect(group.className).toContain('action-row-thumb--has-leading')
    expect(screen.getByText('Saved locally. Backend sync pending')).toBeTruthy()
    expect(document.querySelector('.action-row-thumb-spacer--compact')).toBeTruthy()
    expect(document.querySelector('.action-row-thumb-spacer--compact-with-leading')).toBeTruthy()
    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Reset', 'Save Draft', 'Review Inspections'])
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
    const expectedTriggerSizes = ['calc(1.5em + 0.75rem + 2px)', 'calc(1.5em + 2px + 0.75rem)']
    expect(expectedTriggerSizes).toContain(openFiltersButton.style.width)
    expect(expectedTriggerSizes).toContain(openFiltersButton.style.height)
    expect(screen.getByText('Active filters:')).toBeTruthy()
    expect(screen.getAllByText('Last 30 days').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)

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

  it('clears active filter chips through the existing reset paths', () => {
    const handleSearchChange = vi.fn()
    const handlePeriodChange = vi.fn()
    const handleStatusChange = vi.fn()

    render(
      <TableFilters
        searchValue="alpha"
        onSearchChange={handleSearchChange}
        periodValue="30"
        onPeriodChange={handlePeriodChange}
        periodOptions={[
          { value: 'all', label: 'All time' },
          { value: '30', label: 'Last 30 days' },
        ]}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: 'approved',
            onChange: handleStatusChange,
            options: [
              { value: 'all', label: 'All statuses' },
              { value: 'approved', label: 'Approved' },
            ],
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear Search filter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear Period filter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear Status filter' }))

    expect(handleSearchChange).toHaveBeenCalledWith('')
    expect(handlePeriodChange).toHaveBeenCalledWith('all')
    expect(handleStatusChange).toHaveBeenCalledWith('all')
  })

  it('uses explicit table filter defaults before falling back to the first option', () => {
    render(
      <TableFilters
        searchValue=""
        periodValue="all"
        filters={[
          {
            key: 'sort',
            label: 'Sort',
            value: 'latest',
            defaultValue: 'latest',
            onChange: vi.fn(),
            options: [
              { value: 'oldest', label: 'Oldest first' },
              { value: 'latest', label: 'Latest first' },
            ],
          },
          {
            key: 'status',
            label: 'Status',
            value: 'open',
            onChange: vi.fn(),
            options: [
              { value: 'all', label: 'All statuses' },
              { value: 'open', label: 'Open' },
            ],
          },
        ]}
      />,
    )

    const activeFilters = screen.getByLabelText('Active filters')
    expect(activeFilters.textContent).not.toContain('Latest first')
    expect(activeFilters.textContent).toContain('Open')
  })

  it('renders route navigation without tab roles and marks the active item as current', () => {
    const handleRecords = vi.fn()
    const handleNew = vi.fn()
    const { container } = render(
      <ModuleNavTabs
        items={[
          { key: 'records', label: 'Records', active: true, onClick: handleRecords },
          { key: 'new', label: 'New Record', active: false, onClick: handleNew },
        ]}
      />,
    )

    expect(container.querySelector('[role="tablist"]')).toBeNull()
    expect(container.querySelector('[role="presentation"]')).toBeNull()
    expect(screen.getByText('Records').getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('New Record').getAttribute('aria-current')).toBeNull()

    fireEvent.click(screen.getByText('New Record'))
    expect(handleNew).toHaveBeenCalledTimes(1)
  })

  it('matches route nav items and blocks navigation when a guard returns false', async () => {
    const navigate = vi.fn()
    const guard = vi.fn(() => false)
    const { container } = render(
      <MemoryRouter>
        <RouteNavTabs
          currentPath="/settings/role-permissions"
          navigate={navigate}
          items={[
            { key: 'general', label: 'General', to: '/settings' },
            {
              key: 'roles',
              label: 'Role Permissions',
              to: '/settings/role-permissions',
              match: { type: 'prefix', path: '/settings/role-permissions' },
            },
            {
              key: 'dashboard',
              label: 'Dashboard Visibility',
              to: '/settings/dashboard-visibility',
              onBeforeNavigate: guard,
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(container.querySelector('[role="tablist"]')).toBeNull()
    expect(screen.getByText('Role Permissions').getAttribute('aria-current')).toBe('page')

    fireEvent.click(screen.getByText('Dashboard Visibility'))

    await screen.findByText('Dashboard Visibility')
    expect(guard).toHaveBeenCalledWith(
      '/settings/dashboard-visibility',
      expect.objectContaining({ key: 'dashboard' }),
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('prevents disabled route nav items from navigating and exposes the disabled reason', () => {
    const navigate = vi.fn()
    render(
      <MemoryRouter>
        <RouteNavTabs
          currentPath="/payroll"
          navigate={navigate}
          items={[
            { key: 'records', label: 'Claim Records', to: '/payroll' },
            {
              key: 'new',
              label: 'Apply Claim',
              to: '/payroll/claims/new',
              disabled: true,
              disabledReason: 'Draft changes need review first.',
            },
          ]}
        />
      </MemoryRouter>,
    )

    const disabledItem = screen.getByText('Apply Claim')
    expect(disabledItem.getAttribute('aria-disabled')).toBe('true')
    expect(disabledItem.getAttribute('title')).toBe('Draft changes need review first.')

    fireEvent.click(disabledItem)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('can show visible desktop labels for structured table filters', () => {
    render(
      <TableFilters
        searchValue=""
        periodValue="all"
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: 'all',
            onChange: vi.fn(),
            options: [
              { value: 'all', label: 'All statuses' },
              { value: 'approved', label: 'Approved' },
            ],
          },
        ]}
        showDesktopLabels
      />,
    )

    expect(screen.getAllByText('Period').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0)
  })

  it('renders workflow status text before secondary approval gate detail', () => {
    render(
      <WorkflowStatusSummary
        statusLabel="Pending Review"
        nextActionLabel="Awaiting Contract Manager"
        gates={[{ action: 'Reviewed', label: 'Reviewed' }]}
        approvalHistory={[]}
      />,
    )

    expect(screen.getByText('Pending Review')).toBeTruthy()
    expect(screen.getByText('Awaiting Contract Manager')).toBeTruthy()
    expect(screen.getByText('Reviewed')).toBeTruthy()
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
    expect(screen.getByRole('button', { name: 'Row actions' }).style.minWidth).toBe('44px')
    expect(screen.getByRole('button', { name: 'Row actions' }).style.minHeight).toBe('44px')

    const deleteAction = screen.getByText('Delete').closest('[aria-disabled]')
    expect(deleteAction.getAttribute('aria-disabled')).toBe('true')
    expect(deleteAction.getAttribute('aria-label')).toBe(`Delete. ${disabledReason}`)
    expect(deleteAction.getAttribute('title')).toBe(disabledReason)
    expect(deleteAction.textContent).toBe('Delete')
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
