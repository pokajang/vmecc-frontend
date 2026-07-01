// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { deleteAiHelperThread, fetchAiHelperThreadById, fetchAiHelperThreads } = vi.hoisted(() => ({
  deleteAiHelperThread: vi.fn(),
  fetchAiHelperThreadById: vi.fn(),
  fetchAiHelperThreads: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  deleteAiHelperThread,
  fetchAiHelperThreadById,
  fetchAiHelperThreads,
}))

import useAiHelperHistory from '../useAiHelperHistory'

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAiHelperHistory', () => {
  beforeEach(() => {
    deleteAiHelperThread.mockReset()
    fetchAiHelperThreadById.mockReset()
    fetchAiHelperThreads.mockReset()
    fetchAiHelperThreads.mockResolvedValue({ data: [{ id: 't-list' }] })
  })

  it('ignores stale thread-open responses when another thread was requested after it', async () => {
    const first = deferred()
    const second = deferred()
    const onThreadOpened = vi.fn()

    fetchAiHelperThreadById.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result } = renderHook(() =>
      useAiHelperHistory({
        authUser: { id: 1 },
        currentThreadId: null,
        currentThreadIdRef: { current: null },
        onActiveThreadDeleted: vi.fn(),
        onThreadOpened,
        sending: false,
        sendingRef: { current: false },
      }),
    )

    act(() => {
      result.current.openHistoryThread('old-thread')
      result.current.openHistoryThread('new-thread')
    })

    await act(async () => {
      second.resolve({
        data: {
          thread: { id: 'new-thread', title: 'Fresh' },
          messages: [{ id: 'm2', role: 'assistant', content: 'Fresh message' }],
        },
      })
    })

    await waitFor(() => {
      const threadPayload = onThreadOpened.mock.calls.find(
        ([payload]) => payload.thread?.id === 'new-thread',
      )
      expect(threadPayload).toBeTruthy()
      expect(threadPayload[0]).toMatchObject({
        thread: { id: 'new-thread', title: 'Fresh' },
        messages: [{ id: 'm2', role: 'assistant', content: 'Fresh message' }],
      })
    })

    await act(async () => {
      first.resolve({
        data: {
          thread: { id: 'old-thread', title: 'Stale' },
          messages: [{ id: 'm1', role: 'assistant', content: 'Stale message' }],
        },
      })
    })

    await waitFor(() => {
      const threadPayloads = onThreadOpened.mock.calls
        .map(([payload]) => payload.thread?.id)
        .filter((threadId) => threadId)
      expect(threadPayloads).toEqual(['new-thread'])
    })
  })
})
