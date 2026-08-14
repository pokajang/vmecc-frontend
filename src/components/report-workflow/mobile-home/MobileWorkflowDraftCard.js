import React from 'react'
import { CButton } from '@coreui/react'
import { Trash2 } from 'lucide-react'

const MobileWorkflowDraftCard = ({ ariaLabel, summary = '', savedLabel, onContinue, onDelete }) => {
  return (
    <div className="mobile-workflow-home__draft-list">
      <article className="mobile-workflow-draft-card">
        <div className="mobile-workflow-draft-card__grid">
          <button
            type="button"
            className="mobile-workflow-draft-card__open"
            aria-label={ariaLabel}
            onClick={onContinue}
          >
            <span className="mobile-workflow-draft-card__eyebrow">Draft in progress</span>
            <span className="mobile-workflow-draft-card__summary small text-body-secondary">
              <span className="mobile-workflow-draft-card__action">Continue Draft</span>
              {summary ? (
                <span className="mobile-workflow-draft-card__summary-detail"> {summary}</span>
              ) : null}
            </span>
            <span className="mobile-workflow-draft-card__date small text-body-secondary">
              {savedLabel}
            </span>
          </button>
          <div className="mobile-workflow-draft-card__meta">
            <CButton
              type="button"
              color="link"
              size="sm"
              className="mobile-workflow-draft-card__delete p-1 text-danger shadow-none border-0"
              aria-label="Delete draft"
              onClick={onDelete}
            >
              <Trash2 size={15} aria-hidden="true" />
            </CButton>
          </div>
        </div>
      </article>
    </div>
  )
}

export default MobileWorkflowDraftCard
