import { useEffect, useMemo, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { loadCustomIncidentTitles, saveCustomIncidentTitles } from './customIncidentTitlesStorage'

const containsAreaText = (value) => {
  const text = String(value || '').trim()
  if (!text) return false
  return /\b(zone|area)\b/i.test(text)
}

const useIncidentTitleManager = ({ userId, selectedTitle, updateTitleField, pushToast }) => {
  const [showAddTitleModal, setShowAddTitleModal] = useState(false)
  const [titleEditMode, setTitleEditMode] = useState(false)
  const [customIncidentTitles, setCustomIncidentTitles] = useState([])
  const [newTitleName, setNewTitleName] = useState('')
  const [editingTitleKey, setEditingTitleKey] = useState('')
  const [addTitleError, setAddTitleError] = useState('')

  useEffect(() => {
    setCustomIncidentTitles(loadCustomIncidentTitles(userId))
  }, [userId])

  const typeOptions = useMemo(
    () =>
      customIncidentTitles.map((row) => ({
        value: row.value,
        title: row.title,
        icon: ShieldAlert,
      })),
    [customIncidentTitles],
  )

  const resetDraft = () => {
    setNewTitleName('')
    setEditingTitleKey('')
  }

  const openAddModal = () => {
    setAddTitleError('')
    resetDraft()
    setTitleEditMode(false)
    setShowAddTitleModal(true)
  }

  const closeAddModal = () => {
    setShowAddTitleModal(false)
    setTitleEditMode(false)
    resetDraft()
    setAddTitleError('')
  }

  const saveType = () => {
    const title = String(newTitleName || '').trim()
    const editKey = String(editingTitleKey || '')
      .trim()
      .toLowerCase()

    if (!title) {
      setAddTitleError('Title name is required.')
      return
    }
    if (containsAreaText(title)) {
      setAddTitleError('Use a general incident title only. Area/zone will be auto-filled.')
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
      setAddTitleError('This title already exists.')
      return
    }

    const nextCustomTitles = editKey
      ? customIncidentTitles.map((row) => {
          const rowKey = String(row.value || '')
            .trim()
            .toLowerCase()
          if (rowKey !== editKey) return row
          return { value: title, title }
        })
      : [...customIncidentTitles, { value: title, title }]
    setCustomIncidentTitles(nextCustomTitles)
    saveCustomIncidentTitles(userId, nextCustomTitles)

    if (
      editKey &&
      String(selectedTitle || '')
        .trim()
        .toLowerCase() === editKey
    ) {
      updateTitleField(title, 'custom')
    } else if (!editKey) {
      updateTitleField(title, 'custom')
    }

    if (typeof pushToast === 'function') {
      pushToast(
        editKey ? `Incident title "${title}" updated.` : `Incident title "${title}" added.`,
        {
          title: editKey ? 'Title updated' : 'Title added',
          color: 'success',
        },
      )
    }

    if (editKey) {
      resetDraft()
      setTitleEditMode(true)
      return
    }

    closeAddModal()
  }

  const startEditType = (row) => {
    const value = String(row?.value || '').trim()
    if (!value) return
    setNewTitleName(value)
    setEditingTitleKey(value.toLowerCase())
    setAddTitleError('')
    setTitleEditMode(false)
  }

  const removeType = (value) => {
    const key = String(value || '')
      .trim()
      .toLowerCase()
    if (!key) return

    const nextCustomTitles = customIncidentTitles.filter(
      (row) =>
        String(row.value || '')
          .trim()
          .toLowerCase() !== key,
    )
    setCustomIncidentTitles(nextCustomTitles)
    saveCustomIncidentTitles(userId, nextCustomTitles)

    if (
      String(selectedTitle || '')
        .trim()
        .toLowerCase() === key
    ) {
      updateTitleField('', 'manual')
    }

    if (typeof pushToast === 'function') {
      pushToast('Incident title removed.', {
        title: 'Title removed',
        color: 'warning',
      })
    }
  }

  return {
    showAddTitleModal,
    titleEditMode,
    setTitleEditMode,
    typeOptions,
    systemTypeSet: new Set(),
    systemOverrideSet: new Set(),
    openAddModal,
    closeAddModal,
    saveType,
    startEditType,
    removeType,
    resetSystemOverride: () => {},
    newTitleName,
    setNewTitleName,
    editingTitleKey,
    editingSystemType: false,
    addTitleError,
    setAddTitleError,
  }
}

export default useIncidentTitleManager
