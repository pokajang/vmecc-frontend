import React from 'react'
import { CButton, CFormTextarea } from '@coreui/react'
import { Sparkles } from 'lucide-react'

const AI_BUTTON_STYLE = {
  backgroundColor: 'rgba(0, 126, 122, 0.14)',
  borderColor: 'rgba(0, 126, 122, 0.32)',
  color: 'rgba(0, 126, 122, 0.95)',
}

const IncidentSummaryTextarea = ({ value, invalid, onChange, onGenerate, isGenerating }) => (
  <div className="d-grid gap-2">
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div className="fw-semibold" style={{ minWidth: 0 }}>
        Summary of Emergency / Incident
      </div>
      <CButton
        type="button"
        color="light"
        size="sm"
        className="d-inline-flex align-items-center gap-2"
        style={AI_BUTTON_STYLE}
        onClick={onGenerate}
        disabled={Boolean(isGenerating)}
        aria-label={isGenerating ? 'Generating AI summary' : 'Generate AI summary'}
      >
        <Sparkles size={14} />
        <span className="d-none d-sm-inline">
          {isGenerating ? 'Generating...' : 'Generate AI Summary'}
        </span>
      </CButton>
    </div>
    <CFormTextarea rows={4} value={value} invalid={invalid} onChange={onChange} />
  </div>
)

export default IncidentSummaryTextarea
