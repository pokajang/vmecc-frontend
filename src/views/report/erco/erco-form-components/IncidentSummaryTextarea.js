import React from 'react'
import { CButton, CFormFeedback, CFormLabel, CFormTextarea } from '@coreui/react'
import { ClipboardCheck, Sparkles } from 'lucide-react'

const AI_BUTTON_STYLE = {
  backgroundColor: 'rgba(0, 126, 122, 0.14)',
  borderColor: 'rgba(0, 126, 122, 0.32)',
  color: 'rgba(0, 126, 122, 0.95)',
}

const IncidentSummaryTextarea = ({
  value,
  invalid,
  error = '',
  onChange,
  onGenerate,
  onReview,
  isGenerating,
  isReviewing,
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
            color="light"
            size="sm"
            className="inspection-compact-action-btn d-inline-flex align-items-center gap-2"
            onClick={onReview}
            disabled={Boolean(isReviewing)}
            aria-label={isReviewing ? 'Checking report with AI' : 'Check report with AI'}
          >
            <ClipboardCheck size={14} />
            <span className="d-none d-sm-inline">
              {isReviewing ? 'Checking...' : 'Check with AI'}
            </span>
          </CButton>
          <CButton
            type="button"
            color="light"
            size="sm"
            className="inspection-compact-action-btn d-inline-flex align-items-center gap-2"
            style={AI_BUTTON_STYLE}
            onClick={onGenerate}
            disabled={Boolean(isGenerating)}
            aria-label={isGenerating ? 'Generating AI summary' : generateLabel}
          >
            <Sparkles size={14} />
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
        value={value}
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
