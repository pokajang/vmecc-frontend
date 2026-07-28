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
import { getFitnessCompletionSummary } from './fitnessFormDomain'
import { normalizeFitnessTeams } from './fitnessTeamDomain'
import FitnessStageActions from './FitnessStageActions'

const Metric = ({ label, value }) => (
  <CCol xs={6} md={3}>
    <div className="rounded-3 border p-3 h-100">
      <div className="small text-body-secondary">{label}</div>
      <div className="fs-5 fw-semibold">{value}</div>
    </div>
  </CCol>
)

const FitnessTestSignoffStep = ({
  form,
  user,
  fieldErrors,
  clearError,
  setForm,
  setShiftAssessor,
  onBack,
  onSaveDraft,
  saveLabel,
  submitLabel,
  draftStatus,
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
  return (
    <div className="mb-3 d-grid gap-4">
      <section className="d-grid gap-3" aria-labelledby="fitness-completion-title">
        <div>
          <h3 id="fitness-completion-title" className="h6 mb-1">
            Completion summary
          </h3>
          <p className="small text-body-secondary mb-0">
            Check the calculated results before sending the report for review.
          </p>
        </div>
        <CRow className="g-2">
          <Metric label="Personnel" value={summary.participants} />
          <Metric label="Passed assessments" value={summary.passedAssessments} />
          <Metric label="Failed assessments" value={summary.failedAssessments} />
          <Metric label="Incomplete" value={summary.incompleteAssessments} />
        </CRow>
      </section>

      <section className="d-grid gap-3" data-fitness-test-field="assessors">
        <div>
          <h3 className="h6 mb-1">Shift assessors</h3>
          <p className="small text-body-secondary mb-0">
            Record the assessor responsible for each participating shift.
          </p>
        </div>
        {fieldErrors.assessors ? <CAlert color="danger">{fieldErrors.assessors}</CAlert> : null}
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
            return (
              <CCol key={group.id} xs={12} md={6}>
                <CFormLabel htmlFor={`fitness-assessor-${group.id}`}>
                  {group.shift} assessor
                </CFormLabel>
                {isExternal ? (
                  <CFormInput
                    id={`fitness-assessor-${group.id}`}
                    maxLength={190}
                    value={group.assessor?.name || ''}
                    placeholder="Enter external assessor name"
                    onChange={(event) => {
                      setShiftAssessor(group.id, { userId: '', name: event.target.value })
                      clearError('assessors')
                    }}
                  />
                ) : (
                  <StaffSelect
                    inputId={`fitness-assessor-${group.id}`}
                    value={selectedKey}
                    options={staffOptions}
                    isLoading={staffLoading}
                    placeholder="Search staff directory"
                    onChange={(_, option) => {
                      setShiftAssessor(group.id, {
                        userId: option?.id || '',
                        name: option?.name || '',
                      })
                      clearError('assessors')
                    }}
                  />
                )}
                <CFormCheck
                  id={`fitness-assessor-external-${group.id}`}
                  className="mt-2"
                  label="Assessor is external"
                  checked={isExternal}
                  onChange={(event) => {
                    const nextExternal = event.target.checked
                    setExternalAssessors((current) => ({ ...current, [group.id]: nextExternal }))
                    setShiftAssessor(group.id, {
                      userId: '',
                      name: nextExternal ? group.assessor?.name || '' : '',
                    })
                    clearError('assessors')
                  }}
                />
              </CCol>
            )
          })}
        </CRow>
      </section>

      <section className="rounded-3 border p-3 d-grid gap-3">
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
        onSaveDraft={onSaveDraft}
        saveLabel={saveLabel}
        continueLabel={submitLabel}
        statusMessage={draftStatus}
        primaryType="submit"
      />
    </div>
  )
}

export default FitnessTestSignoffStep
