// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UserManagementTableSection from '../UserManagementTableSection'

vi.mock('src/components/users/UserRowActions', () => ({
  default: ({ user, onToggleStatus }) => (
    <button type="button" onClick={() => onToggleStatus?.(user)}>
      Toggle status
    </button>
  ),
}))

afterEach(() => {
  cleanup()
})

const user = {
  id: 1,
  name: 'Alice Admin',
  email: 'alice@example.test',
  roles: ['HR'],
  status: 'Active',
  last_login_at: '2026-04-15T10:00:00.000Z',
}

const buildProps = (overrides = {}) => ({
  selectedCount: 0,
  bulkActionOptions: [],
  selectedBulkAction: '',
  bulkUpdating: false,
  onBulkActionChange: vi.fn(),
  onOpenBulkConfirm: vi.fn(),
  onClearSelection: vi.fn(),
  search: '',
  onSearchChange: vi.fn(),
  period: 'all',
  onPeriodChange: vi.fn(),
  sort: { field: 'name', dir: 'asc' },
  setSort: vi.fn(),
  sortOptions: [{ value: 'name:asc', label: 'Name A-Z' }],
  roleFilter: 'All',
  setRoleFilter: vi.fn(),
  statusFilter: 'All',
  setStatusFilter: vi.fn(),
  roles: ['HR'],
  onClearFilters: vi.fn(),
  error: '',
  visibleUsers: [user],
  goProfile: vi.fn(),
  toggleSort: vi.fn(),
  selectedIds: [],
  toggleSelect: vi.fn(),
  toggleSelectAll: vi.fn(),
  isSelf: () => false,
  exportUserXlsx: vi.fn(),
  exportingUserId: null,
  openRestoreModal: vi.fn(),
  openStatusModal: vi.fn(),
  openRoleModal: vi.fn(),
  openResetModal: vi.fn(),
  openDeleteModal: vi.fn(),
  openPermanentDeleteModal: vi.fn(),
  openLockModal: vi.fn(),
  openUnlockModal: vi.fn(),
  loading: false,
  rowsToShow: 10,
  setRowsToShow: vi.fn(),
  filteredCount: 1,
  totalCount: 1,
  ...overrides,
})

describe('UserManagementTableSection', () => {
  it('opens the desktop row but not when a row action is clicked', () => {
    const props = buildProps()
    const { container } = render(<UserManagementTableSection {...props} />)

    const row = Array.from(container.querySelectorAll('tbody tr')).find((entry) =>
      entry.textContent?.includes('Alice Admin'),
    )

    fireEvent.click(row)
    expect(props.goProfile).toHaveBeenCalledWith(user)

    props.goProfile.mockClear()
    fireEvent.click(within(row).getByRole('button', { name: 'Toggle status' }))

    expect(props.openStatusModal).toHaveBeenCalledWith(user)
    expect(props.goProfile).not.toHaveBeenCalled()
  })

  it('opens the mobile card while mobile actions stay separate', () => {
    const props = buildProps()
    render(<UserManagementTableSection {...props} />)

    const mobileCard = screen.getByRole('button', {
      name: 'Open user profile for Alice Admin',
    })
    fireEvent.click(mobileCard)
    expect(props.goProfile).toHaveBeenCalledWith(user)

    props.goProfile.mockClear()
    const mobileArticle = mobileCard.closest('article')
    fireEvent.click(within(mobileArticle).getByRole('button', { name: 'Toggle status' }))

    expect(props.openStatusModal).toHaveBeenCalledWith(user)
    expect(props.goProfile).not.toHaveBeenCalled()
  })
})
