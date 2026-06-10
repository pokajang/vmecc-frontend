import React from 'react'
import { CBadge, CCol, CRow } from '@coreui/react'

const IncidentSummaryPanel = ({ teamLabel, shiftLabel, incidentSummaryItems }) => (
  <div className="d-grid gap-2" style={{ minWidth: 0 }}>
    <div className="d-flex align-items-center justify-content-between gap-2">
      <div className="fw-semibold flex-shrink-0">Incident Summary</div>
      <div className="d-flex align-items-center gap-2 flex-wrap" style={{ minWidth: 0 }}>
        <CBadge
          color="light"
          className="border text-body-secondary d-inline-flex align-items-center gap-1"
          style={{ maxWidth: '100%', minWidth: 0 }}
          title={`Team on Shift During Incident: ${teamLabel}`}
        >
          <span className="flex-shrink-0">Team:</span>
          <span className="text-truncate" style={{ minWidth: 0 }}>
            {teamLabel}
          </span>
        </CBadge>
        {shiftLabel ? (
          <CBadge
            color="light"
            className="border text-body-secondary text-truncate"
            style={{ maxWidth: '100%' }}
          >
            Shift: {shiftLabel}
          </CBadge>
        ) : null}
      </div>
    </div>
    <div className="rounded-3 border p-3 p-md-4">
      <CRow className="g-3">
        {incidentSummaryItems.map((item) => (
          <CCol key={item.label} xs={item.fullWidth ? 12 : 6} md={item.fullWidth ? 12 : undefined}>
            <div className="small text-body-secondary">{item.label}</div>
            <div
              className={item.fullWidth ? 'fw-semibold' : 'fw-semibold text-truncate'}
              style={{ minWidth: 0, overflowWrap: item.fullWidth ? 'anywhere' : undefined }}
              title={item.fullWidth ? item.value : undefined}
            >
              {item.value}
            </div>
          </CCol>
        ))}
      </CRow>
    </div>
  </div>
)

export default IncidentSummaryPanel
