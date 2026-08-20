import React from 'react'
import { CButton, CFormFeedback, CFormLabel, CFormTextarea } from '@coreui/react'
import { Sparkles } from 'lucide-react'

const IncidentSummaryTextarea = ({
  value,
  invalid,
  error = '',
  onChange,
  onGenerate,
  isGenerating,
}) => {
  const hasSummary = Boolean(String(value || '').trim())
  const generateLabel = hasSummary ? 'Improve Summary with AI' : 'Generate AI Summary'

  return (
    <div className="d-grid gap-2" data-erco-field="summary">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <CFormLabel
          htmlFor="erco-incident-summary"
          className="fw-semibold text-muted mb-0"
          style={{ minWidth: 0 }}
        >
          Summary of Emergency / Incident
        </CFormLabel>
        <div className="d-flex flex-wrap gap-2">
          <CButton
            type="button"
            color="link"
            size="sm"
            className="erco-icon-action d-inline-flex align-items-center gap-2 p-1 border-0 bg-transparent shadow-none text-primary fw-semibold"
            onClick={onGenerate}
            disabled={Boolean(isGenerating)}
            aria-label={isGenerating ? 'Generating AI summary' : generateLabel}
          >
            <Sparkles size={20} aria-hidden="true" />
            <span className="d-none d-sm-inline">
              {isGenerating ? 'Generating...' : generateLabel}
            </span>
          </CButton>
        </div>
      </div>
      <CFormTextarea
        id="erco-incident-summary"
        rows={4}
        maxLength={20000}
        value={value ?? ''}
        invalid={invalid}
        aria-describedby={invalid ? 'erco-incident-summary-error' : undefined}
        onChange={onChange}
      />
      <CFormFeedback id="erco-incident-summary-error" invalid>
        {error}
      </CFormFeedback>
    </div>
  )
}

export default IncidentSummaryTextarea
