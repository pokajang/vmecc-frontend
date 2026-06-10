import { fetchSystemMaintenanceSetting, saveSystemMaintenanceSetting } from 'src/services/apiClient'

export const DEFAULT_SYSTEM_MAINTENANCE = {
  enabled: false,
  phase: 'off',
  graceEndsAt: null,
  message: 'System is under maintenance. Please try again later.',
  updatedAt: '',
  updatedByUserId: null,
}

const hasMaintenanceKeys = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      ['enabled', 'phase', 'graceEndsAt', 'updatedAt', 'message', 'updatedByUserId'].some((key) =>
        Object.prototype.hasOwnProperty.call(value, key),
      ),
  )

export const normalizeSystemMaintenanceSetting = (value, fallback = DEFAULT_SYSTEM_MAINTENANCE) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_SYSTEM_MAINTENANCE, ...fallback }
  }

  const message = String(
    value.message || fallback.message || DEFAULT_SYSTEM_MAINTENANCE.message,
  ).trim()
  const enabled = Boolean(value.enabled ?? fallback.enabled ?? DEFAULT_SYSTEM_MAINTENANCE.enabled)
  const phaseSource = String(value.phase || fallback.phase || '')
    .trim()
    .toLowerCase()
  const phase = enabled
    ? phaseSource === 'grace' || phaseSource === 'enforced'
      ? phaseSource
      : 'enforced'
    : 'off'
  const graceEndsAtSource = value.graceEndsAt ?? fallback.graceEndsAt ?? null
  const graceEndsAt = phase === 'grace' ? String(graceEndsAtSource || '').trim() || null : null

  return {
    enabled,
    phase,
    graceEndsAt,
    message: message || DEFAULT_SYSTEM_MAINTENANCE.message,
    updatedAt: String(value.updatedAt || fallback.updatedAt || ''),
    updatedByUserId:
      typeof value.updatedByUserId === 'number'
        ? value.updatedByUserId
        : (fallback.updatedByUserId ?? DEFAULT_SYSTEM_MAINTENANCE.updatedByUserId),
  }
}

export const loadSystemMaintenanceSetting = async () => {
  try {
    const result = await fetchSystemMaintenanceSetting()
    const payload = result?.data ?? result
    if (!hasMaintenanceKeys(payload)) {
      return { ok: false, data: { ...DEFAULT_SYSTEM_MAINTENANCE } }
    }
    return { ok: true, data: normalizeSystemMaintenanceSetting(payload), source: 'api' }
  } catch (error) {
    return { ok: false, data: { ...DEFAULT_SYSTEM_MAINTENANCE }, error }
  }
}

export const saveSystemMaintenance = async (nextSetting) => {
  const normalizedInput = normalizeSystemMaintenanceSetting(nextSetting)
  try {
    const result = await saveSystemMaintenanceSetting(normalizedInput)
    const payload = result?.data ?? result
    const persisted = hasMaintenanceKeys(payload)
      ? normalizeSystemMaintenanceSetting(payload, normalizedInput)
      : normalizedInput
    return { ok: true, data: persisted, source: 'api' }
  } catch (error) {
    return { ok: false, data: normalizedInput, error }
  }
}
