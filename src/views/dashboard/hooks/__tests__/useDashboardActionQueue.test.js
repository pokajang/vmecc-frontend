// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useDashboardActionQueue from '../useDashboardActionQueue'

const { fetchDashboardActionQueue } = vi.hoisted(() => ({
  fetchDashboardActionQueue: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  fetchDashboardActionQueue: (...args) => fetchDashboardActionQueue(...args),
}))

describe('useDashboardActionQueue', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('leaves the loading state and shows a retryable error when the request times out', async () => {
    fetchDashboardActionQueue.mockImplementation(
      ({ signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )

    const { result } = renderHook(() => useDashboardActionQueue())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toContain('timed out')
    expect(result.current.retry).toEqual(expect.any(Function))
  })
})
