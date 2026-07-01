import React, { useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CFormInput, CFormTextarea } from '@coreui/react'
import { Camera, Trash2, Upload } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import { PhotoPreview } from 'src/components/report-workflow/ReportViewComponents'
import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'
import {
  ACTIVE_CARD_STYLE,
  resolveTypeIcon,
  stripInspectionContext,
} from 'src/views/inspection/typeOptionUtils'
import { getInspectionLocationDefaults } from 'src/views/inspection/inspectionLocationDefaults'
import {
  HYDRAULIC_CHECK_FIELDS,
  HYDRAULIC_CHECK_STATUS_OPTIONS,
  INSPECTION_PHOTO_CAPTION_CHIPS,
} from 'src/views/inspection/inspectionFormHelpers'
import { ER_AUX_CONDITION_OPTIONS } from 'src/views/inspection/inspectionErAuxHelpers'
import {
  FRT_DAILY_STATUS_OPTIONS,
  FRT_ONE_OFF_STATUS_OPTIONS,
} from 'src/views/inspection/types/frt-daily/helpers'
import {
  formatHighAngleGroupLabel,
  HIGH_ANGLE_STATUS_OPTIONS,
} from 'src/views/inspection/types/high-angle/helpers'
import {
  getScbaSectionFields,
  getScbaSectionTitle,
  SCBA_SECTION_DEFINITIONS,
  SCBA_STATUS_OPTIONS,
} from 'src/views/inspection/types/scba/helpers'

export const FormFieldError = ({ children }) =>
  children ? <div className="inspection-field-error text-danger small mt-2">{children}</div> : null

export const ChipButton = ({ children, onClick, className = '' }) => (
  <button
    type="button"
    className={`inspection-helper-chip btn btn-sm btn-light border ${className}`.trim()}
    onClick={onClick}
  >
    {children}
  </button>
)

export const ChipRow = ({ children, className = '' }) => (
  <div className={`inspection-helper-chip-row d-flex flex-wrap gap-2 ${className}`.trim()}>
    {children}
  </div>
)

const FALLBACK_INSPECTION_TYPE_ICON = resolveTypeIcon('ShieldAlert')

export const formatInspectionDisplayLocationTitle = (inspectionType, value, parentValue = '') => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''

  const mainOptions = getInspectionLocationDefaults(inspectionType)
  if (!parentValue) {
    const mainOption = mainOptions.find(
      (option) =>
        String(option?.value || '')
          .trim()
          .toLowerCase() === rawValue.toLowerCase(),
    )
    return String(mainOption?.title || rawValue).trim()
  }

  const parentOption = mainOptions.find(
    (option) =>
      String(option?.value || '')
        .trim()
        .toLowerCase() ===
      String(parentValue || '')
        .trim()
        .toLowerCase(),
  )
  const subOption = (parentOption?.subLocations || []).find(
    (option) =>
      String(option?.value || '')
        .trim()
        .toLowerCase() === rawValue.toLowerCase(),
  )
  return String(subOption?.title || rawValue).trim()
}

export const InspectionSelectedTypeCard = ({ inspectionType, icon: ProvidedIcon = null }) => {
  const Icon = ProvidedIcon || FALLBACK_INSPECTION_TYPE_ICON
  const label = stripInspectionContext(inspectionType)

  if (!String(inspectionType || '').trim()) return null

  return (
    <div
      className="rounded-3 border border-primary bg-primary bg-opacity-10 p-3"
      style={ACTIVE_CARD_STYLE}
    >
      <div className="d-flex align-items-center gap-2 gap-md-3" style={{ minWidth: 0 }}>
        {Icon ? (
          <div
            data-testid="selected-inspection-type-icon"
            className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center"
            style={{
              width: 40,
              height: 40,
              flex: '0 0 40px',
              lineHeight: 0,
            }}
          >
            <Icon size={18} />
          </div>
        ) : null}
        <div className="fw-semibold text-break" style={{ minWidth: 0 }}>
          {label}
        </div>
      </div>
    </div>
  )
}

const ReadOnlyLocationCard = ({ label }) => (
  <div
    className="rounded-3 border border-primary bg-primary bg-opacity-10 p-3"
    style={ACTIVE_CARD_STYLE}
  >
    <div className="fw-semibold text-break">{label}</div>
  </div>
)

