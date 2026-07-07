import React from 'react'
import { CAlert, CBadge, CButton, CRow } from '@coreui/react'
import {
  INSPECTION_TYPE_DEFINITIONS,
  getInspectionTypeDefinition,
} from '../app/inspectionTypeRegistry'
import { formatTimestamp } from '../domain/utils/inspectionSharedUtils'
import { DetailField } from 'src/components/report-workflow/ReportViewComponents'
import {
  formatInspectionRole,
  isGeneralInspectionType,
  recordToInspectionForm,
} from '../form/inspectionFormHelpers'
import {
  ChipRow,
  InspectionGeneralEvidenceCard,
  InspectionReadOnlyLocationSections,
  InspectionSelectedTypeCard,
  formatInspectionDisplayLocationTitle,
} from '../form/components/InspectionFormDisplaySections'

const hasStructuredSummaryContent = (summary) =>
  summary?.hasContent === true ||
  (Array.isArray(summary?.visibleChecks)
    ? summary.visibleChecks.length > 0
    : Array.isArray(summary?.visibleSections)
      ? summary.visibleSections.some(
          (section) => Array.isArray(section?.visibleRows) && section.visibleRows.length > 0,
        )
      : Array.isArray(summary?.visibleGroups)
        ? summary.visibleGroups.some((group) => Array.isArray(group?.rows) && group.rows.length > 0)
        : Array.isArray(summary?.visibleDailySections) ||
            Array.isArray(summary?.visibleOneOffSections)
          ? [
              ...(summary?.visibleDailySections || []),
              ...(summary?.visibleOneOffSections || []),
            ].some(
              (section) => Array.isArray(section?.visibleRows) && section.visibleRows.length > 0,
            )
          : false)

const hasRows = (value) => Array.isArray(value) && value.length > 0

const getFirstRowValue = (rows = [], fields = []) => {
  const row = (Array.isArray(rows) ? rows : []).find((item) => item && typeof item === 'object')
  if (!row) return ''
  const field = fields.find((key) => String(row?.[key] || '').trim())
  return field ? String(row[field] || '').trim() : ''
}

const withStructuredDetailFallbacks = (form = {}, record = {}) => {
  const source = { ...form, ...record }
  const highAngleChecks = hasRows(form.highAngleChecks)
    ? form.highAngleChecks
    : source.highAngleChecks || source.high_angle_checks || []
  const frtDailyChecks = hasRows(form.frtDailyChecks)
    ? form.frtDailyChecks
    : source.frtDailyChecks || source.frt_daily_checks || []
  const frtOneOffChecks = hasRows(form.frtOneOffChecks)
    ? form.frtOneOffChecks
    : source.frtOneOffChecks || source.frt_one_off_checks || []
  const frtRows = [...(frtDailyChecks || []), ...(frtOneOffChecks || [])]

  return {
    ...form,
    highAngleChecks,
    frtDailyChecks,
    frtOneOffChecks,
    mainLocation:
      form.mainLocation ||
      getFirstRowValue(highAngleChecks, ['mainLocation', 'main_location', 'selectedLocation']) ||
      getFirstRowValue(frtRows, ['mainLocation', 'main_location', 'selectedLocation']) ||
      record.mainLocation ||
      record.main_location ||
      record.selectedLocation ||
      record.location ||
      '',
    frtTruckPlateNo:
      form.frtTruckPlateNo ||
      record.frtTruckPlateNo ||
      record.frt_truck_plate_no ||
      record.frtTruckReference?.plateNo ||
      record.frt_truck_reference?.plateNo ||
      '',
    frtTruckReference:
      Object.keys(form.frtTruckReference || {}).length > 0
        ? form.frtTruckReference
        : record.frtTruckReference || record.frt_truck_reference || form.frtTruckReference || {},
  }
}

const getInspectionTypeDefinitionForDetail = (inspectionType, form = {}, record = {}) => {
  const explicitDefinition = getInspectionTypeDefinition(inspectionType)
  if (explicitDefinition) return explicitDefinition

  const source = { ...form, ...record }
  const structuredFieldMap = [
    ['fireExtinguisherChecks', 'fire-extinguisher-inspection'],
    ['frtDailyChecks', 'frt-daily-inspection'],
    ['frtOneOffChecks', 'frt-daily-inspection'],
    ['highAngleChecks', 'high-angle-rescue-equipment-inspection'],
    ['hydraulicChecks', 'hydraulic-rescue-tools-inspection'],
    ['erAuxChecks', 'er-aux-equipment-inspection'],
    ['scbaBackPlateChecks', 'scba-inspection'],
    ['scbaCylinderChecks', 'scba-inspection'],
    ['scbaFaceMaskChecks', 'scba-inspection'],
  ]
  const matched = structuredFieldMap.find(([field]) => hasRows(source[field]))
  if (!matched) return null

  return INSPECTION_TYPE_DEFINITIONS.find((definition) => definition.key === matched[1]) || null
}

const getSelectedChecklistItems = (checklist = []) =>
  (Array.isArray(checklist) ? checklist : []).filter(
    (item) => item && item.selected !== false && String(item.label || item).trim(),
  )

