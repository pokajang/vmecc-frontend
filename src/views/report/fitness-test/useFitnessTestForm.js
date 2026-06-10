import { useState } from 'react'
import { uid } from '../utils'
import { defaultFitnessTestForm } from './utils'

const useFitnessTestForm = () => {
  const [form, setForm] = useState(defaultFitnessTestForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [setupFieldErrors, setSetupFieldErrors] = useState({})
  const [setupConfirmed, setSetupConfirmed] = useState(false)

  const addChronology = () =>
    setForm((prev) => ({
      ...prev,
      chronology: [...prev.chronology, { id: uid(), time: '', action: '' }],
    }))

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

  return {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    setupFieldErrors,
    setSetupFieldErrors,
    setupConfirmed,
    setSetupConfirmed,
    addChronology,
    updateChronology,
    removeChronology,
  }
}

export default useFitnessTestForm
