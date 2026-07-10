import React from 'react'
import { CButton, CFormLabel, CFormTextarea } from '@coreui/react'
import { Camera, CheckCircle2, Circle, MessageSquare, Trash2, TriangleAlert } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import { hasHydraulicInspectionData } from '../inspectionResetActions'
import {
  buildInspectionElementActions,
  InspectionElementCard,
  InspectionElementValidationBadges,
} from './InspectionElementUi'
import {
  HYDRAULIC_CHECK_FIELDS,
  HYDRAULIC_CHECK_STATUS_OPTIONS,
  getHydraulicRetainedEvidenceFields,
} from 'src/views/inspection/inspectionFormHelpers'
import {
  EvidenceBlock,
  FormFieldError,
  InspectionPhotoActionRow,
  InspectionPhotoEvidenceSummary,
} from './InspectionDisplayShared'

const HydraulicStatusSegment = ({ field, value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2">
    <div className="inspection-hydraulic-check-label small fw-semibold text-muted">
      {field.label}
    </div>
    <div className="inspection-hydraulic-status-group d-flex flex-nowrap justify-content-start gap-2 overflow-auto pb-1">
      {HYDRAULIC_CHECK_STATUS_OPTIONS.map((option) => {
        const isSelected = value === option.value
        const className = `inspection-hydraulic-status-btn btn btn-sm ${
          isSelected ? 'btn-primary' : 'btn-outline-secondary'
        } ${readOnly ? 'pe-none' : ''}`.trim()

        return readOnly ? (
          <span
            key={option.value}
            className={className}
            aria-current={isSelected ? 'true' : undefined}
          >
            {option.label}
          </span>
        ) : (
          <CButton
            key={option.value}
            type="button"
            color={isSelected ? 'primary' : 'secondary'}
            variant={isSelected ? undefined : 'outline'}
            size="sm"
            className="inspection-hydraulic-status-btn"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </CButton>
        )
      })}
    </div>
  </div>
)

const getHydraulicWorkflowState = (row = {}) => {
  const defectCount = HYDRAULIC_CHECK_FIELDS.filter((field) => row[field.key] === 'Defect').length
  const missingStatusCount = HYDRAULIC_CHECK_FIELDS.filter(
    (field) => !String(row[field.key] || '').trim(),
  ).length
  const missingEvidenceCount = HYDRAULIC_CHECK_FIELDS.reduce((count, field) => {
    const status = String(row[field.key] || '').trim()
    const remarks = String(row[field.remarksKey] || '').trim()
    if (status === 'Defect') return count + (remarks ? 0 : 1)
    if (status === 'N/A') return count + (remarks ? 0 : 1)
    return count
  }, 0)
  const missingCount = missingStatusCount + missingEvidenceCount

  return {
    defectCount,
    hasDefect: defectCount > 0,
    isComplete: missingCount === 0,
    missingCount,
    needsEvidence: missingEvidenceCount > 0,
  }
}

const HydraulicInspectionStatusInline = ({ workflowState }) => {
  const completionLabel = workflowState?.isComplete ? 'Checked' : 'Not checked'

  return (
    <span className="inspection-fire-extinguisher-status-inline d-inline-flex flex-wrap align-items-center gap-2 small">
      <span
        className={`d-inline-flex align-items-center gap-1 ${
          workflowState?.isComplete ? 'text-muted' : 'text-body-tertiary'
        }`}
        aria-label={completionLabel}
        title={completionLabel}
      >
        {workflowState?.isComplete ? (
          <CheckCircle2 size={14} className="text-success" aria-hidden="true" />
        ) : (
          <Circle size={14} aria-hidden="true" />
        )}
        <span className="fw-normal">{completionLabel}</span>
      </span>
      {workflowState?.hasDefect ? (
        <span
          className="d-inline-flex align-items-center gap-1 text-danger"
          aria-label={`Defect (${workflowState.defectCount})`}
          title={`Defect (${workflowState.defectCount})`}
        >
          <TriangleAlert size={14} aria-hidden="true" />
          <span className="fw-normal">Defect ({workflowState.defectCount})</span>
        </span>
      ) : null}
    </span>
  )
}

export const HydraulicEquipmentCheckDetails = ({
  row,
  current,
  expandedGeneralRemarks,
  setExpandedGeneralRemarks,
  setPhotoViewer,
  onUpdateCheck,
  onRequestPhotoUpload,
  onRequestDefectPhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  remarksError,
  readOnly,
}) => {
  const retainedEvidenceFields = getHydraulicRetainedEvidenceFields(current)
  const hasGeneralRemarks = String(current.remarks || '').trim() !== ''
  const showGeneralRemarks = Boolean(
    readOnly ? hasGeneralRemarks : expandedGeneralRemarks[row.id] || hasGeneralRemarks,
  )
  const photos = Array.isArray(current.photos) ? current.photos : []

  return (
    <>
      {HYDRAULIC_CHECK_FIELDS.map((field) => {
        const isDefect = current[field.key] === 'Defect'
        const isNotApplicable = current[field.key] === 'N/A'
        const defectRemarks = String(current[field.remarksKey] || '')
        const defectPhotos = Array.isArray(current[field.photosKey]) ? current[field.photosKey] : []
        const hasFieldRetainedEvidence = retainedEvidenceFields.some(
          (retainedField) => retainedField.key === field.key,
        )
        const isMissingRemark = isDefect && !defectRemarks.trim()
        const isMissingNaReason = isNotApplicable && !defectRemarks.trim()
        const openDefectPhotoViewer = (photos = defectPhotos) =>
          setPhotoViewer({
            title: `${row.equipment} - ${field.label} defect photos`,
            photos,
            showCaptionChips: false,
            onAddMorePhoto: () =>
              onRequestDefectPhotoUpload?.(row, field, {
                onAfterAddPhotos: ({ photos: nextPhotos }) => openDefectPhotoViewer(nextPhotos),
              }),
            onSave: (nextPhotos) => updateHydraulicPhotoList(nextPhotos),
            onRemove: (photoId) => onRemovePhoto?.(row, photoId, field.photosKey),
            onChangeDescription: (photoId, description) =>
              onChangePhotoDescription?.(row, photoId, description, field.photosKey),
            onApplyCaption: (photoId, caption) =>
              onApplyPhotoCaption?.(row, photoId, caption, field.photosKey),
          })
        const updateHydraulicPhotoList = (photos) =>
          onUpdateCheck(row, { [field.photosKey]: Array.isArray(photos) ? photos : [] })
        const requestDefectPhoto = () =>
          onRequestDefectPhotoUpload?.(row, field, {
            onAfterAddPhotos: ({ photos: nextPhotos }) => openDefectPhotoViewer(nextPhotos),
          })

        return (
          <div key={field.key} className="inspection-hydraulic-check-with-evidence d-grid gap-2">
            <HydraulicStatusSegment
              field={field}
              value={current[field.key]}
              readOnly={readOnly}
              onChange={(nextValue) => onUpdateCheck(row, { [field.key]: nextValue })}
            />
            {isDefect ? (
              readOnly ? (
                <EvidenceBlock
                  title={`${field.label} defect evidence`}
                  remarks={defectRemarks}
                  photos={defectPhotos}
                  readOnly
                  onViewPhotos={() =>
                    setPhotoViewer({
                      title: `${row.equipment} - ${field.label} defect photos`,
                      photos: defectPhotos,
                      readOnly: true,
                      showDescriptionInput: false,
                    })
                  }
                />
              ) : (
                <div className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2">
                  <CFormTextarea
                    rows={2}
                    value={defectRemarks}
                    placeholder={`${field.label} defect remarks`}
                    aria-label={`${field.label} defect remarks`}
                    onChange={(event) =>
                      onUpdateCheck(row, { [field.remarksKey]: event.target.value })
                    }
                  />
                  {remarksError && isMissingRemark ? (
                    <FormFieldError>{field.label} defect remarks are required.</FormFieldError>
                  ) : null}
                  <InspectionPhotoActionRow
                    photos={defectPhotos}
                    onView={() => openDefectPhotoViewer(defectPhotos)}
                    onAddPhoto={requestDefectPhoto}
                  />
                </div>
              )
            ) : null}
            {hasFieldRetainedEvidence ? (
              <EvidenceBlock
                title={`${field.label} retained evidence from earlier status`}
                remarks={defectRemarks}
                photos={defectPhotos}
                readOnly={readOnly}
                onViewPhotos={() =>
                  setPhotoViewer({
                    title: `${row.equipment} - ${field.label} retained evidence photos`,
                    photos: defectPhotos,
                    readOnly,
                    showDescriptionInput: !readOnly,
                    onRemove: readOnly
                      ? undefined
                      : (photoId) => onRemovePhoto?.(row, photoId, field.photosKey),
                    onChangeDescription: readOnly
                      ? undefined
                      : (photoId, description) =>
                          onChangePhotoDescription?.(row, photoId, description, field.photosKey),
                    onApplyCaption: readOnly
                      ? undefined
                      : (photoId, caption) =>
                          onApplyPhotoCaption?.(row, photoId, caption, field.photosKey),
                  })
                }
              >
                {readOnly ? (
                  <div className="small text-body-secondary">
                    Audit context only. Current status is not Defect or N/A.
                  </div>
                ) : (
                  <div className="d-flex flex-wrap justify-content-end gap-2">
                    <CButton
                      type="button"
                      color="warning"
                      variant="outline"
                      size="sm"
                      className="inspection-compact-action-btn"
                      onClick={() =>
                        onUpdateCheck(row, {
                          [field.remarksKey]: '',
                          [field.photosKey]: [],
                        })
                      }
                    >
                      Clear retained evidence
                    </CButton>
                  </div>
                )}
              </EvidenceBlock>
            ) : null}
            {isNotApplicable ? (
              readOnly ? (
                <EvidenceBlock
                  title={`${field.label} N/A reason`}
                  remarks={defectRemarks}
                  readOnly
                />
              ) : (
                <div className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2">
                  <CFormTextarea
                    rows={2}
                    value={defectRemarks}
                    placeholder={`${field.label} N/A reason`}
                    aria-label={`${field.label} N/A reason`}
                    onChange={(event) =>
                      onUpdateCheck(row, { [field.remarksKey]: event.target.value })
                    }
                  />
                  {remarksError && isMissingNaReason ? (
                    <FormFieldError>{field.label} N/A reason is required.</FormFieldError>
                  ) : null}
                </div>
              )
            ) : null}
          </div>
        )
      })}
      <div className="inspection-equipment-additional-info d-grid gap-2">
        {(readOnly && (showGeneralRemarks || photos.length > 0)) || !readOnly ? (
          <div className="small fw-semibold text-muted">Additional Info (optional)</div>
        ) : null}
        {!readOnly ? (
          <div className="inspection-equipment-additional-actions d-flex flex-wrap justify-content-start gap-2">
            {!showGeneralRemarks ? (
              <CreateActionButton
                label="Remark"
                className="inspection-compact-action-btn"
                icon={<MessageSquare size={13} className="me-1 align-text-bottom" />}
                onClick={() =>
                  setExpandedGeneralRemarks((currentExpanded) => ({
                    ...currentExpanded,
                    [row.id]: true,
                  }))
                }
              />
            ) : null}
            <CreateActionButton
              label="Photo"
              className="inspection-compact-action-btn"
              icon={<Camera size={13} className="me-1 align-text-bottom" />}
              onClick={() => onRequestPhotoUpload?.(row)}
            />
          </div>
        ) : null}
        {showGeneralRemarks ? (
          readOnly ? (
            <div className="small">
              <div className="fw-semibold text-body-secondary">General equipment remarks</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{current.remarks}</div>
            </div>
          ) : (
            <div className="d-grid gap-1">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <CFormLabel className="small fw-semibold text-muted mb-0">
                  General equipment remarks
                </CFormLabel>
                {hasGeneralRemarks ? (
                  <CButton
                    type="button"
                    color="danger"
                    variant="outline"
                    size="sm"
                    className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
                    onClick={() => {
                      onUpdateCheck(row, { remarks: '' })
                      setExpandedGeneralRemarks((currentExpanded) => ({
                        ...currentExpanded,
                        [row.id]: false,
                      }))
                    }}
                  >
                    <Trash2 size={13} />
                    Clear
                  </CButton>
                ) : (
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    className="inspection-compact-action-btn"
                    onClick={() =>
                      setExpandedGeneralRemarks((currentExpanded) => ({
                        ...currentExpanded,
                        [row.id]: false,
                      }))
                    }
                  >
                    Cancel
                  </CButton>
                )}
              </div>
              <CFormTextarea
                rows={2}
                aria-label="General equipment remarks"
                value={current.remarks || ''}
                placeholder="General equipment remarks"
                onChange={(event) => onUpdateCheck(row, { remarks: event.target.value })}
              />
            </div>
          )
        ) : null}
        {photos.length > 0 ? (
          <InspectionPhotoEvidenceSummary
            photos={photos}
            label="View photos"
            onView={() =>
              setPhotoViewer({
                title: `${row.equipment} - additional photos`,
                photos,
                onRemove: (photoId) => onRemovePhoto?.(row, photoId, 'photos'),
                onChangeDescription: (photoId, description) =>
                  onChangePhotoDescription?.(row, photoId, description, 'photos'),
                onApplyCaption: (photoId, caption) =>
                  onApplyPhotoCaption?.(row, photoId, caption, 'photos'),
              })
            }
          />
        ) : null}
      </div>
    </>
  )
}

const HydraulicEquipmentCheckCard = ({
  row,
  current,
  expandedGeneralRemarks,
  setExpandedGeneralRemarks,
  setPhotoViewer,
  onUpdateCheck,
  onResetCheck,
  onMarkEquipmentOk,
  onRequestPhotoUpload,
  onRequestDefectPhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  onEditEquipment,
  onDeleteEquipment,
  remarksError,
  readOnly,
  showBody = true,
  active = false,
  onOpenDetails,
}) => {
  const workflowState = getHydraulicWorkflowState(current)
  const retainedEvidenceFields = getHydraulicRetainedEvidenceFields(current)
  const hasRetainedEvidence = retainedEvidenceFields.length > 0
  const canReset =
    typeof onResetCheck === 'function' &&
    hasHydraulicInspectionData(current, HYDRAULIC_CHECK_FIELDS)
  const actionItems = buildInspectionElementActions({
    canReset,
    onReset: () => onResetCheck(row),
    canEdit: row.canEdit && row.equipmentId,
    onEdit: () => onEditEquipment?.(row),
    canDelete: row.canDelete && row.equipmentId,
    onDelete: () => onDeleteEquipment?.(row),
  })

  return (
    <InspectionElementCard
      title={row.equipment}
      meta={row.equipmentDescription}
      status={<HydraulicInspectionStatusInline workflowState={workflowState} />}
      badges={
        <>
          {row.isCustomEquipment || row.equipmentSource === 'custom' ? (
            <span className="badge text-bg-light border text-body-secondary">Custom</span>
          ) : null}
          {hasRetainedEvidence ? (
            <span className="badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
              Retained evidence
            </span>
          ) : null}
          <InspectionElementValidationBadges
            missingCount={workflowState.missingCount}
            needsEvidence={workflowState.needsEvidence}
          />
        </>
      }
      helperLines={
        hasRetainedEvidence
          ? 'Evidence from an earlier status is retained for audit context.'
          : null
      }
      actions={actionItems}
      actionLabel={`Equipment actions for ${row.equipment}`}
      expanded={showBody}
      active={active}
      readOnly={readOnly}
      onToggle={onOpenDetails ? () => onOpenDetails(row) : undefined}
      showBody={showBody}
    >
      {!readOnly && typeof onMarkEquipmentOk === 'function' ? (
        <div className="d-flex justify-content-end">
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            size="sm"
            className="inspection-compact-action-btn"
            onClick={() => onMarkEquipmentOk(row)}
          >
            All OK
          </CButton>
        </div>
      ) : null}
      <HydraulicEquipmentCheckDetails
        row={row}
        current={current}
        expandedGeneralRemarks={expandedGeneralRemarks}
        setExpandedGeneralRemarks={setExpandedGeneralRemarks}
        setPhotoViewer={setPhotoViewer}
        onUpdateCheck={onUpdateCheck}
        onResetCheck={onResetCheck}
        onRequestPhotoUpload={onRequestPhotoUpload}
        onRequestDefectPhotoUpload={onRequestDefectPhotoUpload}
        onRemovePhoto={onRemovePhoto}
        onChangePhotoDescription={onChangePhotoDescription}
        onApplyPhotoCaption={onApplyPhotoCaption}
        remarksError={remarksError}
        readOnly={readOnly}
      />
    </InspectionElementCard>
  )
}

export default HydraulicEquipmentCheckCard
