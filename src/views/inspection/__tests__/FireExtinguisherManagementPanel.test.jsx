// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import FireExtinguisherManagementPanel from '../records/FireExtinguisherManagementPanel'
import {
  assignFireExtinguisherIssue,
  fetchFireExtinguisherIssueAssignees,
  fetchFireExtinguisherIssues,
} from '../inspectionFireExtinguisherIssueApi'

vi.mock('../inspectionFireExtinguisherApi', () => ({
  markFireExtinguisherOutOfService: vi.fn(),
  restoreFireExtinguisher: vi.fn(),
  retireFireExtinguisher: vi.fn(),
  returnFireExtinguisherToService: vi.fn(),
  updateFireExtinguisherOption: vi.fn(),
}))

vi.mock('../inspectionFireExtinguisherIssueApi', () => ({
  assignFireExtinguisherIssue: vi.fn(),
  cancelFireExtinguisherIssue: vi.fn(),
  fetchFireExtinguisherIssueAssignees: vi.fn(() => Promise.resolve([])),
  fetchFireExtinguisherIssues: vi.fn(),
  reopenFireExtinguisherIssue: vi.fn(),
  resolveFireExtinguisherIssue: vi.fn(),
  startFireExtinguisherIssue: vi.fn(),
  updateFireExtinguisherIssue: vi.fn(),
  unassignFireExtinguisherIssue: vi.fn(),
  verifyFireExtinguisherIssue: vi.fn(),
}))

vi.mock('src/views/report/shared/emergency-report/ReportPhotoSection', () => ({
  default: () => <div>Resolution evidence uploader</div>,
}))

const cancelledIssue = {
  id: 41,
  status: 'cancelled',
  severity: 'medium',
  title: 'Operational condition defect',
  occurrenceCount: 1,
  resolutionEvidence: [],
  events: [],
  lockVersion: 3,
}

const openIssue = {
  ...cancelledIssue,
  id: 42,
  status: 'open',
  title: 'Physical condition defect',
  checkName: 'Physical condition',
  assignee: null,
  lockVersion: 1,
}

const renderPanel = (lifecycleStatus) =>
  render(
    <FireExtinguisherManagementPanel
      detail={{
        catalogId: 7,
        idLocNo: 'LIFE-007',
        lifecycleStatus,
        lockVersion: 2,
      }}
      currentUser={{ id: 9, name: 'Inspector' }}
      canManageCatalog
      canManageIssues
      canVerifyIssues
    />,
  )

beforeEach(() => {
  vi.mocked(fetchFireExtinguisherIssues).mockResolvedValue({
    data: [cancelledIssue],
    meta: { page: 1, lastPage: 1, total: 1, active: 0 },
  })
  vi.mocked(fetchFireExtinguisherIssueAssignees).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('FireExtinguisherManagementPanel', () => {
  it('does not offer issue reopening while the extinguisher is retired', async () => {
    renderPanel('retired')

    expect(await screen.findByText('Operational condition defect')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull()
  })

  it('offers issue reopening after the extinguisher is active again', async () => {
    renderPanel('active')

    expect(await screen.findByText('Operational condition defect')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeTruthy()
  })

  it('assigns an open issue to an eligible user selected from the server list', async () => {
    vi.mocked(fetchFireExtinguisherIssues).mockResolvedValue({
      data: [openIssue],
      meta: { page: 1, lastPage: 1, total: 1, active: 1 },
    })
    vi.mocked(fetchFireExtinguisherIssueAssignees).mockResolvedValue([
      { id: 14, name: 'Maintenance Lead', email: 'lead@example.test' },
    ])
    vi.mocked(assignFireExtinguisherIssue).mockResolvedValue({
      ...openIssue,
      assignee: { id: 14, name: 'Maintenance Lead' },
      lockVersion: 2,
    })

    renderPanel('active')
    expect(await screen.findByText('Physical condition')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }))
    fireEvent.change(screen.getByLabelText('Assign to'), { target: { value: '14' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() =>
      expect(assignFireExtinguisherIssue).toHaveBeenCalledWith(42, {
        assignedToUserId: 14,
        note: '',
        lockVersion: 1,
      }),
    )
  })

  it('does not let the resolver verify their own corrective work', async () => {
    vi.mocked(fetchFireExtinguisherIssues).mockResolvedValue({
      data: [
        {
          ...openIssue,
          status: 'pending_verification',
          resolvedByUserId: 9,
          correctiveAction: 'Replaced damaged hose.',
        },
      ],
      meta: { page: 1, lastPage: 1, total: 1, active: 1 },
    })

    renderPanel('active')

    expect(
      await screen.findByText('A different authorized user must verify this corrective work.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Verify and close' })).toBeNull()
  })

  it('refreshes editable priority fields when the server returns a newer issue version', async () => {
    const refreshedIssue = {
      ...openIssue,
      assignee: { id: 9, name: 'Inspector' },
      severity: 'critical',
      dueAt: '2026-08-15T00:00:00+00:00',
      lockVersion: 2,
    }
    vi.mocked(fetchFireExtinguisherIssues)
      .mockResolvedValueOnce({
        data: [openIssue],
        meta: { page: 1, lastPage: 1, total: 1, active: 1 },
      })
      .mockResolvedValue({
        data: [refreshedIssue],
        meta: { page: 1, lastPage: 1, total: 1, active: 1 },
      })
    vi.mocked(assignFireExtinguisherIssue).mockResolvedValue(refreshedIssue)

    renderPanel('active')
    expect(await screen.findByText('Physical condition')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Assign to me' }))
    await waitFor(() => expect(screen.getByText(/Assigned to Inspector/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Edit priority' }))

    expect(screen.getByLabelText('Severity').value).toBe('critical')
    expect(screen.getByLabelText('Due date').value).toBe('2026-08-15')
  })

  it('ignores a stale issue response after switching to another extinguisher', async () => {
    let resolveFirst
    let resolveSecond
    vi.mocked(fetchFireExtinguisherIssues)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

    const { rerender } = renderPanel('active')
    rerender(
      <FireExtinguisherManagementPanel
        detail={{ catalogId: 8, idLocNo: 'LIFE-008', lifecycleStatus: 'active', lockVersion: 1 }}
        currentUser={{ id: 9, name: 'Inspector' }}
        canManageCatalog
        canManageIssues
        canVerifyIssues
      />,
    )
    resolveSecond({
      data: [{ ...openIssue, id: 81, title: 'Current asset issue', checkName: '' }],
      meta: { page: 1, lastPage: 1, total: 1, active: 1 },
    })
    expect(await screen.findByText('Current asset issue')).toBeTruthy()

    resolveFirst({
      data: [{ ...openIssue, id: 71, title: 'Stale asset issue', checkName: '' }],
      meta: { page: 1, lastPage: 1, total: 1, active: 1 },
    })
    await waitFor(() => expect(screen.queryByText('Stale asset issue')).toBeNull())
    expect(screen.getByText('Current asset issue')).toBeTruthy()
  })
})
