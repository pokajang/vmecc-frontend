import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import StaffSelect from 'src/components/staff/StaffSelect'
import { fetchTeams } from 'src/services/apiClient'
import FitnessCompletionSummary from './FitnessCompletionSummary'
import { getFitnessCompletionSummary } from './fitnessFormDomain'
import { normalizeFitnessTeams } from './fitnessTeamDomain'
import FitnessStageActions from './FitnessStageActions'

const FitnessTestSignoffStep = ({
  form,
  user,
  fieldErrors,
  clearError,
  setForm,
  setShiftAssessor,
  onBack,
  onReviewIncomplete,
  submitLabel,
  isSaving = false,
}) => {
  const summary = getFitnessCompletionSummary(form)
  const [staffOptions, setStaffOptions] = useState([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [staffError, setStaffError] = useState('')
  const [externalAssessors, setExternalAssessors] = useState({})

  useEffect(() => {
    let cancelled = false
    fetchTeams()
      .then((response) => {
        if (cancelled) return
        const options = normalizeFitnessTeams(response)
          .flatMap((team) =>
            team.members.map((member) => ({
              key: `id:${member.memberId}`,
              id: member.memberId,
              name: member.name,
              team: team.name,
              isActive: true,
            })),
          )
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
        setStaffOptions(options)
      })
      .catch(() => {
        if (!cancelled)
          setStaffError('The staff directory is unavailable. External entry remains available.')
      })
      .finally(() => {
        if (!cancelled) setStaffLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const optionsByName = useMemo(
    () =>
      new Map(staffOptions.map((option) => [String(option.name).trim().toLowerCase(), option.key])),
    [staffOptions],
  )
  const updateAssessor = (groupId, assessor) => {
    setShiftAssessor(groupId, assessor)
    const allAssessorsComplete = form.shiftGroups.every((group) => {
      if (!group.participants.length) return true
      const name = group.id === groupId ? assessor?.name : group.assessor?.name
      return Boolean(String(name || '').trim())
    })
    if (allAssessorsComplete) clearError('assessors')
  }

  return (
    <div className="mb-3 d-grid gap-4">
      <section className="d-grid gap-3" aria-labelledby="fitness-completion-title">
        <h3 id="fitness-completion-title" className="h6 mb-0">
          Completion summary
        </h3>
        <FitnessCompletionSummary
          summary={summary}
          onReviewIncomplete={summary.incompleteAssessments ? onReviewIncomplete : undefined}
        />
      </section>

      <section className="d-grid gap-3" data-fitness-test-field="assessors">
        <h3 className="h6 mb-0">Shift assessors</h3>
        {staffError ? <CAlert color="warning">{staffError}</CAlert> : null}
        <CRow className="g-3">
          {form.shiftGroups.map((group) => {
            const selectedKey = group.assessor?.userId
              ? `id:${group.assessor.userId}`
              : optionsByName.get(
                  String(group.assessor?.name || '')
                    .trim()
                    .toLowerCase(),
                ) || ''
            const isExternal =
              externalAssessors[group.id] ??
              (!staffLoading && Boolean(group.assessor?.name) && !selectedKey)
            const assessorMissing =
              Boolean(fieldErrors.assessors) &&
              Boolean(group.participants.length) &&
              !String(group.assessor?.name || '').trim()
            const errorId = `fitness-assessor-${group.id}-error`
            return (
              <CCol key={group.id} xs={12} md={6}>
                <div
                  role="group"
                  aria-describedby={assessorMissing ? errorId : undefined}
                  data-invalid={assessorMissing || undefined}
                >
                  <CFormLabel htmlFor={`fitness-assessor-${group.id}`}>
                    {group.shift} assessor
                  </CFormLabel>
                  {isExternal ? (
                    <CFormInput
                      id={`fitness-assessor-${group.id}`}
                      maxLength={190}
                      value={group.assessor?.name || ''}
                      placeholder="Enter external assessor name"
                      invalid={assessorMissing}
                      onChange={(event) =>
                        updateAssessor(group.id, { userId: '', name: event.target.value })
                      }
                    />
                  ) : (
                    <StaffSelect
                      inputId={`fitness-assessor-${group.id}`}
                      value={selectedKey}
                      options={staffOptions}
                      isLoading={staffLoading}
                      placeholder="Search staff directory"
                      onChange={(_, option) =>
                        updateAssessor(group.id, {
                          userId: option?.id || '',
                          name: option?.name || '',
                        })
                      }
                    />
                  )}
                  {assessorMissing ? (
                    <div id={errorId} className="invalid-feedback d-block" role="alert">
                      {group.shift} assessor is required.
                    </div>
                  ) : null}
                  <CFormCheck
                    id={`fitness-assessor-external-${group.id}`}
                    className="mt-2"
                    label="Assessor is external"
                    checked={isExternal}
                    onChange={(event) => {
                      const nextExternal = event.target.checked
                      setExternalAssessors((current) => ({ ...current, [group.id]: nextExternal }))
                      updateAssessor(group.id, {
                        userId: '',
                        name: nextExternal ? group.assessor?.name || '' : '',
                      })
                    }}
                  />
                </div>
              </CCol>
            )
          })}
        </CRow>
      </section>

      <section className="d-grid gap-3">
        <div className="fw-semibold">Report signoff</div>
        <CRow className="g-3">
          <CCol xs={12} md={6}>
            <div className="small text-body-secondary">Prepared by</div>
            <div className="fw-semibold">{user?.name || user?.email || 'Current user'}</div>
          </CCol>
          <CCol xs={12} md={6}>
            <div className="small text-body-secondary">Verified by</div>
            <div className="fw-semibold">Assigned during review</div>
          </CCol>
        </CRow>
        <div>
          <CFormLabel htmlFor="fitness-notes">Notes (optional)</CFormLabel>
          <CFormTextarea
            id="fitness-notes"
            rows={3}
            maxLength={4000}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </div>
      </section>

      <FitnessStageActions
        onBack={onBack}
        continueLabel={submitLabel}
        primaryType="submit"
        isSaving={isSaving}
      />
    </div>
  )
}

export default FitnessTestSignoffStep