const getChecklistLabel = (item) => String(item?.label || item || '').trim()

const WorkflowActor = ({ entry }) => {
  const actor = String(entry?.by || '').trim() || '--'
  const remarks = String(entry?.remarks || '').trim()
  const meta = entry?.meta && typeof entry.meta === 'object' ? entry.meta : {}
  const role = formatInspectionRole(
    entry?.actorRole || meta.actorRole,
    entry?.actorRoleCode || meta.actorRoleCode,
  )
  return (
    <>
      <div>{actor}</div>
      {role ? <div className="small text-body-secondary">{role}</div> : null}
      {remarks ? (
        <div className="small text-body-secondary mt-1" style={{ whiteSpace: 'pre-wrap' }}>
          Remarks: {remarks}
        </div>
      ) : null}
    </>
  )
}

const findWorkflowAction = (entries = [], name) =>
  entries.find(
    (entry) =>
      String(entry?.action || '')
        .trim()
        .toLowerCase() === name.toLowerCase(),
  ) || null

const ReadOnlyChecklist = ({ checklist, label = 'Checks' }) => {
  const selected = getSelectedChecklistItems(checklist)
  if (selected.length === 0) return null

  return (
    <div className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">{label}</div>
      <ChipRow>
        {selected.map((item) => {
          const label = getChecklistLabel(item)
          return (
            <span
              key={String(item?.id || label)}
              className="inspection-helper-chip btn btn-sm btn-light border active pe-none"
            >
              {label}
            </span>
          )
        })}
      </ChipRow>
    </div>
  )
}

