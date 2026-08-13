import React from 'react'
import { CBadge, CCard, CCardBody, CCardHeader } from '@coreui/react'
import { HydraulicEquipmentChecks } from 'src/views/inspection/form/components/InspectionFormDisplaySections'
import { DetailEvidenceBlock } from '../../records/InspectionDetailReadOnly'
import { HYDRAULIC_CHECK_FIELDS, getHydraulicRetainedEvidenceFields } from './helpers'

export const HydraulicEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  isLoadingRows = false,
  handlers = {},
}) => (
  <HydraulicEquipmentChecks
    mainLocation={mainLocation}
    mainLocationLabel={mainLocationLabel}
    checks={form.hydraulicChecks}
    summary={summary}
    onUpdateCheck={handlers.onUpdateCheck}
    onSaveRowDraft={handlers.onSaveRowDraft}
    onResetCheck={handlers.onResetCheck}
    onMarkEquipmentOk={handlers.onMarkEquipmentOk}
    onMarkAllOk={handlers.onMarkAllOk}
    onRequestPhotoUpload={handlers.onRequestPhotoUpload}
    onRequestDefectPhotoUpload={handlers.onRequestDefectPhotoUpload}
    onRemovePhoto={handlers.onRemovePhoto}
    onChangePhotoDescription={handlers.onChangePhotoDescription}
    onApplyPhotoCaption={handlers.onApplyPhotoCaption}
    onAddEquipment={handlers.onAddEquipment}
    onEditEquipment={handlers.onEditEquipment}
    onDeleteEquipment={handlers.onDeleteEquipment}
    fieldError={fieldErrors.hydraulicChecks}
    remarksError={fieldErrors.hydraulicRemarks}
    isLoadingRows={isLoadingRows}
  />
)

const statusColor = (status) => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
  if (normalized === 'ok') return 'success'
  if (normalized === 'defect') return 'danger'
  if (normalized === 'n/a') return 'warning'
  return 'secondary'
}

const HydraulicStatusBadge = ({ value }) => {
  const text = String(value || '').trim() || '--'
  return (
    <CBadge color={statusColor(text)} className="inspection-readonly-status-badge">
      {text}
    </CBadge>
  )
}

const HydraulicReadOnlyEvidence = DetailEvidenceBlock

const HydraulicReadOnlyField = ({ field, row }) => {
  const status = String(row?.[field.key] || '').trim()
  const remarks = String(row?.[field.remarksKey] || '')
  const photos = Array.isArray(row?.[field.photosKey]) ? row[field.photosKey] : []
  const isDefect = status === 'Defect'
  const isNotApplicable = status === 'N/A'
  const hasRetainedEvidence = getHydraulicRetainedEvidenceFields(row).some(
    (retainedField) => retainedField.key === field.key,
  )

  return (
    <div className="inspection-readonly-check-row d-grid gap-2">
      <div className="d-flex align-items-center justify-content-between gap-3">
        <div className="inspection-readonly-label small fw-semibold text-muted">{field.label}</div>
        <HydraulicStatusBadge value={status} />
      </div>
      {isDefect ? (
        <HydraulicReadOnlyEvidence
          title={`${field.label} defect evidence`}
          remarks={remarks}
          photos={photos}
        />
      ) : null}
      {isNotApplicable ? (
        <HydraulicReadOnlyEvidence title={`${field.label} N/A reason`} remarks={remarks} />
      ) : null}
      {hasRetainedEvidence ? (
        <HydraulicReadOnlyEvidence
          title={`${field.label} retained evidence from earlier status`}
          remarks={remarks}
          photos={photos}
        />
      ) : null}
    </div>
  )
}

export const HydraulicReadOnlySection = ({ mainLocation, form, summary }) => {
  const visibleChecks = summary?.visibleChecks || form.hydraulicChecks || []
  if (!mainLocation && visibleChecks.length === 0) return null

  if (visibleChecks.length === 0) {
    return (
      <div className="inspection-form-section d-grid gap-2">
        <div className="fw-semibold text-muted">Equipment</div>
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          No hydraulic equipment has been added for this location.
        </div>
      </div>
    )
  }

  return (
    <div className="inspection-form-section d-grid gap-3">
      <div className="fw-semibold text-muted">Equipment</div>
      <div className="inspection-hydraulic-card-grid gap-4">
        {visibleChecks.map((row) => {
          const hasDefect = HYDRAULIC_CHECK_FIELDS.some((field) => row?.[field.key] === 'Defect')
          const hasRetainedEvidence = getHydraulicRetainedEvidenceFields(row).length > 0
          const generalRemarks = String(row?.remarks || '').trim()
          const generalPhotos = Array.isArray(row?.photos) ? row.photos : []

          return (
            <CCard key={row.id || row.equipment} className="inspection-hydraulic-card">
              <CCardHeader className="inspection-hydraulic-card-header d-flex align-items-center justify-content-between gap-2">
                <div style={{ minWidth: 0 }}>
                  <div className="fw-semibold text-break">{row.equipment}</div>
                  {row.equipmentDescription ? (
                    <div className="small text-body-secondary mt-1 text-break">
                      {row.equipmentDescription}
                    </div>
                  ) : null}
                </div>
                {hasDefect ? (
                  <CBadge color="danger" className="border border-danger-subtle">
                    Defect
                  </CBadge>
                ) : null}
                {hasRetainedEvidence ? (
                  <CBadge color="warning" className="border border-warning-subtle">
                    Retained evidence
                  </CBadge>
                ) : null}
              </CCardHeader>
              <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
                {HYDRAULIC_CHECK_FIELDS.map((field) => (
                  <HydraulicReadOnlyField key={field.key} field={field} row={row} />
                ))}
                {generalRemarks || generalPhotos.length > 0 ? (
                  <HydraulicReadOnlyEvidence
                    title="General equipment remarks"
                    remarks={generalRemarks}
                    photos={generalPhotos}
                  />
                ) : null}
              </CCardBody>
            </CCard>
          )
        })}
      </div>
    </div>
  )
}
