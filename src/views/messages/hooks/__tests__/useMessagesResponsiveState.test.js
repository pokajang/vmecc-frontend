// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useMessagesResponsiveState from '../useMessagesResponsiveState'

describe('useMessagesResponsiveState', () => {
  let mediaListener
  let mediaState

  beforeEach(() => {
    mediaListener = null
    mediaState = { matches: false }
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: mediaState.matches,
        media: '(max-width: 991.98px)',
        onchange: null,
        addEventListener: vi.fn((event, listener) => {
          if (event === 'change') mediaListener = listener
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('uses desktop thread view by default', async () => {
    const { result } = renderHook(() => useMessagesResponsiveState({ activeUserId: 12 }))

    await waitFor(() => expect(result.current.isMobile).toBe(false))
    expect(result.current.mobileView).toBe('thread')
    expect(result.current.showThreadPanel).toBe(true)
    expect(result.current.showListPanel).toBe(true)
    expect(result.current.shouldPollThread).toBe(true)
  })

  it('switches to list view on mobile breakpoint changes', async () => {
    const { result } = renderHook(() => useMessagesResponsiveState({ activeUserId: 12 }))

    await act(async () => {
      mediaState.matches = true
      mediaListener?.({ matches: true })
    })

    expect(result.current.isMobile).toBe(true)
    expect(result.current.mobileView).toBe('list')
    expect(result.current.showThreadPanel).toBe(false)
    expect(result.current.showListPanel).toBe(true)
    expect(result.current.shouldPollThread).toBe(false)
  })
})