const ReadOnlyDescription = ({ description, label = 'Describe' }) => {
  const text = String(description || '').trim()
  if (!text) return null

  return (
    <div className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">{label}</div>
      <div className="rounded-3 border bg-light-subtle p-3" style={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    </div>
  )
}

const WorkflowActivity = ({ entries = [] }) => {
  const submittedEntry = findWorkflowAction(entries, 'Submitted')
  const reviewedEntry = findWorkflowAction(entries, 'Reviewed')
  const approvedEntry = findWorkflowAction(entries, 'Approved')
  const rejectedEntry = findWorkflowAction(entries, 'Rejected')

  if (!submittedEntry && !reviewedEntry && !approvedEntry && !rejectedEntry) return null

  return (
    <div className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">Workflow Activity</div>
      <CRow className="g-3">
        {submittedEntry ? (
          <DetailField label="Submitted By" xs={12} md={4}>
            <WorkflowActor entry={submittedEntry} />
          </DetailField>
        ) : null}
        {reviewedEntry ? (
          <DetailField label="Reviewed By" xs={12} md={4}>
            <WorkflowActor entry={reviewedEntry} />
          </DetailField>
        ) : null}
        {approvedEntry ? (
          <DetailField label="Approved By" xs={12} md={4}>
            <WorkflowActor entry={approvedEntry} />
          </DetailField>
        ) : null}
        {rejectedEntry ? (
          <DetailField label="Rejected By" xs={12} md={4}>
            <WorkflowActor entry={rejectedEntry} />
          </DetailField>
        ) : null}
      </CRow>
    </div>
  )
}

const InspectionRecordMeta = ({
  record,
  form,
  inspectedAt,
  submittedAt,
  submittedEntry,
  renderStatusBadge,
}) => {
  const submittedRole = formatInspectionRole(
    record.submittedByRole ||
      form.submittedByRole ||
      record.inspectionActor?.role ||
      form.inspectionActor?.role,
    record.submittedByRoleCode ||
      form.submittedByRoleCode ||
      record.inspectionActor?.roleCode ||
      form.inspectionActor?.roleCode,
  )

  return (
    <div className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">Report Details</div>
      <CRow className="g-3">
        <DetailField label="Status">
          {typeof renderStatusBadge === 'function' ? (
            renderStatusBadge(record.status || 'Unknown')
          ) : (
            <CBadge color="secondary">{record.status || 'Unknown'}</CBadge>
          )}
        </DetailField>
        <DetailField label="Inspection Date/Time">{inspectedAt || '--'}</DetailField>
        <DetailField label="Submitted By">
          {record.submittedBy || submittedEntry?.by || '--'}
        </DetailField>
        {submittedRole ? <DetailField label="Role">{submittedRole}</DetailField> : null}
        <DetailField label="Submitted At">{submittedAt}</DetailField>
        {record.nextActionRole ? (
          <DetailField label="Next Action">Next action: {record.nextActionRole}</DetailField>
        ) : null}
      </CRow>
    </div>
  )
}

const InspectionDetailSection = ({
  selectedRecord,
  onBack,
  formatDateTime,
  renderStatusBadge,
  onEditRecord,
  canEditRecord,
  onReviewRecord,
  onApproveRecord,
  onRejectRecord,
  onDownloadRecord,
  downloadingId = null,
  isActionBusy = false,
}) => {
  if (!selectedRecord) return <CAlert color="warning">Report not found.</CAlert>

  const r = selectedRecord
  const form = withStructuredDetailFallbacks(recordToInspectionForm(r), r)
  const selectedType = String(form.inspectionType || r.incidentType || '').trim()
  const selectedTypeDefinition = getInspectionTypeDefinitionForDetail(selectedType, form, r)
  const isGeneral = isGeneralInspectionType(selectedType)
  const dateTime = formatDateTime(r.incidentDate || r.reportDate, r.incidentTime || r.reportTime)
  const inspectedAt = formatTimestamp(form.inspectedAt || r.inspectedAt, '--')
  const submittedAt = formatTimestamp(r.submittedAt, '') || dateTime || '--'
  const timeline = Array.isArray(r.timeline) ? r.timeline : []
  const submittedEntry = findWorkflowAction(timeline, 'Submitted')
  const readOnlySummary = selectedTypeDefinition?.getSummary?.({
    ...form,
    ...(selectedTypeDefinition?.checksField
      ? {
          [selectedTypeDefinition.checksField]: form[selectedTypeDefinition.checksField] || [],
          [selectedTypeDefinition.equipmentRowsField]:
            form[selectedTypeDefinition.checksField] || [],
        }
      : {}),
  })
  const mainLocationLabel = formatInspectionDisplayLocationTitle(selectedType, form.mainLocation)
  const ReadOnlySection = selectedTypeDefinition?.ReadOnlySection || null

  const renderActions = () => (
    <div className="d-flex flex-column flex-sm-row flex-wrap gap-2 justify-content-end">
      <CButton color="light" onClick={onBack}>
        Back to records
      </CButton>
      {typeof onEditRecord === 'function' && canEditRecord?.(r) ? (
        <CButton color="primary" variant="outline" onClick={() => onEditRecord(r)}>
          Edit record
        </CButton>
      ) : null}
      <CButton
        color="secondary"
        variant="outline"
        disabled={Boolean(downloadingId)}
        onClick={() => onDownloadRecord?.(r.id)}
      >
        {downloadingId === r.id ? 'Generating...' : 'Download'}
      </CButton>
      {r.canReview === true ? (
        <CButton
          color="info"
          variant="outline"
          disabled={isActionBusy}
          onClick={() => onReviewRecord?.(r)}
        >
          Review
        </CButton>
      ) : null}
      {r.canApprove === true || r.canReject === true ? (
        <>
          {r.canApprove === true ? (
            <CButton
              color="success"
              variant="outline"
              disabled={isActionBusy}
              onClick={() => onApproveRecord?.(r)}
            >
              Approve
            </CButton>
          ) : null}
          {r.canReject === true ? (
            <CButton
              color="danger"
              variant="outline"
              disabled={isActionBusy}
              onClick={() => onRejectRecord?.(r)}
            >
              Reject
            </CButton>
          ) : null}
        </>
      ) : null}
    </div>
  )

  return (
    <div className="inspection-detail-section">
      <div className="inspection-form-sections d-grid gap-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div className="fw-semibold">{r.displayId}</div>
            <div className="small text-body-secondary">{submittedAt}</div>
          </div>
          <div className="d-none d-md-block">{renderActions()}</div>
        </div>

        <InspectionRecordMeta
          record={r}
          form={form}
          inspectedAt={inspectedAt}
          submittedAt={submittedAt}
          submittedEntry={submittedEntry}
          renderStatusBadge={renderStatusBadge}
        />

        <div className="inspection-form-section d-grid gap-3">
          <div className="fw-semibold text-muted">Type</div>
          <InspectionSelectedTypeCard
            inspectionType={selectedTypeDefinition?.title || selectedType}
          />
        </div>

        <InspectionReadOnlyLocationSections
          inspectionType={selectedType}
          mainLocation={form.mainLocation}
          subLocation={form.subLocation}
        />

        {selectedTypeDefinition?.formMode === 'structured' ? (
          <>
            <ReadOnlyDescription description={form.description || r.description} label="Summary" />
            <ReadOnlyChecklist checklist={form.checklist} label="Checklist" />
          </>
        ) : null}

        {ReadOnlySection &&
        (selectedTypeDefinition?.formMode === 'structured' ||
          hasStructuredSummaryContent(readOnlySummary)) ? (
          <ReadOnlySection
            mainLocation={form.mainLocation}
            mainLocationLabel={mainLocationLabel}
            form={form}
            summary={readOnlySummary}
          />
        ) : null}

        {!isGeneral && selectedTypeDefinition?.formMode !== 'structured' ? (
          <>
            <ReadOnlyDescription description={form.description || r.description} label="Summary" />
            <ReadOnlyChecklist checklist={form.checklist} label="Checklist" />
          </>
        ) : null}

        <InspectionGeneralEvidenceCard
          readOnly
          title={selectedTypeDefinition?.photoEvidenceTitle || 'Upload Photos and Describe'}
          photos={form.photos}
          emptyMessage={
            selectedTypeDefinition?.formMode === 'structured'
              ? 'No general evidence photos added.'
              : 'No inspection photos were added.'
          }
        />

        <WorkflowActivity entries={timeline} />

        <div className="d-md-none">{renderActions()}</div>
      </div>
    </div>
  )
}

export default InspectionDetailSection
