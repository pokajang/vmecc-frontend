import { describe, expect, it, vi } from 'vitest'
import { registerAppServiceWorker } from '../serviceWorkerRegistration'

describe('service worker registration', () => {
  it('checks for an update without attaching an automatic page-reload listener', async () => {
    const registration = { update: vi.fn().mockResolvedValue(undefined) }
    const serviceWorker = {
      addEventListener: vi.fn(),
      register: vi.fn().mockResolvedValue(registration),
    }

    await expect(registerAppServiceWorker({ serviceWorker })).resolves.toBe(registration)

    expect(serviceWorker.register).toHaveBeenCalledWith('/service-worker.js')
    expect(registration.update).toHaveBeenCalledTimes(1)
    expect(serviceWorker.addEventListener).not.toHaveBeenCalled()
  })

  it('keeps the current app usable when registration or update checks fail', async () => {
    await expect(
      registerAppServiceWorker({
        serviceWorker: { register: vi.fn().mockRejectedValue(new Error('registration failed')) },
      }),
    ).resolves.toBeNull()

    const registration = { update: vi.fn().mockRejectedValue(new Error('update failed')) }
    await expect(
      registerAppServiceWorker({
        serviceWorker: { register: vi.fn().mockResolvedValue(registration) },
      }),
    ).resolves.toBe(registration)
  })
})
