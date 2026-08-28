import React from 'react'
const ClaimDraftHeaderBar = ({ activeDraftId }) =>
  activeDraftId ? (
    <div className="small text-body-secondary" data-testid="payroll-claim-draft-panel">
      Editing saved draft
    </div>
  ) : null

export default ClaimDraftHeaderBar