export const InspectionReadOnlyLocationSections = ({
  inspectionType,
  mainLocation,
  subLocation,
}) => {
  const mainLabel = formatInspectionDisplayLocationTitle(inspectionType, mainLocation)
  const subLabel = formatInspectionDisplayLocationTitle(inspectionType, subLocation, mainLocation)

  if (!mainLabel) return null

  return (
    <>
      <div className="inspection-form-section d-grid gap-3">
        <div className="fw-semibold text-muted">Choose Main Location</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <ReadOnlyLocationCard label={mainLabel} />
          </div>
        </div>
      </div>

      {subLabel ? (
        <div className="inspection-form-section d-grid gap-3">
          <div className="d-flex flex-wrap align-items-baseline gap-2">
            <div className="fw-semibold text-muted">Choose Sub-location</div>
            <div className="small text-body-secondary">(optional under {mainLabel})</div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <ReadOnlyLocationCard label={subLabel} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export const PhotoGallery = ({
  photos,
  onRemove,
  onChangeDescription,
  onApplyCaption,
  emptyMessage = 'No photos yet. Upload photos to continue.',
  readOnly = false,
}) => {
  const visiblePhotos = dedupePhotos(photos)
  if (!visiblePhotos.length) {
    return (
      <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">{emptyMessage}</div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '0.75rem',
      }}
    >
      {visiblePhotos.map((photo, index) => (
        <div
          key={photo.id || `${photo.fileName || 'photo'}-${index}`}
          className="rounded-3 border border-light-subtle p-2 d-grid gap-2"
        >
          <PhotoPreview photo={photo} />
          <div className="small text-truncate">{photo.fileName || 'Photo'}</div>
          {readOnly ? (
            String(photo?.description || '').trim() ? (
              <div className="small text-body-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                {photo.description}
              </div>
            ) : null
          ) : (
            <>
              <CFormInput
                size="sm"
                value={String(photo?.description || '')}
                placeholder="Describe this photo"
                onChange={(event) => onChangeDescription(photo.id, event.target.value)}
              />
              <ChipRow className="inspection-photo-caption-chips">
                {INSPECTION_PHOTO_CAPTION_CHIPS.map((caption) => (
                  <ChipButton key={caption} onClick={() => onApplyCaption(photo.id, caption)}>
                    {caption}
                  </ChipButton>
                ))}
              </ChipRow>
              <CButton
                type="button"
                color="danger"
                variant="outline"
                size="sm"
                className="d-inline-flex align-items-center justify-content-center gap-1"
                onClick={() => onRemove(photo.id)}
              >
                <Trash2 size={14} />
                Remove
              </CButton>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export const InspectionGeneralEvidenceCard = ({
  title,
  photos,
  readOnly = false,
  fieldError = false,
  emptyMessage = 'No photos yet. Upload photos to continue.',
  onTakePhoto,
  onUploadPhoto,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  cardRef,
}) => (
  <CCard className="inspection-general-evidence-card" ref={cardRef}>
    <CCardHeader className="inspection-general-evidence-card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
      <div className="fw-semibold">{title}</div>
      {!readOnly ? (
        <div className="d-flex align-items-center gap-2">
          <CreateActionButton
            label={<span className="d-none d-sm-inline">Take photo</span>}
            ariaLabel="Take photo"
            icon={<Camera size={13} className="me-0 me-sm-1 align-text-bottom" />}
            importance="primary"
            className="inspection-take-photo-btn px-2 px-sm-2"
            onClick={onTakePhoto}
          />
          <CreateActionButton
            label={<span className="d-none d-sm-inline">Upload photo</span>}
            ariaLabel="Upload photo"
            icon={<Upload size={13} className="me-0 me-sm-1 align-text-bottom" />}
            className="px-2 px-sm-2"
            onClick={onUploadPhoto}
          />
        </div>
      ) : null}
    </CCardHeader>
    <CCardBody className="inspection-general-evidence-card-body d-grid gap-3">
      <PhotoGallery
        photos={photos}
        readOnly={readOnly}
        onRemove={onRemovePhoto}
        onChangeDescription={onChangePhotoDescription}
        onApplyCaption={onApplyPhotoCaption}
        emptyMessage={emptyMessage}
      />
      <FormFieldError>{fieldError ? 'Upload at least one inspection photo.' : ''}</FormFieldError>
    </CCardBody>
  </CCard>
)

const HydraulicStatusSegment = ({ field, value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-check-row d-flex align-items-center justify-content-between gap-2">
    <div className="inspection-hydraulic-check-label small fw-semibold text-muted">
      {field.label}
    </div>
    <div className="inspection-hydraulic-status-group d-flex flex-wrap justify-content-end gap-3">
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

const EvidenceBlock = ({ title, remarks = '', photos = [], readOnly = false, children = null }) => {
  const visiblePhotos = dedupePhotos(photos)
  const hasRemarks = String(remarks || '').trim() !== ''
  if (readOnly && !hasRemarks && visiblePhotos.length === 0 && !children) return null

  return (
    <div className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2">
      {title ? <div className="small fw-semibold text-body-secondary">{title}</div> : null}
      {hasRemarks ? (
        <div className="small" style={{ whiteSpace: 'pre-wrap' }}>
          {remarks}
        </div>
      ) : null}
      {children}
      {visiblePhotos.length > 0 ? (
        <PhotoGallery photos={visiblePhotos} readOnly={readOnly} emptyMessage="" />
      ) : null}
    </div>
  )
}

export const HydraulicEquipmentChecks = ({
  mainLocation,
  mainLocationLabel,
  checks,
  summary,
  onUpdateCheck,
  onMarkEquipmentOk,
  onMarkAllOk,
  onRequestPhotoUpload,
  onRequestDefectPhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  onAddEquipment,
  onEditEquipment,
  onDeleteEquipment,
  fieldError = false,
  remarksError = false,
  readOnly = false,
}) => {
  const visibleChecks = summary?.visibleChecks || checks || []
  const [expandedGeneralRemarks, setExpandedGeneralRemarks] = useState({})
  const displayMainLocation = String(mainLocationLabel || mainLocation || '').trim()

  if (!mainLocation && visibleChecks.length === 0) return null

  if (visibleChecks.length === 0) {
    return (
      <div className="d-grid gap-2">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="fw-semibold text-muted">Hydraulic Equipment Checks</div>
          {!readOnly ? (
            <CreateActionButton
              label="Add equipment (0)"
              className="inspection-compact-action-btn"
              onClick={onAddEquipment}
            />
          ) : null}
        </div>
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          No hydraulic equipment has been added for this location.
        </div>
      </div>
    )
  }

  const checksById = new Map((checks || []).map((check) => [String(check.id || ''), check]))

  return (
    <div className="d-grid gap-3">
      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">Hydraulic Equipment Checks</div>
          <div className="inspection-hydraulic-summary-pills d-flex flex-wrap align-items-center gap-1">
            {displayMainLocation ? (
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {displayMainLocation}
              </span>
            ) : null}
            {summary ? (
              <>
                <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                  {summary.checkedCount} of {summary.totalCount} checked
                </span>
                <span
                  className={`inspection-hydraulic-summary-pill badge border ${
                    summary.defectCount > 0
                      ? 'text-bg-danger-subtle text-danger border-danger-subtle'
                      : 'text-bg-light text-body'
                  }`}
                >
                  {summary.defectCount > 0
                    ? `${summary.defectCount} defect${summary.defectCount === 1 ? '' : 's'}`
                    : 'No defects'}
                </span>
                {!readOnly && summary.incompleteDefectEvidenceCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.incompleteDefectEvidenceCount} need evidence
                  </span>
                ) : null}
                {!readOnly && summary.incompleteNaReasonCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.incompleteNaReasonCount} need N/A reason
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {!readOnly ? (
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
            <CreateActionButton
              label="Mark all OK"
              className="inspection-compact-action-btn"
              onClick={onMarkAllOk}
            />
            <CreateActionButton
              label={`Add equipment (${summary?.totalCount || visibleChecks.length})`}
              className="inspection-compact-action-btn"
              onClick={onAddEquipment}
            />
          </div>
        ) : null}
      </div>

      <div className="inspection-hydraulic-card-grid gap-5">
        {visibleChecks.map((row) => {
          const current = { ...row, ...(checksById.get(String(row.id || '')) || {}) }
          const hasDefect = HYDRAULIC_CHECK_FIELDS.some((field) => current[field.key] === 'Defect')
          const hasGeneralRemarks = String(current.remarks || '').trim() !== ''
          const showGeneralRemarks = Boolean(
            readOnly ? hasGeneralRemarks : expandedGeneralRemarks[row.id] || hasGeneralRemarks,
          )
          const photos = Array.isArray(current.photos) ? current.photos : []
          return (
            <CCard key={row.id || row.equipment} className="inspection-hydraulic-card">
              <CCardHeader className="inspection-hydraulic-card-header d-flex align-items-center justify-content-between gap-2">
                <div className="d-flex flex-wrap align-items-center gap-2" style={{ minWidth: 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <div className="fw-semibold text-break">{row.equipment}</div>
                      {row.isCustomEquipment || row.equipmentSource === 'custom' ? (
                        <span className="badge text-bg-light border text-body-secondary">
                          Custom
                        </span>
                      ) : null}
                      {hasDefect ? (
                        <span className="badge text-bg-danger-subtle text-danger border border-danger-subtle">
                          Defect
                        </span>
                      ) : null}
                    </div>
                    {row.equipmentDescription ? (
                      <div className="small text-body-secondary mt-1 text-break">
                        {row.equipmentDescription}
                      </div>
                    ) : null}
                  </div>
                </div>
                {!readOnly ? (
                  <div className="d-flex flex-wrap align-items-center justify-content-end gap-1 flex-shrink-0">
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      className="inspection-compact-action-btn"
                      onClick={() => onMarkEquipmentOk?.(row)}
                    >
                      Mark OK
                    </CButton>
                    {(row.canEdit || row.canDelete) && row.equipmentId ? (
                      <>
                        {row.canEdit ? (
                          <CButton
                            type="button"
                            color="secondary"
                            variant="outline"
                            size="sm"
                            className="inspection-compact-action-btn"
                            onClick={() => onEditEquipment?.(row)}
                          >
                            Edit
                          </CButton>
                        ) : null}
                        {row.canDelete ? (
                          <CButton
                            type="button"
                            color="danger"
                            variant="outline"
                            size="sm"
                            className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
                            onClick={() => onDeleteEquipment?.(row)}
                          >
                            <Trash2 size={13} />
                            Delete
                          </CButton>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </CCardHeader>

              <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
                {HYDRAULIC_CHECK_FIELDS.map((field) => {
                  const isDefect = current[field.key] === 'Defect'
                  const isNotApplicable = current[field.key] === 'N/A'
                  const defectRemarks = String(current[field.remarksKey] || '')
                  const defectPhotos = Array.isArray(current[field.photosKey])
                    ? current[field.photosKey]
                    : []
                  const isMissingRemark = isDefect && !defectRemarks.trim()
                  const isMissingPhoto = isDefect && defectPhotos.length === 0
                  const isMissingNaReason = isNotApplicable && !defectRemarks.trim()
                  return (
                    <div
                      key={field.key}
                      className="inspection-hydraulic-check-with-evidence d-grid gap-2"
                    >
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
                            <div className="d-flex flex-wrap justify-content-end gap-2">
                              <CreateActionButton
                                label="Add defect photo"
                                className="inspection-compact-action-btn"
                                icon={<Camera size={13} className="me-1 align-text-bottom" />}
                                onClick={() => onRequestDefectPhotoUpload?.(row, field)}
                              />
                            </div>
                            {remarksError && isMissingRemark ? (
                              <FormFieldError>
                                {field.label} defect remarks are required.
                              </FormFieldError>
                            ) : null}
                            {remarksError && isMissingPhoto ? (
                              <FormFieldError>
                                {field.label} defect photo is required.
                              </FormFieldError>
                            ) : null}
                            {defectPhotos.length > 0 ? (
                              <PhotoGallery
                                photos={defectPhotos}
                                onRemove={(photoId) =>
                                  onRemovePhoto?.(row, photoId, field.photosKey)
                                }
                                onChangeDescription={(photoId, description) =>
                                  onChangePhotoDescription?.(
                                    row,
                                    photoId,
                                    description,
                                    field.photosKey,
                                  )
                                }
                                onApplyCaption={(photoId, caption) =>
                                  onApplyPhotoCaption?.(row, photoId, caption, field.photosKey)
                                }
                              />
                            ) : null}
                          </div>
                        )
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
                <div className="d-grid gap-2">
                  {(readOnly && (showGeneralRemarks || photos.length > 0)) || !readOnly ? (
                    <div className="small fw-semibold text-muted">Additional Info (optional)</div>
                  ) : null}
                  {!readOnly ? (
                    <div className="d-flex flex-wrap justify-content-end gap-2">
                      {!showGeneralRemarks ? (
                        <CreateActionButton
                          label="Add general remark"
                          className="inspection-compact-action-btn"
                          onClick={() =>
                            setExpandedGeneralRemarks((currentExpanded) => ({
                              ...currentExpanded,
                              [row.id]: true,
                            }))
                          }
                        />
                      ) : null}
                      <CreateActionButton
                        label="Add equipment photo"
                        className="inspection-compact-action-btn"
                        icon={<Camera size={13} className="me-1 align-text-bottom" />}
                        onClick={() => onRequestPhotoUpload?.(row)}
                      />
                    </div>
                  ) : null}
                  {showGeneralRemarks ? (
                    readOnly ? (
                      <div className="small">
                        <div className="fw-semibold text-body-secondary">
                          General equipment remarks
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{current.remarks}</div>
                      </div>
                    ) : (
                      <div className="d-grid gap-1">
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <div className="small fw-semibold text-muted">
                            General equipment remarks
                          </div>
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
                          value={current.remarks || ''}
                          placeholder="General equipment remarks"
                          onChange={(event) => onUpdateCheck(row, { remarks: event.target.value })}
                        />
                      </div>
                    )
                  ) : null}
                  {photos.length > 0 ? (
                    <PhotoGallery
                      photos={photos}
                      readOnly={readOnly}
                      onRemove={(photoId) => onRemovePhoto?.(row, photoId, 'photos')}
                      onChangeDescription={(photoId, description) =>
                        onChangePhotoDescription?.(row, photoId, description, 'photos')
                      }
                      onApplyCaption={(photoId, caption) =>
                        onApplyPhotoCaption?.(row, photoId, caption, 'photos')
                      }
                    />
                  ) : null}
                </div>
              </CCardBody>
            </CCard>
          )
        })}
      </div>

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldError ? 'Complete all hydraulic equipment checks before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {remarksError ? 'Add defect evidence and N/A reasons before review.' : ''}
          </FormFieldError>
        </>
      ) : null}
    </div>
  )
}

const ErAuxConditionSegment = ({ value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-check-row d-flex align-items-center justify-content-between gap-2">
    <div className="inspection-hydraulic-check-label small fw-semibold text-muted">Condition</div>
    <div className="inspection-hydraulic-status-group d-flex flex-wrap justify-content-end gap-3">
      {ER_AUX_CONDITION_OPTIONS.map((option) =>
        readOnly ? (
          <span
            key={option.value}
            className={`inspection-hydraulic-status-btn btn btn-sm ${
              value === option.value ? 'btn-primary' : 'btn-outline-secondary'
            } pe-none`.trim()}
            aria-current={value === option.value ? 'true' : undefined}
          >
            {option.label}
          </span>
        ) : (
          <CButton
            key={option.value}
            type="button"
            color={value === option.value ? 'primary' : 'secondary'}
            variant={value === option.value ? undefined : 'outline'}
            size="sm"
            className="inspection-hydraulic-status-btn"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </CButton>
        ),
      )}
    </div>
  </div>
)

export const ErAuxEquipmentChecks = ({
  mainLocation,
  mainLocationLabel,
  checks,
  summary,
  inspectedBy = '',
  inspectionDate = '',
  onUpdateCheck,
  onUpdateSessionMeta,
  onMarkEquipmentOk,
  onMarkAllOk,
  onAddEquipment,
  onEditEquipment,
  onDeleteEquipment,
  fieldError = false,
  remarksError = false,
  sessionError = false,
  readOnly = false,
}) => {
  const visibleChecks = summary?.visibleChecks || checks || []
  const displayMainLocation = String(mainLocationLabel || mainLocation || '').trim()

  if (!mainLocation && visibleChecks.length === 0) return null

  return (
    <div className="d-grid gap-3">
      <CCard className="inspection-hydraulic-card">
        <CCardHeader className="inspection-hydraulic-card-header">
          <div className="fw-semibold text-muted">Inspection Session</div>
        </CCardHeader>
        <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
          {readOnly ? (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="small text-body-secondary">Inspected By</div>
                <div className="fw-semibold">{String(inspectedBy || '--')}</div>
              </div>
              <div className="col-12 col-md-6">
                <div className="small text-body-secondary">Inspection Date</div>
                <div className="fw-semibold">{String(inspectionDate || '--')}</div>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="small fw-semibold text-muted mb-1">Inspected By</div>
                <CFormInput
                  value={String(inspectedBy || '')}
                  placeholder="Inspector name"
                  onChange={(event) =>
                    onUpdateSessionMeta?.('erAuxInspectedBy', event.target.value)
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <div className="small fw-semibold text-muted mb-1">Inspection Date</div>
                <CFormInput
                  type="date"
                  value={String(inspectionDate || '')}
                  onChange={(event) =>
                    onUpdateSessionMeta?.('erAuxInspectionDate', event.target.value)
                  }
                />
              </div>
            </div>
          )}
          {!readOnly && sessionError ? (
            <FormFieldError>Inspector name and inspection date are required.</FormFieldError>
          ) : null}
        </CCardBody>
      </CCard>

      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">ER Aux Equipment Checks</div>
          <div className="inspection-hydraulic-summary-pills d-flex flex-wrap align-items-center gap-1">
            {displayMainLocation ? (
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {displayMainLocation}
              </span>
            ) : null}
            {summary ? (
              <>
                <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                  {summary.checkedCount} of {summary.totalCount} checked
                </span>
                <span
                  className={`inspection-hydraulic-summary-pill badge border ${
                    summary.issueCount > 0
                      ? 'text-bg-danger-subtle text-danger border-danger-subtle'
                      : 'text-bg-light text-body'
                  }`}
                >
                  {summary.issueCount > 0
                    ? `${summary.issueCount} issue${summary.issueCount === 1 ? '' : 's'}`
                    : 'No issues'}
                </span>
                {!readOnly && summary.incompleteRemarksCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.incompleteRemarksCount} need remarks
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {!readOnly ? (
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
            <CreateActionButton
              label="Mark all OK"
              className="inspection-compact-action-btn"
              onClick={onMarkAllOk}
            />
            <CreateActionButton
              label={`Add equipment (${summary?.totalCount || visibleChecks.length})`}
              className="inspection-compact-action-btn"
              onClick={onAddEquipment}
            />
          </div>
        ) : null}
      </div>

      {visibleChecks.length === 0 ? (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          No ER Aux equipment has been added for this location.
        </div>
      ) : (
        <div className="inspection-hydraulic-card-grid gap-5">
          {visibleChecks.map((row) => {
            const hasIssue = ['Defect', 'Missing', 'N/A'].includes(
              String(row.condition || '').trim(),
            )
            const quantity = String(row.quantity || row.defaultQuantity || '')

            return (
              <CCard key={row.id || row.equipment} className="inspection-hydraulic-card">
                <CCardHeader className="inspection-hydraulic-card-header d-flex align-items-center justify-content-between gap-2">
                  <div style={{ minWidth: 0 }}>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <div className="fw-semibold text-break">{row.equipment}</div>
                      {row.isCustomEquipment || row.equipmentSource === 'custom' ? (
                        <span className="badge text-bg-light border text-body-secondary">
                          Custom
                        </span>
                      ) : null}
                      {hasIssue ? (
                        <span className="badge text-bg-danger-subtle text-danger border border-danger-subtle">
                          Issue
                        </span>
                      ) : null}
                    </div>
                    {row.equipmentDescription ? (
                      <div className="small text-body-secondary mt-1 text-break">
                        {row.equipmentDescription}
                      </div>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <div className="d-flex flex-wrap align-items-center justify-content-end gap-1 flex-shrink-0">
                      <CButton
                        type="button"
                        color="secondary"
                        variant="outline"
                        size="sm"
                        className="inspection-compact-action-btn"
                        onClick={() => onMarkEquipmentOk?.(row)}
                      >
                        Mark OK
                      </CButton>
                      {(row.canEdit || row.canDelete) && row.equipmentId ? (
                        <>
                          {row.canEdit ? (
                            <CButton
                              type="button"
                              color="secondary"
                              variant="outline"
                              size="sm"
                              className="inspection-compact-action-btn"
                              onClick={() => onEditEquipment?.(row)}
                            >
                              Edit
                            </CButton>
                          ) : null}
                          {row.canDelete ? (
                            <CButton
                              type="button"
                              color="danger"
                              variant="outline"
                              size="sm"
                              className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
                              onClick={() => onDeleteEquipment?.(row)}
                            >
                              <Trash2 size={13} />
                              Delete
                            </CButton>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </CCardHeader>
                <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
                  {readOnly ? (
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <div className="small text-body-secondary">Quantity</div>
                        <div className="fw-semibold">{quantity || '--'}</div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="small text-body-secondary">Condition</div>
                        <div className="fw-semibold">{row.condition || '--'}</div>
                      </div>
                      <div className="col-12">
                        <div className="small text-body-secondary">Remarks</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{row.remarks || '--'}</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="row g-3">
                        <div className="col-12 col-md-4">
                          <div className="small fw-semibold text-muted mb-1">Quantity</div>
                          <CFormInput
                            value={quantity}
                            inputMode="numeric"
                            placeholder="Quantity"
                            onChange={(event) =>
                              onUpdateCheck?.(row, { quantity: event.target.value })
                            }
                          />
                        </div>
                        <div className="col-12 col-md-8">
                          <ErAuxConditionSegment
                            value={row.condition}
                            onChange={(nextValue) => onUpdateCheck?.(row, { condition: nextValue })}
                          />
                        </div>
                      </div>
                      <div className="d-grid gap-1">
                        <div className="small fw-semibold text-muted">Remarks</div>
                        <CFormTextarea
                          rows={2}
                          value={row.remarks || ''}
                          placeholder="Condition remarks"
                          onChange={(event) =>
                            onUpdateCheck?.(row, { remarks: event.target.value })
                          }
                        />
                        {remarksError &&
                        ['Defect', 'Missing', 'N/A'].includes(String(row.condition || '').trim()) &&
                        !String(row.remarks || '').trim() ? (
                          <FormFieldError>
                            Condition remarks are required for issues.
                          </FormFieldError>
                        ) : null}
                      </div>
                    </>
                  )}
                </CCardBody>
              </CCard>
            )
          })}
        </div>
      )}

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldError ? 'Complete all ER Aux rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {remarksError ? 'Add remarks for issue conditions before review.' : ''}
          </FormFieldError>
        </>
      ) : null}
    </div>
  )
}

const HighAngleStatusSegment = ({ value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-status-group d-flex flex-wrap justify-content-end gap-3">
    {HIGH_ANGLE_STATUS_OPTIONS.map((option) =>
      readOnly ? (
        <span
          key={option.value}
          className={`inspection-hydraulic-status-btn btn btn-sm ${
            value === option.value ? 'btn-primary' : 'btn-outline-secondary'
          } pe-none`.trim()}
          aria-current={value === option.value ? 'true' : undefined}
        >
          {option.label}
        </span>
      ) : (
        <CButton
          key={option.value}
          type="button"
          color={value === option.value ? 'primary' : 'secondary'}
          variant={value === option.value ? undefined : 'outline'}
          size="sm"
          className="inspection-hydraulic-status-btn"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </CButton>
      ),
    )}
  </div>
)

export const HighAngleInspectionChecks = ({
  mainLocation,
  mainLocationLabel,
  summary,
  inspectedBy = '',
  inspectionDate = '',
  onUpdateSessionMeta,
  onUpdateCheck,
  onMarkRowOk,
  onMarkAllOk,
  fieldError = false,
  remarksError = false,
  sessionError = false,
  readOnly = false,
}) => {
  const displayKit = String(mainLocationLabel || mainLocation || '').trim()
  const visibleGroups = summary?.visibleGroups || []

  if (!mainLocation && visibleGroups.length === 0) return null

  return (
    <div className="d-grid gap-3">
      <CCard className="inspection-hydraulic-card">
        <CCardHeader className="inspection-hydraulic-card-header">
          <div className="fw-semibold text-muted">Inspection Session</div>
        </CCardHeader>
        <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
          {readOnly ? (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="small text-body-secondary">Inspected By</div>
                <div className="fw-semibold">{String(inspectedBy || '--')}</div>
              </div>
              <div className="col-12 col-md-6">
                <div className="small text-body-secondary">Inspection Date</div>
                <div className="fw-semibold">{String(inspectionDate || '--')}</div>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="small fw-semibold text-muted mb-1">Inspected By</div>
                <CFormInput
                  value={String(inspectedBy || '')}
                  placeholder="Inspector name"
                  onChange={(event) =>
                    onUpdateSessionMeta?.('highAngleInspectedBy', event.target.value)
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <div className="small fw-semibold text-muted mb-1">Inspection Date</div>
                <CFormInput
                  type="date"
                  value={String(inspectionDate || '')}
                  onChange={(event) =>
                    onUpdateSessionMeta?.('highAngleInspectionDate', event.target.value)
                  }
                />
              </div>
            </div>
          )}
          {!readOnly && sessionError ? (
            <FormFieldError>Inspector name and inspection date are required.</FormFieldError>
          ) : null}
        </CCardBody>
      </CCard>

      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">High Angle Rescue Equipment Checks</div>
          <div className="inspection-hydraulic-summary-pills d-flex flex-wrap align-items-center gap-1">
            {displayKit ? (
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {displayKit}
              </span>
            ) : null}
            {summary ? (
              <>
                <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                  {summary.checkedCount} of {summary.totalCount} checked
                </span>
                <span
                  className={`inspection-hydraulic-summary-pill badge border ${
                    summary.issueCount > 0
                      ? 'text-bg-danger-subtle text-danger border-danger-subtle'
                      : 'text-bg-light text-body'
                  }`}
                >
                  {summary.issueCount > 0
                    ? `${summary.issueCount} issue row${summary.issueCount === 1 ? '' : 's'}`
                    : 'No issues'}
                </span>
                {!readOnly && summary.incompleteRemarksCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.incompleteRemarksCount} need remarks
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {!readOnly ? (
          <CreateActionButton
            label="Mark all Good"
            className="inspection-compact-action-btn"
            onClick={onMarkAllOk}
          />
        ) : null}
      </div>

      {visibleGroups.map((group) => (
        <div key={group.key} className="d-grid gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="fw-semibold text-muted">{group.title}</div>
            <div className="inspection-hydraulic-summary-pills d-flex flex-wrap align-items-center gap-1">
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {group.checkedCount} of {group.rows.length} checked
              </span>
              {group.issueCount > 0 ? (
                <span className="inspection-hydraulic-summary-pill badge text-bg-danger-subtle text-danger border border-danger-subtle">
                  {group.issueCount} issue row{group.issueCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </div>

          <div className="inspection-hydraulic-card-grid gap-5">
            {group.rows.map((row) => {
              const hasIssue = String(row.condition || '') === 'Not Good'
              const storageLabel = formatHighAngleGroupLabel(row)

              return (
                <CCard
                  key={row.id || `${row.mainLocation}:${row.rowNumber}`}
                  className="inspection-hydraulic-card"
                >
                  <CCardHeader className="inspection-hydraulic-card-header d-flex align-items-center justify-content-between gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <div className="fw-semibold text-break">{row.equipment || 'Equipment'}</div>
                        {hasIssue ? (
                          <span className="badge text-bg-danger-subtle text-danger border border-danger-subtle">
                            Issue
                          </span>
                        ) : null}
                      </div>
                      <div className="small text-body-secondary mt-1 text-break">
                        Row {row.rowNumber || '--'} - Qty {row.quantity || '--'}
                      </div>
                      <div className="small text-body-secondary text-break">{storageLabel}</div>
                    </div>
                    {!readOnly ? (
                      <CButton
                        type="button"
                        color="secondary"
                        variant="outline"
                        size="sm"
                        className="inspection-compact-action-btn"
                        onClick={() => onMarkRowOk?.(row)}
                      >
                        Mark Good
                      </CButton>
                    ) : null}
                  </CCardHeader>
                  <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
                    {readOnly ? (
                      <>
                        <div className="row g-3">
                          <div className="col-12 col-md-4">
                            <div className="small text-body-secondary">Storage Location</div>
                            <div className="fw-semibold">{row.location || '--'}</div>
                          </div>
                          <div className="col-12 col-md-4">
                            <div className="small text-body-secondary">Compartment</div>
                            <div className="fw-semibold">{row.subLocation || '--'}</div>
                          </div>
                          <div className="col-12 col-md-4">
                            <div className="small text-body-secondary">Quantity</div>
                            <div className="fw-semibold">{row.quantity || '--'}</div>
                          </div>
                          <div className="col-12">
                            <div className="small text-body-secondary">Condition</div>
                            <div className="fw-semibold">{row.condition || '--'}</div>
                          </div>
                        </div>
                        <div className="small text-body-secondary">Remarks</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{row.remarks || '--'}</div>
                      </>
                    ) : (
                      <>
                        <div className="row g-3">
                          <div className="col-12 col-md-4">
                            <div className="small text-body-secondary">Storage Location</div>
                            <div className="fw-semibold">{row.location || '--'}</div>
                          </div>
                          <div className="col-12 col-md-4">
                            <div className="small text-body-secondary">Compartment</div>
                            <div className="fw-semibold">{row.subLocation || '--'}</div>
                          </div>
                          <div className="col-12 col-md-4">
                            <div className="small text-body-secondary">Quantity</div>
                            <div className="fw-semibold">{row.quantity || '--'}</div>
                          </div>
                          <div className="col-12">
                            <div className="small fw-semibold text-muted mb-1">Condition</div>
                            <HighAngleStatusSegment
                              value={row.condition}
                              onChange={(nextValue) =>
                                onUpdateCheck?.(row, {
                                  condition: nextValue,
                                })
                              }
                            />
                          </div>
                        </div>
                        {hasIssue ? (
                          <div className="d-grid gap-1">
                            <div className="small fw-semibold text-muted">Remarks</div>
                            <CFormTextarea
                              rows={2}
                              value={row.remarks || ''}
                              placeholder="Issue remarks"
                              onChange={(event) =>
                                onUpdateCheck?.(row, {
                                  remarks: event.target.value,
                                })
                              }
                            />
                            {remarksError && !String(row.remarks || '').trim() ? (
                              <FormFieldError>Remarks are required for issue rows.</FormFieldError>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    )}
                  </CCardBody>
                </CCard>
              )
            })}
          </div>
        </div>
      ))}

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldError ? 'Complete all High Angle rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {remarksError ? 'Add remarks for High Angle issue rows before review.' : ''}
          </FormFieldError>
        </>
      ) : null}
    </div>
  )
}

const FrtStatusSegment = ({ options, value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-status-group d-flex flex-wrap justify-content-end gap-3">
    {options.map((option) =>
      readOnly ? (
        <span
          key={option.value}
          className={`inspection-hydraulic-status-btn btn btn-sm ${
            value === option.value ? 'btn-primary' : 'btn-outline-secondary'
          } pe-none`.trim()}
          aria-current={value === option.value ? 'true' : undefined}
        >
          {option.label}
        </span>
      ) : (
        <CButton
          key={option.value}
          type="button"
          color={value === option.value ? 'primary' : 'secondary'}
          variant={value === option.value ? undefined : 'outline'}
          size="sm"
          className="inspection-hydraulic-status-btn"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </CButton>
      ),
    )}
  </div>
)

export const FrtDailyInspectionChecks = ({
  mainLocation,
  mainLocationLabel,
  summary,
  form = {},
  onUpdateSessionMeta,
  onUpdateCheck,
  onMarkRowOk,
  onMarkAllOk,
  fieldErrors = {},
  readOnly = false,
}) => {
  const displayTruck = String(mainLocationLabel || mainLocation || '').trim()
  const dailySections = summary?.visibleDailySections || []
  const oneOffSections = summary?.visibleOneOffSections || []
  const truckReference = summary?.truckReference || form?.frtTruckReference || {}
  const inspectedBy = String(form?.frtInspectedBy || '').trim()
  const inspectionDate = String(form?.frtInspectionDate || '').trim()
  const shift = String(form?.frtShift || '').trim()
  const dailyRemarks = String(form?.frtDailyRemarks || '').trim()
  const oneOffRemarks = String(form?.frtOneOffRemarks || '').trim()

  if (!mainLocation && dailySections.length === 0 && oneOffSections.length === 0) return null

  return (
    <div className="d-grid gap-3">
      <CCard className="inspection-hydraulic-card">
        <CCardHeader className="inspection-hydraulic-card-header">
          <div className="fw-semibold text-muted">Inspection Session</div>
        </CCardHeader>
        <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
          {readOnly ? (
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="small text-body-secondary">Inspected By</div>
                <div className="fw-semibold">{inspectedBy || '--'}</div>
              </div>
              <div className="col-12 col-md-4">
                <div className="small text-body-secondary">Inspection Date</div>
                <div className="fw-semibold">{inspectionDate || '--'}</div>
              </div>
              <div className="col-12 col-md-4">
                <div className="small text-body-secondary">Shift</div>
                <div className="fw-semibold">{shift || '--'}</div>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="small fw-semibold text-muted mb-1">Inspected By</div>
                <CFormInput
                  value={inspectedBy}
                  placeholder="Inspector name"
                  onChange={(event) => onUpdateSessionMeta?.('frtInspectedBy', event.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <div className="small fw-semibold text-muted mb-1">Inspection Date</div>
                <CFormInput
                  type="date"
                  value={inspectionDate}
                  onChange={(event) =>
                    onUpdateSessionMeta?.('frtInspectionDate', event.target.value)
                  }
                />
              </div>
              <div className="col-12 col-md-4">
                <div className="small fw-semibold text-muted mb-1">Shift</div>
                <CFormInput
                  value={shift}
                  placeholder="Day / Night"
                  onChange={(event) => onUpdateSessionMeta?.('frtShift', event.target.value)}
                />
              </div>
            </div>
          )}
          {!readOnly && fieldErrors.frtSession ? (
            <FormFieldError>
              Inspector name, inspection date, and shift are required.
            </FormFieldError>
          ) : null}
        </CCardBody>
      </CCard>

      <CCard className="inspection-hydraulic-card">
        <CCardHeader className="inspection-hydraulic-card-header">
          <div className="fw-semibold text-muted">Truck Reference</div>
        </CCardHeader>
        <CCardBody className="inspection-hydraulic-card-body">
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <div className="small text-body-secondary">Plate No.</div>
              <div className="fw-semibold">{truckReference.plateNo || '--'}</div>
            </div>
            <div className="col-12 col-md-3">
              <div className="small text-body-secondary">Road Tax Expiry</div>
              <div className="fw-semibold">{truckReference.roadTaxExpiry || '--'}</div>
            </div>
            <div className="col-12 col-md-3">
              <div className="small text-body-secondary">Insurance Expiry</div>
              <div className="fw-semibold">{truckReference.insuranceExpiry || '--'}</div>
            </div>
            <div className="col-12 col-md-3">
              <div className="small text-body-secondary">Puspakom Expiry</div>
              <div className="fw-semibold">{truckReference.puspakomExpiry || '--'}</div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">FRT Daily Roster</div>
          <div className="inspection-hydraulic-summary-pills d-flex flex-wrap align-items-center gap-1">
            {displayTruck ? (
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {displayTruck}
              </span>
            ) : null}
            {summary ? (
              <>
                <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                  {summary.dailyCheckedCount} of {summary.dailyRows.length} complete
                </span>
                <span
                  className={`inspection-hydraulic-summary-pill badge border ${
                    summary.dailyIssueCount > 0
                      ? 'text-bg-danger-subtle text-danger border-danger-subtle'
                      : 'text-bg-light text-body'
                  }`}
                >
                  {summary.dailyIssueCount > 0
                    ? `${summary.dailyIssueCount} issue row${summary.dailyIssueCount === 1 ? '' : 's'}`
                    : 'No issues'}
                </span>
                {!readOnly && summary.dailyIncompleteRemarksCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.dailyIncompleteRemarksCount} need remarks
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {!readOnly ? (
          <CreateActionButton
            label="Mark all status rows Checked"
            className="inspection-compact-action-btn"
            onClick={onMarkAllOk}
          />
        ) : null}
      </div>

      {dailySections.map((section) => (
        <CCard key={section.key} className="inspection-hydraulic-card">
          <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="fw-semibold">{section.title}</div>
            <div className="inspection-hydraulic-summary-pills d-flex flex-wrap gap-1">
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {section.checkedCount} of {section.visibleRows.length} complete
              </span>
              {section.issueCount > 0 ? (
                <span className="inspection-hydraulic-summary-pill badge text-bg-danger-subtle text-danger border border-danger-subtle">
                  {section.issueCount} issue row{section.issueCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </CCardHeader>
          <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
            {section.visibleRows.map((row) => {
              const isReadingRow = row.rowKind === 'reading'
              const hasIssue = row.status === 'Issue'
              return (
                <div key={row.id} className="rounded-3 border p-3 d-grid gap-3">
                  <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-semibold text-break">{row.equipment}</div>
                      <div className="small text-body-secondary">
                        Row {row.rowNumber || '--'}
                        {!isReadingRow ? ` • Qty ${row.quantity || '--'}` : ''}
                      </div>
                    </div>
                    {!readOnly && !isReadingRow ? (
                      <CButton
                        type="button"
                        color="secondary"
                        variant="outline"
                        size="sm"
                        className="inspection-compact-action-btn"
                        onClick={() => onMarkRowOk?.(row)}
                      >
                        Mark Checked
                      </CButton>
                    ) : null}
                  </div>

                  {readOnly ? (
                    <>
                      <div className="row g-3">
                        {!isReadingRow ? (
                          <>
                            <div className="col-12 col-md-4">
                              <div className="small text-body-secondary">Quantity</div>
                              <div className="fw-semibold">{row.quantity || '--'}</div>
                            </div>
                            <div className="col-12 col-md-8">
                              <div className="small text-body-secondary">Status</div>
                              <div className="fw-semibold">{row.status || '--'}</div>
                            </div>
                          </>
                        ) : (
                          <div className="col-12">
                            <div className="small text-body-secondary">Reading</div>
                            <div className="fw-semibold">{row.readingValue || '--'}</div>
                          </div>
                        )}
                      </div>
                      {!isReadingRow && hasIssue ? (
                        <div>
                          <div className="small text-body-secondary">Remarks</div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{row.remarks || '--'}</div>
                        </div>
                      ) : null}
                    </>
                  ) : isReadingRow ? (
                    <div className="d-grid gap-1">
                      <div className="small fw-semibold text-muted">Reading</div>
                      <CFormInput
                        value={row.readingValue || ''}
                        inputMode="numeric"
                        placeholder={
                          row.equipment === 'FUEL LEVEL (%)' ? 'Fuel level %' : 'Enter reading'
                        }
                        onChange={(event) =>
                          onUpdateCheck?.(row, { readingValue: event.target.value })
                        }
                      />
                      {fieldErrors.frtDailyChecks && !String(row.readingValue || '').trim() ? (
                        <FormFieldError>Reading is required.</FormFieldError>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <div className="row g-3">
                        <div className="col-12 col-md-4">
                          <div className="small text-body-secondary">Quantity</div>
                          <div className="fw-semibold">{row.quantity || '--'}</div>
                        </div>
                        <div className="col-12 col-md-8">
                          <div className="small fw-semibold text-muted mb-1">Status</div>
                          <FrtStatusSegment
                            options={FRT_DAILY_STATUS_OPTIONS}
                            value={row.status}
                            onChange={(nextValue) => onUpdateCheck?.(row, { status: nextValue })}
                          />
                        </div>
                      </div>
                      {hasIssue ? (
                        <div className="d-grid gap-1">
                          <div className="small fw-semibold text-muted">Remarks</div>
                          <CFormTextarea
                            rows={2}
                            value={row.remarks || ''}
                            placeholder="Issue remarks"
                            onChange={(event) =>
                              onUpdateCheck?.(row, { remarks: event.target.value })
                            }
                          />
                          {fieldErrors.frtDailyRemarks && !String(row.remarks || '').trim() ? (
                            <FormFieldError>Remarks are required for issue rows.</FormFieldError>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )
            })}
          </CCardBody>
        </CCard>
      ))}

      <div className="d-grid gap-1">
        <div className="small fw-semibold text-muted">Daily Remarks</div>
        {readOnly ? (
          <div className="rounded-3 border bg-light-subtle p-3" style={{ whiteSpace: 'pre-wrap' }}>
            {dailyRemarks || '--'}
          </div>
        ) : (
          <CFormTextarea
            rows={3}
            value={dailyRemarks}
            placeholder="Optional daily roster remarks"
            onChange={(event) => onUpdateSessionMeta?.('frtDailyRemarks', event.target.value)}
          />
        )}
      </div>

      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center gap-2">
        <div className="fw-semibold text-muted">FRT One-Off Checklist</div>
        <div className="inspection-hydraulic-summary-pills d-flex flex-wrap gap-1">
          {summary ? (
            <>
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {summary.oneOffCheckedCount} of {summary.oneOffRows.length} complete
              </span>
              <span
                className={`inspection-hydraulic-summary-pill badge border ${
                  summary.oneOffIssueCount > 0
                    ? 'text-bg-danger-subtle text-danger border-danger-subtle'
                    : 'text-bg-light text-body'
                }`}
              >
                {summary.oneOffIssueCount > 0
                  ? `${summary.oneOffIssueCount} issue row${summary.oneOffIssueCount === 1 ? '' : 's'}`
                  : 'No issues'}
              </span>
              {!readOnly && summary.oneOffIncompleteRemarksCount > 0 ? (
                <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                  {summary.oneOffIncompleteRemarksCount} need remarks
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {oneOffSections.map((section) => (
        <CCard key={section.key} className="inspection-hydraulic-card">
          <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="fw-semibold">{section.title}</div>
            <div className="inspection-hydraulic-summary-pills d-flex flex-wrap gap-1">
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {section.checkedCount} of {section.visibleRows.length} complete
              </span>
              {section.issueCount > 0 ? (
                <span className="inspection-hydraulic-summary-pill badge text-bg-danger-subtle text-danger border border-danger-subtle">
                  {section.issueCount} issue row{section.issueCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </CCardHeader>
          <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
            {section.visibleRows.map((row) => {
              const hasIssue = row.condition === 'Not Good'
              return (
                <div key={row.id} className="rounded-3 border p-3 d-grid gap-3">
                  <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-semibold text-break">{row.equipment}</div>
                      <div className="small text-body-secondary">Row {row.rowNumber || '--'}</div>
                    </div>
                    {!readOnly ? (
                      <CButton
                        type="button"
                        color="secondary"
                        variant="outline"
                        size="sm"
                        className="inspection-compact-action-btn"
                        onClick={() => onMarkRowOk?.(row)}
                      >
                        Mark Good
                      </CButton>
                    ) : null}
                  </div>
                  {readOnly ? (
                    <>
                      <div>
                        <div className="small text-body-secondary">Condition</div>
                        <div className="fw-semibold">{row.condition || '--'}</div>
                      </div>
                      {hasIssue ? (
                        <div>
                          <div className="small text-body-secondary">Remarks</div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{row.remarks || '--'}</div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="d-grid gap-1">
                        <div className="small fw-semibold text-muted">Condition</div>
                        <FrtStatusSegment
                          options={FRT_ONE_OFF_STATUS_OPTIONS}
                          value={row.condition}
                          onChange={(nextValue) => onUpdateCheck?.(row, { condition: nextValue })}
                        />
                      </div>
                      {hasIssue ? (
                        <div className="d-grid gap-1">
                          <div className="small fw-semibold text-muted">Remarks</div>
                          <CFormTextarea
                            rows={2}
                            value={row.remarks || ''}
                            placeholder="Issue remarks"
                            onChange={(event) =>
                              onUpdateCheck?.(row, { remarks: event.target.value })
                            }
                          />
                          {fieldErrors.frtOneOffRemarks && !String(row.remarks || '').trim() ? (
                            <FormFieldError>Remarks are required for Not Good rows.</FormFieldError>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )
            })}
          </CCardBody>
        </CCard>
      ))}

      <div className="d-grid gap-1">
        <div className="small fw-semibold text-muted">One-Off Remarks</div>
        {readOnly ? (
          <div className="rounded-3 border bg-light-subtle p-3" style={{ whiteSpace: 'pre-wrap' }}>
            {oneOffRemarks || '--'}
          </div>
        ) : (
          <CFormTextarea
            rows={3}
            value={oneOffRemarks}
            placeholder="Optional one-off checklist remarks"
            onChange={(event) => onUpdateSessionMeta?.('frtOneOffRemarks', event.target.value)}
          />
        )}
      </div>

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldErrors.frtDailyChecks ? 'Complete all daily roster rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {fieldErrors.frtDailyRemarks ? 'Add remarks for daily issue rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {fieldErrors.frtOneOffChecks ? 'Complete all one-off rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {fieldErrors.frtOneOffRemarks
              ? 'Add remarks for one-off issue rows before review.'
              : ''}
          </FormFieldError>
        </>
      ) : null}
    </div>
  )
}

const ScbaStatusSegment = ({ label, value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-check-row d-flex align-items-center justify-content-between gap-2">
    <div className="inspection-hydraulic-check-label small fw-semibold text-muted">{label}</div>
    <div className="inspection-hydraulic-status-group d-flex flex-wrap justify-content-end gap-3">
      {SCBA_STATUS_OPTIONS.map((option) =>
        readOnly ? (
          <span
            key={option.value}
            className={`inspection-hydraulic-status-btn btn btn-sm ${
              value === option.value ? 'btn-primary' : 'btn-outline-secondary'
            } pe-none`.trim()}
            aria-current={value === option.value ? 'true' : undefined}
          >
            {option.label}
          </span>
        ) : (
          <CButton
            key={option.value}
            type="button"
            color={value === option.value ? 'primary' : 'secondary'}
            variant={value === option.value ? undefined : 'outline'}
            size="sm"
            className="inspection-hydraulic-status-btn"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </CButton>
        ),
      )}
    </div>
  </div>
)

const getScbaDisplayLabel = (row = {}) => {
  const serialNo = String(row.serialNo || '').trim()
  const brand = String(row.brand || '').trim()
  if (brand && serialNo) return `${brand} ${serialNo}`
  return serialNo || brand || 'SCBA item'
}

const getScbaRowMeta = (sectionKey, row = {}) => {
  if (sectionKey === 'cylinder') {
    return [String(row.size || '').trim() && `${row.size}L`, String(row.cylinderType || '').trim()]
      .filter(Boolean)
      .join(' • ')
  }
  return String(row.brand || '').trim()
}

export const ScbaInspectionChecks = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  inspectedBy = '',
  inspectionDate = '',
  onUpdateSessionMeta,
  onUpdateGroupedCheck,
  onMarkRowOk,
  onMarkAllOk,
  fieldError = false,
  remarksError = false,
  sessionError = false,
  readOnly = false,
}) => {
  const displayMainLocation = String(mainLocationLabel || mainLocation || '').trim()
  const visibleSections =
    summary?.visibleSections ||
    SCBA_SECTION_DEFINITIONS.map((section) => ({
      ...section,
      visibleRows: [],
      checkedCount: 0,
      issueCount: 0,
      incompleteRemarksCount: 0,
    }))

  if (!mainLocation && visibleSections.every((section) => section.visibleRows.length === 0))
    return null

  return (
    <div className="d-grid gap-3">
      <CCard className="inspection-hydraulic-card">
        <CCardHeader className="inspection-hydraulic-card-header">
          <div className="fw-semibold text-muted">Inspection Session</div>
        </CCardHeader>
        <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
          {readOnly ? (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="small text-body-secondary">Inspected By</div>
                <div className="fw-semibold">{String(inspectedBy || '--')}</div>
              </div>
              <div className="col-12 col-md-6">
                <div className="small text-body-secondary">Inspection Date</div>
                <div className="fw-semibold">{String(inspectionDate || '--')}</div>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="small fw-semibold text-muted mb-1">Inspected By</div>
                <CFormInput
                  value={String(inspectedBy || '')}
                  placeholder="Inspector name"
                  onChange={(event) => onUpdateSessionMeta?.('scbaInspectedBy', event.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <div className="small fw-semibold text-muted mb-1">Inspection Date</div>
                <CFormInput
                  type="date"
                  value={String(inspectionDate || '')}
                  onChange={(event) =>
                    onUpdateSessionMeta?.('scbaInspectionDate', event.target.value)
                  }
                />
              </div>
            </div>
          )}
          {!readOnly && sessionError ? (
            <FormFieldError>Inspector name and inspection date are required.</FormFieldError>
          ) : null}
        </CCardBody>
      </CCard>

      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">SCBA Checks</div>
          <div className="inspection-hydraulic-summary-pills d-flex flex-wrap align-items-center gap-1">
            {displayMainLocation ? (
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {displayMainLocation}
              </span>
            ) : null}
            {summary ? (
              <>
                <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                  {summary.checkedCount} of {summary.totalCount} checked
                </span>
                <span
                  className={`inspection-hydraulic-summary-pill badge border ${
                    summary.issueCount > 0
                      ? 'text-bg-danger-subtle text-danger border-danger-subtle'
                      : 'text-bg-light text-body'
                  }`}
                >
                  {summary.issueCount > 0
                    ? `${summary.issueCount} issue field${summary.issueCount === 1 ? '' : 's'}`
                    : 'No issues'}
                </span>
                {!readOnly && summary.incompleteRemarksCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.incompleteRemarksCount} need remarks
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {!readOnly ? (
          <CreateActionButton
            label="Mark all Good"
            className="inspection-compact-action-btn"
            onClick={onMarkAllOk}
          />
        ) : null}
      </div>

      {visibleSections.map((section) => {
        const rows = section.visibleRows || []
        if (rows.length === 0) return null

        return (
          <div key={section.key} className="d-grid gap-3">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="fw-semibold text-muted">
                {section.title || getScbaSectionTitle(section.key)}
              </div>
              <div className="inspection-hydraulic-summary-pills d-flex flex-wrap align-items-center gap-1">
                <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                  {section.checkedCount} of {rows.length} checked
                </span>
                {section.issueCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-danger-subtle text-danger border border-danger-subtle">
                    {section.issueCount} issue field{section.issueCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="inspection-hydraulic-card-grid gap-5">
              {rows.map((row) => {
                const issueFields = getScbaSectionFields(section.key).filter(
                  (field) => field.kind === 'status' && String(row[field.key] || '') === 'Not Good',
                )
                const hasIssue = issueFields.length > 0

                return (
                  <CCard key={row.id || row.serialNo} className="inspection-hydraulic-card">
                    <CCardHeader className="inspection-hydraulic-card-header d-flex align-items-center justify-content-between gap-2">
                      <div style={{ minWidth: 0 }}>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <div className="fw-semibold text-break">{getScbaDisplayLabel(row)}</div>
                          {hasIssue ? (
                            <span className="badge text-bg-danger-subtle text-danger border border-danger-subtle">
                              Issue
                            </span>
                          ) : null}
                        </div>
                        {getScbaRowMeta(section.key, row) ? (
                          <div className="small text-body-secondary mt-1 text-break">
                            {getScbaRowMeta(section.key, row)}
                          </div>
                        ) : null}
                      </div>
                      {!readOnly ? (
                        <CButton
                          type="button"
                          color="secondary"
                          variant="outline"
                          size="sm"
                          className="inspection-compact-action-btn"
                          onClick={() => onMarkRowOk?.(section.key, row)}
                        >
                          Mark Good
                        </CButton>
                      ) : null}
                    </CCardHeader>
                    <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
                      {readOnly ? (
                        <>
                          <div className="row g-3">
                            {section.fields.map((field) => (
                              <div key={field.key} className="col-12 col-md-4">
                                <div className="small text-body-secondary">{field.label}</div>
                                <div className="fw-semibold">{String(row[field.key] || '--')}</div>
                              </div>
                            ))}
                          </div>
                          <div className="small text-body-secondary">Remarks</div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{row.remarks || '--'}</div>
                        </>
                      ) : (
                        <>
                          <div className="row g-3">
                            {section.fields.map((field) =>
                              field.kind === 'status' ? (
                                <div key={field.key} className="col-12">
                                  <ScbaStatusSegment
                                    label={field.label}
                                    value={row[field.key]}
                                    onChange={(nextValue) =>
                                      onUpdateGroupedCheck?.(section.key, row, {
                                        [field.key]: nextValue,
                                      })
                                    }
                                  />
                                </div>
                              ) : (
                                <div key={field.key} className="col-12 col-md-6">
                                  <div className="small fw-semibold text-muted mb-1">
                                    {field.label}
                                  </div>
                                  <CFormInput
                                    value={String(row[field.key] || '')}
                                    inputMode="numeric"
                                    placeholder={field.label}
                                    onChange={(event) =>
                                      onUpdateGroupedCheck?.(section.key, row, {
                                        [field.key]: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                              ),
                            )}
                          </div>
                          <div className="d-grid gap-1">
                            <div className="small fw-semibold text-muted">Remarks</div>
                            <CFormTextarea
                              rows={2}
                              value={row.remarks || ''}
                              placeholder="Section remarks"
                              onChange={(event) =>
                                onUpdateGroupedCheck?.(section.key, row, {
                                  remarks: event.target.value,
                                })
                              }
                            />
                            {remarksError && hasIssue && !String(row.remarks || '').trim() ? (
                              <FormFieldError>
                                Remarks are required for issue fields.
                              </FormFieldError>
                            ) : null}
                          </div>
                        </>
                      )}
                    </CCardBody>
                  </CCard>
                )
              })}
            </div>
          </div>
        )
      })}

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldError ? 'Complete all SCBA rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {remarksError ? 'Add remarks for SCBA issue fields before review.' : ''}
          </FormFieldError>
        </>
      ) : null}
    </div>
  )
}
