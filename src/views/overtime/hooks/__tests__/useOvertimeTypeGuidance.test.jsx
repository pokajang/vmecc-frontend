// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { classifyMyOvertimeDateApiFirst } from 'src/services/overtimeApi'
import useOvertimeTypeGuidance from '../useOvertimeTypeGuidance'

vi.mock('src/services/overtimeApi', () => ({
  classifyMyOvertimeDateApiFirst: vi.fn(),
}))

const deferred = () => {
  let resolve
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useOvertimeTypeGuidance', () => {
  it('uses one classification request in derived guidance mode and clears busy state', async () => {
    const request = deferred()
    classifyMyOvertimeDateApiFirst.mockReturnValueOnce(request.promise)
    const setIsOvertimeTypeDeriving = vi.fn()
    const setOvertimeGuidanceMessage = vi.fn()

    renderHook(() =>
      useOvertimeTypeGuidance({
        activeSection: 'new-overtime',
        claimDate: '2026-08-26',
        defaultOvertimeType: 'weekday',
        isOvertimeGuidanceEnabled: true,
        overtimeType: 'weekday',
        overtimeTypeDerivedMode: true,
        setIsOvertimeTypeDeriving,
        setOvertimeGuidanceMessage,
      }),
    )

    await waitFor(() => expect(classifyMyOvertimeDateApiFirst).toHaveBeenCalledTimes(1))
    expect(setIsOvertimeTypeDeriving).toHaveBeenCalledWith(true)

    request.resolve({ ok: true, data: { overtime_type: 'weekday' } })

    await waitFor(() => {
      expect(setOvertimeGuidanceMessage).toHaveBeenCalledWith(
        'Selected overtime type matches recommendation for 2026-08-26.',
      )
      expect(setIsOvertimeTypeDeriving).toHaveBeenLastCalledWith(false)
    })
  })

  it('ignores stale classification results after the date changes', async () => {
    const firstRequest = deferred()
    const secondRequest = deferred()
    classifyMyOvertimeDateApiFirst
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise)
    const setIsOvertimeTypeDeriving = vi.fn()
    const setOvertimeGuidanceMessage = vi.fn()
    const baseProps = {
      activeSection: 'new-overtime',
      defaultOvertimeType: 'weekday',
      isOvertimeGuidanceEnabled: true,
      overtimeType: 'weekday',
      overtimeTypeDerivedMode: false,
      setIsOvertimeTypeDeriving,
      setOvertimeGuidanceMessage,
    }

    const { rerender } = renderHook(
      ({ claimDate }) => useOvertimeTypeGuidance({ ...baseProps, claimDate }),
      { initialProps: { claimDate: '2026-08-25' } },
    )
    await waitFor(() => expect(classifyMyOvertimeDateApiFirst).toHaveBeenCalledTimes(1))

    rerender({ claimDate: '2026-08-26' })
    await waitFor(() => expect(classifyMyOvertimeDateApiFirst).toHaveBeenCalledTimes(2))

    firstRequest.resolve({ ok: true, data: { overtime_type: 'weekend' } })
    secondRequest.resolve({ ok: true, data: { overtime_type: 'weekday' } })

    await waitFor(() => {
      expect(setOvertimeGuidanceMessage).toHaveBeenLastCalledWith(
        'Selected overtime type matches recommendation for 2026-08-26.',
      )
      expect(setIsOvertimeTypeDeriving).toHaveBeenLastCalledWith(false)
    })
    expect(setOvertimeGuidanceMessage).not.toHaveBeenCalledWith(
      expect.stringContaining('2026-08-25'),
    )
  })
})
