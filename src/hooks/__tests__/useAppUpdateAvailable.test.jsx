// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useAppUpdateAvailable, { APP_UPDATE_CHECK_INTERVAL_MS } from '../useAppUpdateAvailable'

const checkForAppUpdate = vi.fn()
const prepareAppUpdate = vi.fn()
const activateWaitingWorker = vi.fn()

vi.mock('src/services/appVersion', () => ({
  checkForAppUpdate: (...args) => checkForAppUpdate(...args),
}))
vi.mock('src/services/serviceWorkerUpdates', () => ({
  SERVICE_WORKER_UPDATE_READY_EVENT: 'vmecc:service-worker-update-ready',
  prepareAppUpdate: (...args) => prepareAppUpdate(...args),
  activateWaitingWorker: (...args) => activateWaitingWorker(...args),
}))

describe('useAppUpdateAvailable', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
    sessionStorage.clear()
    prepareAppUpdate.mockResolvedValue({ state: 'installed' })
    activateWaitingWorker.mockResolvedValue({})
  })

  it('shows and snoozes available updates for the current session', async () => {
    checkForAppUpdate.mockResolvedValue({
      available: true,
      latest: { buildId: 'new-build' },
    })

    const { result } = renderHook(() => useAppUpdateAvailable())

    await waitFor(() => expect(result.current.updateAvailable).toBe(true))

    act(() => {
      result.current.dismissUpdate()
    })
    expect(result.current.updateAvailable).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('vmecc:service-worker-update-ready'))
    })
    expect(result.current.updateAvailable).toBe(false)

    await act(async () => {
      await result.current.checkNow()
    })
    expect(result.current.updateAvailable).toBe(false)
  })

  it('keeps an existing banner visible after a failed refresh check', async () => {
    checkForAppUpdate
      .mockResolvedValueOnce({
        available: true,
        latest: { buildId: 'new-build' },
      })
      .mockResolvedValueOnce({
        available: false,
        latest: null,
      })

    const { result } = renderHook(() => useAppUpdateAvailable())

    await waitFor(() => expect(result.current.updateAvailable).toBe(true))

    await act(async () => {
      await result.current.checkNow()
    })

    expect(result.current.updateAvailable).toBe(true)
  })

  it('polls on the configured interval', async () => {
    vi.useFakeTimers()
    checkForAppUpdate.mockResolvedValue({
      available: false,
      latest: null,
    })

    renderHook(() => useAppUpdateAvailable())

    await act(async () => {
      vi.advanceTimersByTime(0)
      await Promise.resolve()
    })
    expect(checkForAppUpdate).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(APP_UPDATE_CHECK_INTERVAL_MS)
      await Promise.resolve()
    })
    expect(checkForAppUpdate).toHaveBeenCalledTimes(2)
  })

  it('surfaces a worker that is already waiting during rollout migration', async () => {
    checkForAppUpdate.mockResolvedValue({
      available: false,
      latest: { buildId: 'current-build' },
    })
    const { result } = renderHook(() => useAppUpdateAvailable())

    await waitFor(() => expect(checkForAppUpdate).toHaveBeenCalled())
    act(() => {
      window.dispatchEvent(new Event('vmecc:service-worker-update-ready'))
    })

    expect(result.current.updateAvailable).toBe(true)
    expect(result.current.status).toBe('ready')
  })

  it('does not let a current-version response hide an earlier worker-ready signal', async () => {
    let resolveVersionCheck
    checkForAppUpdate.mockReturnValue(
      new Promise((resolve) => {
        resolveVersionCheck = resolve
      }),
    )
    const { result } = renderHook(() => useAppUpdateAvailable())

    await waitFor(() => expect(checkForAppUpdate).toHaveBeenCalled())
    act(() => {
      window.dispatchEvent(new Event('vmecc:service-worker-update-ready'))
    })
    await act(async () => {
      resolveVersionCheck({
        available: false,
        latest: { buildId: 'current-build' },
      })
      await Promise.resolve()
    })

    expect(result.current.updateAvailable).toBe(true)
    expect(result.current.status).toBe('ready')
  })
})
