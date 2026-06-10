import { useCallback, useState } from 'react'
import {
  fetchSalaryStatutoryRates,
  saveOvertimeRateSettings as saveOvertimeRateSettingsApi,
  saveSalaryStatutoryRates as saveSalaryStatutoryRatesApi,
} from 'src/services/apiClient'
import featureFlags from 'src/config/featureFlags'
import {
  defaultOvertimeRateSettings,
  defaultSalaryStatutoryRates,
  normalizeSalaryStatutoryRates,
} from '../../utils'

const useSalaryAssignmentRatesState = ({ user, pushToast }) => {
  const statutoryRatesFeatureEnabled = featureFlags.salaryStatutoryRatesApiEnabled
  const [otRateSettings, setOtRateSettings] = useState(() => defaultOvertimeRateSettings())
  const [otRateDirty, setOtRateDirty] = useState(false)
  const [isStatutoryRatesSaving, setIsStatutoryRatesSaving] = useState(false)
  const [isOvertimeRatesSaving, setIsOvertimeRatesSaving] = useState(false)
  const [statutoryRates, setStatutoryRates] = useState(() => defaultSalaryStatutoryRates())
  const [rateEditMode, setRateEditMode] = useState(false)
  const [statutoryRatesDraft, setStatutoryRatesDraft] = useState(() =>
    defaultSalaryStatutoryRates(),
  )

  const hydrateStatutoryRates = useCallback(async () => {
    let loadedRates = defaultSalaryStatutoryRates()
    if (statutoryRatesFeatureEnabled) {
      try {
        const apiRates = await fetchSalaryStatutoryRates()
        if (apiRates?.data && typeof apiRates.data === 'object') {
          loadedRates = normalizeSalaryStatutoryRates(apiRates.data)
        }
      } catch {
        pushToast('Unable to load statutory rates from backend.', {
          title: 'Rate warning',
          color: 'warning',
        })
      }
    }
    setStatutoryRates(loadedRates)
    setStatutoryRatesDraft(loadedRates)
    setRateEditMode(false)
  }, [pushToast, statutoryRatesFeatureEnabled])

  const editStatutoryRates = useCallback(() => {
    setStatutoryRatesDraft(statutoryRates)
    setRateEditMode(true)
  }, [statutoryRates])

  const changeStatutoryRateField = useCallback((type, side, value) => {
    if (!type || !side) return
    const asDecimal = Number.parseFloat(value)
    setStatutoryRatesDraft((prev) => {
      const normalized = normalizeSalaryStatutoryRates(prev)
      return {
        ...normalized,
        [type]: {
          ...normalized[type],
          [side]: Number.isFinite(asDecimal) ? Math.max(asDecimal, 0) / 100 : 0,
        },
      }
    })
  }, [])

  const cancelStatutoryRateEdit = useCallback(() => {
    setStatutoryRatesDraft(statutoryRates)
    setRateEditMode(false)
  }, [statutoryRates])

  const saveStatutoryRates = useCallback(async () => {
    if (isStatutoryRatesSaving) return false
    if (!statutoryRatesFeatureEnabled) {
      pushToast('Salary statutory rates API is not enabled in this environment.', {
        title: 'Feature disabled',
        color: 'warning',
      })
      return false
    }
    setIsStatutoryRatesSaving(true)
    try {
      const actor = user?.name || user?.full_name || user?.email || 'System user'
      const updated = {
        ...normalizeSalaryStatutoryRates(statutoryRatesDraft),
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
      }
      try {
        await saveSalaryStatutoryRatesApi(updated)
      } catch {
        pushToast('Unable to save statutory rates to backend.', {
          title: 'Save failed',
          color: 'danger',
        })
        return false
      }
      setStatutoryRates(updated)
      setStatutoryRatesDraft(updated)
      setRateEditMode(false)
      pushToast('Statutory rates updated.', { title: 'Saved', color: 'success' })
      return true
    } finally {
      setIsStatutoryRatesSaving(false)
    }
  }, [
    isStatutoryRatesSaving,
    pushToast,
    statutoryRatesDraft,
    statutoryRatesFeatureEnabled,
    user?.email,
    user?.full_name,
    user?.name,
  ])

  const updateOvertimeRateField = useCallback((field, value) => {
    setOtRateSettings((prev) => ({ ...prev, [field]: value }))
    setOtRateDirty(true)
  }, [])

  const updateOvertimeBaseHourField = useCallback((field, value) => {
    setOtRateSettings((prev) => ({
      ...prev,
      baseHourCalculation: {
        ...(prev?.baseHourCalculation || {}),
        [field]: value,
      },
    }))
    setOtRateDirty(true)
  }, [])

  const updateOvertimeApplicabilityField = useCallback((field, value) => {
    setOtRateSettings((prev) => ({
      ...prev,
      otApplicability: {
        ...(prev?.otApplicability || {}),
        [field]: value,
      },
    }))
    setOtRateDirty(true)
  }, [])

  const updateOvertimeRoleOverrideField = useCallback((role, value) => {
    setOtRateSettings((prev) => ({
      ...prev,
      baseHourCalculation: {
        ...(prev?.baseHourCalculation || {}),
        roleNormalHoursPerDay: {
          ...(prev?.baseHourCalculation?.roleNormalHoursPerDay || {}),
          [role]: value,
        },
      },
    }))
    setOtRateDirty(true)
  }, [])

  const resetOvertimeRates = useCallback(() => {
    setOtRateSettings(defaultOvertimeRateSettings())
    setOtRateDirty(true)
  }, [])

  const persistOvertimeRates = useCallback(
    async ({ successMessage = 'Overtime settings updated.' } = {}) => {
      if (isOvertimeRatesSaving) return false
      setIsOvertimeRatesSaving(true)
      const actor = user?.name || user?.full_name || user?.email || 'System user'
      const nowIso = new Date().toISOString()
      const nextHistoryEntry = {
        id: `otr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: nowIso,
        by: actor,
        weekdayMultiplier: String(otRateSettings?.weekdayMultiplier || ''),
        weekendMultiplier: String(otRateSettings?.weekendMultiplier || ''),
        publicHolidayMultiplier: String(otRateSettings?.publicHolidayMultiplier || ''),
        baseHourMode: String(otRateSettings?.baseHourCalculation?.mode || ''),
        normalHoursStrategy: String(otRateSettings?.baseHourCalculation?.normalHoursStrategy || ''),
        monthlyDivisor: String(otRateSettings?.baseHourCalculation?.monthlyDivisor || ''),
        globalNormalHoursPerDay: String(
          otRateSettings?.baseHourCalculation?.globalNormalHoursPerDay || '',
        ),
        defaultRoleHoursPerDay: String(
          otRateSettings?.baseHourCalculation?.defaultRoleHoursPerDay || '',
        ),
        roleOverrideCount: Object.values(
          otRateSettings?.baseHourCalculation?.roleNormalHoursPerDay || {},
        )
          .map((value) => Number.parseFloat(value))
          .filter((value) => Number.isFinite(value) && value > 0).length,
      }
      const existingHistory = Array.isArray(otRateSettings?.rateHistory)
        ? otRateSettings.rateHistory
        : []
      const nextHistory = [nextHistoryEntry, ...existingHistory].slice(0, 20)
      const updated = {
        ...otRateSettings,
        updatedAt: nowIso,
        updatedBy: actor,
        rateHistory: nextHistory,
      }
      try {
        await saveOvertimeRateSettingsApi(updated)
      } catch {
        pushToast('Unable to save overtime rates to backend.', {
          title: 'Save failed',
          color: 'danger',
        })
        return false
      } finally {
        setIsOvertimeRatesSaving(false)
      }
      setOtRateSettings(updated)
      setOtRateDirty(false)
      pushToast(successMessage, { title: 'Saved', color: 'success' })
      return true
    },
    [isOvertimeRatesSaving, otRateSettings, pushToast, user?.email, user?.full_name, user?.name],
  )

  return {
    hydrateStatutoryRates,
    statutoryRatesFeatureEnabled,
    statutoryRates,
    statutoryRatesDraft,
    rateEditMode,
    editStatutoryRates,
    changeStatutoryRateField,
    saveStatutoryRates,
    cancelStatutoryRateEdit,
    otRateSettings,
    setOtRateSettings,
    otRateDirty,
    setOtRateDirty,
    updateOvertimeRateField,
    updateOvertimeBaseHourField,
    updateOvertimeApplicabilityField,
    updateOvertimeRoleOverrideField,
    resetOvertimeRates,
    persistOvertimeRates,
  }
}

export default useSalaryAssignmentRatesState
