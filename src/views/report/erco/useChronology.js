import { useEffect, useMemo, useRef, useState } from 'react'
import { uid } from '../utils'
import {
  PRESET_TYPES,
  PREMOB_ACTIONS,
  DEMOB_ACTIONS,
  resolveNextChronologyTime,
  addMinutesToTime,
  parseTimeToMinutes,
  reorderRows,
  buildPreMobRowsFromStart,
  buildManualRowFromStart,
} from './chronologyUtils'

// --- Pointer-drag DOM helpers (no React state, pure DOM) ---

const createDragGhost = (sourceEl, clientX, clientY) => {
  const rect = sourceEl.getBoundingClientRect()
  const ghost = sourceEl.cloneNode(true)
  ghost.querySelectorAll('input, button, textarea').forEach((el) => {
    el.style.pointerEvents = 'none'
  })
  // setProperty with 'important' priority overrides Bootstrap's `position: relative !important`
  // that is inherited via cloneNode when the source element has the `position-relative` class.
  ghost.style.setProperty('position', 'fixed', 'important')
  Object.assign(ghost.style, {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '9999',
    opacity: '0.95',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    borderRadius: '0.5rem',
    background: 'var(--cui-body-bg, #fff)',
    transform: 'scale(1.015)',
  })
  document.body.appendChild(ghost)
  return { el: ghost, offsetX: clientX - rect.left, offsetY: clientY - rect.top }
}

const findClosestId = (refsMap, clientY) => {
  let closest = null
  let closestDist = Infinity
  for (const [id, el] of Object.entries(refsMap)) {
    if (!el) continue
    const rect = el.getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    const dist = Math.abs(clientY - mid)
    if (dist < closestDist) {
      closestDist = dist
      closest = id
    }
  }
  return closest
}

const getRowStep = (refsMap, rows) => {
  if (rows.length < 2) return 56
  const el0 = refsMap[rows[0]?.id]
  const el1 = refsMap[rows[1]?.id]
  if (!el0 || !el1) return 56
  return Math.abs(el1.getBoundingClientRect().top - el0.getBoundingClientRect().top) || 56
}

const applySlideTransforms = (refsMap, rows, fromIndex, toIndex) => {
  const step = getRowStep(refsMap, rows)
  rows.forEach((row, idx) => {
    const el = refsMap[row.id]
    if (!el) return
    if (idx === fromIndex) {
      el.style.visibility = 'hidden'
      return
    }
    let translate = 0
    if (fromIndex < toIndex && idx > fromIndex && idx <= toIndex) translate = -step
    else if (fromIndex > toIndex && idx >= toIndex && idx < fromIndex) translate = step
    el.style.transform = translate ? `translateY(${translate}px)` : ''
    el.style.transition = 'transform 180ms ease'
  })
}

const clearSlideTransforms = (refsMap) => {
  for (const el of Object.values(refsMap)) {
    if (!el) continue
    el.style.transition = 'none'
    el.style.transform = ''
    el.style.visibility = ''
  }
}

// --- Hook ---

