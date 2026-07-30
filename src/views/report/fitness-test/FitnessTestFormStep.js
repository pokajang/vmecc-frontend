import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CFormInput,
  CFormLabel,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { Pencil } from 'lucide-react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import ReportPhotoSection from '../shared/emergency-report/ReportPhotoSection'
import { FITNESS_FIELD_LIMITS } from './constants'
import {
  fitnessResultLabel,
  flattenFitnessParticipants,
  getProficiencyCheckpointSummary,
} from './fitnessFormDomain'
import FitnessParticipantResultSummary from './FitnessParticipantResultSummary'
import FitnessStageActions from './FitnessStageActions'
import FitnessCheckpointControls from './FitnessCheckpointControls'
import FitnessShiftDateTools from './FitnessShiftDateTools'
import { validateFitnessResults } from './validation'

const ResultBadge = ({ value }) => (
  <CBadge color={value === 'pass' ? 'success' : value === 'failed' ? 'danger' : 'secondary'}>
    {fitnessResultLabel(value)}
  </CBadge>
)

const participantResultIssues = (participant) => {
  const issues = []
  const age = Number(participant.ageSnapshot)
  if (!Number.isInteger(age) || age < 18 || age > 100) issues.push('age (18–100)')

  const fitnessFields = [
    ['sitUps', 'sit-ups'],
    ['jumpingJacks', 'jumping jacks'],
    ['pushUps', 'push-ups'],
  ]
  fitnessFields.forEach(([field, label]) => {
    if (
      participant.fitness?.[field] === '' ||
      !Number.isFinite(Number(participant.fitness?.[field]))
    ) {
      issues.push(label)
    }
  })
  if (!participant.fitness?.testedOn) issues.push('fitness test date')

  const checkpointSummary = getProficiencyCheckpointSummary(participant.proficiency)
  Object.entries(checkpointSummary.completion).forEach(([checkpoint, complete]) => {
    if (!complete) issues.push(checkpoint.toUpperCase())
  })
  if (
    participant.proficiency?.durationSeconds === '' ||
    !Number.isFinite(Number(participant.proficiency?.durationSeconds)) ||
    Number(participant.proficiency?.durationSeconds) <= 0
  ) {
    issues.push('combined time')
  }
  if (!participant.proficiency?.testedOn) issues.push('proficiency test date')
  return issues
}

const ResultInputs = ({ participant, mode, update, prefix }) =>
  mode === 'fitness' ? (
    <>
      {[
        ['sitUps', 'Sit-ups'],
        ['jumpingJacks', 'Jumping jacks'],
        ['pushUps', 'Push-ups'],
      ].map(([field, label]) => (
        <div key={field}>
          <CFormLabel htmlFor={`${prefix}-${field}`}>{label}</CFormLabel>
          <CFormInput
            id={`${prefix}-${field}`}
            type="number"
            min="0"
            max={FITNESS_FIELD_LIMITS.count}
            value={participant.fitness[field]}
            onChange={(event) => update({ fitness: { [field]: event.target.value } })}
          />
        </div>
      ))}
      <div>
        <CFormLabel htmlFor={`${prefix}-fitness-date`}>Test date</CFormLabel>
        <CFormInput
          id={`${prefix}-fitness-date`}
          type="date"
          value={participant.fitness.testedOn}
          onChange={(event) => update({ fitness: { testedOn: event.target.value } })}
        />
      </div>
    </>
  ) : (
    <>
      <FitnessCheckpointControls participant={participant} update={update} />
      <div>
        <CFormLabel htmlFor={`${prefix}-duration`}>CP1–CP6 combined time (seconds)</CFormLabel>
        <CFormInput
          id={`${prefix}-duration`}
          type="number"
          min="1"
          max="3599"
          value={participant.proficiency.durationSeconds}
          onChange={(event) => update({ proficiency: { durationSeconds: event.target.value } })}
        />
      </div>
      <div>
        <CFormLabel htmlFor={`${prefix}-proficiency-date`}>Test date</CFormLabel>
        <CFormInput
          id={`${prefix}-proficiency-date`}
          type="date"
          value={participant.proficiency.testedOn}
          onChange={(event) => update({ proficiency: { testedOn: event.target.value } })}
        />
      </div>
    </>
  )

