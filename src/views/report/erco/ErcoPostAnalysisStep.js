import React from 'react'
import { CAlert } from '@coreui/react'
import { sortResponders } from './chronologyUtils'
import { formatErcoLocation, resolveRespondingTeamLabel } from './utils'
import {
  PostIncidentAnalysisSection,
  DetailsStepActions,
  IncidentSummaryPanel,
} from './erco-form-components'

const ErcoPostAnalysisStep = ({
  form,
  fieldErrors,
  setForm,
  pushToast,
  onBack,
  onClear,
  onSaveDraft,
  showIncidentSummary = true,
  showActions = true,
  primaryLabel = 'Submit Report',
}) => {
  const teamLabel = resolveRespondingTeamLabel(form.respondingTeamName, form.respondingAttendance)
  const shiftLabel = String(form.respondingTeamShift || '').trim()
  const selectedResponderNames = sortResponders(
    Array.isArray(form.respondingAttendance) ? form.respondingAttendance : [],
  )
    .filter((row) => row?.present)
    .map((row) => String(row?.name || '').trim())
    .filter(Boolean)
  const respondersSummaryValue =
    selectedResponderNames.length === 0 ? 'None selected' : selectedResponderNames.join(', ')

  const incidentSummaryItems = [
    { label: 'Incident Type', value: String(form.incidentType || '').trim() || '--' },
    { label: 'Weather', value: String(form.weather || '').trim() || '--' },
    { label: 'Area', value: formatErcoLocation(form.location) || '--' },
    { label: 'Incident Date', value: String(form.incidentDate || '').trim() || '--' },
    { label: 'Incident Time', value: String(form.incidentTime || '').trim() || '--' },
    { label: 'Responding Team', value: teamLabel },
    { label: 'Responding Members', value: respondersSummaryValue, fullWidth: true },
  ]

  return (
    <div className="mb-3 d-grid gap-4">
      {showIncidentSummary ? (
        <IncidentSummaryPanel
          teamLabel={teamLabel}
          shiftLabel={shiftLabel}
          incidentSummaryItems={incidentSummaryItems}
        />
      ) : null}

      {fieldErrors.postIncidentStrengths ? (
        <CAlert color="danger" className="mb-0">
          {fieldErrors.postIncidentStrengths}
        </CAlert>
      ) : null}

      <PostIncidentAnalysisSection
        value={form.postIncidentAnalysis}
        onChange={(next) => setForm((prev) => ({ ...prev, postIncidentAnalysis: next }))}
        pushToast={pushToast}
      />

      {showActions ? (
        <DetailsStepActions
          onBack={onBack}
          onClear={onClear}
          onSaveDraft={onSaveDraft}
          primaryLabel={primaryLabel}
        />
      ) : null}
    </div>
  )
}

export default ErcoPostAnalysisStep
