import {
  checkForServiceWorkerUpdate,
  setAppServiceWorkerRegistration,
  startServiceWorkerUpdateChecks,
} from './serviceWorkerUpdates'

export const registerAppServiceWorker = async ({
  serviceWorker = globalThis.navigator?.serviceWorker,
  scriptUrl = '/service-worker.js',
} = {}) => {
  if (!serviceWorker?.register) return null

  try {
    const registration = await serviceWorker.register(scriptUrl, { updateViaCache: 'none' })
    setAppServiceWorkerRegistration(registration)
    try {
      await checkForServiceWorkerUpdate({ serviceWorker })
    } catch {
      // The active worker remains usable when an update check fails.
    }
    startServiceWorkerUpdateChecks({ serviceWorker })
    return registration || null
  } catch {
    return null
  }
}
