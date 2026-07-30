import { useState } from 'react'
import { uid } from '../utils'
import { DRILL_FIELD_LIMITS } from './constants'
import { defaultDrillForm, normalizeDrillForm } from './utils'

const useDrillForm = (initialFormSeed = null) => {
  const [form, setForm] = useState(() =>
    initialFormSeed ? normalizeDrillForm(initialFormSeed) : defaultDrillForm(),
  )
  const [fieldErrors, setFieldErrors] = useState({})
  const [setupFieldErrors, setSetupFieldErrors] = useState({})

  const addChronology = (patch = {}) =>
    setForm((prev) =>
      prev.chronology.length >= DRILL_FIELD_LIMITS.chronology
        ? prev
        : {
            ...prev,
            chronology: [...prev.chronology, { id: uid(), time: '', action: '', ...patch }],
          },
    )

  const updateChronology = (rowId, patch) =>
    setForm((prev) => ({
      ...prev,
      chronology: prev.chronology.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    }))

  const removeChronology = (rowId) =>
    setForm((prev) => ({
      ...prev,
      chronology:
        prev.chronology.length <= 1
          ? prev.chronology
          : prev.chronology.filter((row) => row.id !== rowId),
    }))

  const moveChronology = (rowId, direction) =>
    setForm((prev) => {
      const rows = [...prev.chronology]
      const index = rows.findIndex((row) => row.id === rowId)
      const target = index + Number(direction || 0)
      if (index < 0 || target < 0 || target >= rows.length) return prev
      const [row] = rows.splice(index, 1)
      rows.splice(target, 0, row)
      return { ...prev, chronology: rows }
    })

  return {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    setupFieldErrors,
    setSetupFieldErrors,
    addChronology,
    updateChronology,
    removeChronology,
    moveChronology,
  }
}

export default useDrillForm
