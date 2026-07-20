// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MESSAGE_STATUS_ABORTED,
  MESSAGE_STATUS_COMPLETED,
  MESSAGE_STATUS_FAILED,
  MESSAGE_STATUS_STREAMING,
} from '../constants'

const { fetchAiHelperThread, streamAiHelperMessage, reportAiHelperMessage } = vi.hoisted(() => ({
  fetchAiHelperThread: vi.fn(),
  streamAiHelperMessage: vi.fn(),
  reportAiHelperMessage: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  fetchAiHelperThread,
  reportAiHelperMessage,
  streamAiHelperMessage,
}))

import useAiHelperChat from '../useAiHelperChat'

const createDeferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolveFn, rejectFn) => {
    resolve = resolveFn
    reject = rejectFn
  })
  return { promise, resolve, reject }
}

describe('useAiHelperChat', () => {
  beforeEach(() => {
    fetchAiHelperThread.mockReset()
    streamAiHelperMessage.mockReset()
    reportAiHelperMessage.mockReset()

    fetchAiHelperThread.mockResolvedValue({
      data: {
        thread: { id: 'thread-1' },
        messages: [],
      },
    })
  })

  it('ignores stale stream completion after generation is stopped and keeps retry metadata', async () => {
    const showNotice = vi.fn()
    const recordThreadActivity = vi.fn()
    const streamCalls = []

    streamAiHelperMessage.mockImplementation(async (_payload, handlers) => {
      const deferred = createDeferred()
      streamCalls.push({
        handlers,
        resolve: deferred.resolve,
      })
      return deferred.promise
    })

    const { result } = renderHook(() =>
      useAiHelperChat({
        authUser: { id: 1 },
        contextPage: { path: '/inspection' },
        open: true,
        recordThreadActivity,
        responseLanguage: 'en',
        routeContext: { path: '/inspection' },
        showNotice,
      }),
    )

    await waitFor(() => {
      expect(result.current.loadingThread).toBe(false)
    })

    await act(async () => {
      result.current.sendMessage({ prompt: 'first question' })
    })

    await waitFor(() => {
      expect(result.current.sending).toBe(true)
    })

    await waitFor(() => {
      const assistants = result.current.messages.filter((item) => item.role === 'assistant')
      expect(assistants).toHaveLength(1)
      expect(assistants[0].status).toBe(MESSAGE_STATUS_STREAMING)
    })

    act(() => {
      result.current.stopGeneration()
    })

    await act(async () => {
      result.current.sendMessage({ prompt: 'second question' })
    })

    await waitFor(() => {
      expect(result.current.sending).toBe(true)
      expect(result.current.messages.filter((item) => item.role === 'assistant')).toHaveLength(2)
    })

    const assistantMessages = result.current.messages.filter((item) => item.role === 'assistant')
    const firstAssistant = assistantMessages[0]
    const secondAssistant = assistantMessages[1]

    expect(firstAssistant.status).toBe(MESSAGE_STATUS_ABORTED)
    expect(secondAssistant.status).toBe(MESSAGE_STATUS_STREAMING)

    act(() => {
      streamCalls[0].handlers.onDone({ message: { content: 'stale response' } })
      streamCalls[0].resolve()
    })

    act(() => {
      streamCalls[1].handlers.onDone({ message: { content: 'fresh response' } })
      streamCalls[1].resolve()
    })

    await waitFor(() => {
      expect(result.current.sending).toBe(false)
      const updatedAssistants = result.current.messages.filter((item) => item.role === 'assistant')
      expect(updatedAssistants[0]).toMatchObject({
        status: MESSAGE_STATUS_ABORTED,
      })
      expect(updatedAssistants[1]).toMatchObject({
        content: 'fresh response',
        status: MESSAGE_STATUS_COMPLETED,
      })
      expect(updatedAssistants[1]).not.toMatchObject({
        content: 'stale response',
      })
    })
  })

  it('stores retry context on failure for immediate retry', async () => {
    streamAiHelperMessage.mockImplementation(async (_payload, handlers) => {
      handlers.onError({ message: 'Stream failed due to timeout' })
    })

    const { result } = renderHook(() =>
      useAiHelperChat({
        authUser: { id: 1 },
        contextPage: { path: '/inspection' },
        open: true,
        recordThreadActivity: vi.fn(),
        responseLanguage: 'en',
        routeContext: { path: '/inspection', title: 'Inspection' },
        showNotice: vi.fn(),
      }),
    )

    await waitFor(() => {
      expect(result.current.loadingThread).toBe(false)
    })

    act(() => {
      void result.current.sendMessage({
        prompt: 'timeout question',
        context: { path: '/reports', title: 'Reports page' },
      })
    })

    await waitFor(() => {
      const failedMessage = result.current.messages.find(
        (message) => message.role === 'assistant' && message.status === MESSAGE_STATUS_FAILED,
      )
      expect(failedMessage).toBeTruthy()
      expect(failedMessage.retry_prompt).toBe('timeout question')
      expect(failedMessage.retry_context).toEqual({ path: '/reports', title: 'Reports page' })
      expect(typeof failedMessage.request_id).toBe('number')
    })
  })

  it('preserves a typed SSE error code and shows its retry guidance', async () => {
    streamAiHelperMessage.mockImplementation(async (_payload, handlers) => {
      handlers.onError({
        code: 'AI_HELPER_DEADLINE_EXCEEDED',
        message: 'AI helper response deadline was exceeded.',
      })
    })

    const { result } = renderHook(() =>
      useAiHelperChat({
        authUser: { id: 1 },
        contextPage: { path: '/inspection' },
        open: true,
        recordThreadActivity: vi.fn(),
        responseLanguage: 'en',
        routeContext: { path: '/inspection' },
        showNotice: vi.fn(),
      }),
    )

    await waitFor(() => expect(result.current.loadingThread).toBe(false))
    await act(async () => {
      await result.current.sendMessage({ prompt: 'deadline question' })
    })

    const retryMessage =
      'Ask AI hit a temporary service issue before the response finished. Please try again.'
    expect(result.current.sendError).toBe(retryMessage)
    expect(
      result.current.messages.find(
        (message) => message.role === 'assistant' && message.status === MESSAGE_STATUS_FAILED,
      ),
    ).toMatchObject({
      content: retryMessage,
      retry_prompt: 'deadline question',
    })
  })

  it('sends a UUID idempotency key with each generation request', async () => {
    let sentPayload
    streamAiHelperMessage.mockImplementation(async (payload, handlers) => {
      sentPayload = payload
      handlers.onDone({ message: { content: 'ready', status: MESSAGE_STATUS_COMPLETED } })
    })

    const { result } = renderHook(() =>
      useAiHelperChat({
        authUser: { id: 1 },
        contextPage: { path: '/inspection' },
        open: true,
        recordThreadActivity: vi.fn(),
        responseLanguage: 'en',
        routeContext: { path: '/inspection' },
        showNotice: vi.fn(),
      }),
    )

    await waitFor(() => expect(result.current.loadingThread).toBe(false))
    await act(async () => {
      await result.current.sendMessage({ prompt: 'How do I apply for leave?' })
    })

    expect(sentPayload.request_uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('marks in-flight assistant generation as aborted when user stops it', async () => {
    const showNotice = vi.fn()
    let streamCall
    const completion = createDeferred()

    streamAiHelperMessage.mockImplementation(async () => {
      streamCall = completion
      return completion.promise
    })

    const { result } = renderHook(() =>
      useAiHelperChat({
        authUser: { id: 1 },
        contextPage: { path: '/inspection' },
        open: true,
        recordThreadActivity: vi.fn(),
        responseLanguage: 'en',
        routeContext: { path: '/inspection' },
        showNotice,
      }),
    )

    await waitFor(() => {
      expect(result.current.loadingThread).toBe(false)
    })

    act(() => {
      result.current.sendMessage({ prompt: 'interrupted question' })
    })

    await waitFor(() => {
      expect(result.current.sending).toBe(true)
      expect(
        result.current.messages.filter((message) => message.role === 'assistant'),
      ).toHaveLength(1)
    })

    act(() => {
      result.current.stopGeneration()
    })

    await act(async () => {
      completion.resolve()
    })

    await waitFor(() => {
      const assistantMessage = result.current.messages.find((item) => item.role === 'assistant')
      expect(assistantMessage).toMatchObject({
        status: MESSAGE_STATUS_ABORTED,
        content: 'Stopped.',
      })
      expect(result.current.sending).toBe(false)
      expect(streamCall).toBeTruthy()
    })
  })

  it('ignores bootstrap thread response when a thread-open sequence is starting', async () => {
    const bootstrapRequest = createDeferred()
    fetchAiHelperThread.mockReturnValue(bootstrapRequest.promise)

    const { result } = renderHook(() =>
      useAiHelperChat({
        authUser: { id: 1 },
        contextPage: { path: '/inspection' },
        open: true,
        recordThreadActivity: vi.fn(),
        responseLanguage: 'en',
        routeContext: { path: '/inspection' },
        showNotice: vi.fn(),
      }),
    )

    await waitFor(() => {
      expect(result.current.loadingThread).toBe(true)
    })

    act(() => {
      result.current.handleThreadOpened({ loading: true, loadingLabel: 'Opening chat...' })
    })

    await act(async () => {
      bootstrapRequest.resolve({
        data: {
          thread: { id: 'bootstrap-thread', title: 'Bootstrap chat' },
          messages: [{ id: 'bootstrap-message', role: 'assistant', content: 'Old message' }],
        },
      })
      await bootstrapRequest.promise
    })

    await waitFor(() => {
      expect(result.current.thread).toBe(null)
      expect(result.current.messages).toEqual([])
      expect(result.current.loadingThread).toBe(true)
      expect(result.current.threadLoadingLabel).toBe('Opening chat...')
    })

    act(() => {
      result.current.handleThreadOpened({
        thread: { id: 'open-thread', title: 'Opened chat' },
        messages: [{ id: 'open-message', role: 'assistant', content: 'Open message' }],
        loading: false,
      })
    })

    expect(result.current.thread).toEqual({ id: 'open-thread', title: 'Opened chat' })
    expect(result.current.messages).toEqual([
      { id: 'open-message', role: 'assistant', content: 'Open message' },
    ])
    expect(result.current.loadingThread).toBe(false)
  })
})
