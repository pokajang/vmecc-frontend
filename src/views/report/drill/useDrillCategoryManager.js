import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DRILL_EXERCISE_CATEGORY_OPTIONS } from './constants'
import {
  loadCustomDrillCategories,
  saveCustomDrillCategories,
} from './customDrillCategoriesStorage'
import {
  loadDrillCategoryOverrides,
  saveDrillCategoryOverrides,
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

export const DRILL_CATEGORY_VISIBLE_LIMIT = 4
export const DRILL_CATEGORY_TOGGLE_VALUE = '__drill_categories_toggle__'

const useDrillCategoryManager = ({ userId, selectedCategories, updateSetupField, pushToast }) => {
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [categoryEditMode, setCategoryEditMode] = useState(false)
  const [categoryOverrides, setCategoryOverrides] = useState([])
  const [customCategories, setCustomCategories] = useState([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [newCategoryIconKey, setNewCategoryIconKey] = useState('')
  const [editingCategoryKey, setEditingCategoryKey] = useState('')
  const [addCategoryError, setAddCategoryError] = useState('')

  useEffect(() => {
    setCustomCategories(loadCustomDrillCategories(userId))
    setCategoryOverrides(loadDrillCategoryOverrides(userId))
  }, [userId])

  const systemOptions = useMemo(
    () => applyTypeOverrides(DRILL_EXERCISE_CATEGORY_OPTIONS, categoryOverrides),
    [categoryOverrides],
  )
  const iconOptions = useMemo(() => getTypeIconOptions('incident'), [])
  const categoryOptions = useMemo(
    () => [
      ...systemOptions,
      ...customCategories.map((row) =>
        withResolvedTypeIcon(row, 'incident', 'Custom exercise category.'),
      ),
    ],
    [customCategories, systemOptions],
  )
  const visibleCategoryOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: categoryOptions,
        selected: selectedCategories,
        visibleLimit: DRILL_CATEGORY_VISIBLE_LIMIT,
        showAll: showAllCategories,
        toggleOption: {
          value: DRILL_CATEGORY_TOGGLE_VALUE,
          title: showAllCategories ? 'Show less' : 'Show more',
          description: '',
          icon: showAllCategories ? ChevronUp : ChevronDown,
        },
      }),
    [categoryOptions, selectedCategories, showAllCategories],
  )
  const availableIconOptions = useMemo(() => {
    const editKey = normalizeTypeKey(editingCategoryKey)
    const currentIconKey = String(newCategoryIconKey || '').trim()
    const usedIconKeys = new Set(
      categoryOptions
        .filter((row) => normalizeTypeKey(row?.value) !== editKey)
        .map((row) => resolveTypeIconKey(row, 'incident'))
        .filter(Boolean),
    )
    return iconOptions.filter(
      (option) => !usedIconKeys.has(option.key) || option.key === currentIconKey,
    )
  }, [categoryOptions, editingCategoryKey, iconOptions, newCategoryIconKey])
  const systemCategorySet = useMemo(
    () => new Set(DRILL_EXERCISE_CATEGORY_OPTIONS.map((row) => normalizeTypeKey(row.value))),
    [],
  )

  const resetDraft = () => {
    setNewCategoryName('')
    setNewCategoryDescription('')
    setNewCategoryIconKey('')
    setEditingCategoryKey('')
  }
  const openAddModal = () => {
    setAddCategoryError('')
    resetDraft()
    const usedIconKeys = new Set(
      categoryOptions.map((row) => resolveTypeIconKey(row, 'incident')).filter(Boolean),
    )
    const unusedIcon = iconOptions.find((option) => !usedIconKeys.has(option.key))
    setNewCategoryIconKey(
      unusedIcon?.key ||
        pickLeastUsedTypeIconKey('incident', [...customCategories, ...categoryOverrides]),
    )
    setCategoryEditMode(false)
    setShowAddCategoryModal(true)
  }
  const closeAddModal = () => {
    setShowAddCategoryModal(false)
    setCategoryEditMode(false)
    resetDraft()
    setAddCategoryError('')
  }
  const saveCategory = () => {
    const title = String(newCategoryName || '').trim()
    const description = String(newCategoryDescription || '').trim()
    const iconKey = String(newCategoryIconKey || '').trim()
    const editKey = normalizeTypeKey(editingCategoryKey)
    if (!title) {
      setAddCategoryError('Exercise category name is required.')
      return
    }
    const exists = categoryOptions.some((row) => {
      const key = normalizeTypeKey(row.value)
      return key !== editKey && key === normalizeTypeKey(title)
    })
    if (exists) {
      setAddCategoryError('This exercise category already exists.')
      return
    }
    const iconExists = iconOptions.some((option) => option.key === iconKey)
    const iconUsed = categoryOptions.some(
      (row) =>
        normalizeTypeKey(row.value) !== editKey && resolveTypeIconKey(row, 'incident') === iconKey,
    )
    if (!iconExists || iconUsed) {
      setAddCategoryError(
        iconExists ? 'This icon is already used by another category.' : 'Choose an icon.',
      )
      return
    }
    if (editKey && systemCategorySet.has(editKey)) {
      const baseOption = DRILL_EXERCISE_CATEGORY_OPTIONS.find(
        (row) => normalizeTypeKey(row.value) === editKey,
      )
      if (!baseOption) return
      const nextOverrides = [
        ...categoryOverrides.filter((row) => normalizeTypeKey(row.value) !== editKey),
        { value: baseOption.value, title, description, iconKey },
      ]
      setCategoryOverrides(nextOverrides)
      saveDrillCategoryOverrides(userId, nextOverrides)
      pushToast?.(`Exercise category "${title}" updated.`, {
        title: 'Category updated',
        color: 'success',
      })
      resetDraft()
      setCategoryEditMode(true)
      return
    }
    const nextCustomCategories = editKey
      ? customCategories.map((row) =>
          normalizeTypeKey(row.value) === editKey
            ? { value: title, title, description, iconKey }
            : row,
        )
      : [...customCategories, { value: title, title, description, iconKey }]
    setCustomCategories(nextCustomCategories)
    saveCustomDrillCategories(userId, nextCustomCategories)
    const selected = Array.isArray(selectedCategories) ? selectedCategories : []
    updateSetupField(
      'exerciseCategories',
      editKey
        ? selected.map((value) => (normalizeTypeKey(value) === editKey ? title : value))
        : [...selected, title],
    )
    pushToast?.(
      editKey ? `Exercise category "${title}" updated.` : `Exercise category "${title}" added.`,
      { title: editKey ? 'Category updated' : 'Category added', color: 'success' },
    )
    if (editKey) {
      resetDraft()
      setCategoryEditMode(true)
      return
    }
    setShowAllCategories(true)
    closeAddModal()
  }
  const startEditCategory = (row) => {
    const value = String(row?.value || '').trim()
    if (!value) return
    setNewCategoryName(String(row?.title || value).trim())
    setNewCategoryDescription(String(row?.description || '').trim())
    setNewCategoryIconKey(resolveTypeIconKey(row, 'incident'))
    setEditingCategoryKey(normalizeTypeKey(value))
    setAddCategoryError('')
    setCategoryEditMode(false)
  }
  const removeCategory = (value) => {
    const key = normalizeTypeKey(value)
    if (!key) return
    if (systemCategorySet.has(key)) {
      const baseOption = DRILL_EXERCISE_CATEGORY_OPTIONS.find(
        (row) => normalizeTypeKey(row.value) === key,
      )
      if (!baseOption) return
      const nextOverrides = [
        ...categoryOverrides.filter((row) => normalizeTypeKey(row.value) !== key),
        {
          value: baseOption.value,
          title: baseOption.title || baseOption.value,
          description: baseOption.description || '',
          iconKey: resolveTypeIconKey(baseOption, 'incident'),
          hidden: true,
        },
      ]
      setCategoryOverrides(nextOverrides)
      saveDrillCategoryOverrides(userId, nextOverrides)
    } else {
      const nextCustomCategories = customCategories.filter(
        (row) => normalizeTypeKey(row.value) !== key,
      )
      setCustomCategories(nextCustomCategories)
      saveCustomDrillCategories(userId, nextCustomCategories)
    }
    const selected = Array.isArray(selectedCategories) ? selectedCategories : []
    updateSetupField(
      'exerciseCategories',
      selected.filter((category) => normalizeTypeKey(category) !== key),
    )
    pushToast?.('Exercise category removed.', { title: 'Category removed', color: 'warning' })
  }

  return {
    showAllCategories,
    setShowAllCategories,
    showAddCategoryModal,
    categoryEditMode,
    setCategoryEditMode,
    categoryOptions,
    visibleCategoryOptions,
    openAddModal,
    closeAddModal,
    saveCategory,
    startEditCategory,
    removeCategory,
    newCategoryName,
    setNewCategoryName,
    newCategoryDescription,
    setNewCategoryDescription,
    newCategoryIconKey,
    setNewCategoryIconKey,
    iconOptions: availableIconOptions,
    editingCategoryKey,
    addCategoryError,
    setAddCategoryError,
  }
}

export default useDrillCategoryManager
