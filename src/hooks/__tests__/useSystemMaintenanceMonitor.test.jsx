// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useSystemMaintenanceMonitor, {
  MAINTENANCE_ACTIVE_POLL_INTERVAL_MS,
  MAINTENANCE_ERROR_BACKOFF_BASE_MS,
  MAINTENANCE_OFF_POLL_INTERVAL_MS,
  getSystemMaintenancePollDelay,
} from '../useSystemMaintenanceMonitor'

const OFF_SETTING = {
  enabled: false,
  phase: 'off',
  graceEndsAt: null,
  updatedAt: '',
}

const ENFORCED_SETTING = {
  enabled: true,
  phase: 'enforced',
  graceEndsAt: null,
  updatedAt: '2026-07-21T00:00:00+00:00',
}

const NO_JITTER = () => 0

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

const advance = async (milliseconds) => {
  await act(async () => {
    vi.advanceTimersByTime(milliseconds)
    await Promise.resolve()
    await Promise.resolve()
  })
}

const setVisibility = (value) => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value,
  })
}

describe('useSystemMaintenanceMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T00:00:00Z'))
    setVisibility('visible')
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calculates state-aware polling and failure delays', () => {
    expect(getSystemMaintenancePollDelay({ setting: OFF_SETTING, random: () => 0 })).toBe(
      MAINTENANCE_OFF_POLL_INTERVAL_MS,
    )
    expect(getSystemMaintenancePollDelay({ setting: ENFORCED_SETTING })).toBe(
      MAINTENANCE_ACTIVE_POLL_INTERVAL_MS,
    )
    expect(
      getSystemMaintenancePollDelay({
        setting: OFF_SETTING,
        failureCount: 2,
        random: () => 0,
      }),
    ).toBe(MAINTENANCE_ERROR_BACKOFF_BASE_MS * 2)
    expect(
      getSystemMaintenancePollDelay({
        setting: OFF_SETTING,
        failureCount: 20,
        random: () => 1,
      }),
    ).toBe(5 * 60_000)
    expect(
      getSystemMaintenancePollDelay({
        setting: ENFORCED_SETTING,
        failureCount: 20,
        random: () => 1,
      }),
    ).toBe(60_000)
    expect(
      getSystemMaintenancePollDelay({
        setting: {
          enabled: true,
          phase: 'grace',
          graceEndsAt: '2026-07-21T00:00:04Z',
        },
        now: Date.now(),
      }),
    ).toBe(4_250)
  })

  it('polls once per minute while maintenance is off and every ten seconds when enforced', async () => {
    const loadSetting = vi.fn(async () => ({ ok: true, data: OFF_SETTING }))
    const onUpdate = vi.fn()
    const { rerender } = renderHook(
      ({ setting }) =>
        useSystemMaintenanceMonitor({
          enabled: true,
          setting,
          loadSetting,
          onUpdate,
          random: NO_JITTER,
        }),
      { initialProps: { setting: OFF_SETTING } },
    )

    await flushPromises()
    expect(loadSetting).toHaveBeenCalledTimes(1)

    await advance(MAINTENANCE_OFF_POLL_INTERVAL_MS - 1)
    expect(loadSetting).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(loadSetting).toHaveBeenCalledTimes(2)

    loadSetting.mockResolvedValue({ ok: true, data: ENFORCED_SETTING })
    rerender({ setting: ENFORCED_SETTING })
    await flushPromises()
    await advance(MAINTENANCE_ACTIVE_POLL_INTERVAL_MS)
    expect(loadSetting).toHaveBeenCalledTimes(3)
    expect(onUpdate).toHaveBeenLastCalledWith(ENFORCED_SETTING)
  })

  it('pauses while hidden and refreshes once when the tab becomes visible', async () => {
    const loadSetting = vi.fn(async () => ({ ok: true, data: OFF_SETTING }))
    renderHook(() =>
      useSystemMaintenanceMonitor({
        enabled: true,
        setting: OFF_SETTING,
        loadSetting,
        random: NO_JITTER,
      }),
    )
    await flushPromises()
    expect(loadSetting).toHaveBeenCalledTimes(1)

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await advance(MAINTENANCE_OFF_POLL_INTERVAL_MS * 2)
    expect(loadSetting).toHaveBeenCalledTimes(1)

    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(loadSetting).toHaveBeenCalledTimes(2)
  })

  it('refreshes immediately and keeps polling after a rapid hide and show cycle', async () => {
    const loadSetting = vi.fn(async () => ({ ok: true, data: OFF_SETTING }))
    renderHook(() =>
      useSystemMaintenanceMonitor({
        enabled: true,
        setting: OFF_SETTING,
        loadSetting,
        random: NO_JITTER,
      }),
    )
    await flushPromises()

    await advance(100)
    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(loadSetting).toHaveBeenCalledTimes(2)

    await advance(MAINTENANCE_OFF_POLL_INTERVAL_MS)
    expect(loadSetting).toHaveBeenCalledTimes(3)
  })

  it('pauses offline and refreshes when connectivity returns', async () => {
    const loadSetting = vi.fn(async () => ({ ok: true, data: OFF_SETTING }))
    renderHook(() =>
      useSystemMaintenanceMonitor({
        enabled: true,
        setting: OFF_SETTING,
        loadSetting,
        random: NO_JITTER,
      }),
    )
    await flushPromises()

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
    window.dispatchEvent(new Event('offline'))
    await advance(MAINTENANCE_OFF_POLL_INTERVAL_MS * 2)
    expect(loadSetting).toHaveBeenCalledTimes(1)

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
    window.dispatchEvent(new Event('online'))
    await flushPromises()
    expect(loadSetting).toHaveBeenCalledTimes(2)
  })

  it('ignores a successful result from a request aborted while hiding the tab', async () => {
    let resolveRequest
    const loadSetting = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )
    const onUpdate = vi.fn()
    const onResult = vi.fn()

    renderHook(() =>
      useSystemMaintenanceMonitor({
        enabled: true,
        setting: OFF_SETTING,
        loadSetting,
        onUpdate,
        onResult,
        random: NO_JITTER,
      }),
    )

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await act(async () => {
      resolveRequest({ ok: true, data: ENFORCED_SETTING })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onUpdate).not.toHaveBeenCalled()
    expect(onResult).not.toHaveBeenCalled()
  })

  it('keeps scheduling from the latest external state when an older request finishes', async () => {
    let finishOlderRequest
    const loadSetting = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOlderRequest = resolve
          }),
      )
      .mockResolvedValue({ ok: true, data: ENFORCED_SETTING })

    const { rerender } = renderHook(
      ({ setting }) =>
        useSystemMaintenanceMonitor({
          enabled: true,
          setting,
          loadSetting,
          onUpdate: vi.fn(),
          random: NO_JITTER,
        }),
      { initialProps: { setting: OFF_SETTING } },
    )

    rerender({ setting: ENFORCED_SETTING })
    await act(async () => {
      finishOlderRequest({ ok: true, data: OFF_SETTING })
      await Promise.resolve()
      await Promise.resolve()
    })

    await advance(MAINTENANCE_ACTIVE_POLL_INTERVAL_MS)
    expect(loadSetting).toHaveBeenCalledTimes(2)
  })

  it('queues one immediate refresh when visibility returns before an aborted request settles', async () => {
    let finishAbortedRequest
    const loadSetting = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishAbortedRequest = resolve
          }),
      )
      .mockResolvedValue({ ok: true, data: OFF_SETTING })

    renderHook(() =>
      useSystemMaintenanceMonitor({
        enabled: true,
        setting: OFF_SETTING,
        loadSetting,
        random: NO_JITTER,
      }),
    )
    expect(loadSetting).toHaveBeenCalledTimes(1)

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))

    await act(async () => {
      finishAbortedRequest({ ok: false, error: { name: 'AbortError' } })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(loadSetting).toHaveBeenCalledTimes(2)
  })

  it('uses exponential backoff after failures and resets it after success', async () => {
    const loadSetting = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: new Error('Unavailable') })
      .mockResolvedValueOnce({ ok: false, error: new Error('Unavailable') })
      .mockResolvedValue({ ok: true, data: OFF_SETTING })

    renderHook(() =>
      useSystemMaintenanceMonitor({
        enabled: true,
        setting: OFF_SETTING,
        loadSetting,
        random: NO_JITTER,
      }),
    )
    await flushPromises()
    expect(loadSetting).toHaveBeenCalledTimes(1)

    await advance(MAINTENANCE_ERROR_BACKOFF_BASE_MS)
    expect(loadSetting).toHaveBeenCalledTimes(2)
    await advance(MAINTENANCE_ERROR_BACKOFF_BASE_MS * 2)
    expect(loadSetting).toHaveBeenCalledTimes(3)

    await advance(MAINTENANCE_OFF_POLL_INTERVAL_MS)
    expect(loadSetting).toHaveBeenCalledTimes(4)
  })

  it('never overlaps requests and stops when disabled', async () => {
    let resolveRequest
    const loadSetting = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )
    const { rerender } = renderHook(
      ({ enabled }) =>
        useSystemMaintenanceMonitor({
          enabled,
          setting: OFF_SETTING,
          loadSetting,
          random: NO_JITTER,
        }),
      { initialProps: { enabled: true } },
    )

    expect(loadSetting).toHaveBeenCalledTimes(1)
    await advance(MAINTENANCE_OFF_POLL_INTERVAL_MS * 2)
    expect(loadSetting).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveRequest({ ok: true, data: OFF_SETTING })
      await Promise.resolve()
      await Promise.resolve()
    })

    rerender({ enabled: false })
    await advance(MAINTENANCE_OFF_POLL_INTERVAL_MS * 2)
    expect(loadSetting).toHaveBeenCalledTimes(1)
  })
})
