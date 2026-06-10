import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ERCO_LOCATION_OPTIONS } from './constants'
import { loadCustomLocationTypes, saveCustomLocationTypes } from './customLocationTypesStorage'
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
  loadLocationSystemOverrides,
  saveLocationSystemOverrides,
} from './systemTypeOverridesStorage'

export const LOCATION_VISIBLE_LIMIT = 3
export const LOCATION_TOGGLE_VALUE = '__erco_location_types_toggle__'

const useLocationTypeManager = ({ userId, selectedLocations, updateSetupField, pushToast }) => {
  const [showAllLocationTypes, setShowAllLocationTypes] = useState(false)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [locationEditMode, setLocationEditMode] = useState(false)
  const [locationSystemOverrides, setLocationSystemOverrides] = useState([])
  const [customLocationTypes, setCustomLocationTypes] = useState([])
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationDescription, setNewLocationDescription] = useState('')
  const [newLocationIconKey, setNewLocationIconKey] = useState('')
  const [editingLocationKey, setEditingLocationKey] = useState('')
  const [addLocationError, setAddLocationError] = useState('')

  useEffect(() => {
    setCustomLocationTypes(loadCustomLocationTypes(userId))
    setLocationSystemOverrides(loadLocationSystemOverrides(userId))
  }, [userId])

  const locationSystemOptions = useMemo(
    () => applyTypeOverrides(ERCO_LOCATION_OPTIONS, locationSystemOverrides),
    [locationSystemOverrides],
  )

  const iconOptions = useMemo(() => getTypeIconOptions('location'), [])

  const typeOptions = useMemo(
    () => [
      ...locationSystemOptions,
      ...customLocationTypes.map((row) =>
        withResolvedTypeIcon(row, 'location', 'Custom area / location.'),
      ),
    ],
    [customLocationTypes, locationSystemOptions],
  )

  const visibleTypeOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: typeOptions,
        selected: selectedLocations,
        visibleLimit: LOCATION_VISIBLE_LIMIT,
        showAll: showAllLocationTypes,
        toggleOption: {
          value: LOCATION_TOGGLE_VALUE,
          title: showAllLocationTypes ? 'Show less' : 'Show more',
          description: showAllLocationTypes ? 'Hide extra areas.' : 'View all areas.',
          icon: showAllLocationTypes ? ChevronUp : ChevronDown,
        },
      }),
    [selectedLocations, showAllLocationTypes, typeOptions],
  )

  const systemTypeSet = useMemo(
    () => new Set(ERCO_LOCATION_OPTIONS.map((row) => String(row.value || '').toLowerCase())),
    [],
  )
  const editingSystemType = useMemo(
    () => Boolean(editingLocationKey && systemTypeSet.has(editingLocationKey)),
    [editingLocationKey, systemTypeSet],
  )

  const systemOverrideSet = useMemo(
    () =>
      new Set(
        locationSystemOverrides.map((row) =>
          String(row.value || '')
            .trim()
            .toLowerCase(),
        ),
      ),
    [locationSystemOverrides],
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
      pickLeastUsedTypeIconKey('location', [...customLocationTypes, ...locationSystemOverrides]),
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
    const editKey = String(editingLocationKey || '')
      .trim()
      .toLowerCase()

    if (!title) {
      setAddLocationError('Area name is required.')
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
      setAddLocationError('This area already exists.')
      return
    }

    if (editKey && systemTypeSet.has(editKey)) {
      const baseOption = ERCO_LOCATION_OPTIONS.find(
        (row) =>
          String(row.value || '')
            .trim()
            .toLowerCase() === editKey,
      )
      if (!baseOption) return

      const nextOverrides = [
        ...locationSystemOverrides.filter(
          (row) =>
            String(row.value || '')
              .trim()
              .toLowerCase() !== editKey,
        ),
        {
          value: baseOption.value,
          title,
          description,
          iconKey: newLocationIconKey,
        },
      ]
      setLocationSystemOverrides(nextOverrides)
      saveLocationSystemOverrides(userId, nextOverrides)

      if (typeof pushToast === 'function') {
        pushToast(`Area "${title}" updated.`, {
          title: 'Area updated',
          color: 'success',
        })
      }

      resetDraft()
      setLocationEditMode(true)
      return
    }

    const nextCustomTypes = editKey
      ? customLocationTypes.map((row) => {
          const rowKey = String(row.value || '')
            .trim()
            .toLowerCase()
          if (rowKey !== editKey) return row
          return { value: title, title, description, iconKey: newLocationIconKey }
        })
      : [...customLocationTypes, { value: title, title, description, iconKey: newLocationIconKey }]
    setCustomLocationTypes(nextCustomTypes)
    saveCustomLocationTypes(userId, nextCustomTypes)

    if (editKey) {
      const next = selectedLocations.map((item) =>
        String(item || '')
          .trim()
          .toLowerCase() === editKey
          ? title
          : item,
      )
      updateSetupField('location', next)
    } else {
      const next = selectedLocations.includes(title)
        ? selectedLocations
        : [...selectedLocations, title]
      updateSetupField('location', next)
    }

    if (typeof pushToast === 'function') {
      pushToast(editKey ? `Area "${title}" updated.` : `Area "${title}" added.`, {
        title: editKey ? 'Area updated' : 'Area added',
        color: 'success',
      })
    }

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
    setNewLocationIconKey(resolveTypeIconKey(row, 'location'))
    setEditingLocationKey(value.toLowerCase())
    setAddLocationError('')
    setLocationEditMode(false)
  }

  const removeType = (value) => {
    const key = String(value || '')
      .trim()
      .toLowerCase()
    if (!key) return

    if (systemTypeSet.has(key)) {
      const baseOption = ERCO_LOCATION_OPTIONS.find((row) => normalizeTypeKey(row.value) === key)
      if (!baseOption) return
      const nextOverrides = [
        ...locationSystemOverrides.filter((row) => normalizeTypeKey(row.value) !== key),
        {
          value: baseOption.value,
          title: baseOption.title || baseOption.value,
          description: baseOption.description || '',
          iconKey: baseOption.iconKey || '',
          hidden: true,
        },
      ]
      setLocationSystemOverrides(nextOverrides)
      saveLocationSystemOverrides(userId, nextOverrides)
      updateSetupField(
        'location',
        selectedLocations.filter((item) => normalizeTypeKey(item) !== key),
      )
      pushToast?.('Area removed.', { title: 'Area removed', color: 'warning' })
      return
    }

    const nextCustomTypes = customLocationTypes.filter(
      (row) =>
        String(row.value || '')
          .trim()
          .toLowerCase() !== key,
    )
    setCustomLocationTypes(nextCustomTypes)
    saveCustomLocationTypes(userId, nextCustomTypes)

    const nextLocation = selectedLocations.filter(
      (item) =>
        String(item || '')
          .trim()
          .toLowerCase() !== key,
    )
    updateSetupField('location', nextLocation)

    if (typeof pushToast === 'function') {
      pushToast('Area removed.', {
        title: 'Area removed',
        color: 'warning',
      })
    }
  }

  const resetSystemOverride = (value) => {
    const key = String(value || '')
      .trim()
      .toLowerCase()
    if (!key) return

    const nextOverrides = locationSystemOverrides.filter(
      (row) =>
        String(row.value || '')
          .trim()
          .toLowerCase() !== key,
    )
    setLocationSystemOverrides(nextOverrides)
    saveLocationSystemOverrides(userId, nextOverrides)

    if (typeof pushToast === 'function') {
      pushToast('Area reset to default.', {
        title: 'Reset complete',
        color: 'info',
      })
    }
  }

  return {
    showAllLocationTypes,
    setShowAllLocationTypes,
    showAddLocationModal,
    locationEditMode,
    setLocationEditMode,
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
    newLocationName,
    setNewLocationName,
    newLocationDescription,
    setNewLocationDescription,
    newLocationIconKey,
    setNewLocationIconKey,
    iconOptions,
    editingLocationKey,
    editingSystemType,
    addLocationError,
    setAddLocationError,
  }
}

export default useLocationTypeManager
