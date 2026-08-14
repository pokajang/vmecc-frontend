// @vitest-environment jsdom

import React from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = { authUser: { id: 7 } }

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector(mockState),
}))

vi.mock('src/services/apiClient', () => ({
  fetchMessageThreads: vi.fn(),
}))

vi.mock('../useMessageLeader', () => ({
  broadcastThreads: vi.fn(),
  getIsLeader: () => true,
  initMessageLeader: (onLeaderChange) => {
    onLeaderChange(true)
    return vi.fn()
  },
}))

vi.mock('src/services/logger', () => ({ logError: vi.fn() }))

describe('useMessageThreads activation lifecycle', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockState.authUser = { id: 7 }
  })

  it('stops polling immediately when disabled and resumes when re-enabled', async () => {
    const { fetchMessageThreads } = await import('src/services/apiClient')
    fetchMessageThreads.mockResolvedValue({ data: [] })
    const { default: useMessageThreads } = await import('../useMessageThreads')

    const Harness = ({ enabled }) => {
      useMessageThreads({ enabled })
      return null
    }

    const view = render(<Harness enabled />)
    await act(async () => {})
    expect(fetchMessageThreads).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(fetchMessageThreads).toHaveBeenCalledTimes(2)

    view.rerender(<Harness enabled={false} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(fetchMessageThreads).toHaveBeenCalledTimes(2)

    view.rerender(<Harness enabled />)
    await act(async () => {})
    expect(fetchMessageThreads).toHaveBeenCalledTimes(3)

    view.unmount()
    vi.useRealTimers()
  })

  it('terminates polling when the server reports that Messages is disabled', async () => {
    const { fetchMessageThreads } = await import('src/services/apiClient')
    fetchMessageThreads.mockRejectedValue({
      status: 403,
      payload: { message: 'Module is disabled.' },
    })
    const { default: useMessageThreads } = await import('../useMessageThreads')

    const Harness = () => {
      useMessageThreads({ enabled: true })
      return null
    }

    const view = render(<Harness />)
    await act(async () => {})
    expect(fetchMessageThreads).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(fetchMessageThreads).toHaveBeenCalledTimes(1)

    view.unmount()
    vi.useRealTimers()
  })
})
