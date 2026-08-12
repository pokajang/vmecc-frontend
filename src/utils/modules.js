export const getModuleState = (moduleActivation, key) => {
  if (!key) {
    return { enabled: true, reason: null, blockingModule: null }
  }

  const state = moduleActivation?.effective?.[key]
  if (!state || typeof state !== 'object') {
    return { enabled: true, reason: null, blockingModule: null }
  }

  return {
    enabled: state.enabled !== false,
    reason: state.reason || null,
    blockingModule: state.blockingModule || state.blocking_module || null,
  }
}

export const isModuleEnabled = (moduleActivation, key) =>
  getModuleState(moduleActivation, key).enabled

export const isModuleActivationHydrated = (moduleActivation) => moduleActivation?.hydrated === true

export const isAnyModuleEnabled = (moduleActivation, keys = []) =>
  Array.isArray(keys) && keys.some((key) => isModuleEnabled(moduleActivation, key))

export const getModuleDisabledReason = (moduleActivation, key) =>
  getModuleState(moduleActivation, key)

export const normalizeModuleActivationPayload = (payload) => {
  const data = payload?.data || payload || {}
  return {
    hydrated: true,
    registry: Array.isArray(data.registry) ? data.registry : [],
    configured: data.configured && typeof data.configured === 'object' ? data.configured : {},
    effective: data.effective && typeof data.effective === 'object' ? data.effective : {},
    fallbackMode: data.fallbackMode !== false,
  }
}
