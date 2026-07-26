// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  activateWaitingWorker,
  checkForServiceWorkerUpdate,
  prepareAppUpdate,
  resetServiceWorkerUpdateStateForTests,
  setAppServiceWorkerRegistration,
} from '../serviceWorkerUpdates'

describe('service worker update coordination', () => {
  beforeEach(() => {
    resetServiceWorkerUpdateStateForTests()
    vi.useRealTimers()
  })

  it('coalesces simultaneous update checks', async () => {
    let finishUpdate
    const registration = {
      update: vi.fn(
        () =>
          new Promise((resolve) => {
            finishUpdate = resolve
          }),
      ),
    }
    setAppServiceWorkerRegistration(registration)

    const first = checkForServiceWorkerUpdate()
    const second = checkForServiceWorkerUpdate()
    await Promise.resolve()
    finishUpdate()

    await expect(first).resolves.toBe(registration)
    await expect(second).resolves.toBe(registration)
    expect(registration.update).toHaveBeenCalledTimes(1)
  })

  it('returns an already waiting worker when preparing an update', async () => {
    const waiting = { state: 'installed' }
    const registration = {
      waiting,
      update: vi.fn().mockResolvedValue(undefined),
    }
    setAppServiceWorkerRegistration(registration)

    await expect(prepareAppUpdate()).resolves.toBe(waiting)
  })

  it('asks the waiting worker to activate and resolves on controller change', async () => {
    const serviceWorker = new EventTarget()
    serviceWorker.addEventListener = vi.fn(serviceWorker.addEventListener.bind(serviceWorker))
    serviceWorker.removeEventListener = vi.fn(serviceWorker.removeEventListener.bind(serviceWorker))
    const waiting = {
      postMessage: vi.fn(() => serviceWorker.dispatchEvent(new Event('controllerchange'))),
    }
    const registration = { waiting }
    setAppServiceWorkerRegistration(registration)

    await expect(activateWaitingWorker({ serviceWorker })).resolves.toBe(registration)
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'VMECC_SKIP_WAITING' })
  })

  it('also resolves when activation completes without a controller-change event', async () => {
    const serviceWorker = new EventTarget()
    const waiting = new EventTarget()
    waiting.state = 'installed'
    waiting.postMessage = vi.fn(() => {
      waiting.state = 'activated'
      waiting.dispatchEvent(new Event('statechange'))
    })
    const registration = { waiting }
    setAppServiceWorkerRegistration(registration)

    await expect(activateWaitingWorker({ serviceWorker })).resolves.toBe(registration)
  })

  it('fails cleanly when no waiting worker is available', async () => {
    setAppServiceWorkerRegistration({ waiting: null })

    await expect(activateWaitingWorker({ serviceWorker: new EventTarget() })).rejects.toThrow(
      'not ready',
    )
  })

  it('allows a reload-only update when service workers are unavailable', async () => {
    await expect(prepareAppUpdate({ serviceWorker: null })).resolves.toBeNull()
  })
})
