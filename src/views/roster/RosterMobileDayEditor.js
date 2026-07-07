import React, { useState } from 'react'
import {
  CButton,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
} from '@coreui/react'

const RosterMobileDayEditor = ({
  visible = false,
  row = null,
  shiftDef = null,
  currentTeamId = null,
  teams = [],
  onAssign,
  onClose,
}) => {
  const strVal = currentTeamId !== undefined && currentTeamId !== null ? String(currentTeamId) : ''
  const [selectedTeamId, setSelectedTeamId] = useState(strVal)
  const isOrphaned = strVal && !teams.some((team) => String(team.id) === strVal)

  const handleApply = () => {
    if (!row?.date || !shiftDef?.slug) return
    onAssign?.(row.date, shiftDef.slug, selectedTeamId || null)
    onClose?.()
  }

  return (
    <COffcanvas
      placement="bottom"
      visible={visible}
      onHide={onClose}
      className="d-md-none"
      data-testid="roster-management-mobile-editor"
    >
      <COffcanvasHeader>
        <COffcanvasTitle>
          {shiftDef?.name || 'Shift'} - {row?.date || '-'}
        </COffcanvasTitle>
      </COffcanvasHeader>
      <COffcanvasBody>
        <div className="d-grid gap-3">
          <div>
            <label className="form-label small fw-semibold" htmlFor="roster-mobile-team-select">
              Team
            </label>
            <select
              id="roster-mobile-team-select"
              aria-label={`Assign ${row?.date || ''} ${shiftDef?.name || 'shift'}`}
              className="form-select"
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
              style={{
                border: isOrphaned ? '1px solid var(--cui-danger)' : undefined,
              }}
            >
              <option value="">Unassigned</option>
              {isOrphaned ? (
                <option value={strVal} disabled>
                  (deleted team)
                </option>
              ) : null}
              {teams.map((team) => (
                <option key={team.id} value={String(team.id)}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div className="d-flex flex-wrap justify-content-end gap-2">
            <CButton color="light" onClick={onClose}>
              Cancel
            </CButton>
            <CButton color="primary" onClick={handleApply}>
              Apply
            </CButton>
          </div>
        </div>
      </COffcanvasBody>
    </COffcanvas>
  )
}

export default RosterMobileDayEditor
