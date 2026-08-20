import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  fetchDrillEnvironmentOptions,
  replaceDrillEnvironmentOptions,
} from '../../../services/apiClient'
import { DRILL_ENVIRONMENT_OPTIONS } from './constants'
import {
  loadCustomDrillEnvironments,
  saveCustomDrillEnvironments,
} from './customDrillEnvironmentsStorage'
import {
  loadDrillEnvironmentOverrides,
  saveDrillEnvironmentOverrides,
} from './systemTypeOverridesStorage'
import {
  applyTypeOverrides,
  buildPinnedVisibleOptions,
  getTypeIconOptions,
  normalizeTypeKey,
  pickLeastUsedTypeIconKey,
  resolveTypeIconKey,
  withResolvedTypeIcon,
} from '../typeOptionUtils'

export const DRILL_ENVIRONMENT_VISIBLE_LIMIT = 4
export const DRILL_ENVIRONMENT_TOGGLE_VALUE = '__drill_environment_toggle__'

const normalizeEnvironmentRow = (row) => {
  const title = String(row?.title || row?.value || '').trim()
  if (!title) return null
  return {
    value: title,
    title,
    description: String(row?.description || '').trim(),
    iconKey: String(row?.iconKey || row?.icon_key || '').trim(),
  }
}

const normalizeEnvironmentRows = (rows) => {
  const seen = new Set()
  return (Array.isArray(rows) ? rows : [])
    .map(normalizeEnvironmentRow)
    .filter(Boolean)
    .filter((row) => {
      const key = String(row.value).trim().toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const canPersistEnvironmentOptions = () =>
  typeof import.meta === 'undefined' || import.meta.env?.MODE !== 'test'

const useDrillEnvironmentManager = ({
  userId,
  selectedEnvironment,
  updateSetupField,
  pushToast,
}) => {
  const [showAllDrillEnvironments, setShowAllDrillEnvironments] = useState(false)
  const [showAddEnvironmentModal, setShowAddEnvironmentModal] = useState(false)
  const [environmentEditMode, setEnvironmentEditMode] = useState(false)
  const [environmentOverrides, setEnvironmentOverrides] = useState([])
  const [customEnvironments, setCustomEnvironments] = useState([])
  const [newEnvironmentName, setNewEnvironmentName] = useState('')
  const [newEnvironmentDescription, setNewEnvironmentDescription] = useState('')
  const [newEnvironmentIconKey, setNewEnvironmentIconKey] = useState('')
  const [editingEnvironmentKey, setEditingEnvironmentKey] = useState('')
  const [addEnvironmentError, setAddEnvironmentError] = useState('')

  const persistCustomEnvironmentOptions = useCallback(
    async (rows) => {
      if (!canPersistEnvironmentOptions() || !userId) return
      try {
        await replaceDrillEnvironmentOptions(Array.isArray(rows) ? rows : [])
      } catch {
        // Keep local storage behavior when backend persistence is unavailable.
      }
    },
    [userId],
  )

  const refreshRemoteEnvironmentOptions = useCallback(async () => {
    if (!canPersistEnvironmentOptions() || !userId) return
    try {
      const payload = await fetchDrillEnvironmentOptions()
      const normalized = normalizeEnvironmentRows(payload?.data)
      setCustomEnvironments(normalized)
      saveCustomDrillEnvironments(userId, normalized)
    } catch {
      // Keep local storage behavior as a fallback.
    }
  }, [userId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCustomEnvironments(loadCustomDrillEnvironments(userId))
      setEnvironmentOverrides(loadDrillEnvironmentOverrides(userId))
    }, 0)
    const refreshTimer = window.setTimeout(() => {
      void refreshRemoteEnvironmentOptions()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(refreshTimer)
    }
  }, [userId, refreshRemoteEnvironmentOptions])

  const systemOptions = useMemo(
    () => applyTypeOverrides(DRILL_ENVIRONMENT_OPTIONS, environmentOverrides),
    [environmentOverrides],
  )

  const iconOptions = useMemo(() => getTypeIconOptions('weather'), [])

  const typeOptions = useMemo(
    () => [
      ...systemOptions,
      ...customEnvironments.map((row) =>
        withResolvedTypeIcon(row, 'weather', 'Custom environment.'),
      ),
    ],
    [customEnvironments, systemOptions],
  )

  const availableIconOptions = useMemo(() => {
    const editKey = normalizeTypeKey(editingEnvironmentKey)
    const currentIconKey = String(newEnvironmentIconKey || '').trim()
    const usedIconKeys = new Set(
      typeOptions
        .filter((row) => normalizeTypeKey(row?.value) !== editKey)
        .map((row) => resolveTypeIconKey(row, 'weather'))
        .filter(Boolean),
    )
    return iconOptions.filter(
      (option) => !usedIconKeys.has(option.key) || option.key === currentIconKey,
    )
  }, [editingEnvironmentKey, iconOptions, newEnvironmentIconKey, typeOptions])

  const systemTypeSet = useMemo(
    () => new Set(DRILL_ENVIRONMENT_OPTIONS.map((row) => normalizeTypeKey(row.value))),
    [],
  )

  const visibleTypeOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: typeOptions,
        selected: selectedEnvironment,
        visibleLimit: DRILL_ENVIRONMENT_VISIBLE_LIMIT,
        showAll: showAllDrillEnvironments,
        toggleOption: {
          value: DRILL_ENVIRONMENT_TOGGLE_VALUE,
          title: showAllDrillEnvironments ? 'Show less' : 'Show more',
          description: '',
          icon: showAllDrillEnvironments ? ChevronUp : ChevronDown,
        },
      }),
    [selectedEnvironment, showAllDrillEnvironments, typeOptions],
  )

  const resetDraft = () => {
    setNewEnvironmentName('')
    setNewEnvironmentDescription('')
    setNewEnvironmentIconKey('')
    setEditingEnvironmentKey('')
  }

  const openAddModal = () => {
    setAddEnvironmentError('')
    resetDraft()
    const usedIconKeys = new Set(
      typeOptions.map((row) => resolveTypeIconKey(row, 'weather')).filter(Boolean),
    )
    const unusedIcon = iconOptions.find((option) => !usedIconKeys.has(option.key))
    setNewEnvironmentIconKey(
      unusedIcon?.key ||
        pickLeastUsedTypeIconKey('weather', [...customEnvironments, ...environmentOverrides]),
    )
    setEnvironmentEditMode(false)
    setShowAddEnvironmentModal(true)
  }

  const closeAddModal = () => {
    setShowAddEnvironmentModal(false)
    setEnvironmentEditMode(false)
    resetDraft()
    setAddEnvironmentError('')
  }

  const saveType = () => {
    const title = String(newEnvironmentName || '').trim()
    const description = String(newEnvironmentDescription || '').trim()
    const iconKey = String(newEnvironmentIconKey || '').trim()
    const editKey = normalizeTypeKey(editingEnvironmentKey)

    if (!title) {
      setAddEnvironmentError('Environment name is required.')
      return
    }

    const exists = typeOptions.some((row) => {
      const key = normalizeTypeKey(row.value)
      if (editKey && key === editKey) return false
      return key === title.toLowerCase()
    })
    if (exists) {
      setAddEnvironmentError('This drill environment already exists.')
      return
    }

    const iconExists = iconOptions.some((option) => option.key === iconKey)
    const iconUsed = typeOptions.some(
      (row) =>
        normalizeTypeKey(row.value) !== editKey && resolveTypeIconKey(row, 'weather') === iconKey,
    )
    if (!iconExists || iconUsed) {
      setAddEnvironmentError(
        iconExists ? 'This icon is already used by another environment.' : 'Choose an icon.',
      )
      return
    }

    if (editKey && systemTypeSet.has(editKey)) {
      const baseOption = DRILL_ENVIRONMENT_OPTIONS.find(
        (row) => normalizeTypeKey(row.value) === editKey,
      )
      if (!baseOption) return
      const nextOverrides = [
        ...environmentOverrides.filter((row) => normalizeTypeKey(row.value) !== editKey),
        { value: baseOption.value, title, description, iconKey },
      ]
      setEnvironmentOverrides(nextOverrides)
      saveDrillEnvironmentOverrides(userId, nextOverrides)
      pushToast?.(`Drill environment "${title}" updated.`, {
        title: 'Environment updated',
        color: 'success',
      })
      resetDraft()
      setEnvironmentEditMode(true)
      return
    }

    const nextCustomEnvironments = editKey
      ? customEnvironments.map((row) =>
          normalizeTypeKey(row.value) === editKey
            ? { value: title, title, description, iconKey }
            : row,
        )
      : [...customEnvironments, { value: title, title, description, iconKey }]

    setCustomEnvironments(nextCustomEnvironments)
    saveCustomDrillEnvironments(userId, nextCustomEnvironments)
    void persistCustomEnvironmentOptions(nextCustomEnvironments)

    if (editKey && normalizeTypeKey(selectedEnvironment) === editKey) {
      updateSetupField('weather', title)
    } else if (!editKey) {
      updateSetupField('weather', title)
    }

    pushToast?.(
      editKey ? `Drill environment "${title}" updated.` : `Drill environment "${title}" added.`,
      {
        title: editKey ? 'Environment updated' : 'Environment added',
        color: 'success',
      },
    )

    if (editKey) {
      resetDraft()
      setEnvironmentEditMode(true)
      return
    }

    closeAddModal()
  }

  const startEditType = (row) => {
    const value = String(row?.value || '').trim()
    if (!value) return
    setNewEnvironmentName(String(row?.title || value).trim())
    setNewEnvironmentDescription(String(row?.description || '').trim())
    setNewEnvironmentIconKey(resolveTypeIconKey(row, 'weather'))
    setEditingEnvironmentKey(value.toLowerCase())
    setAddEnvironmentError('')
    setEnvironmentEditMode(false)
  }

  const removeType = (value) => {
    const key = normalizeTypeKey(value)
    if (!key) return

    if (systemTypeSet.has(key)) {
      const baseOption = DRILL_ENVIRONMENT_OPTIONS.find(
        (row) => normalizeTypeKey(row.value) === key,
      )
      if (!baseOption) return
      const nextOverrides = [
        ...environmentOverrides.filter((row) => normalizeTypeKey(row.value) !== key),
        {
          value: baseOption.value,
          title: baseOption.title || baseOption.value,
          description: baseOption.description || '',
          iconKey: baseOption.iconKey || '',
          hidden: true,
        },
      ]
      setEnvironmentOverrides(nextOverrides)
      saveDrillEnvironmentOverrides(userId, nextOverrides)
      if (normalizeTypeKey(selectedEnvironment) === key) updateSetupField('weather', '')
      pushToast?.('Drill environment removed.', {
        title: 'Environment removed',
        color: 'warning',
      })
      return
    }

    const nextCustomEnvironments = customEnvironments.filter(
      (row) => normalizeTypeKey(row.value) !== key,
    )
    setCustomEnvironments(nextCustomEnvironments)
    saveCustomDrillEnvironments(userId, nextCustomEnvironments)
    void persistCustomEnvironmentOptions(nextCustomEnvironments)

    if (normalizeTypeKey(selectedEnvironment) === key) {
      updateSetupField('weather', '')
    }

    pushToast?.('Drill environment removed.', {
      title: 'Environment removed',
      color: 'warning',
    })
  }

  return {
    showAllDrillEnvironments,
    setShowAllDrillEnvironments,
    showAddEnvironmentModal,
    environmentEditMode,
    setEnvironmentEditMode,
    typeOptions,
    visibleTypeOptions,
    openAddModal,
    closeAddModal,
    saveType,
    startEditType,
    removeType,
    newEnvironmentName,
    setNewEnvironmentName,
    newEnvironmentDescription,
    setNewEnvironmentDescription,
    newEnvironmentIconKey,
    setNewEnvironmentIconKey,
    iconOptions: availableIconOptions,
    editingEnvironmentKey,
    addEnvironmentError,
    setAddEnvironmentError,
  }
}

export default useDrillEnvironmentManager
