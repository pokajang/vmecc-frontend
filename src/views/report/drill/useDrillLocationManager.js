import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DRILL_LOCATION_OPTIONS } from './constants'
import { loadCustomDrillLocations, saveCustomDrillLocations } from './customDrillLocationsStorage'
import {
  loadDrillLocationOverrides,
  saveDrillLocationOverrides,
} from './systemTypeOverridesStorage'
import {
  applyTypeOverrides,
  buildPinnedVisibleOptions,
  normalizeTypeKey,
  pickLeastUsedTypeIconKey,
  withResolvedTypeIcon,
} from '../typeOptionUtils'

export const DRILL_LOCATION_VISIBLE_LIMIT = 4
export const DRILL_LOCATION_TOGGLE_VALUE = '__drill_locations_toggle__'

const useDrillLocationManager = ({ userId, selectedLocation, updateSetupField, pushToast }) => {
  const [showAllDrillLocations, setShowAllDrillLocations] = useState(false)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [locationEditMode, setLocationEditMode] = useState(false)
  const [locationOverrides, setLocationOverrides] = useState([])
  const [customLocations, setCustomLocations] = useState([])
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationDescription, setNewLocationDescription] = useState('')
  const [newLocationIconKey, setNewLocationIconKey] = useState('')
  const [editingLocationKey, setEditingLocationKey] = useState('')
  const [addLocationError, setAddLocationError] = useState('')

  useEffect(() => {
    setCustomLocations(loadCustomDrillLocations(userId))
    setLocationOverrides(loadDrillLocationOverrides(userId))
  }, [userId])

  const systemOptions = useMemo(
    () => applyTypeOverrides(DRILL_LOCATION_OPTIONS, locationOverrides),
    [locationOverrides],
  )

  const typeOptions = useMemo(
    () => [
      ...systemOptions,
      ...customLocations.map((row) => withResolvedTypeIcon(row, 'location', 'Custom location.')),
    ],
    [customLocations, systemOptions],
  )

  const visibleTypeOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: typeOptions,
        selected: selectedLocation,
        visibleLimit: DRILL_LOCATION_VISIBLE_LIMIT,
        showAll: showAllDrillLocations,
        toggleOption: {
          value: DRILL_LOCATION_TOGGLE_VALUE,
          title: showAllDrillLocations ? 'Show less' : 'Show more',
          description: '',
          icon: showAllDrillLocations ? ChevronUp : ChevronDown,
        },
      }),
    [selectedLocation, showAllDrillLocations, typeOptions],
  )

  const systemTypeSet = useMemo(
    () => new Set(DRILL_LOCATION_OPTIONS.map((row) => normalizeTypeKey(row.value))),
    [],
  )

  const resetDraft = () => {
    setNewLocationName('')
    setNewLocationDescription('')
    setNewLocationIconKey('')
    setEditingLocationKey('')
  }

  const openAddModal = () => {
    setAddLocationError('')
    resetDraft()
    setNewLocationIconKey(
      pickLeastUsedTypeIconKey('location', [...customLocations, ...locationOverrides]),
    )
    setLocationEditMode(false)
    setShowAddLocationModal(true)
  }

  const closeAddModal = () => {
    setShowAddLocationModal(false)
    setLocationEditMode(false)
    resetDraft()
    setAddLocationError('')
  }

  const saveType = () => {
    const title = String(newLocationName || '').trim()
    const description = String(newLocationDescription || '').trim()
    const editKey = normalizeTypeKey(editingLocationKey)

    if (!title) {
      setAddLocationError('Drill location name is required.')
      return
    }

    const exists = typeOptions.some((row) => {
      const key = normalizeTypeKey(row.value)
      if (editKey && key === editKey) return false
      return key === title.toLowerCase()
    })
    if (exists) {
      setAddLocationError('This drill location already exists.')
      return
    }

    if (editKey && systemTypeSet.has(editKey)) {
      const baseOption = DRILL_LOCATION_OPTIONS.find(
        (row) => normalizeTypeKey(row.value) === editKey,
      )
      if (!baseOption) return
      const nextOverrides = [
        ...locationOverrides.filter((row) => normalizeTypeKey(row.value) !== editKey),
        { value: baseOption.value, title, description, iconKey: newLocationIconKey },
      ]
      setLocationOverrides(nextOverrides)
      saveDrillLocationOverrides(userId, nextOverrides)
      pushToast?.(`Drill location "${title}" updated.`, {
        title: 'Location updated',
        color: 'success',
      })
      resetDraft()
      setLocationEditMode(true)
      return
    }

    const nextCustomLocations = editKey
      ? customLocations.map((row) =>
          normalizeTypeKey(row.value) === editKey
            ? { value: title, title, description, iconKey: newLocationIconKey }
            : row,
        )
      : [...customLocations, { value: title, title, description, iconKey: newLocationIconKey }]
    setCustomLocations(nextCustomLocations)
    saveCustomDrillLocations(userId, nextCustomLocations)

    if (editKey && normalizeTypeKey(selectedLocation) === editKey) {
      updateSetupField('location', title)
    } else if (!editKey) {
      updateSetupField('location', title)
    }

    pushToast?.(
      editKey ? `Drill location "${title}" updated.` : `Drill location "${title}" added.`,
      { title: editKey ? 'Location updated' : 'Location added', color: 'success' },
    )

    if (editKey) {
      resetDraft()
      setLocationEditMode(true)
      return
    }
    closeAddModal()
  }

  const startEditType = (row) => {
    const value = String(row?.value || '').trim()
    if (!value) return
    setNewLocationName(String(row?.title || value).trim())
    setNewLocationDescription(String(row?.description || '').trim())
    setNewLocationIconKey(String(row?.iconKey || '').trim())
    setEditingLocationKey(value.toLowerCase())
    setAddLocationError('')
    setLocationEditMode(false)
  }

  const removeType = (value) => {
    const key = normalizeTypeKey(value)
    if (!key) return

    if (systemTypeSet.has(key)) {
      const baseOption = DRILL_LOCATION_OPTIONS.find((row) => normalizeTypeKey(row.value) === key)
      if (!baseOption) return
      const nextOverrides = [
        ...locationOverrides.filter((row) => normalizeTypeKey(row.value) !== key),
        {
          value: baseOption.value,
          title: baseOption.title || baseOption.value,
          description: baseOption.description || '',
          iconKey: baseOption.iconKey || '',
          hidden: true,
        },
      ]
      setLocationOverrides(nextOverrides)
      saveDrillLocationOverrides(userId, nextOverrides)
      if (normalizeTypeKey(selectedLocation) === key) updateSetupField('location', '')
      pushToast?.('Drill location removed.', { title: 'Location removed', color: 'warning' })
      return
    }

    const nextCustomLocations = customLocations.filter((row) => normalizeTypeKey(row.value) !== key)
    setCustomLocations(nextCustomLocations)
    saveCustomDrillLocations(userId, nextCustomLocations)
    if (normalizeTypeKey(selectedLocation) === key) updateSetupField('location', '')
    pushToast?.('Drill location removed.', { title: 'Location removed', color: 'warning' })
  }

  return {
    showAllDrillLocations,
    setShowAllDrillLocations,
    showAddLocationModal,
    locationEditMode,
    setLocationEditMode,
    typeOptions,
    visibleTypeOptions,
    openAddModal,
    closeAddModal,
    saveType,
    startEditType,
    removeType,
    newLocationName,
    setNewLocationName,
    newLocationDescription,
    setNewLocationDescription,
    newLocationIconKey,
    setNewLocationIconKey,
    editingLocationKey,
    addLocationError,
    setAddLocationError,
  }
}

export default useDrillLocationManager
