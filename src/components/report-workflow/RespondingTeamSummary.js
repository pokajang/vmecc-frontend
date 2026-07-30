import React from 'react'
import { CButton, CRow } from '@coreui/react'
import { DetailField } from './ReportViewComponents'

const text = (value) => String(value || '').trim()

const RespondingTeamSummary = ({ respondingTeam, isDrill = false, onEdit, variant = 'detail' }) => {
  if (!respondingTeam) return null

  const attendance = (
    Array.isArray(respondingTeam.attendance) ? respondingTeam.attendance : []
  ).filter((member) => text(member?.name))
  if (!text(respondingTeam.name) && !text(respondingTeam.shift) && !attendance.length) return null

  const title = isDrill ? 'Exercise Personnel' : 'Responding Team'
  const isReview = variant === 'review'

  return (
    <section
      className={
        isReview ? 'inspection-review-section d-grid gap-3' : 'inspection-form-section d-grid gap-3'
      }
    >
      <div className="d-flex justify-content-between align-items-center gap-2">
        <div className={isReview ? 'inspection-review-section__title' : 'fw-semibold text-muted'}>
          {title}
        </div>
        {typeof onEdit === 'function' ? (
          <CButton type="button" color="link" size="sm" className="p-0" onClick={onEdit}>
            Edit
          </CButton>
        ) : null}
      </div>

      <CRow className="g-3">
        <DetailField label="Team">{respondingTeam.name || '--'}</DetailField>
        {respondingTeam.shift ? (
          <DetailField label="Shift">{respondingTeam.shift}</DetailField>
        ) : null}
      </CRow>

      {attendance.length ? (
        <div>
          <div className="small text-body-secondary mb-1">Attending members</div>
          <ul className="responding-team-members list-unstyled mb-0">
            {attendance.map((member, index) => {
              const role = text(member.role)
              const exerciseRole = text(member.exerciseRole)
              const displayName = `${member.name}${role ? ` - ${role}` : ''}${
                exerciseRole ? ` (${exerciseRole})` : ''
              }`
              return (
                <li key={member.memberId || `${member.name}-${index}`}>
                  <span className="responding-team-members__name">{displayName}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

export default RespondingTeamSummary
