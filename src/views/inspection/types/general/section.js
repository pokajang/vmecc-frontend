import React from 'react'
import { normalizeInspectionIssues } from '../inspectionIssues'

const text = (value) => String(value || '').trim()

export const GeneralReadOnlySection = ({ form }) => {
  const findings = normalizeInspectionIssues(form?.inspectionIssues || form?.issues)

  if (findings.length === 0) return null

  return (
    <div className="inspection-form-section d-grid gap-4">
      {findings.length > 0 ? (
        <div className="d-grid gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="fw-semibold text-muted">Findings</div>
          </div>
          {findings.map((issue, index) => (
            <div className="inspection-finding-card" key={issue.id}>
              <div className="inspection-finding-card__content d-grid gap-2">
                {text(issue.description) ? (
                  <div className="fw-semibold" style={{ whiteSpace: 'pre-wrap' }}>
                    {index + 1}. {issue.description}
                  </div>
                ) : null}
                {text(issue.actionRequired) ? (
                  <div>
                    <div className="small text-muted">Action required</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{issue.actionRequired}</div>
                  </div>
                ) : null}
                {issue.photos.length > 0 ? (
                  <div className="small text-body-secondary">
                    {issue.photos.length} finding photo
                    {issue.photos.length === 1 ? '' : 's'} attached
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
