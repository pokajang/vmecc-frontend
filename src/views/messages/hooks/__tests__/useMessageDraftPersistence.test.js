import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useMessageDraftPersistence from '../useMessageDraftPersistence'

describe('useMessageDraftPersistence', () => {
  let storage

  beforeEach(() => {
    storage = new Map()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key) => storage.get(key) ?? null),
        setItem: vi.fn((key, value) => storage.set(key, String(value))),
        removeItem: vi.fn((key) => storage.delete(key)),
      },
    })
    vi.useRealTimers()
  })

  it('loads stored drafts for the active user', async () => {
    localStorage.setItem('vmecc_message_drafts_7', JSON.stringify({ 12: 'Saved draft' }))

    const { result } = renderHook(() => useMessageDraftPersistence({ authUserId: 7 }))

    await waitFor(() => expect(result.current.drafts).toEqual({ 12: 'Saved draft' }))
    expect(result.current.lastThreadKey).toBe('vmecc_last_thread_id_7')
  })

  it('debounces draft writes to localStorage', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useMessageDraftPersistence({ authUserId: 7 }))

    await act(async () => {
      await Promise.resolve()
    })
    localStorage.removeItem('vmecc_message_drafts_7')

    await act(async () => {
      result.current.setDrafts({ 12: 'Next draft' })
    })
    expect(localStorage.getItem('vmecc_message_drafts_7')).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(JSON.parse(localStorage.getItem('vmecc_message_drafts_7'))).toEqual({
      12: 'Next draft',
    })
  })
})