export const useChronology = ({ form, setForm, pushToast }) => {
  const [rowModal, setRowModal] = useState(null)
  const [isAdvanceMenuOpen, setIsAdvanceMenuOpen] = useState(false)
  const [showPreMobModeModal, setShowPreMobModeModal] = useState(false)
  const [startTimeEditMode, setStartTimeEditMode] = useState(false)
  const [showStartModeModal, setShowStartModeModal] = useState(false)
  const [responseStartTime, setResponseStartTime] = useState(
    addMinutesToTime(String(form.incidentTime || '').trim(), 5) ||
      String(form.incidentTime || '').trim() ||
      '',
  )
  const [draggingRowId, setDraggingRowId] = useState(null)
  const [dragOverRowId, setDragOverRowId] = useState(null)
  const [draggingEventRowId, setDraggingEventRowId] = useState(null)
  const [dragOverEventRowId, setDragOverEventRowId] = useState(null)
  const [hoveredEventRowId, setHoveredEventRowId] = useState(null)
  const [focusedEventRowId, setFocusedEventRowId] = useState(null)
  const [swappedRowIds, setSwappedRowIds] = useState([])
  const [swapEffectScope, setSwapEffectScope] = useState('row')
  const [canUndo, setCanUndo] = useState(false)
  const swapEffectTimerRef = useRef(null)
  const undoTimerRef = useRef(null)
  const snapshotRef = useRef(null)
  const eventFieldRefs = useRef({})
  const rowContainerRefs = useRef({})

  const chronologyRows = useMemo(
    () => (Array.isArray(form.chronology) ? form.chronology : []),
    [form.chronology],
  )

  const hasPreMobRows = chronologyRows.some((row) => row?.presetType === PRESET_TYPES.PREMOB)
  const hasDemobRows = chronologyRows.some((row) => row?.presetType === PRESET_TYPES.DEMOB)
  const hasAnyPresetRows = hasPreMobRows || hasDemobRows
  const isChronologyDefault =
    chronologyRows.length === 1 &&
    !String(chronologyRows[0]?.time || '').trim() &&
    !String(chronologyRows[0]?.action || '').trim()
  const showChronologyStarter = isChronologyDefault

  const isChronologyOutOfOrder = chronologyRows.some((row, idx) => {
    if (idx === 0) return false
    const prev = chronologyRows[idx - 1]
    const prevMin = parseTimeToMinutes(prev?.time)
    const currMin = parseTimeToMinutes(row?.time)
    if (prevMin === null || currMin === null) return false
    return currMin < prevMin
  })

  useEffect(
    () => () => {
      if (swapEffectTimerRef.current) window.clearTimeout(swapEffectTimerRef.current)
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current)
    },
    [],
  )

  // Auto-seed default chronology with PreMob rows when still untouched.
  useEffect(() => {
    if (!isChronologyDefault) return
    const startTime = String(form.incidentTime || '').trim()
    if (!startTime) return

    setForm((prev) => {
      const rows = Array.isArray(prev.chronology) ? prev.chronology : []
      if (rows.length !== 1) return prev
      const row = rows[0] || {}
      if (String(row?.time || '').trim() || String(row?.action || '').trim()) return prev
      const nextRows = buildPreMobRowsFromStart(startTime)
      if (!nextRows.length) return prev
      return {
        ...prev,
        chronology: nextRows,
      }
    })
  }, [form.incidentTime, isChronologyDefault, setForm])

  const snapshotChronology = () => {
    snapshotRef.current = form.chronology
    setCanUndo(true)
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current)
    undoTimerRef.current = window.setTimeout(() => {
      snapshotRef.current = null
      setCanUndo(false)
      undoTimerRef.current = null
    }, 8000)
  }

  const undoChronology = () => {
    const prev = snapshotRef.current
    if (!prev) return
    snapshotRef.current = null
    setCanUndo(false)
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
    updateChronologyRows(prev)
    if (pushToast) pushToast('Last change undone.', { title: 'Undo', color: 'info' })
  }

  const updateChronologyRows = (updater) =>
    setForm((prev) => {
      const currentRows = Array.isArray(prev.chronology) ? prev.chronology : []
      const nextRowsRaw = typeof updater === 'function' ? updater(currentRows) : updater
      const nextRows = Array.isArray(nextRowsRaw) ? nextRowsRaw : currentRows
      const defaultRows = buildPreMobRowsFromStart(String(prev.incidentTime || '').trim())
      return {
        ...prev,
        chronology: nextRows.length > 0 ? nextRows : defaultRows,
      }
    })

  const updateChronologyRow = (rowId, patch) =>
    updateChronologyRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    )

  const addChronologyRow = (seed = {}) => {
    snapshotChronology()
    updateChronologyRows((rows) => [...rows, { id: uid(), time: '', action: '', ...seed }])
  }

  const addChronologyRowAfter = (rowId, seed = {}) => {
    snapshotChronology()
    updateChronologyRows((rows) => {
      const fromIndex = rows.findIndex((row) => row.id === rowId)
      if (fromIndex < 0) return [...rows, { id: uid(), time: '', action: '', ...seed }]
      const nextRows = [...rows]
      nextRows.splice(fromIndex + 1, 0, { id: uid(), time: '', action: '', ...seed })
      return nextRows
    })
  }

  const removeChronologyRow = (rowId) => {
    if (chronologyRows.length <= 1) return
    snapshotChronology()
    updateChronologyRows((rows) => rows.filter((row) => row.id !== rowId))
  }

  const triggerSwapEffect = (scope, affectedRowIds) => {
    if (swapEffectTimerRef.current) {
      window.clearTimeout(swapEffectTimerRef.current)
    }
    setSwapEffectScope(scope)
    setSwappedRowIds(affectedRowIds)
    swapEffectTimerRef.current = window.setTimeout(() => {
      setSwappedRowIds([])
      setSwapEffectScope('row')
      swapEffectTimerRef.current = null
    }, 320)
  }

  const moveChronologyRow = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    const fromRowId = chronologyRows[fromIndex]?.id
    const toRowId = chronologyRows[toIndex]?.id
    triggerSwapEffect('row', [fromRowId, toRowId].filter(Boolean))
    snapshotChronology()
    updateChronologyRows((rows) => reorderRows(rows, fromIndex, toIndex))
  }

  const sortChronologyByTime = () => {
    snapshotChronology()
    updateChronologyRows((rows) =>
      [...rows].sort((a, b) => {
        const aMin = parseTimeToMinutes(a?.time)
        const bMin = parseTimeToMinutes(b?.time)
        if (aMin === null && bMin === null) return 0
        if (aMin === null) return 1
        if (bMin === null) return -1
        return aMin - bMin
      }),
    )
    if (pushToast)
      pushToast('Chronology sorted by time.', { title: 'Events sorted', color: 'info' })
  }

  const moveChronologyEventPayload = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    const fromRowId = chronologyRows[fromIndex]?.id
    const toRowId = chronologyRows[toIndex]?.id
    triggerSwapEffect('event', [fromRowId, toRowId].filter(Boolean))
    snapshotChronology()
    updateChronologyRows((rows) => {
      const safeRows = Array.isArray(rows) ? [...rows] : []
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= safeRows.length ||
        toIndex >= safeRows.length
      ) {
        return safeRows
      }
      const payloads = safeRows.map((row) => ({
        action: row?.action || '',
        presetType: row?.presetType || '',
      }))
      const [moved] = payloads.splice(fromIndex, 1)
      payloads.splice(toIndex, 0, moved)
      return safeRows.map((row, index) => ({
        ...row,
        action: String(payloads[index]?.action || ''),
        presetType: String(payloads[index]?.presetType || ''),
      }))
    })
  }

  // --- Pointer-based drag handlers ---

  const handleRowGripPointerDown = (e, rowId) => {
    e.preventDefault()
    const rows = chronologyRows
    const fromIndex = rows.findIndex((r) => r.id === rowId)
    const rowEl = rowContainerRefs.current[rowId]
    if (!rowEl || fromIndex < 0) return

    const ghost = createDragGhost(rowEl, e.clientX, e.clientY)
    document.body.style.userSelect = 'none'
    setDraggingRowId(rowId)
    applySlideTransforms(rowContainerRefs.current, rows, fromIndex, fromIndex)

    let currentToIndex = fromIndex

    const onMove = (moveEvent) => {
      ghost.el.style.left = `${moveEvent.clientX - ghost.offsetX}px`
      ghost.el.style.top = `${moveEvent.clientY - ghost.offsetY}px`
      const targetId = findClosestId(rowContainerRefs.current, moveEvent.clientY)
      if (!targetId) return
      const targetIndex = rows.findIndex((r) => r.id === targetId)
      if (targetIndex < 0 || targetIndex === currentToIndex) return
      currentToIndex = targetIndex
      setDragOverRowId(targetId)
      applySlideTransforms(rowContainerRefs.current, rows, fromIndex, targetIndex)
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      ghost.el.remove()
      document.body.style.userSelect = ''
    }

    const onUp = () => {
      cleanup()
      if (currentToIndex !== fromIndex) moveChronologyRow(fromIndex, currentToIndex)
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => {
          clearSlideTransforms(rowContainerRefs.current)
          setDraggingRowId(null)
          setDragOverRowId(null)
        }),
      )
    }

    const onCancel = () => {
      cleanup()
      clearSlideTransforms(rowContainerRefs.current)
      setDraggingRowId(null)
      setDragOverRowId(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  const handleEventGripPointerDown = (e, rowId) => {
    e.preventDefault()
    const rows = chronologyRows
    const fromIndex = rows.findIndex((r) => r.id === rowId)
    const fieldEl = eventFieldRefs.current[rowId]
    if (!fieldEl || fromIndex < 0) return

    const ghost = createDragGhost(fieldEl, e.clientX, e.clientY)
    document.body.style.userSelect = 'none'
    setDraggingEventRowId(rowId)
    applySlideTransforms(eventFieldRefs.current, rows, fromIndex, fromIndex)

    let currentToIndex = fromIndex

    const onMove = (moveEvent) => {
      ghost.el.style.left = `${moveEvent.clientX - ghost.offsetX}px`
      ghost.el.style.top = `${moveEvent.clientY - ghost.offsetY}px`
      const targetId = findClosestId(eventFieldRefs.current, moveEvent.clientY)
      if (!targetId) return
      const targetIndex = rows.findIndex((r) => r.id === targetId)
      if (targetIndex < 0 || targetIndex === currentToIndex) return
      currentToIndex = targetIndex
      setDragOverEventRowId(targetId)
      applySlideTransforms(eventFieldRefs.current, rows, fromIndex, targetIndex)
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      ghost.el.remove()
      document.body.style.userSelect = ''
    }

    const onUp = () => {
      cleanup()
      if (currentToIndex !== fromIndex) moveChronologyEventPayload(fromIndex, currentToIndex)
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => {
          clearSlideTransforms(eventFieldRefs.current)
          setDraggingEventRowId(null)
          setDragOverEventRowId(null)
        }),
      )
    }

    const onCancel = () => {
      cleanup()
      clearSlideTransforms(eventFieldRefs.current)
      setDraggingEventRowId(null)
      setDragOverEventRowId(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  // --- Preset / toolbar handlers ---

  const addRowsWithActions = (actions, label, { mode = 'append', presetType = '' } = {}) => {
    const safeActions = (Array.isArray(actions) ? actions : [])
      .map((text) => String(text || '').trim())
      .filter(Boolean)
    if (safeActions.length === 0) return
    const isReplace = mode === 'replace'
    snapshotChronology()
    updateChronologyRows((existingRows) => {
      const firstTime = isReplace
        ? String(form.incidentTime || '').trim()
        : resolveNextChronologyTime(existingRows, form.incidentTime, 5)
      const nextRows = safeActions.map((action, index) => ({
        id: uid(),
        time: firstTime ? addMinutesToTime(firstTime, index * 5) : '',
        action,
        presetType,
      }))
      return isReplace ? nextRows : [...existingRows, ...nextRows]
    })
    if (pushToast) {
      pushToast(
        `${isReplace ? 'Reset and added' : 'Added'} ${safeActions.length} ${label} row${
          safeActions.length > 1 ? 's' : ''
        }.`,
        { title: 'Chronology updated', color: 'success' },
      )
    }
  }

  const removePresetRows = (presetType, label) => {
    const removedCount = chronologyRows.filter((row) => row?.presetType === presetType).length
    if (removedCount <= 0) return
    snapshotChronology()
    updateChronologyRows((rows) => rows.filter((row) => row?.presetType !== presetType))
    if (pushToast) {
      pushToast(`Removed ${removedCount} ${label} row${removedCount > 1 ? 's' : ''}.`, {
        title: 'Chronology updated',
        color: 'warning',
      })
    }
  }

  const isBlankRow = (row) =>
    !String(row?.time || '').trim().length && !String(row?.action || '').trim().length

  const handleAddSimpleRow = () => {
    const nextTime = resolveNextChronologyTime(chronologyRows, form.incidentTime, 5)
    addChronologyRow({ time: nextTime, action: '' })
    setIsAdvanceMenuOpen(false)
  }

  const handleAddPreMobRows = () => {
    if (hasPreMobRows) {
      removePresetRows(PRESET_TYPES.PREMOB, 'PreMob')
      setIsAdvanceMenuOpen(false)
      return
    }
    if (chronologyRows.length === 0 || chronologyRows.every(isBlankRow)) {
      addRowsWithActions(PREMOB_ACTIONS, 'PreMob', {
        mode: 'replace',
        presetType: PRESET_TYPES.PREMOB,
      })
      setIsAdvanceMenuOpen(false)
      return
    }
    setShowPreMobModeModal(true)
    setIsAdvanceMenuOpen(false)
  }

  const handlePreMobAppend = () => {
    addRowsWithActions(PREMOB_ACTIONS, 'PreMob', {
      mode: 'append',
      presetType: PRESET_TYPES.PREMOB,
    })
    setShowPreMobModeModal(false)
  }

  const handlePreMobReplace = () => {
    addRowsWithActions(PREMOB_ACTIONS, 'PreMob', {
      mode: 'replace',
      presetType: PRESET_TYPES.PREMOB,
    })
    setShowPreMobModeModal(false)
  }

  const handleAddDemobRows = () => {
    if (hasDemobRows) {
      removePresetRows(PRESET_TYPES.DEMOB, 'Demob')
      setIsAdvanceMenuOpen(false)
      return
    }
    addRowsWithActions(DEMOB_ACTIONS, 'Demob', {
      mode: 'append',
      presetType: PRESET_TYPES.DEMOB,
    })
    setIsAdvanceMenuOpen(false)
  }

  const handleResetChronology = () => {
    snapshotChronology()
    const defaultRows = buildPreMobRowsFromStart(String(form.incidentTime || '').trim())
    updateChronologyRows(defaultRows)
    setIsAdvanceMenuOpen(false)
    setShowPreMobModeModal(false)
    setStartTimeEditMode(false)
    setShowStartModeModal(false)
    setResponseStartTime(String(form.incidentTime || '').trim() || '')
    if (pushToast) {
      pushToast('Chronology reset with PreMob events.', { title: 'Events reset', color: 'info' })
    }
  }

  const handleSetResponseStartTime = () => {
    setStartTimeEditMode(true)
  }

  const handleSaveResponseStartTime = () => {
    if (parseTimeToMinutes(responseStartTime) === null) {
      pushToast?.('Select a valid response start time first.', {
        title: 'Invalid time',
        color: 'warning',
      })
      return
    }
    setStartTimeEditMode(false)
    setShowStartModeModal(true)
  }

  const handleCancelResponseStartTimeEdit = () => {
    setStartTimeEditMode(false)
    setResponseStartTime(String(form.incidentTime || '').trim() || '')
  }

  const applyStartMode = (mode) => {
    const safeStartTime = parseTimeToMinutes(responseStartTime) !== null ? responseStartTime : ''
    if (!safeStartTime) return
    snapshotChronology()
    updateChronologyRows(
      mode === 'premob'
        ? buildPreMobRowsFromStart(safeStartTime)
        : buildManualRowFromStart(safeStartTime),
    )
    setShowStartModeModal(false)
    setIsAdvanceMenuOpen(false)
    if (pushToast) {
      pushToast(
        mode === 'premob'
          ? 'PreMob template created from response start time.'
          : 'Manual chronology row created from response start time.',
        { title: 'Chronology initialized', color: 'success' },
      )
    }
  }

  // --- Row modal (mobile add/edit) ---

  const openAddRowModal = () => {
    const nextTime = resolveNextChronologyTime(chronologyRows, form.incidentTime, 5)
    setRowModal({ editId: null, time: nextTime || '', action: '' })
  }

  const openEditRowModal = (row) => {
    setRowModal({
      editId: row.id,
      time: String(row?.time || ''),
      action: String(row?.action || ''),
    })
  }

  const closeRowModal = () => setRowModal(null)

  const setRowModalDraft = (patch) => setRowModal((prev) => (prev ? { ...prev, ...patch } : prev))

  const commitRowModal = (andNext = false) => {
    if (!rowModal) return
    const { editId, time, action } = rowModal
    if (editId) {
      updateChronologyRow(editId, { time, action })
    } else {
      snapshotChronology()
      updateChronologyRows((rows) => [...rows, { id: uid(), time, action }])
    }
    if (andNext) {
      const nextTime = addMinutesToTime(time || '', 5)
      setRowModal({ editId: null, time: nextTime || '', action: '' })
    } else {
      setRowModal(null)
    }
  }

  return {
    // Derived state
    chronologyRows,
    hasPreMobRows,
    hasDemobRows,
    hasAnyPresetRows,
    isChronologyDefault,
    showChronologyStarter,
    isChronologyOutOfOrder,

    // Drag state (read — setters are controlled internally by pointer handlers)
    draggingRowId,
    dragOverRowId,
    draggingEventRowId,
    dragOverEventRowId,
    hoveredEventRowId,
    setHoveredEventRowId,
    focusedEventRowId,
    setFocusedEventRowId,
    swappedRowIds,
    swapEffectScope,

    // Refs
    eventFieldRefs,
    rowContainerRefs,

    // Row modal (mobile)
    rowModal,
    openAddRowModal,
    openEditRowModal,
    closeRowModal,
    setRowModalDraft,
    commitRowModal,

    // Modal state
    isAdvanceMenuOpen,
    setIsAdvanceMenuOpen,
    showPreMobModeModal,
    setShowPreMobModeModal,
    showStartModeModal,
    setShowStartModeModal,

    // Response start time
    startTimeEditMode,
    responseStartTime,
    setResponseStartTime,

    // Undo
    canUndo,
    undoChronology,

    // Row mutations
    updateChronologyRow,
    addChronologyRowAfter,
    removeChronologyRow,
    moveChronologyRow,
    moveChronologyEventPayload,
    sortChronologyByTime,

    // Drag entry points (pointer-based)
    handleRowGripPointerDown,
    handleEventGripPointerDown,

    // Chronology actions
    handleAddSimpleRow,
    handleAddPreMobRows,
    handlePreMobAppend,
    handlePreMobReplace,
    handleAddDemobRows,
    handleResetChronology,

    // Response start time actions
    handleSetResponseStartTime,
    handleSaveResponseStartTime,
    handleCancelResponseStartTimeEdit,
    applyStartMode,
  }
}
