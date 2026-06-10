import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ERCO_INCIDENT_TYPE_OPTIONS } from './constants'
import { loadCustomIncidentTypes, saveCustomIncidentTypes } from './customIncidentTypesStorage'
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
  loadIncidentSystemOverrides,
  saveIncidentSystemOverrides,
} from './systemTypeOverridesStorage'
import { loadTypeUsage, sortOptionsByUsage } from './typeUsageStorage'

export const INCIDENT_TYPE_VISIBLE_LIMIT = 3
export const INCIDENT_TYPE_TOGGLE_VALUE = '__erco_incident_types_toggle__'

const useIncidentTypeManager = ({ userId, selectedType, updateSetupField, pushToast }) => {
  const [showAllIncidentTypes, setShowAllIncidentTypes] = useState(false)
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)
  const [incidentEditMode, setIncidentEditMode] = useState(false)
  const [incidentSystemOverrides, setIncidentSystemOverrides] = useState([])
  const [customIncidentTypes, setCustomIncidentTypes] = useState([])
  const [incidentUsage, setIncidentUsage] = useState({})
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeDescription, setNewTypeDescription] = useState('')
  const [newTypeIconKey, setNewTypeIconKey] = useState('')
  const [editingIncidentTypeKey, setEditingIncidentTypeKey] = useState('')
  const [addTypeError, setAddTypeError] = useState('')

  useEffect(() => {
    setCustomIncidentTypes(loadCustomIncidentTypes(userId))
    setIncidentSystemOverrides(loadIncidentSystemOverrides(userId))
    setIncidentUsage(loadTypeUsage(userId, 'incident'))
  }, [userId])

  const incidentSystemOptions = useMemo(
    () => applyTypeOverrides(ERCO_INCIDENT_TYPE_OPTIONS, incidentSystemOverrides),
    [incidentSystemOverrides],
  )

  const iconOptions = useMemo(() => getTypeIconOptions('incident'), [])

  const typeOptions = useMemo(() => {
    const options = [
      ...incidentSystemOptions,
      ...customIncidentTypes.map((row) =>
        withResolvedTypeIcon(row, 'incident', 'Custom emergency / incident type.'),
      ),
    ]
    return sortOptionsByUsage(options, incidentUsage)
  }, [customIncidentTypes, incidentSystemOptions, incidentUsage])

  const systemOverrideSet = useMemo(
    () =>
      new Set(
        incidentSystemOverrides.map((row) =>
          String(row.value || '')
            .trim()
            .toLowerCase(),
        ),
      ),
    [incidentSystemOverrides],
  )

  const systemTypeSet = useMemo(
    () => new Set(ERCO_INCIDENT_TYPE_OPTIONS.map((row) => String(row.value || '').toLowerCase())),
    [],
  )
  const editingSystemType = useMemo(
    () => Boolean(editingIncidentTypeKey && systemTypeSet.has(editingIncidentTypeKey)),
    [editingIncidentTypeKey, systemTypeSet],
  )

  const visibleTypeOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: typeOptions,
        selected: selectedType,
        visibleLimit: INCIDENT_TYPE_VISIBLE_LIMIT,
        showAll: showAllIncidentTypes,
        toggleOption: {
          value: INCIDENT_TYPE_TOGGLE_VALUE,
          title: showAllIncidentTypes ? 'Show less' : 'Show more',
          description: showAllIncidentTypes
            ? 'Hide extra incident types.'
            : 'View all incident types.',
          icon: showAllIncidentTypes ? ChevronUp : ChevronDown,
        },
      }),
    [selectedType, showAllIncidentTypes, typeOptions],
  )

  const resetDraft = () => {
    setNewTypeName('')
    setNewTypeDescription('')
    setNewTypeIconKey('')
    setEditingIncidentTypeKey('')
  }

  const openAddModal = () => {
    setAddTypeError('')
    resetDraft()
    setNewTypeIconKey(
      pickLeastUsedTypeIconKey('incident', [...customIncidentTypes, ...incidentSystemOverrides]),
    )
    setIncidentEditMode(false)
    setShowAddTypeModal(true)
  }

  const closeAddModal = () => {
    setShowAddTypeModal(false)
    setIncidentEditMode(false)
    resetDraft()
    setAddTypeError('')
  }

  const saveType = () => {
    const title = String(newTypeName || '').trim()
    const description = String(newTypeDescription || '').trim()
    const editKey = String(editingIncidentTypeKey || '')
      .trim()
      .toLowerCase()

    if (!title) {
      setAddTypeError('Type name is required.')
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
      setAddTypeError('This type already exists.')
      return
    }

    if (editKey && systemTypeSet.has(editKey)) {
      const baseOption = ERCO_INCIDENT_TYPE_OPTIONS.find(
        (row) =>
          String(row.value || '')
            .trim()
            .toLowerCase() === editKey,
      )
      if (!baseOption) return

      const nextOverrides = [
        ...incidentSystemOverrides.filter(
          (row) =>
            String(row.value || '')
              .trim()
              .toLowerCase() !== editKey,
        ),
        {
          value: baseOption.value,
          title,
          description,
          iconKey: newTypeIconKey,
        },
      ]
      setIncidentSystemOverrides(nextOverrides)
      saveIncidentSystemOverrides(userId, nextOverrides)

      if (typeof pushToast === 'function') {
        pushToast(`Incident type "${title}" updated.`, {
          title: 'Type updated',
          color: 'success',
        })
      }

      resetDraft()
      setIncidentEditMode(true)
      return
    }

    const nextCustomTypes = editKey
      ? customIncidentTypes.map((row) => {
          const rowKey = String(row.value || '')
            .trim()
            .toLowerCase()
          if (rowKey !== editKey) return row
          return { value: title, title, description, iconKey: newTypeIconKey }
        })
      : [...customIncidentTypes, { value: title, title, description, iconKey: newTypeIconKey }]
    setCustomIncidentTypes(nextCustomTypes)
    saveCustomIncidentTypes(userId, nextCustomTypes)

    if (
      editKey &&
      String(selectedType || '')
        .trim()
        .toLowerCase() === editKey
    ) {
      updateSetupField('incidentType', title)
    } else if (!editKey) {
      updateSetupField('incidentType', title)
    }

    if (typeof pushToast === 'function') {
      pushToast(editKey ? `Incident type "${title}" updated.` : `Incident type "${title}" added.`, {
        title: editKey ? 'Type updated' : 'Type added',
        color: 'success',
      })
    }

    if (editKey) {
      resetDraft()
      setIncidentEditMode(true)
      return
    }

    closeAddModal()
  }

  const startEditType = (row) => {
    const value = String(row?.value || '').trim()
    if (!value) return
    setNewTypeName(String(row?.title || value).trim())
    setNewTypeDescription(String(row?.description || '').trim())
    setNewTypeIconKey(resolveTypeIconKey(row, 'incident'))
    setEditingIncidentTypeKey(value.toLowerCase())
    setAddTypeError('')
    setIncidentEditMode(false)
  }

  const removeType = (value) => {
    const key = String(value || '')
      .trim()
      .toLowerCase()
    if (!key) return

    if (systemTypeSet.has(key)) {
      const baseOption = ERCO_INCIDENT_TYPE_OPTIONS.find(
        (row) => normalizeTypeKey(row.value) === key,
      )
      if (!baseOption) return
      const nextOverrides = [
        ...incidentSystemOverrides.filter((row) => normalizeTypeKey(row.value) !== key),
        {
          value: baseOption.value,
          title: baseOption.title || baseOption.value,
          description: baseOption.description || '',
          iconKey: baseOption.iconKey || '',
          hidden: true,
        },
      ]
      setIncidentSystemOverrides(nextOverrides)
      saveIncidentSystemOverrides(userId, nextOverrides)
      if (normalizeTypeKey(selectedType) === key) updateSetupField('incidentType', '')
      pushToast?.('Incident type removed.', { title: 'Type removed', color: 'warning' })
      return
    }

    const nextCustomTypes = customIncidentTypes.filter(
      (row) =>
        String(row.value || '')
          .trim()
          .toLowerCase() !== key,
    )
    setCustomIncidentTypes(nextCustomTypes)
    saveCustomIncidentTypes(userId, nextCustomTypes)

    if (
      String(selectedType || '')
        .trim()
        .toLowerCase() === key
    ) {
      updateSetupField('incidentType', '')
    }

    if (typeof pushToast === 'function') {
      pushToast('Incident type removed.', {
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

    const nextOverrides = incidentSystemOverrides.filter(
      (row) =>
        String(row.value || '')
          .trim()
          .toLowerCase() !== key,
    )
    setIncidentSystemOverrides(nextOverrides)
    saveIncidentSystemOverrides(userId, nextOverrides)

    if (typeof pushToast === 'function') {
      pushToast('Incident type reset to default.', {
        title: 'Reset complete',
        color: 'info',
      })
    }
  }

  return {
    showAllIncidentTypes,
    setShowAllIncidentTypes,
    showAddTypeModal,
    incidentEditMode,
    setIncidentEditMode,
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
    newTypeName,
    setNewTypeName,
    newTypeDescription,
    setNewTypeDescription,
    newTypeIconKey,
    setNewTypeIconKey,
    iconOptions,
    editingIncidentTypeKey,
    editingSystemType,
    addTypeError,
    setAddTypeError,
  }
}

export default useIncidentTypeManager
