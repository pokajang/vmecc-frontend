// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WorkflowNotifications, { groupWorkflowNotifications } from '../WorkflowNotifications'
import useWorkflowNotifications from 'src/hooks/useWorkflowNotifications'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('src/hooks/useWorkflowNotifications', () => ({
  default: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('WorkflowNotifications', () => {
  it('groups action-required notifications before other updates', () => {
    const groups = groupWorkflowNotifications([
      { id: 1, message: 'FYI' },
      { id: 2, message: 'Approve leave', actionRequiredForViewer: true },
    ])

    expect(groups.map((group) => group.key)).toEqual(['action-required', 'updates'])
    expect(groups[0].items[0].id).toBe(2)
  })

  it('renders grouped notifications and preserves click behavior', () => {
    const markRead = vi.fn()
    const deleteOne = vi.fn()
    const onClose = vi.fn()
    useWorkflowNotifications.mockReturnValue({
      items: [
        {
          id: 1,
          module: 'leave',
          event: 'submitted',
          title: 'Leave needs approval',
          createdAt: '2026-06-12T08:00:00.000Z',
          unread: true,
          actionRequiredForViewer: true,
          metadata: {
            workflowTeamName: 'Alpha Team',
            nextActionRole: 'Assistant Incident Commander',
            workflowRoutingSource: 'temporary_coverage',
          },
          payload: { id: 'LV-1' },
        },
        {
          id: 2,
          module: 'payroll',
          event: 'updated',
          title: 'Payroll updated',
          createdAt: '2026-06-12T09:00:00.000Z',
          unread: false,
        },
      ],
      loading: false,
      submitting: false,
      error: '',
      refresh: vi.fn(),
      markRead,
      markAllRead: vi.fn(),
      deleteOne,
      deleteAll: vi.fn(),
    })

    render(
      <MemoryRouter>
        <WorkflowNotifications onClose={onClose} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Action Required')).toBeTruthy()
    expect(screen.getByText('Other Updates')).toBeTruthy()
    expect(screen.getByText('Action Required').closest('.mobile-overlay-section')).toBeTruthy()
    expect(screen.getAllByText('1')[0].classList.contains('mobile-overlay-section-count')).toBe(
      true,
    )
    expect(document.querySelector('.notification-item-dot')).toBeNull()
    expect(
      screen.getByText('Alpha Team · Acting Assistant Incident Commander · Temporary coverage'),
    ).toBeTruthy()

    fireEvent.click(screen.getByText('Leave needs approval'))

    expect(markRead).toHaveBeenCalledWith(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark as read' })[0])
    expect(markRead).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete notification' })[0])
    expect(deleteOne).toHaveBeenCalledWith(1)
  })

  it('uses accessible icon actions and confirms successful batch operations', async () => {
    const markAllRead = vi.fn().mockResolvedValue(true)
    const deleteAll = vi.fn().mockResolvedValue(true)
    const refresh = vi.fn().mockResolvedValue(true)
    useWorkflowNotifications.mockReturnValue({
      items: [
        {
          id: 1,
          module: 'inspection',
          event: 'submitted',
          title: 'Inspection submitted',
          createdAt: '2026-07-24T09:55:00.000Z',
          unread: true,
        },
      ],
      loading: false,
      submitting: false,
      error: '',
      refresh,
      markRead: vi.fn(),
      markAllRead,
      deleteOne: vi.fn(),
      deleteAll,
    })

    render(
      <MemoryRouter>
        <WorkflowNotifications />
      </MemoryRouter>,
    )

    const markAllButton = screen.getByRole('button', {
      name: 'Mark all notifications as read',
    })
    const deleteAllButton = screen.getByRole('button', { name: 'Delete all notifications' })
    const refreshButton = screen.getByRole('button', { name: 'Refresh notifications' })

    expect(markAllButton.textContent).toBe('')
    expect(deleteAllButton.textContent).toBe('')
    expect(refreshButton.textContent).toBe('')

    fireEvent.click(markAllButton)
    expect(await screen.findByText('All messages marked as read.')).toBeTruthy()

    fireEvent.click(refreshButton)
    expect(await screen.findByText('Messages refreshed successfully.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    await waitFor(() => expect(screen.queryByText('Messages refreshed successfully.')).toBeNull())

    fireEvent.click(deleteAllButton)
    expect(screen.getByText('Delete all notifications?')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('dialog')))
    fireEvent.click(screen.getByRole('button', { name: 'Delete all', exact: true }))

    await waitFor(() => expect(deleteAll).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('All messages deleted.')).toBeTruthy()
  })

  it('does not announce success when a batch operation fails', async () => {
    useWorkflowNotifications.mockReturnValue({
      items: [{ id: 1, unread: true }],
      loading: false,
      submitting: false,
      error: 'Failed to mark all notifications as read.',
      refresh: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn().mockResolvedValue(false),
      deleteOne: vi.fn(),
      deleteAll: vi.fn(),
    })

    render(
      <MemoryRouter>
        <WorkflowNotifications />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mark all notifications as read' }))

    await waitFor(() => expect(screen.queryByText('All messages marked as read.')).toBeNull())
  })
})
