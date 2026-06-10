import { useState } from 'react'
import { uid } from '../utils'
import { defaultErcoForm } from './utils'

const useErcoForm = () => {
  const [form, setForm] = useState(defaultErcoForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [setupFieldErrors, setSetupFieldErrors] = useState({})
  const [setupConfirmed, setSetupConfirmed] = useState(false)
  const [respondingTeamConfirmed, setRespondingTeamConfirmed] = useState(false)
  const [detailsConfirmed, setDetailsConfirmed] = useState(false)

  const addChronology = (seed = {}) =>
    setForm((prev) => ({
      ...prev,
      chronology: [...prev.chronology, { id: uid(), time: '', action: '', ...seed }],
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
    respondingTeamConfirmed,
    setRespondingTeamConfirmed,
    detailsConfirmed,
    setDetailsConfirmed,
    addChronology,
    updateChronology,
    removeChronology,
  }
}

export default useErcoForm
