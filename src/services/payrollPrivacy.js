const LEGACY_PAYROLL_STORAGE_PREFIXES = [
  'vmecc_claim_records',
  'vmecc_claim_drafts',
  'vmecc_claim_draft_salary',
  'vmecc_claim_draft_expense',
  'vmecc_salary_claim_assignment',
  'vmecc_overtime_records',
  'vmecc_overtime_draft',
  'payroll-claim-autosave',
  'payroll-claim-autosave-retry',
]

const volatileRows = new Map()
let activeIdentity = ''
let identityGeneration = 0
const pendingControllers = new Set()
const PAYROLL_SESSION_CHANNEL = 'vmecc-sensitive-session'
export const PAYROLL_SESSION_CLEARED_EVENT = 'vmecc:payroll-session-cleared'
const sessionChannel =
  typeof globalThis.window?.BroadcastChannel === 'function'
    ? new globalThis.window.BroadcastChannel(PAYROLL_SESSION_CHANNEL)
    : null

const volatileStorage = {
  get length() {
    return volatileRows.size
  },
  key(index) {
    return Array.from(volatileRows.keys())[index] ?? null
  },
  getItem(key) {
    return volatileRows.has(String(key)) ? volatileRows.get(String(key)) : null
  },
  setItem(key, value) {
    volatileRows.set(String(key), String(value))
  },
  removeItem(key) {
    volatileRows.delete(String(key))
  },
  clear() {
    volatileRows.clear()
  },
}

const purgeStorage = (storage) => {
  if (!storage?.key || !storage?.removeItem) return
  const keys = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && LEGACY_PAYROLL_STORAGE_PREFIXES.some((prefix) => String(key).startsWith(prefix))) {
      keys.push(key)
    }
  }
  keys.forEach((key) => storage.removeItem(key))
}

export const purgeLegacyPayrollBrowserData = () => {
  try {
    purgeStorage(globalThis.localStorage)
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
  try {
    purgeStorage(globalThis.sessionStorage)
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

export const getPayrollVolatileStorage = () => volatileStorage

export const resolveSensitiveIdentityKey = (user) =>
  String(user?.id || user?.userId || user?.email || 'signed-out')

export const activatePayrollIdentity = (userId) => {
  const nextIdentity = String(userId || '').trim()
  if (nextIdentity === activeIdentity) return identityGeneration

  activeIdentity = nextIdentity
  identityGeneration += 1
  pendingControllers.forEach((controller) => controller.abort())
  pendingControllers.clear()
  volatileStorage.clear()
  purgeLegacyPayrollBrowserData()

  return identityGeneration
}

const dispatchSessionClearedEvent = () => {
  if (
    typeof globalThis.dispatchEvent !== 'function' ||
    typeof globalThis.CustomEvent !== 'function'
  ) {
    return
  }
  globalThis.dispatchEvent(new globalThis.CustomEvent(PAYROLL_SESSION_CLEARED_EVENT))
}

export const clearPayrollSensitiveState = ({ broadcast = true } = {}) => {
  activeIdentity = ''
  identityGeneration += 1
  pendingControllers.forEach((controller) => controller.abort())
  pendingControllers.clear()
  volatileStorage.clear()
  purgeLegacyPayrollBrowserData()
  dispatchSessionClearedEvent()
  if (broadcast) {
    sessionChannel?.postMessage({ type: 'session-cleared' })
  }
}

export const createPayrollRequestContext = (userId) => {
  const normalizedUserId = String(userId || '').trim()
  const generation = activatePayrollIdentity(normalizedUserId)
  const controller = new AbortController()
  pendingControllers.add(controller)

  return {
    signal: controller.signal,
    isCurrent: () =>
      !controller.signal.aborted &&
      generation === identityGeneration &&
      normalizedUserId === activeIdentity,
    release: () => pendingControllers.delete(controller),
    abort: () => {
      controller.abort()
      pendingControllers.delete(controller)
    },
  }
}

purgeLegacyPayrollBrowserData()

if (sessionChannel) {
  sessionChannel.onmessage = (event) => {
    if (event?.data?.type === 'session-cleared') {
      clearPayrollSensitiveState({ broadcast: false })
    }
  }
}
