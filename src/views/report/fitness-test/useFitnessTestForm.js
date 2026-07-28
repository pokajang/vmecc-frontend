import { useState } from 'react'
import { createDefaultFitnessTestForm, updateFitnessParticipantResults } from './fitnessFormDomain'

const useFitnessTestForm = () => {
  const [form, setForm] = useState(createDefaultFitnessTestForm)
  const [fieldErrors, setFieldErrors] = useState({})

  const updateParticipant = (groupId, participantId, patch) =>
    setForm((current) => ({
      ...current,
      shiftGroups: current.shiftGroups.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              participants: group.participants.map((participant) =>
                participant.id === participantId
                  ? updateFitnessParticipantResults(participant, patch)
                  : participant,
              ),
            },
      ),
    }))

  const setShiftAssessor = (groupId, name) =>
    setForm((current) => ({
      ...current,
      shiftGroups: current.shiftGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              assessor:
                name && typeof name === 'object'
                  ? { userId: String(name.userId || ''), name: String(name.name || '') }
                  : { ...group.assessor, name: String(name || '') },
            }
          : group,
      ),
    }))

  const applyShiftTestDate = (groupId, mode, testedOn) =>
    setForm((current) => ({
      ...current,
      shiftGroups: current.shiftGroups.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              participants: group.participants.map((participant) =>
                participant?.[mode]?.testedOn
                  ? participant
                  : updateFitnessParticipantResults(participant, {
                      [mode]: { testedOn },
                    }),
              ),
            },
      ),
    }))

  return {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    updateParticipant,
    setShiftAssessor,
    applyShiftTestDate,
  }
}

export default useFitnessTestForm
