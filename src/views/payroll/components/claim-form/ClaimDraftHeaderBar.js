import React from 'react'
import { CBadge } from '@coreui/react'

const ClaimDraftHeaderBar = ({ activeDraftId }) =>
  activeDraftId ? (
    <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-2">
      <CBadge color="info">Editing Draft</CBadge>
      <span className="text-body-secondary small">Draft ID: {activeDraftId}</span>
    </div>
  ) : null

export default ClaimDraftHeaderBar
