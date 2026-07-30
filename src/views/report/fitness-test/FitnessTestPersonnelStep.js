import React, { useEffect, useMemo, useState } from 'react'
import { CAlert, CBadge, CButton } from '@coreui/react'
import { Trash2, Users } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import ResponsiveChoiceSelector from 'src/components/report-workflow/ResponsiveChoiceSelector'
import WorkflowRosterGroup from 'src/components/report-workflow/WorkflowRosterGroup'
import TableLoader from 'src/components/TableLoader'
import { fetchTeams } from 'src/services/apiClient'
import useReportIsMobile from '../hooks/useReportIsMobile'
import { uid } from '../utils'
import { FITNESS_FIELD_LIMITS } from './constants'
import { createFitnessParticipant, flattenFitnessParticipants } from './fitnessFormDomain'
import FitnessParticipantModal from './FitnessParticipantModal'
import FitnessStageActions from './FitnessStageActions'
import {
  fitnessMemberKey,
  mergeFitnessTeamsIntoForm,
  normalizeFitnessTeams,
  setFitnessMembersIncluded,
} from './fitnessTeamDomain'

const keyOf = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
const FitnessTestPersonnelStep = ({
  form,
  setForm,
  fieldErrors,
  clearError,
  onBack,
  onSaveDraft,
  onContinue,
  saveLabel,
  draftStatus,
  pushToast,
}) => {
  const isMobile = useReportIsMobile()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [participantError, setParticipantError] = useState('')
  const [manualDraft, setManualDraft] = useState({
    name: '',
    role: '',
    age: '',
    shift: '',
    newShift: '',
  })

  useEffect(() => {
    let cancelled = false
    fetchTeams()
      .then((response) => {
        if (cancelled) return
        const loadedTeams = normalizeFitnessTeams(response)
        setTeams(loadedTeams)
        setForm((current) => mergeFitnessTeamsIntoForm(current, loadedTeams))
      })
      .catch(() => {
        if (!cancelled) setLoadError('Unable to load team members. Retry after reconnecting.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadAttempt, setForm])

  const selectedKeys = useMemo(
    () => new Set(flattenFitnessParticipants(form).map(fitnessMemberKey)),
    [form],
  )

  const toggleMember = (team, member) => {
    const targetKey = fitnessMemberKey(member)
    setForm((current) =>
      setFitnessMembersIncluded(current, team, targetKey, !selectedKeys.has(targetKey)),
    )
    clearError('shiftGroups')
  }

  const setTeamIncluded = (team, included) => {
    setForm((current) =>
      setFitnessMembersIncluded(current, team, team.members.map(fitnessMemberKey), included),
    )
    clearError('shiftGroups')
  }

  const selectedCount = selectedKeys.size
  const shiftOptions = useMemo(
    () =>
      [
        ...new Set([
          ...teams.map((team) => team.name),
          ...form.shiftGroups.map((group) => group.shift),
        ]),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [form.shiftGroups, teams],
  )
  const manualParticipants = useMemo(
    () => flattenFitnessParticipants(form).filter((participant) => participant.source === 'manual'),
    [form],
  )
  const unavailableParticipants = useMemo(
    () =>
      flattenFitnessParticipants(form).filter(
        (participant) => participant.rosterStatus === 'unavailable',
      ),
    [form],
  )

  const closeParticipantModal = () => {
    setShowAddParticipant(false)
    setParticipantError('')
    setManualDraft({ name: '', role: '', age: '', shift: '', newShift: '' })
  }

  const addManualParticipant = () => {
    const name = manualDraft.name.trim()
    const age = Number(manualDraft.age)
    const shift = (
      manualDraft.shift === '__new__' ? manualDraft.newShift : manualDraft.shift
    ).trim()
    if (!name) return setParticipantError('Participant name is required.')
    if (!Number.isInteger(age) || age < 18 || age > FITNESS_FIELD_LIMITS.age) {
      return setParticipantError('Enter a valid age from 18 to 100.')
    }
    if (!shift) return setParticipantError('Choose a shift or enter a new shift name.')
    const participants = flattenFitnessParticipants(form)
    if (participants.length >= FITNESS_FIELD_LIMITS.participants) {
      return setParticipantError(
        `A report can contain up to ${FITNESS_FIELD_LIMITS.participants} participants.`,
      )
    }
    if (participants.some((participant) => keyOf(participant.name) === keyOf(name))) {
      return setParticipantError(`A participant named ${name} is already selected.`)
    }

    setForm((current) => {
      const groupIndex = current.shiftGroups.findIndex((item) => keyOf(item.shift) === keyOf(shift))
      const group = current.shiftGroups[groupIndex] || {
        id: `manual-shift-${uid()}`,
        shift,
        assessor: { userId: '', name: '' },
        participants: [],
      }
      const participant = createFitnessParticipant(
        { id: `manual-${uid()}`, name, role: manualDraft.role.trim(), age, source: 'manual' },
        current.reportingMonth,
        group.participants.length,
      )
      const nextGroup = { ...group, participants: [...group.participants, participant] }
      const groups =
        groupIndex >= 0
          ? current.shiftGroups.map((item, index) => (index === groupIndex ? nextGroup : item))
          : [...current.shiftGroups, nextGroup]
      return { ...current, shiftGroups: groups }
    })
    clearError('shiftGroups')
    pushToast?.(`${name} added to ${shift}.`, { title: 'Participant added', color: 'success' })
    closeParticipantModal()
  }

  const removeManualParticipant = (participant) => {
    setForm((current) => ({
      ...current,
      shiftGroups: current.shiftGroups
        .map((group) => ({
          ...group,
          participants: group.participants.filter((row) => row.id !== participant.id),
        }))
        .filter((group) => group.participants.length),
    }))
    pushToast?.(`${participant.name} removed.`, { title: 'Participant removed', color: 'info' })
  }

  return (
    <div className="mb-3 d-grid gap-4">
      <section className="d-grid gap-3" data-fitness-test-field="shiftGroups">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
          <h3 className="h6 mb-0">Participating personnel</h3>
          <div className="d-flex align-items-center gap-2">
            {!loading && !loadError && teams.length ? (
              <CBadge color="success">Active roster included</CBadge>
            ) : null}
            <CBadge color="light" className="border text-body-secondary">
              {selectedCount} included
            </CBadge>
            <CreateActionButton
              label="Add participant"
              className="inspection-compact-action-btn"
              onClick={() => setShowAddParticipant(true)}
            />
          </div>
        </div>
        {loading ? <TableLoader message="Loading team members..." /> : null}
        {loadError ? (
          <CAlert
            color="warning"
            className="d-flex flex-wrap align-items-center justify-content-between gap-2"
          >
            <span>{loadError}</span>
            <CButton
              type="button"
              color="warning"
              variant="outline"
              onClick={() => {
                setLoading(true)
                setLoadError('')
                setLoadAttempt((current) => current + 1)
              }}
            >
              Retry
            </CButton>
          </CAlert>
        ) : null}
        {unavailableParticipants.length ? (
          <CAlert color="warning">
            {unavailableParticipants.length} saved participant
            {unavailableParticipants.length === 1 ? ' is' : 's are'} no longer in the active team
            list. Existing results were preserved for review.
          </CAlert>
        ) : null}
        {fieldErrors.shiftGroups ? <CAlert color="danger">{fieldErrors.shiftGroups}</CAlert> : null}
        {!loading && !loadError && teams.length === 0 ? (
          <CAlert
            color="warning"
            className="d-flex flex-wrap align-items-center justify-content-between gap-2"
          >
            <span>No team members are configured.</span>
            <CButton
              type="button"
              color="warning"
              variant="outline"
              onClick={() => setShowAddParticipant(true)}
            >
              Add participant
            </CButton>
          </CAlert>
        ) : null}
        {teams.map((team) => {
          const includedCount = team.members.filter((member) =>
            selectedKeys.has(fitnessMemberKey(member)),
          ).length
          return (
            <WorkflowRosterGroup
              key={team.id || team.name}
              title={team.name}
              countLabel={`${includedCount} of ${team.members.length} included`}
              onIncludeAll={() => setTeamIncluded(team, true)}
              onExcludeAll={() => setTeamIncluded(team, false)}
              includeDisabled={includedCount === team.members.length}
              excludeDisabled={includedCount === 0}
              className="fitness-personnel-card"
            >
              <ResponsiveChoiceSelector
                isMobile={isMobile}
                options={team.members.map((member) => ({
                  value: fitnessMemberKey(member),
                  title: member.name,
                  description: member.role || 'Shift member',
                  icon: Users,
                }))}
                value={[...selectedKeys]}
                onChange={(value) =>
                  toggleMember(
                    team,
                    team.members.find((item) => fitnessMemberKey(item) === value),
                  )
                }
                selectionMode="multi"
                columns={{ xs: 6, md: 4, lg: 3 }}
                variant="compact"
                showDescription
                ariaLabel={`${team.name} members`}
              />
            </WorkflowRosterGroup>
          )
        })}
        {manualParticipants.length ? (
          <section
            className="rounded-3 border p-3 d-grid gap-2"
            aria-labelledby="fitness-manual-participants-title"
          >
            <div id="fitness-manual-participants-title" className="fw-semibold">
              Added participants
            </div>
            {manualParticipants.map((participant) => (
              <div key={participant.id} className="fitness-manual-participant border-top pt-2">
                <div className="fitness-manual-participant__copy">
                  <div className="fw-semibold">{participant.name}</div>
                  <div className="fitness-manual-participant__meta small text-body-secondary">
                    <span>{participant.shift}</span>
                    <span>{participant.role || 'Participant'}</span>
                    <span>Age {participant.ageSnapshot}</span>
                  </div>
                </div>
                <CButton
                  type="button"
                  color="light"
                  size="sm"
                  aria-label={`Remove ${participant.name}`}
                  onClick={() => removeManualParticipant(participant)}
                >
                  <Trash2 size={15} className="text-danger" />
                </CButton>
              </div>
            ))}
          </section>
        ) : null}
      </section>
      <FitnessStageActions
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onContinue={onContinue}
        saveLabel={saveLabel}
        statusMessage={draftStatus}
      />
      <FitnessParticipantModal
        visible={showAddParticipant}
        draft={manualDraft}
        setDraft={(updater) => {
          setManualDraft(updater)
          if (participantError) setParticipantError('')
        }}
        shifts={shiftOptions}
        error={participantError}
        onClose={closeParticipantModal}
        onSave={addManualParticipant}
      />
    </div>
  )
}

export default FitnessTestPersonnelStep
