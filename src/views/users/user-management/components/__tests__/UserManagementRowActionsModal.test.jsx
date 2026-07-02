// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UserActionModals from 'src/components/users/UserActionModals'
import UserManagementTableSection from '../UserManagementTableSection'

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

const baseProps = {
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
  openPermanentDeleteModal: vi.fn(),
  openLockModal: vi.fn(),
  openUnlockModal: vi.fn(),
  loading: false,
  rowsToShow: 10,
  setRowsToShow: vi.fn(),
  filteredCount: 1,
  totalCount: 1,
}

const Harness = ({ goProfile = vi.fn() }) => {
  const [actionUser, setActionUser] = useState(null)
  const [activeModal, setActiveModal] = useState(null)

  const openDeleteModal = (nextUser) => {
    setActionUser(nextUser)
    setActiveModal('delete')
  }

  return (
    <>
      <UserManagementTableSection
        {...baseProps}
        goProfile={goProfile}
        openDeleteModal={openDeleteModal}
      />
      <UserActionModals
        actionUser={actionUser}
        actionUpdating={false}
        roleModalOpen={false}
        roleAssignments={[]}
        teams={[]}
        onAddAssignment={vi.fn()}
        onRemoveAssignment={vi.fn()}
        onChangeAssignment={vi.fn()}
        onCloseRole={vi.fn()}
        onConfirmRole={vi.fn()}
        confirmResetOpen={false}
        onConfirmReset={vi.fn()}
        onCloseReset={vi.fn()}
        confirmDeleteOpen={activeModal === 'delete'}
        onConfirmDelete={vi.fn()}
        onCloseDelete={() => setActiveModal(null)}
        confirmPermanentDeleteOpen={false}
        onConfirmPermanentDelete={vi.fn()}
        onClosePermanentDelete={vi.fn()}
        confirmDeactivateOpen={false}
        onConfirmDeactivate={vi.fn()}
        onCloseDeactivate={vi.fn()}
        confirmActivateOpen={false}
        onConfirmActivate={vi.fn()}
        onCloseActivate={vi.fn()}
        confirmLockOpen={false}
        onConfirmLock={vi.fn()}
        onCloseLock={vi.fn()}
        confirmUnlockOpen={false}
        onConfirmUnlock={vi.fn()}
        onCloseUnlock={vi.fn()}
        confirmRestoreOpen={false}
        onConfirmRestore={vi.fn()}
        onCloseRestore={vi.fn()}
      />
    </>
  )
}

describe('UserManagement row actions', () => {
  it('opens the delete confirmation modal without triggering row navigation', async () => {
    const goProfile = vi.fn()
    const { container } = render(<Harness goProfile={goProfile} />)
    const row = Array.from(container.querySelectorAll('tbody tr')).find((entry) =>
      entry.textContent?.includes('Alice Admin'),
    )

    fireEvent.click(within(row).getByRole('button', { name: 'Row actions' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete user' }))

    await waitFor(() => {
      expect(screen.getByText('Delete User')).toBeTruthy()
      expect(
        screen.getByText('This will disable access for Alice Admin. You can restore later.'),
      ).toBeTruthy()
    })
    expect(goProfile).not.toHaveBeenCalled()
  })
})
