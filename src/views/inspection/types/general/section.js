import React from 'react'
import { ChipRow } from 'src/views/inspection/components/InspectionFormDisplaySections'

const text = (value) => String(value || '').trim()

const ReadOnlyChip = ({ label }) => (
  <span className="inspection-helper-chip btn btn-sm btn-light border active pe-none">{label}</span>
)

export const GeneralReadOnlySection = ({ form, summary }) => {
  const visibleChecks = Array.isArray(summary?.visibleChecks) ? summary.visibleChecks : []
  const description = text(summary?.description || form?.description)

  if (visibleChecks.length === 0 && !description) return null

  return (
    <div className="inspection-form-section d-grid gap-4">
      {visibleChecks.length > 0 ? (
        <div className="d-grid gap-3">
          <div className="fw-semibold text-muted">Quick Checks</div>
          <ChipRow>
            {visibleChecks.map((item) => (
              <ReadOnlyChip key={item.id || item.label} label={item.label} />
            ))}
          </ChipRow>
        </div>
      ) : null}

      {description ? (
        <div className="d-grid gap-3">
          <div className="fw-semibold text-muted">Describe</div>
          <div className="rounded-3 border bg-light-subtle p-3" style={{ whiteSpace: 'pre-wrap' }}>
            {description}
          </div>
        </div>
      ) : null}
    </div>
  )
}
