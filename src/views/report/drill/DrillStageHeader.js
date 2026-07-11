import React from 'react'
import { CButton, CProgress, CProgressBar } from '@coreui/react'
import { DRILL_NEW_SECTIONS, DRILL_SECTION_LABELS } from './constants'

const DrillStageHeader = ({ activeSection, onNavigate }) => {
  const index = Math.max(0, DRILL_NEW_SECTIONS.indexOf(activeSection))
  const percent = ((index + 1) / DRILL_NEW_SECTIONS.length) * 100

  return (
    <section className="d-grid gap-2 mb-4" aria-label="Drill report progress">
      <div className="d-flex justify-content-between align-items-baseline gap-3">
        <h2 className="h5 mb-0">{DRILL_SECTION_LABELS[activeSection] || 'Drill Report'}</h2>
        <span className="small text-body-secondary">
          Step {index + 1} of {DRILL_NEW_SECTIONS.length}
        </span>
      </div>
      <CProgress height={6} aria-label={`Step ${index + 1} of ${DRILL_NEW_SECTIONS.length}`}>
        <CProgressBar value={percent} />
      </CProgress>
      <div className="d-none d-md-flex flex-wrap gap-3 small text-body-secondary">
        {DRILL_NEW_SECTIONS.map((section, sectionIndex) => (
          <CButton
            key={section}
            type="button"
            color="link"
            size="sm"
            className={`p-0 text-decoration-none ${
              section === activeSection ? 'fw-semibold text-primary' : 'text-body-secondary'
            }`}
            aria-current={section === activeSection ? 'step' : undefined}
            onClick={() => onNavigate?.(section)}
          >
            {sectionIndex + 1}. {DRILL_SECTION_LABELS[section]}
          </CButton>
        ))}
      </div>
    </section>
  )
}

export default DrillStageHeader
