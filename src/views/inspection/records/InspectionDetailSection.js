import React, { useState } from 'react'
import { CAlert, CBadge, CRow } from '@coreui/react'
import { DetailField } from 'src/components/report-workflow/ReportViewComponents'
import {
  getInspectionTypeDefinition,
  INSPECTION_TYPE_DEFINITIONS,
} from '../app/inspectionTypeRegistry'
import { formatTimestamp } from '../domain/utils/inspectionSharedUtils'
import { formatInspectionRole, recordToInspectionForm } from '../form/inspectionFormHelpers'
import {
  ChipRow,
  InspectionGeneralEvidenceCard,
  InspectionPhotoViewerModal,
  formatInspectionDisplayLocationTitle,
} from '../form/components/InspectionFormDisplaySections'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../inspectionReportEvidenceCopy'
import InspectionDetailActionBar from './InspectionDetailActionBar'
import InspectionDetailFindingsSection from './InspectionDetailFindingsSection'

const text = (value) => String(value || '').trim()

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
  const field = fields.find((key) => text(row?.[key]))
  return field ? text(row[field]) : ''
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
    ['hseSelections', 'health-safety-environment-inspection'],
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
    (item) => item && item.selected !== false && text(item.label || item),
  )

const getChecklistLabel = (item) => text(item?.label || item)

const buildFallbackDetailContextFields = (selectedType, form = {}, record = {}) => {
  const fields = [{ key: 'type', label: 'Type', value: text(selectedType) || '--' }]
  const mainLocation = text(form.mainLocation || record.mainLocation || record.location)
  const subLocation = text(form.subLocation || record.subLocation)

  if (mainLocation) {
    fields.push({
      key: 'location',
      label: 'Location',
      value: formatInspectionDisplayLocationTitle(selectedType, mainLocation) || mainLocation,
    })
  }
  if (subLocation) {
    fields.push({
      key: 'sub-location',
      label: 'Sub-location',
      value:
        formatInspectionDisplayLocationTitle(selectedType, subLocation, mainLocation) ||
        subLocation,
    })
  }
  return fields
}

const ReadOnlyChecklist = ({ checklist, label = 'Checklist' }) => {
  const selected = getSelectedChecklistItems(checklist)
  if (selected.length === 0) return null

  return (
    <div className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">{label}</div>
      <ChipRow>
        {selected.map((item) => {
          const labelValue = getChecklistLabel(item)
          return (
            <span
              key={String(item?.id || labelValue)}
              className="inspection-helper-chip btn btn-sm btn-light border active pe-none"
            >
              {labelValue}
            </span>
          )
        })}
      </ChipRow>
    </div>
  )
}

const ReadOnlyDescription = ({ description, label = 'Summary' }) => {
  const descriptionText = text(description)
  if (!descriptionText) return null

  return (
    <div className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">{label}</div>
      <div className="rounded-3 border bg-light-subtle p-3" style={{ whiteSpace: 'pre-wrap' }}>
        {descriptionText}
      </div>
    </div>
  )
}

