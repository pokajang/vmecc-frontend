export const registerAppServiceWorker = async ({
  serviceWorker = globalThis.navigator?.serviceWorker,
  scriptUrl = '/service-worker.js',
} = {}) => {
  if (!serviceWorker?.register) return null

  try {
    const registration = await serviceWorker.register(scriptUrl)
    try {
      await registration?.update?.()
    } catch {
      // The active worker remains usable when an update check fails.
    }
    return registration || null
  } catch {
    return null
  }
}
