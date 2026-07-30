import React from 'react'
import { CButton } from '@coreui/react'
import { Trash2 } from 'lucide-react'

const MobileWorkflowDraftCard = ({
  ariaLabel,
  summary = '',
  savedLabel,
  syncStatus = '',
  onContinue,
  onDelete,
}) => {
  const hasPendingSync = syncStatus && syncStatus !== 'synced'

  return (
    <div className="mobile-workflow-home__draft-list list-group list-group-flush overflow-hidden border rounded-3">
      <article className="mobile-workflow-draft-card list-group-item p-3 bg-body">
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
            {hasPendingSync ? (
              <span className="small text-warning-emphasis">Sync pending</span>
            ) : null}
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
