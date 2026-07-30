import React from 'react'
import WorkflowSummaryList from 'src/components/report-workflow/WorkflowSummaryList'
import { formatDateTime } from 'src/views/report/utils'
import { sortResponders } from '../chronologyUtils'
import { formatErcoLocation, resolveRespondingTeamLabel } from '../utils'

const EMPTY_VALUE = '--'

export const buildIncidentSummaryItems = (form = {}) => {
  const attendanceRows = Array.isArray(form.respondingAttendance) ? form.respondingAttendance : []
  const responderNames = sortResponders(attendanceRows)
    .filter((row) => row?.present)
    .map((row) => String(row?.name || '').trim())
    .filter(Boolean)
  const teamLabel = resolveRespondingTeamLabel(form.respondingTeamName, attendanceRows)
  const shiftLabel = String(form.respondingTeamShift || '').trim()

  return [
    {
      key: 'incident-type',
      label: 'Incident Type',
      value: String(form.incidentType || '').trim() || EMPTY_VALUE,
    },
    {
      key: 'area',
      label: 'Area',
      value: formatErcoLocation(form.location) || EMPTY_VALUE,
    },
    {
      key: 'weather',
      label: 'Weather',
      value: String(form.weather || '').trim() || EMPTY_VALUE,
    },
    {
      key: 'date-time',
      label: 'Date & Time',
      value: formatDateTime(
        String(form.incidentDate || form.reportDate || '').trim(),
        String(form.incidentTime || form.reportTime || '').trim(),
      ),
    },
    {
      key: 'responding-team',
      label: 'Responding Team',
      value: teamLabel,
      meta: shiftLabel,
      fullWidth: true,
    },
    {
      key: 'responding-members',
      label: 'Responding Members',
      value: responderNames.length > 0 ? responderNames.join(', ') : 'None selected',
      fullWidth: true,
    },
  ]
}

const IncidentSummaryPanel = ({ form }) => (
  <WorkflowSummaryList
    title="Incident Summary"
    items={buildIncidentSummaryItems(form)}
    variant="detail"
  />
)

export default IncidentSummaryPanel
