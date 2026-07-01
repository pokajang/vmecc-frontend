import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DRILL_TYPE_OPTIONS } from './constants'
import { loadCustomDrillTypes, saveCustomDrillTypes } from './customDrillTypesStorage'
import { loadDrillTypeOverrides, saveDrillTypeOverrides } from './systemTypeOverridesStorage'
import { loadDrillTypeUsage, sortDrillOptionsByUsage } from './typeUsageStorage'
import {
  applyTypeOverrides,
  buildPinnedVisibleOptions,
  getTypeIconOptions,
  normalizeTypeKey,
  pickLeastUsedTypeIconKey,
  resolveTypeIconKey,
  withResolvedTypeIcon,
} from '../typeOptionUtils'

export const DRILL_TYPE_VISIBLE_LIMIT = 4
export const DRILL_TYPE_TOGGLE_VALUE = '__drill_types_toggle__'

const useDrillTypeManager = ({ userId, selectedType, updateSetupField, pushToast }) => {
  const [showAllDrillTypes, setShowAllDrillTypes] = useState(false)
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)
  const [drillTypeEditMode, setDrillTypeEditMode] = useState(false)
  const [drillTypeOverrides, setDrillTypeOverrides] = useState([])
  const [customDrillTypes, setCustomDrillTypes] = useState([])
  const [drillUsage, setDrillUsage] = useState({})
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeDescription, setNewTypeDescription] = useState('')
  const [newTypeIconKey, setNewTypeIconKey] = useState('')
  const [editingDrillTypeKey, setEditingDrillTypeKey] = useState('')
  const [addTypeError, setAddTypeError] = useState('')

  useEffect(() => {
    setCustomDrillTypes(loadCustomDrillTypes(userId))
    setDrillTypeOverrides(loadDrillTypeOverrides(userId))
    setDrillUsage(loadDrillTypeUsage(userId))
  }, [userId])

  const systemOptions = useMemo(
    () => applyTypeOverrides(DRILL_TYPE_OPTIONS, drillTypeOverrides),
    [drillTypeOverrides],
  )

  const iconOptions = useMemo(() => getTypeIconOptions('incident'), [])

  const typeOptions = useMemo(() => {
    const options = [
      ...systemOptions,
      ...customDrillTypes.map((row) => withResolvedTypeIcon(row, 'incident', 'Custom drill type.')),
    ]
    return sortDrillOptionsByUsage(options, drillUsage)
  }, [customDrillTypes, drillUsage, systemOptions])

  const availableIconOptions = useMemo(() => {
    const editKey = normalizeTypeKey(editingDrillTypeKey)
    const currentIconKey = String(newTypeIconKey || '').trim()
    const usedIconKeys = new Set(
      typeOptions
        .filter((row) => normalizeTypeKey(row?.value) !== editKey)
        .map((row) => resolveTypeIconKey(row, 'incident'))
        .filter(Boolean),
    )
    return iconOptions.filter(
      (option) => !usedIconKeys.has(option.key) || option.key === currentIconKey,
    )
  }, [editingDrillTypeKey, iconOptions, newTypeIconKey, typeOptions])

  const systemTypeSet = useMemo(
    () => new Set(DRILL_TYPE_OPTIONS.map((row) => normalizeTypeKey(row.value))),
    [],
  )

  const visibleTypeOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: typeOptions,
        selected: selectedType,
        visibleLimit: DRILL_TYPE_VISIBLE_LIMIT,
        showAll: showAllDrillTypes,
        toggleOption: {
          value: DRILL_TYPE_TOGGLE_VALUE,
          title: showAllDrillTypes ? 'Show less' : 'Show more',
          description: showAllDrillTypes ? 'Hide extra drill types.' : 'View all drill types.',
          icon: showAllDrillTypes ? ChevronUp : ChevronDown,
        },
      }),
    [selectedType, showAllDrillTypes, typeOptions],
  )

  const resetDraft = () => {
    setNewTypeName('')
    setNewTypeDescription('')
    setNewTypeIconKey('')
    setEditingDrillTypeKey('')
  }

  const openAddModal = () => {
    setAddTypeError('')
    resetDraft()
    const usedIconKeys = new Set(
      typeOptions.map((row) => resolveTypeIconKey(row, 'incident')).filter(Boolean),
    )
    const unusedIcon = iconOptions.find((option) => !usedIconKeys.has(option.key))
    setNewTypeIconKey(
      unusedIcon?.key ||
        pickLeastUsedTypeIconKey('incident', [...customDrillTypes, ...drillTypeOverrides]),
    )
    setDrillTypeEditMode(false)
    setShowAddTypeModal(true)
  }

  const closeAddModal = () => {
    setShowAddTypeModal(false)
    setDrillTypeEditMode(false)
    resetDraft()
    setAddTypeError('')
  }

  const saveType = () => {
    const title = String(newTypeName || '').trim()
    const description = String(newTypeDescription || '').trim()
    const iconKey = String(newTypeIconKey || '').trim()
    const editKey = normalizeTypeKey(editingDrillTypeKey)

    if (!title) {
      setAddTypeError('Drill type name is required.')
      return
    }

    const exists = typeOptions.some((row) => {
      const key = normalizeTypeKey(row.value)
      if (editKey && key === editKey) return false
      return key === title.toLowerCase()
    })
    if (exists) {
      setAddTypeError('This drill type already exists.')
      return
    }

    const iconExists = iconOptions.some((option) => option.key === iconKey)
    const iconUsed = typeOptions.some(
      (row) =>
        normalizeTypeKey(row.value) !== editKey && resolveTypeIconKey(row, 'incident') === iconKey,
    )
    if (!iconExists || iconUsed) {
      setAddTypeError(iconExists ? 'This icon is already used by another type.' : 'Choose an icon.')
      return
    }

    if (editKey && systemTypeSet.has(editKey)) {
      const baseOption = DRILL_TYPE_OPTIONS.find((row) => normalizeTypeKey(row.value) === editKey)
      if (!baseOption) return
      const nextOverrides = [
        ...drillTypeOverrides.filter((row) => normalizeTypeKey(row.value) !== editKey),
        { value: baseOption.value, title, description, iconKey },
      ]
      setDrillTypeOverrides(nextOverrides)
      saveDrillTypeOverrides(userId, nextOverrides)
      pushToast?.(`Drill type "${title}" updated.`, {
        title: 'Type updated',
        color: 'success',
      })
      resetDraft()
      setDrillTypeEditMode(true)
      return
    }

    const nextCustomTypes = editKey
      ? customDrillTypes.map((row) =>
          normalizeTypeKey(row.value) === editKey
            ? { value: title, title, description, iconKey }
            : row,
        )
      : [...customDrillTypes, { value: title, title, description, iconKey }]
    setCustomDrillTypes(nextCustomTypes)
    saveCustomDrillTypes(userId, nextCustomTypes)

    if (editKey && normalizeTypeKey(selectedType) === editKey) {
      updateSetupField('incidentType', title)
    } else if (!editKey) {
      updateSetupField('incidentType', title)
    }

    pushToast?.(editKey ? `Drill type "${title}" updated.` : `Drill type "${title}" added.`, {
      title: editKey ? 'Type updated' : 'Type added',
      color: 'success',
    })

    if (editKey) {
      resetDraft()
      setDrillTypeEditMode(true)
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
    setEditingDrillTypeKey(value.toLowerCase())
    setAddTypeError('')
    setDrillTypeEditMode(false)
  }

  const removeType = (value) => {
    const key = normalizeTypeKey(value)
    if (!key) return

    if (systemTypeSet.has(key)) {
      const baseOption = DRILL_TYPE_OPTIONS.find((row) => normalizeTypeKey(row.value) === key)
      if (!baseOption) return
      const nextOverrides = [
        ...drillTypeOverrides.filter((row) => normalizeTypeKey(row.value) !== key),
        {
          value: baseOption.value,
          title: baseOption.title || baseOption.value,
          description: baseOption.description || '',
          iconKey: baseOption.iconKey || '',
          hidden: true,
        },
      ]
      setDrillTypeOverrides(nextOverrides)
      saveDrillTypeOverrides(userId, nextOverrides)
      if (normalizeTypeKey(selectedType) === key) updateSetupField('incidentType', '')
      pushToast?.('Drill type removed.', { title: 'Type removed', color: 'warning' })
      return
    }

    const nextCustomTypes = customDrillTypes.filter((row) => normalizeTypeKey(row.value) !== key)
    setCustomDrillTypes(nextCustomTypes)
    saveCustomDrillTypes(userId, nextCustomTypes)
    if (normalizeTypeKey(selectedType) === key) updateSetupField('incidentType', '')
    pushToast?.('Drill type removed.', { title: 'Type removed', color: 'warning' })
  }

  return {
    showAllDrillTypes,
    setShowAllDrillTypes,
    showAddTypeModal,
    drillTypeEditMode,
    setDrillTypeEditMode,
    typeOptions,
    visibleTypeOptions,
    openAddModal,
    closeAddModal,
    saveType,
    startEditType,
    removeType,
    newTypeName,
    setNewTypeName,
    newTypeDescription,
    setNewTypeDescription,
    newTypeIconKey,
    setNewTypeIconKey,
    iconOptions: availableIconOptions,
    editingDrillTypeKey,
    addTypeError,
    setAddTypeError,
  }
}

export default useDrillTypeManager
