const UPDATE_READY_TIMEOUT_MS = 15_000
const ACTIVATION_TIMEOUT_MS = 10_000
export const SERVICE_WORKER_UPDATE_READY_EVENT = 'vmecc:service-worker-update-ready'

let appRegistration = null
let updateCheckPromise = null
let removeUpdateChecks = null

const notifyUpdateReady = (registration) => {
  if (!registration?.waiting || typeof globalThis.window?.dispatchEvent !== 'function') return
  const event =
    typeof CustomEvent === 'function'
      ? new CustomEvent(SERVICE_WORKER_UPDATE_READY_EVENT)
      : new Event(SERVICE_WORKER_UPDATE_READY_EVENT)
  globalThis.window.dispatchEvent(event)
}

export const setAppServiceWorkerRegistration = (registration) => {
  appRegistration = registration || null
}

export const getRegistration = async ({
  serviceWorker = globalThis.navigator?.serviceWorker,
} = {}) => {
  if (appRegistration) return appRegistration
  if (!serviceWorker?.getRegistration) return null
  try {
    appRegistration = (await serviceWorker.getRegistration('/')) || null
  } catch {
    appRegistration = null
  }
  return appRegistration
}

export const checkForServiceWorkerUpdate = async (options = {}) => {
  if (updateCheckPromise) return updateCheckPromise

  updateCheckPromise = (async () => {
    const registration = await getRegistration(options)
    if (!registration) return null
    await registration.update?.()
    notifyUpdateReady(registration)
    return registration
  })()

  try {
    return await updateCheckPromise
  } finally {
    updateCheckPromise = null
  }
}

const waitForWaitingWorker = (registration, timeoutMs = UPDATE_READY_TIMEOUT_MS) =>
  new Promise((resolve, reject) => {
    if (registration?.waiting) {
      resolve(registration.waiting)
      return
    }

    let installing = registration?.installing || null
    let timeoutId

    const cleanup = () => {
      if (timeoutId) globalThis.clearTimeout?.(timeoutId)
      registration?.removeEventListener?.('updatefound', handleUpdateFound)
      installing?.removeEventListener?.('statechange', handleStateChange)
    }
    const finish = (worker) => {
      cleanup()
      resolve(worker)
    }
    const fail = (message) => {
      cleanup()
      reject(new Error(message))
    }
    const handleStateChange = () => {
      if (registration?.waiting || installing?.state === 'installed') {
        finish(registration?.waiting || installing)
      } else if (installing?.state === 'redundant') {
        fail('The new service worker could not be installed.')
      }
    }
    const watchInstalling = () => {
      installing?.removeEventListener?.('statechange', handleStateChange)
      installing = registration?.installing || null
      if (!installing) return
      installing.addEventListener?.('statechange', handleStateChange)
      handleStateChange()
    }
    function handleUpdateFound() {
      watchInstalling()
    }

    timeoutId = globalThis.setTimeout?.(
      () => fail('Timed out while preparing the application update.'),
      timeoutMs,
    )
    registration?.addEventListener?.('updatefound', handleUpdateFound)
    watchInstalling()
  })

export const prepareAppUpdate = async (options = {}) => {
  const serviceWorker = options.serviceWorker ?? globalThis.navigator?.serviceWorker
  const registration = await checkForServiceWorkerUpdate(options)
  if (!registration) {
    if (!serviceWorker) return null
    throw new Error('Service worker registration is unavailable.')
  }
  return waitForWaitingWorker(registration, options.timeoutMs)
}

export const activateWaitingWorker = async ({
  serviceWorker = globalThis.navigator?.serviceWorker,
  timeoutMs = ACTIVATION_TIMEOUT_MS,
} = {}) => {
  const registration = await getRegistration({ serviceWorker })
  const waiting = registration?.waiting
  if (!waiting) throw new Error('The application update is not ready yet.')

  return new Promise((resolve, reject) => {
    let timeoutId
    const cleanup = () => {
      if (timeoutId) globalThis.clearTimeout?.(timeoutId)
      serviceWorker?.removeEventListener?.('controllerchange', handleControllerChange)
      waiting.removeEventListener?.('statechange', handleWorkerStateChange)
    }
    const handleControllerChange = () => {
      cleanup()
      resolve(registration)
    }
    const handleWorkerStateChange = () => {
      if (waiting.state !== 'activated') return
      cleanup()
      resolve(registration)
    }

    serviceWorker?.addEventListener?.('controllerchange', handleControllerChange, { once: true })
    waiting.addEventListener?.('statechange', handleWorkerStateChange)
    timeoutId = globalThis.setTimeout?.(() => {
      cleanup()
      reject(new Error('Timed out while activating the application update.'))
    }, timeoutMs)
    waiting.postMessage({ type: 'VMECC_SKIP_WAITING' })
  })
}

export const startServiceWorkerUpdateChecks = ({
  serviceWorker = globalThis.navigator?.serviceWorker,
  windowTarget = globalThis.window,
  documentTarget = globalThis.document,
} = {}) => {
  if (removeUpdateChecks || !serviceWorker) return removeUpdateChecks || (() => {})

  const check = () => {
    void checkForServiceWorkerUpdate({ serviceWorker }).catch(() => {})
  }
  const checkWhenVisible = () => {
    if (!documentTarget?.visibilityState || documentTarget.visibilityState === 'visible') check()
  }

  windowTarget?.addEventListener?.('pageshow', checkWhenVisible)
  windowTarget?.addEventListener?.('online', checkWhenVisible)
  documentTarget?.addEventListener?.('visibilitychange', checkWhenVisible)

  removeUpdateChecks = () => {
    windowTarget?.removeEventListener?.('pageshow', checkWhenVisible)
    windowTarget?.removeEventListener?.('online', checkWhenVisible)
    documentTarget?.removeEventListener?.('visibilitychange', checkWhenVisible)
    removeUpdateChecks = null
  }
  return removeUpdateChecks
}

export const resetServiceWorkerUpdateStateForTests = () => {
  removeUpdateChecks?.()
  appRegistration = null
  updateCheckPromise = null
}