const WorkflowActor = ({ entry }) => {
  const actor = text(entry?.by) || '--'
  const remarks = text(entry?.remarks)
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
  entries.find((entry) => text(entry?.action).toLowerCase() === name.toLowerCase()) || null

const getWorkflowHistoryEntries = (entries = []) =>
  [
    ['Reviewed By', findWorkflowAction(entries, 'Reviewed')],
    ['Approved By', findWorkflowAction(entries, 'Approved')],
    ['Rejected By', findWorkflowAction(entries, 'Rejected')],
  ].filter(([, entry]) => entry)

const renderStatusBadge = (status, customRenderer) =>
  typeof customRenderer === 'function' ? (
    customRenderer(status || 'Unknown')
  ) : (
    <CBadge color="secondary">{status || 'Unknown'}</CBadge>
  )

const InspectionRecordMeta = ({
  record,
  form,
  inspectedAt,
  submittedAt,
  submittedEntry,
  timeline,
  renderStatusBadge: customStatusRenderer,
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
  const workflowHistoryEntries = getWorkflowHistoryEntries(timeline)

  return (
    <section className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">Report Metadata</div>
      <CRow className="g-3">
        <DetailField label="Report ID">{record.displayId || '--'}</DetailField>
        <DetailField label="Status">
          {renderStatusBadge(record.status || 'Unknown', customStatusRenderer)}
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
        {workflowHistoryEntries.map(([label, entry]) => (
          <DetailField key={label} label={label}>
            <WorkflowActor entry={entry} />
          </DetailField>
        ))}
      </CRow>
    </section>
  )
}

const InspectionContextSection = ({ fields = [] }) => {
  const visibleFields = (Array.isArray(fields) ? fields : []).filter(
    (field) => field && text(field.label) && text(field.value),
  )
  if (visibleFields.length === 0) return null

  return (
    <section className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">Inspection Context</div>
      <CRow className="g-3">
        {visibleFields.map((field) => (
          <DetailField key={field.key || field.label} label={field.label} xs={12} md={4}>
            {field.value}
          </DetailField>
        ))}
      </CRow>
    </section>
  )
}

const buildFallbackFindingsContent = (form = {}, record = {}) => {
  const description = text(form.description || record.description)
  const checklistItems = getSelectedChecklistItems(form.checklist || record.checklist)

  if (!description && checklistItems.length === 0) return null

  return (
    <>
      <ReadOnlyDescription description={description} />
      <ReadOnlyChecklist checklist={checklistItems} />
    </>
  )
}

const hasBlockFindingData = (definition, form = {}, summary = null) => {
  if (!definition?.ReadOnlySection) return false
  if (hasStructuredSummaryContent(summary)) return true
  if (definition.key === 'general-inspection') {
    return (
      Array.isArray(form.inspectionIssues || form.issues) &&
      (form.inspectionIssues || form.issues).length > 0
    )
  }
  if (definition.key === 'health-safety-environment-inspection') {
    return (
      (Array.isArray(form.hseSelections) && form.hseSelections.length > 0) ||
      (Array.isArray(form.inspectionIssues || form.issues) &&
        (form.inspectionIssues || form.issues).length > 0)
    )
  }
  return definition.formMode === 'structured'
}

const InspectionDetailSection = ({
  selectedRecord,
  onBack,
  formatDateTime,
  renderStatusBadge: customStatusRenderer,
  onEditRecord,
  canEditRecord,
  onReviewRecord,
  onApproveRecord,
  onRejectRecord,
  onDownloadRecord,
  downloadingId = null,
  isActionBusy = false,
}) => {
  const [photoViewer, setPhotoViewer] = useState(null)
  if (!selectedRecord) return <CAlert color="warning">Report not found.</CAlert>

  const record = selectedRecord
  const form = withStructuredDetailFallbacks(recordToInspectionForm(record), record)
  const selectedType = text(form.inspectionType || record.incidentType)
  const selectedTypeDefinition = getInspectionTypeDefinitionForDetail(selectedType, form, record)
  const dateTime = formatDateTime(
    record.incidentDate || record.reportDate,
    record.incidentTime || record.reportTime,
  )
  const inspectedAt = formatTimestamp(form.inspectedAt || record.inspectedAt, '--')
  const submittedAt = formatTimestamp(record.submittedAt, '') || dateTime || '--'
  const timeline = Array.isArray(record.timeline) ? record.timeline : []
  const submittedEntry = findWorkflowAction(timeline, 'Submitted')
  const readOnlyChecks = selectedTypeDefinition?.checksField
    ? form[selectedTypeDefinition.checksField] || []
    : []
  const readOnlySummary = selectedTypeDefinition?.getSummary?.(
    {
      ...form,
      ...(selectedTypeDefinition?.checksField
        ? {
            [selectedTypeDefinition.checksField]: readOnlyChecks,
            [selectedTypeDefinition.equipmentRowsField]: readOnlyChecks,
          }
        : {}),
    },
    selectedTypeDefinition?.checksField ? { checks: readOnlyChecks } : {},
  )
  const mainLocationLabel = formatInspectionDisplayLocationTitle(selectedType, form.mainLocation)
  const BlockReadOnlySection = selectedTypeDefinition?.ReadOnlySection || null
  const detailContextFields =
    selectedTypeDefinition?.detailContextFields?.(form, record) ||
    buildFallbackDetailContextFields(selectedTypeDefinition?.title || selectedType, form, record)
  const detailFindingsMode = selectedTypeDefinition?.detailFindingsMode || 'block'
  const detailFindingItems =
    detailFindingsMode === 'itemized'
      ? selectedTypeDefinition?.buildDetailFindingItems?.(form, readOnlySummary, record) || []
      : []
  const blockFindingContent =
    detailFindingsMode === 'block' &&
    BlockReadOnlySection &&
    hasBlockFindingData(selectedTypeDefinition, form, readOnlySummary) ? (
      <BlockReadOnlySection
        mainLocation={form.mainLocation}
        mainLocationLabel={mainLocationLabel}
        form={form}
        summary={readOnlySummary}
      />
    ) : null
  const fallbackFindingsContent =
    detailFindingsMode === 'itemized' && detailFindingItems.length > 0
      ? null
      : blockFindingContent || buildFallbackFindingsContent(form, record)

  return (
    <div className="inspection-detail-section">
      <div className="inspection-form-sections d-grid gap-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div className="fw-semibold">{record.displayId}</div>
            <div className="small text-body-secondary">{submittedAt}</div>
          </div>
          <InspectionDetailActionBar
            mode="desktop"
            record={record}
            onBack={onBack}
            onEditRecord={onEditRecord}
            canEditRecord={canEditRecord}
            onReviewRecord={onReviewRecord}
            onApproveRecord={onApproveRecord}
            onRejectRecord={onRejectRecord}
            onDownloadRecord={onDownloadRecord}
            downloadingId={downloadingId}
            isActionBusy={isActionBusy}
          />
        </div>

        <InspectionRecordMeta
          record={record}
          form={form}
          inspectedAt={inspectedAt}
          submittedAt={submittedAt}
          submittedEntry={submittedEntry}
          timeline={timeline}
          renderStatusBadge={customStatusRenderer}
        />

        <InspectionContextSection fields={detailContextFields} />

        <InspectionDetailFindingsSection
          sectionTitle="Inspection Findings"
          findingsTitle={
            detailFindingsMode === 'itemized'
              ? selectedTypeDefinition?.detailFindingsTitle || ''
              : ''
          }
          items={detailFindingItems}
          renderItemContent={(item) =>
            selectedTypeDefinition?.renderDetailFindingContent?.(item, {
              form,
              summary: readOnlySummary,
              record,
              onViewPhotos: setPhotoViewer,
            }) || null
          }
          fallbackContent={fallbackFindingsContent}
        />

        <section className="inspection-form-section d-grid gap-3">
          <div className="fw-semibold text-muted">
            {INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
          </div>
          <InspectionGeneralEvidenceCard
            readOnly
            title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
            photos={form.photos}
            remarks={form.reportRemarks}
            emptyMessage={INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage}
            remarksLabel={INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel}
          />
        </section>

        <InspectionDetailActionBar
          mode="mobile"
          record={record}
          onBack={onBack}
          onEditRecord={onEditRecord}
          canEditRecord={canEditRecord}
          onReviewRecord={onReviewRecord}
          onApproveRecord={onApproveRecord}
          onRejectRecord={onRejectRecord}
          onDownloadRecord={onDownloadRecord}
          downloadingId={downloadingId}
          isActionBusy={isActionBusy}
        />
      </div>
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
    </div>
  )
}

export default InspectionDetailSection
