// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useWorkflowDraftAutosave from '../useWorkflowDraftAutosave'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useWorkflowDraftAutosave', () => {
  it('debounces changed snapshots without saving the initial snapshot', async () => {
    vi.useFakeTimers()
    const saveDraft = vi.fn(async () => true)
    const { rerender } = renderHook(
      ({ snapshot }) =>
        useWorkflowDraftAutosave({ enabled: true, snapshot, saveDraft, delayMs: 100 }),
      { initialProps: { snapshot: 'initial' } },
    )

    await act(async () => vi.advanceTimersByTimeAsync(100))
    expect(saveDraft).not.toHaveBeenCalled()

    rerender({ snapshot: 'changed' })
    await act(async () => vi.advanceTimersByTimeAsync(100))
    expect(saveDraft).toHaveBeenCalledWith({ source: 'auto' })
  })

  it('keeps an actionable retry when persistence fails', async () => {
    vi.useFakeTimers()
    const saveDraft = vi.fn(async () => false)
    const { result, rerender } = renderHook(
      ({ snapshot }) =>
        useWorkflowDraftAutosave({ enabled: true, snapshot, saveDraft, delayMs: 100 }),
      { initialProps: { snapshot: 'initial' } },
    )

    rerender({ snapshot: 'changed' })
    await act(async () => vi.advanceTimersByTimeAsync(100))

    expect(result.current.feedback?.message).toContain('could not be saved')
    expect(result.current.feedback?.action?.label).toBe('Retry')
  })
})
