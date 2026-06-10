// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useWorkflowNotifications from '../useWorkflowNotifications'

const useSelector = vi.fn()
const getWorkflowUnreadCount = vi.fn()
const getWorkflowNotificationsForViewer = vi.fn()
const markAllWorkflowNotificationsReadForViewer = vi.fn()
const markWorkflowNotificationAsRead = vi.fn()
const deleteWorkflowNotificationById = vi.fn()
const deleteAllWorkflowNotificationsForViewer = vi.fn()

vi.mock('react-redux', () => ({
  useSelector: (...args) => useSelector(...args),
}))

vi.mock('src/services/workflowNotifications', () => ({
  getWorkflowUnreadCount: (...args) => getWorkflowUnreadCount(...args),
  getWorkflowNotificationsForViewer: (...args) => getWorkflowNotificationsForViewer(...args),
  markAllWorkflowNotificationsReadForViewer: (...args) =>
    markAllWorkflowNotificationsReadForViewer(...args),
  markWorkflowNotificationAsRead: (...args) => markWorkflowNotificationAsRead(...args),
  deleteWorkflowNotificationById: (...args) => deleteWorkflowNotificationById(...args),
  deleteAllWorkflowNotificationsForViewer: (...args) =>
    deleteAllWorkflowNotificationsForViewer(...args),
}))

describe('useWorkflowNotifications', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
    useSelector.mockImplementation((selector) => selector({ authUser: { id: 'user-1' } }))
    markWorkflowNotificationAsRead.mockResolvedValue({ ok: true })
    deleteWorkflowNotificationById.mockResolvedValue({ ok: true })
    deleteAllWorkflowNotificationsForViewer.mockResolvedValue({ ok: true })
  })

  it('marks all notifications as read and syncs the unread count event', async () => {
    getWorkflowNotificationsForViewer
      .mockResolvedValueOnce({
        ok: true,
        data: [
          { id: 'n-1', unread: true, read: false, createdAt: '2026-04-27T18:21:00Z' },
          { id: 'n-2', unread: false, read: true, createdAt: '2026-04-27T18:20:00Z' },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [
          { id: 'n-1', unread: false, read: true, createdAt: '2026-04-27T18:21:00Z' },
          { id: 'n-2', unread: false, read: true, createdAt: '2026-04-27T18:20:00Z' },
        ],
      })
    getWorkflowUnreadCount.mockResolvedValueOnce({ ok: true, count: 1 }).mockResolvedValueOnce({
      ok: true,
      count: 0,
    })
    markAllWorkflowNotificationsReadForViewer.mockResolvedValue({ ok: true })

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const { result } = renderHook(() => useWorkflowNotifications({ unreadOnly: false }))

    await waitFor(() => expect(result.current.items).toHaveLength(2))
    expect(result.current.unreadCount).toBe(1)

    await act(async () => {
      await result.current.markAllRead()
    })

    expect(markAllWorkflowNotificationsReadForViewer).toHaveBeenCalledTimes(1)
    expect(result.current.items.every((item) => item.unread === false)).toBe(true)
    expect(result.current.unreadCount).toBe(0)
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'workflow-notifications-updated',
        detail: { count: 0 },
      }),
    )
  })

  it('does not visually regress when the first post-read refresh is stale', async () => {
    getWorkflowNotificationsForViewer
      .mockResolvedValueOnce({
        ok: true,
        data: [{ id: 'n-1', unread: true, read: false, createdAt: '2026-04-27T18:21:00Z' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [{ id: 'n-1', unread: true, read: false, createdAt: '2026-04-27T18:21:00Z' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [{ id: 'n-1', unread: false, read: true, createdAt: '2026-04-27T18:21:00Z' }],
      })

    getWorkflowUnreadCount
      .mockResolvedValueOnce({ ok: true, count: 1 })
      .mockResolvedValueOnce({ ok: true, count: 0 })
      .mockResolvedValueOnce({ ok: true, count: 0 })

    markAllWorkflowNotificationsReadForViewer.mockResolvedValue({ ok: true })

    const { result } = renderHook(() => useWorkflowNotifications({ unreadOnly: false }))

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0].unread).toBe(true)

    vi.useFakeTimers()

    await act(async () => {
      await result.current.markAllRead()
    })

    expect(result.current.items[0].unread).toBe(false)
    expect(result.current.unreadCount).toBe(0)

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(result.current.items[0].unread).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })

    expect(result.current.items[0].unread).toBe(false)
  })
})