const FitnessTestFormStep = ({
  form,
  setForm,
  fieldErrors,
  clearError,
  updateParticipant,
  applyShiftTestDate,
  onBack,
  onSaveDraft,
  onContinue,
  saveLabel,
  draftStatus,
  pushToast,
  incompleteOnly = false,
  onShowAllResults,
  photoProcessing = false,
  onPhotoProcessingChange,
}) => {
  const [mode, setMode] = useState('fitness')
  const [drawerTarget, setDrawerTarget] = useState(null)
  const [shiftDates, setShiftDates] = useState({})
  const drawerAgeRef = useRef(null)
  const drawerTargetId = drawerTarget?.id
  const participants = useMemo(() => flattenFitnessParticipants(form), [form])
  const visibleParticipants = useMemo(
    () =>
      incompleteOnly
        ? participants.filter((participant) => participantResultIssues(participant).length)
        : participants,
    [incompleteOnly, participants],
  )
  const participantGroups = useMemo(
    () =>
      form.shiftGroups
        .map((group) => ({
          ...group,
          participants: visibleParticipants.filter(
            (participant) => participant.groupId === group.id,
          ),
        }))
        .filter((group) => group.participants.length),
    [form.shiftGroups, visibleParticipants],
  )
  const update = (participant, patch) => {
    updateParticipant(participant.groupId, participant.id, patch)
  }
  const shiftDateKey = (groupId) => `${mode}:${groupId}`
  const applyDateToShift = (groupId) => {
    const testedOn = shiftDates[shiftDateKey(groupId)] || ''
    if (!testedOn) return
    applyShiftTestDate?.(groupId, mode, testedOn)
  }

  useEffect(() => {
    if (fieldErrors.results && validateFitnessResults(form).isValid) clearError('results')
  }, [clearError, fieldErrors.results, form])

  useEffect(() => {
    if (!drawerTargetId) return undefined
    const focusTimer = window.setTimeout(() => drawerAgeRef.current?.focus(), 120)
    return () => window.clearTimeout(focusTimer)
  }, [drawerTargetId, mode])

  return (
    <div className="mb-3 d-grid gap-4" data-fitness-test-field="results">
      <section className="d-grid gap-3">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <h3 className="h6 mb-0">Participant results</h3>
            <CBadge color="light" className="border text-body-secondary">
              Auto-calculated
            </CBadge>
          </div>
          <CButtonGroup role="group" aria-label="Assessment result type">
            <CButton
              type="button"
              color={mode === 'fitness' ? 'primary' : 'light'}
              className="fitness-assessment-mode"
              aria-pressed={mode === 'fitness'}
              onClick={() => setMode('fitness')}
            >
              Fitness
            </CButton>
            <CButton
              type="button"
              color={mode === 'proficiency' ? 'primary' : 'light'}
              className="fitness-assessment-mode"
              aria-pressed={mode === 'proficiency'}
              onClick={() => setMode('proficiency')}
            >
              Proficiency
            </CButton>
          </CButtonGroup>
        </div>
        {incompleteOnly ? (
          <CAlert
            color={visibleParticipants.length ? 'info' : 'success'}
            className="mb-0 d-flex flex-wrap align-items-center justify-content-between gap-2"
          >
            <span>
              {visibleParticipants.length
                ? `Showing ${visibleParticipants.length} participant${visibleParticipants.length === 1 ? '' : 's'} with incomplete fields.`
                : 'All incomplete participant fields are resolved.'}
            </span>
            <CButton type="button" color="light" size="sm" onClick={onShowAllResults}>
              Show all
            </CButton>
          </CAlert>
        ) : null}
        <div className="table-responsive d-none d-md-block">
          <CTable align="middle" bordered small>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell scope="col">Shift / participant</CTableHeaderCell>
                <CTableHeaderCell scope="col">Age</CTableHeaderCell>
                {mode === 'fitness' ? (
                  <>
                    <CTableHeaderCell scope="col">Sit-ups</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Jumping jacks</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Push-ups</CTableHeaderCell>
                  </>
                ) : (
                  <>
                    <CTableHeaderCell scope="col">Checkpoints</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Combined time (sec)</CTableHeaderCell>
                  </>
                )}
                <CTableHeaderCell scope="col">Test date</CTableHeaderCell>
                <CTableHeaderCell scope="col">Result</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {participantGroups.map((group) => (
                <React.Fragment key={group.id}>
                  <CTableRow className="table-light">
                    <CTableHeaderCell colSpan={mode === 'fitness' ? 7 : 6} scope="rowgroup">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <span>{group.shift}</span>
                        <FitnessShiftDateTools
                          compact
                          shift={group.shift}
                          mode={mode}
                          value={shiftDates[shiftDateKey(group.id)] || ''}
                          onChange={(value) =>
                            setShiftDates((current) => ({
                              ...current,
                              [shiftDateKey(group.id)]: value,
                            }))
                          }
                          onApply={() => applyDateToShift(group.id)}
                        />
                      </div>
                    </CTableHeaderCell>
                  </CTableRow>
                  {group.participants.map((participant) => {
                    const assessment = participant[mode]
                    const issues = fieldErrors.results ? participantResultIssues(participant) : []
                    return (
                      <CTableRow key={participant.id} aria-invalid={issues.length > 0 || undefined}>
                        <CTableHeaderCell scope="row">
                          <div>{participant.name}</div>
                          <div className="small text-body-secondary">{participant.shift}</div>
                          {issues.length ? (
                            <div className="small text-danger mt-1" role="alert">
                              Needs: {issues.join(', ')}
                            </div>
                          ) : null}
                        </CTableHeaderCell>
                        <CTableDataCell style={{ minWidth: 90 }}>
                          <CFormInput
                            aria-label={`Age for ${participant.name}`}
                            type="number"
                            min="18"
                            max="100"
                            value={participant.ageSnapshot}
                            onChange={(event) =>
                              update(participant, { ageSnapshot: event.target.value })
                            }
                          />
                        </CTableDataCell>
                        {mode === 'fitness' ? (
                          ['sitUps', 'jumpingJacks', 'pushUps'].map((field) => (
                            <CTableDataCell key={field} style={{ minWidth: 110 }}>
                              <CFormInput
                                aria-label={`${field} for ${participant.name}`}
                                type="number"
                                min="0"
                                max={FITNESS_FIELD_LIMITS.count}
                                value={assessment[field]}
                                onChange={(event) =>
                                  update(participant, { fitness: { [field]: event.target.value } })
                                }
                              />
                            </CTableDataCell>
                          ))
                        ) : (
                          <>
                            <CTableDataCell style={{ minWidth: 245 }}>
                              <FitnessCheckpointControls
                                compact
                                participant={participant}
                                update={(patch) => update(participant, patch)}
                              />
                            </CTableDataCell>
                            <CTableDataCell style={{ minWidth: 150 }}>
                              <CFormInput
                                aria-label={`CP1 through CP6 combined time for ${participant.name}`}
                                type="number"
                                min="1"
                                max="3599"
                                value={assessment.durationSeconds}
                                onChange={(event) =>
                                  update(participant, {
                                    proficiency: { durationSeconds: event.target.value },
                                  })
                                }
                              />
                            </CTableDataCell>
                          </>
                        )}
                        <CTableDataCell style={{ minWidth: 155 }}>
                          <CFormInput
                            aria-label={`${mode} test date for ${participant.name}`}
                            type="date"
                            value={assessment.testedOn}
                            onChange={(event) =>
                              update(participant, { [mode]: { testedOn: event.target.value } })
                            }
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <ResultBadge value={assessment.result} />
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </React.Fragment>
              ))}
            </CTableBody>
          </CTable>
        </div>

        <div className="d-grid gap-2 d-md-none">
          {participantGroups.map((group) => (
            <section key={group.id} className="rounded-3 border p-3 d-grid gap-3">
              <div className="d-grid gap-2">
                <div className="fw-semibold">{group.shift}</div>
                <FitnessShiftDateTools
                  shift={group.shift}
                  mode={mode}
                  value={shiftDates[shiftDateKey(group.id)] || ''}
                  onChange={(value) =>
                    setShiftDates((current) => ({
                      ...current,
                      [shiftDateKey(group.id)]: value,
                    }))
                  }
                  onApply={() => applyDateToShift(group.id)}
                />
              </div>
              {group.participants.map((participant) => {
                const assessment = participant[mode]
                const issues = fieldErrors.results ? participantResultIssues(participant) : []
                return (
                  <div
                    key={participant.id}
                    className="fitness-result-card border-top pt-3 d-grid gap-2"
                    aria-invalid={issues.length > 0 || undefined}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <div className="fw-semibold">{participant.name}</div>
                        <div className="small text-body-secondary">
                          Age {participant.ageSnapshot || '--'}
                        </div>
                        {issues.length ? (
                          <div className="small text-danger mt-1" role="alert">
                            Needs: {issues.join(', ')}
                          </div>
                        ) : null}
                      </div>
                      <CButton
                        type="button"
                        color="light"
                        className="fitness-result-edit"
                        aria-label={`Edit ${mode} result for ${participant.name}`}
                        onClick={() => setDrawerTarget(participant)}
                      >
                        <Pencil size={16} />
                      </CButton>
                    </div>
                    <div className="d-flex justify-content-between align-items-end gap-3">
                      <FitnessParticipantResultSummary assessment={assessment} mode={mode} />
                      <ResultBadge value={assessment.result} />
                    </div>
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      </section>

      <ReportPhotoSection
        moduleKey="fitness-test"
        title="Fitness test photographs"
        photos={form.photos}
        onChange={(photos) => setForm((previous) => ({ ...previous, photos }))}
        pushToast={pushToast}
        allowCapture={false}
        onProcessingChange={onPhotoProcessingChange}
        emptyMessage=""
        descriptionMaxLength={2000}
      />

      <FitnessStageActions
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onContinue={onContinue}
        saveLabel={saveLabel}
        statusMessage={photoProcessing ? 'Uploading fitness test photo…' : draftStatus}
        disabled={photoProcessing}
      />

      <MobileBottomDrawer
        visible={Boolean(drawerTarget)}
        title={
          drawerTarget
            ? `${drawerTarget.name} · ${mode === 'fitness' ? 'Fitness' : 'Proficiency'}`
            : 'Edit result'
        }
        onClose={() => setDrawerTarget(null)}
      >
        {drawerTarget ? (
          <div className="fitness-result-drawer d-grid gap-3">
            {fieldErrors.results && participantResultIssues(drawerTarget).length ? (
              <CAlert color="danger" className="mb-0">
                Needs: {participantResultIssues(drawerTarget).join(', ')}
              </CAlert>
            ) : null}
            <div>
              <CFormLabel htmlFor="fitness-mobile-age">Age</CFormLabel>
              <CFormInput
                ref={drawerAgeRef}
                id="fitness-mobile-age"
                type="number"
                min="18"
                max="100"
                value={drawerTarget.ageSnapshot}
                onChange={(event) => {
                  update(drawerTarget, { ageSnapshot: event.target.value })
                  setDrawerTarget((current) => ({ ...current, ageSnapshot: event.target.value }))
                }}
              />
            </div>
            <ResultInputs
              participant={drawerTarget}
              mode={mode}
              prefix="fitness-mobile"
              update={(patch) => {
                update(drawerTarget, patch)
                setDrawerTarget((current) => ({
                  ...current,
                  ...patch,
                  fitness: { ...current.fitness, ...(patch.fitness || {}) },
                  proficiency: {
                    ...current.proficiency,
                    ...(patch.proficiency || {}),
                    checkpointCompletion: {
                      ...current.proficiency?.checkpointCompletion,
                      ...patch.proficiency?.checkpointCompletion,
                    },
                  },
                }))
              }}
            />
            <div className="fitness-result-drawer__footer">
              <CButton
                type="button"
                color="primary"
                className="w-100"
                onClick={() => setDrawerTarget(null)}
              >
                Done
              </CButton>
            </div>
          </div>
        ) : null}
      </MobileBottomDrawer>
    </div>
  )
}

export default FitnessTestFormStep
