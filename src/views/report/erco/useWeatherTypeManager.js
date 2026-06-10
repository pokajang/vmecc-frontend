import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ERCO_WEATHER_OPTIONS } from './constants'
import { loadCustomWeatherTypes, saveCustomWeatherTypes } from './customWeatherTypesStorage'
import {
  applyTypeOverrides,
  buildPinnedVisibleOptions,
  getTypeIconOptions,
  normalizeTypeKey,
  pickLeastUsedTypeIconKey,
  resolveTypeIconKey,
  withResolvedTypeIcon,
} from '../typeOptionUtils'
import {
  loadWeatherSystemOverrides,
  saveWeatherSystemOverrides,
} from './systemTypeOverridesStorage'
import { loadTypeUsage, sortOptionsByUsage } from './typeUsageStorage'

export const WEATHER_VISIBLE_LIMIT = 3
export const WEATHER_TOGGLE_VALUE = '__erco_weather_types_toggle__'

const useWeatherTypeManager = ({ userId, selectedWeather, updateSetupField, pushToast }) => {
  const [showAllWeatherTypes, setShowAllWeatherTypes] = useState(false)
  const [showAddWeatherModal, setShowAddWeatherModal] = useState(false)
  const [weatherEditMode, setWeatherEditMode] = useState(false)
  const [weatherSystemOverrides, setWeatherSystemOverrides] = useState([])
  const [customWeatherTypes, setCustomWeatherTypes] = useState([])
  const [weatherUsage, setWeatherUsage] = useState({})
  const [newWeatherName, setNewWeatherName] = useState('')
  const [newWeatherDescription, setNewWeatherDescription] = useState('')
  const [newWeatherIconKey, setNewWeatherIconKey] = useState('')
  const [editingWeatherTypeKey, setEditingWeatherTypeKey] = useState('')
  const [addWeatherError, setAddWeatherError] = useState('')

  useEffect(() => {
    setCustomWeatherTypes(loadCustomWeatherTypes(userId))
    setWeatherSystemOverrides(loadWeatherSystemOverrides(userId))
    setWeatherUsage(loadTypeUsage(userId, 'weather'))
  }, [userId])

  const weatherSystemOptions = useMemo(
    () => applyTypeOverrides(ERCO_WEATHER_OPTIONS, weatherSystemOverrides),
    [weatherSystemOverrides],
  )

  const iconOptions = useMemo(() => getTypeIconOptions('weather'), [])

  const typeOptions = useMemo(() => {
    const options = [
      ...weatherSystemOptions,
      ...customWeatherTypes.map((row) =>
        withResolvedTypeIcon(row, 'weather', 'Custom weather condition.'),
      ),
    ]
    return sortOptionsByUsage(options, weatherUsage)
  }, [customWeatherTypes, weatherSystemOptions, weatherUsage])

  const systemOverrideSet = useMemo(
    () =>
      new Set(
        weatherSystemOverrides.map((row) =>
          String(row.value || '')
            .trim()
            .toLowerCase(),
        ),
      ),
    [weatherSystemOverrides],
  )

  const systemTypeSet = useMemo(
    () => new Set(ERCO_WEATHER_OPTIONS.map((row) => String(row.value || '').toLowerCase())),
    [],
  )
  const editingSystemType = useMemo(
    () => Boolean(editingWeatherTypeKey && systemTypeSet.has(editingWeatherTypeKey)),
    [editingWeatherTypeKey, systemTypeSet],
  )

  const visibleTypeOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: typeOptions,
        selected: selectedWeather,
        visibleLimit: WEATHER_VISIBLE_LIMIT,
        showAll: showAllWeatherTypes,
        toggleOption: {
          value: WEATHER_TOGGLE_VALUE,
          title: showAllWeatherTypes ? 'Show less' : 'Show more',
          description: showAllWeatherTypes
            ? 'Hide extra weather types.'
            : 'View all weather types.',
          icon: showAllWeatherTypes ? ChevronUp : ChevronDown,
        },
      }),
    [selectedWeather, showAllWeatherTypes, typeOptions],
  )

  const resetDraft = () => {
    setNewWeatherName('')
    setNewWeatherDescription('')
    setNewWeatherIconKey('')
    setEditingWeatherTypeKey('')
  }

  const openAddModal = () => {
    setAddWeatherError('')
    resetDraft()
    setNewWeatherIconKey(
      pickLeastUsedTypeIconKey('weather', [...customWeatherTypes, ...weatherSystemOverrides]),
    )
    setWeatherEditMode(false)
    setShowAddWeatherModal(true)
  }

  const closeAddModal = () => {
    setShowAddWeatherModal(false)
    setWeatherEditMode(false)
    resetDraft()
    setAddWeatherError('')
  }

  const saveType = () => {
    const title = String(newWeatherName || '').trim()
    const description = String(newWeatherDescription || '').trim()
    const editKey = String(editingWeatherTypeKey || '')
      .trim()
      .toLowerCase()

    if (!title) {
      setAddWeatherError('Type name is required.')
      return
    }

    const exists = typeOptions.some((row) => {
      const key = String(row.value || '')
        .trim()
        .toLowerCase()
      if (editKey && key === editKey) return false
      return key === title.toLowerCase()
    })
    if (exists) {
      setAddWeatherError('This weather type already exists.')
      return
    }

    if (editKey && systemTypeSet.has(editKey)) {
      const baseOption = ERCO_WEATHER_OPTIONS.find(
        (row) =>
          String(row.value || '')
            .trim()
            .toLowerCase() === editKey,
      )
      if (!baseOption) return

      const nextOverrides = [
        ...weatherSystemOverrides.filter(
          (row) =>
            String(row.value || '')
              .trim()
              .toLowerCase() !== editKey,
        ),
        {
          value: baseOption.value,
          title,
          description,
          iconKey: newWeatherIconKey,
        },
      ]
      setWeatherSystemOverrides(nextOverrides)
      saveWeatherSystemOverrides(userId, nextOverrides)

      if (typeof pushToast === 'function') {
        pushToast(`Weather type "${title}" updated.`, {
          title: 'Type updated',
          color: 'success',
        })
      }

      resetDraft()
      setWeatherEditMode(true)
      return
    }

    const nextCustomTypes = editKey
      ? customWeatherTypes.map((row) => {
          const rowKey = String(row.value || '')
            .trim()
            .toLowerCase()
          if (rowKey !== editKey) return row
          return { value: title, title, description, iconKey: newWeatherIconKey }
        })
      : [...customWeatherTypes, { value: title, title, description, iconKey: newWeatherIconKey }]
    setCustomWeatherTypes(nextCustomTypes)
    saveCustomWeatherTypes(userId, nextCustomTypes)

    if (
      editKey &&
      String(selectedWeather || '')
        .trim()
        .toLowerCase() === editKey
    ) {
      updateSetupField('weather', title)
    } else if (!editKey) {
      updateSetupField('weather', title)
    }

    if (typeof pushToast === 'function') {
      pushToast(editKey ? `Weather type "${title}" updated.` : `Weather type "${title}" added.`, {
        title: editKey ? 'Type updated' : 'Type added',
        color: 'success',
      })
    }

    if (editKey) {
      resetDraft()
      setWeatherEditMode(true)
      return
    }

    closeAddModal()
  }

  const startEditType = (row) => {
    const value = String(row?.value || '').trim()
    if (!value) return
    setNewWeatherName(String(row?.title || value).trim())
    setNewWeatherDescription(String(row?.description || '').trim())
    setNewWeatherIconKey(resolveTypeIconKey(row, 'weather'))
    setEditingWeatherTypeKey(value.toLowerCase())
    setAddWeatherError('')
    setWeatherEditMode(false)
  }

  const removeType = (value) => {
    const key = String(value || '')
      .trim()
      .toLowerCase()
    if (!key) return

    if (systemTypeSet.has(key)) {
      const baseOption = ERCO_WEATHER_OPTIONS.find((row) => normalizeTypeKey(row.value) === key)
      if (!baseOption) return
      const nextOverrides = [
        ...weatherSystemOverrides.filter((row) => normalizeTypeKey(row.value) !== key),
        {
          value: baseOption.value,
          title: baseOption.title || baseOption.value,
          description: baseOption.description || '',
          iconKey: baseOption.iconKey || '',
          hidden: true,
        },
      ]
      setWeatherSystemOverrides(nextOverrides)
      saveWeatherSystemOverrides(userId, nextOverrides)
      if (normalizeTypeKey(selectedWeather) === key) updateSetupField('weather', '')
      pushToast?.('Weather type removed.', { title: 'Type removed', color: 'warning' })
      return
    }

    const nextCustomTypes = customWeatherTypes.filter(
      (row) =>
        String(row.value || '')
          .trim()
          .toLowerCase() !== key,
    )
    setCustomWeatherTypes(nextCustomTypes)
    saveCustomWeatherTypes(userId, nextCustomTypes)

    if (
      String(selectedWeather || '')
        .trim()
        .toLowerCase() === key
    ) {
      updateSetupField('weather', '')
    }

    if (typeof pushToast === 'function') {
      pushToast('Weather type removed.', {
        title: 'Type removed',
        color: 'warning',
      })
    }
  }

  const resetSystemOverride = (value) => {
    const key = String(value || '')
      .trim()
      .toLowerCase()
    if (!key) return

    const nextOverrides = weatherSystemOverrides.filter(
      (row) =>
        String(row.value || '')
          .trim()
          .toLowerCase() !== key,
    )
    setWeatherSystemOverrides(nextOverrides)
    saveWeatherSystemOverrides(userId, nextOverrides)

    if (typeof pushToast === 'function') {
      pushToast('Weather type reset to default.', {
        title: 'Reset complete',
        color: 'info',
      })
    }
  }

  return {
    showAllWeatherTypes,
    setShowAllWeatherTypes,
    showAddWeatherModal,
    weatherEditMode,
    setWeatherEditMode,
    typeOptions,
    visibleTypeOptions,
    systemTypeSet,
    systemOverrideSet,
    openAddModal,
    closeAddModal,
    saveType,
    startEditType,
    removeType,
    resetSystemOverride,
    newWeatherName,
    setNewWeatherName,
    newWeatherDescription,
    setNewWeatherDescription,
    newWeatherIconKey,
    setNewWeatherIconKey,
    iconOptions,
    editingWeatherTypeKey,
    editingSystemType,
    addWeatherError,
    setAddWeatherError,
  }
}

export default useWeatherTypeManager
