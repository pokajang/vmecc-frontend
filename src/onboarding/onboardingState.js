import { updateOnboardingState } from 'src/services/apiClient'

export const mergeOnboardingState = (user, key, state) => ({
  ...user,
  onboarding: {
    ...(user?.onboarding || {}),
    [key]: state,
  },
})

export const readOnboardingState = (user, key, version) => {
  const record = user?.onboarding?.[key] || null
  if (!record || (version && record.version && record.version !== version)) return null
  return record
}

export const isOnboardingDebugEnabled = () => {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem('vmecc_onboarding_debug') === '1'
  } catch {
    return false
  }
}

export const logOnboardingDebug = (message, data = {}) => {
  if (!isOnboardingDebugEnabled()) return
  console.info(`[onboarding] ${message}`, data)
}

export const updateOnboardingEvent = async ({
  dispatch,
  event,
  fallbackRecord,
  key,
  payload = {},
  syncRedux = true,
  user,
  version,
  writeFallbackRecord,
}) => {
  if (!user?.id) return null

  try {
    const response = await updateOnboardingState(key, {
      version,
      event,
      ...(Object.keys(payload).length > 0 ? { payload } : {}),
    })
    const nextState = response?.data?.[key]
    logOnboardingDebug('persisted event', { event, key, nextState, payload, version })
    if (nextState && syncRedux && dispatch) {
      dispatch({
        type: 'set',
        authUser: mergeOnboardingState(user, key, nextState),
      })
    }
    return nextState
  } catch (error) {
    logOnboardingDebug('event persistence failed', {
      event,
      key,
      message: error?.message,
      payload,
      version,
    })
    if (fallbackRecord && writeFallbackRecord) {
      writeFallbackRecord(user.id, fallbackRecord)
    }
    return null
  }
}
