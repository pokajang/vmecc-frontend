// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useWorkflowNotificationCounts from '../useWorkflowNotificationCounts'

const useSelector = vi.fn()
const getWorkflowUnreadCount = vi.fn()

vi.mock('react-redux', () => ({
  useSelector: (...args) => useSelector(...args),
}))

vi.mock('src/services/workflowNotifications', () => ({
  getWorkflowUnreadCount: (...args) => getWorkflowUnreadCount(...args),
}))

const flushTimers = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useWorkflowNotificationCounts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    useSelector.mockImplementation((selector) => selector({ authUser: { id: 'user-1' } }))
  })

  it('stops polling unread counts after an auth-blocked response', async () => {
    getWorkflowUnreadCount.mockResolvedValue({ ok: false, count: 0, error: { status: 401 } })

    renderHook(() => useWorkflowNotificationCounts())

    await flushTimers(0)
    expect(getWorkflowUnreadCount).toHaveBeenCalledTimes(1)

    await flushTimers(30 * 1000)
    expect(getWorkflowUnreadCount).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new CustomEvent('workflow-notifications-updated'))
    await flushTimers(0)
    expect(getWorkflowUnreadCount).toHaveBeenCalledTimes(1)
  })
})
