// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
      deleteOne: vi.fn(),
      deleteAll: vi.fn(),
    })

    render(
      <MemoryRouter>
        <WorkflowNotifications onClose={onClose} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Action Required')).toBeTruthy()
    expect(screen.getByText('Other Updates')).toBeTruthy()

    fireEvent.click(screen.getByText('Leave needs approval'))

    expect(markRead).toHaveBeenCalledWith(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledTimes(1)
  })
})
