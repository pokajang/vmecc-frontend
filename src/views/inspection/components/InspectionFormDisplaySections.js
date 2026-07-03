import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CFormTextarea,
} from '@coreui/react'
import { Camera, MessageSquare, Trash2, Upload } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import RowActions from 'src/components/RowActions'
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
  appendInspectionText,
  getHydraulicRetainedEvidenceFields,
} from 'src/views/inspection/inspectionFormHelpers'
import { ER_AUX_CONDITION_OPTIONS } from 'src/views/inspection/inspectionErAuxHelpers'
import {
  FRT_DAILY_STATUS_OPTIONS,
  FRT_ONE_OFF_STATUS_OPTIONS,
} from 'src/views/inspection/types/frt-daily/helpers'
import {
  formatHighAngleGroupLabel,
  HIGH_ANGLE_CONDITION_FIELD,
  HIGH_ANGLE_STATUS_OPTIONS,
  getHighAngleRetainedEvidenceRows,
} from 'src/views/inspection/types/high-angle/helpers'
import {
  getScbaFieldEvidenceKeys,
  getScbaRowRetainedEvidenceFields,
  getScbaSectionFields,
  getScbaSectionTitle,
  normalizeScbaCustomSections,
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
  showDescriptionInput = true,
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
              {showDescriptionInput ? (
                <div className="d-grid gap-2">
                  <CFormInput
                    size="sm"
                    value={String(photo?.description || '')}
                    placeholder="Describe this photo"
                    onChange={(event) => onChangeDescription?.(photo.id, event.target.value)}
                  />
                  {onApplyCaption ? (
                    <ChipRow className="inspection-photo-caption-chips">
                      {INSPECTION_PHOTO_CAPTION_CHIPS.map((caption) => (
                        <ChipButton key={caption} onClick={() => onApplyCaption(photo.id, caption)}>
                          {caption}
                        </ChipButton>
                      ))}
                    </ChipRow>
                  ) : null}
                </div>
              ) : null}
              {onRemove ? (
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
              ) : null}
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export const InspectionPhotoEvidenceSummary = ({
  photos,
  onView,
  readOnly = false,
  label = 'View photos',
}) => {
  const visiblePhotos = dedupePhotos(photos)
  if (!visiblePhotos.length) return null

  return (
    <div className="rounded-3 border bg-light-subtle p-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div className="small text-body-secondary">
        {visiblePhotos.length} photo{visiblePhotos.length === 1 ? '' : 's'} added
      </div>
      <CButton
        type="button"
        color="secondary"
        variant="outline"
        size="sm"
        className="inspection-compact-action-btn"
        onClick={onView}
        disabled={!onView}
      >
        {readOnly ? 'View photos' : label}
      </CButton>
    </div>
  )
}

const InspectionPhotoViewerModalContent = ({ viewer, onClose }) => {
  const [visiblePhotos, setVisiblePhotos] = useState(() => dedupePhotos(viewer?.photos))

  const removePhoto = (photoId) => {
    viewer?.onRemove?.(photoId)
    setVisiblePhotos((currentPhotos) =>
      currentPhotos.filter((photo) => String(photo.id || '') !== String(photoId || '')),
    )
  }

  const updatePhotoDescription = (photoId, description) => {
    viewer?.onChangeDescription?.(photoId, description)
    setVisiblePhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        String(photo.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    )
  }

  const applyPhotoCaption = (photoId, caption) => {
    viewer?.onApplyCaption?.(photoId, caption)
    setVisiblePhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        String(photo.id || '') === String(photoId || '')
          ? { ...photo, description: appendInspectionText(photo.description, caption) }
          : photo,
      ),
    )
  }

  return (
    <CModal visible onClose={onClose} size="lg" scrollable>
      <CModalHeader onClose={onClose}>
        <CModalTitle>{viewer?.title || 'Photos'}</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        <div className="small text-body-secondary">
          {visiblePhotos.length} photo{visiblePhotos.length === 1 ? '' : 's'}
        </div>
        <PhotoGallery
          photos={visiblePhotos}
          readOnly={viewer?.readOnly === true}
          showDescriptionInput={viewer?.showDescriptionInput !== false}
          onRemove={viewer?.onRemove ? removePhoto : undefined}
          onChangeDescription={viewer?.onChangeDescription ? updatePhotoDescription : undefined}
          onApplyCaption={viewer?.onApplyCaption ? applyPhotoCaption : undefined}
          emptyMessage="No photos added."
        />
      </CModalBody>
    </CModal>
  )
}

export const InspectionPhotoViewerModal = ({ viewer, onClose }) => {
  if (!viewer) return null
  const viewerKey = dedupePhotos(viewer?.photos)
    .map((photo) => String(photo?.id || photo?.url || photo?.fileName || ''))
    .join('|')

  return (
    <InspectionPhotoViewerModalContent
      key={`${viewer?.title || 'photos'}:${viewerKey}`}
      viewer={viewer}
      onClose={onClose}
    />
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
        emptyMessage={emptyMessage}
      />
      <FormFieldError>{fieldError ? 'Upload at least one inspection photo.' : ''}</FormFieldError>
    </CCardBody>
  </CCard>
)

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

const EvidenceBlock = ({
  title,
  remarks = '',
  photos = [],
  readOnly = false,
  children = null,
  onViewPhotos,
}) => {
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
        <InspectionPhotoEvidenceSummary
          photos={visiblePhotos}
          readOnly={readOnly}
          onView={onViewPhotos}
        />
      ) : null}
    </div>
  )
}

const normalizeSearchText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const isCompactInspectionViewport = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 575.98px)').matches

const rowContainsSearch = (row = {}, fields = [], search = '') => {
  const query = normalizeSearchText(search)
  if (!query) return true
  const haystack = fields.map((field) => row?.[field]).join(' ')
  return normalizeSearchText(haystack).includes(query)
}

const ManagedCheckToolbar = ({
  search,
  onSearch,
  searchPlaceholder,
  onNextIncomplete,
  onExpandAll,
  onCollapseAll,
  resultCount,
  totalCount,
  readOnly = false,
}) => {
  if (readOnly) return null

  return (
    <div className="inspection-check-toolbar">
      <CFormInput
        size="sm"
        value={search}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        onChange={(event) => onSearch?.(event.target.value)}
      />
      <div className="inspection-check-toolbar__actions">
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          size="sm"
          className="inspection-compact-action-btn"
          onClick={onNextIncomplete}
        >
          Next incomplete
        </CButton>
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          size="sm"
          className="inspection-compact-action-btn"
          onClick={onExpandAll}
        >
          Expand all
        </CButton>
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          size="sm"
          className="inspection-compact-action-btn"
          onClick={onCollapseAll}
        >
          Collapse all
        </CButton>
      </div>
      {search ? (
        <div className="small text-body-secondary">
          Showing {resultCount} of {totalCount}
        </div>
      ) : null}
    </div>
  )
}

export const HydraulicEquipmentChecks = ({
  mainLocation,
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
  const [photoViewer, setPhotoViewer] = useState(null)

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
          const retainedEvidenceFields = getHydraulicRetainedEvidenceFields(current)
          const hasRetainedEvidence = retainedEvidenceFields.length > 0
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
                      {hasRetainedEvidence ? (
                        <span className="badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                          Retained evidence
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
                      All OK
                    </CButton>
                    {(row.canEdit || row.canDelete) && row.equipmentId ? (
                      <RowActions
                        iconSize={16}
                        hitArea={32}
                        toggleAriaLabel={`Equipment actions for ${row.equipment}`}
                        items={[
                          row.canEdit
                            ? {
                                key: 'edit',
                                label: 'Edit',
                                onClick: () => onEditEquipment?.(row),
                              }
                            : null,
                          row.canDelete
                            ? {
                                key: 'delete',
                                label: 'Delete',
                                className: 'text-danger',
                                onClick: () => onDeleteEquipment?.(row),
                              }
                            : null,
                        ].filter(Boolean)}
                      />
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
                  const hasRetainedEvidence = retainedEvidenceFields.some(
                    (retainedField) => retainedField.key === field.key,
                  )
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
                              <InspectionPhotoEvidenceSummary
                                photos={defectPhotos}
                                label="View photos"
                                onView={() =>
                                  setPhotoViewer({
                                    title: `${row.equipment} - ${field.label} defect photos`,
                                    photos: defectPhotos,
                                    onRemove: (photoId) =>
                                      onRemovePhoto?.(row, photoId, field.photosKey),
                                    onChangeDescription: (photoId, description) =>
                                      onChangePhotoDescription?.(
                                        row,
                                        photoId,
                                        description,
                                        field.photosKey,
                                      ),
                                    onApplyCaption: (photoId, caption) =>
                                      onApplyPhotoCaption?.(row, photoId, caption, field.photosKey),
                                  })
                                }
                              />
                            ) : null}
                          </div>
                        )
                      ) : null}
                      {hasRetainedEvidence ? (
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
                                    onChangePhotoDescription?.(
                                      row,
                                      photoId,
                                      description,
                                      field.photosKey,
                                    ),
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
                <div className="d-grid gap-2">
                  {(readOnly && (showGeneralRemarks || photos.length > 0)) || !readOnly ? (
                    <div className="small fw-semibold text-muted">Additional Info (optional)</div>
                  ) : null}
                  {!readOnly ? (
                    <div className="d-flex flex-wrap justify-content-start gap-2">
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
                        <div className="fw-semibold text-body-secondary">
                          General equipment remarks
                        </div>
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
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
    </div>
  )
}

const ErAuxConditionSegment = ({ value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2">
    <div className="inspection-hydraulic-check-label small fw-semibold text-muted">Condition</div>
    <div className="inspection-hydraulic-status-group d-flex flex-nowrap justify-content-start gap-2 overflow-auto pb-1">
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

const ErAuxQuantityRow = ({ value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-check-row d-flex align-items-center justify-content-between gap-2">
    <div className="inspection-hydraulic-check-label small fw-semibold text-muted">Quantity</div>
    {readOnly ? (
      <div
        className="rounded-2 border px-3 py-2 small fw-semibold text-body text-center"
        style={{ minWidth: '5.5rem' }}
      >
        {value || '--'}
      </div>
    ) : (
      <CFormInput
        value={value}
        inputMode="numeric"
        placeholder="Quantity"
        style={{ width: '5.5rem' }}
        onChange={(event) => onChange?.(event.target.value)}
      />
    )}
  </div>
)

export const ErAuxEquipmentChecks = ({
  mainLocation,
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
  const incompleteCheckDetails = summary?.incompleteCheckDetails || []
  const incompleteEvidenceDetails = summary?.incompleteEvidenceDetails || []
  const [expandedAdditionalNotes, setExpandedAdditionalNotes] = useState({})
  const [photoViewer, setPhotoViewer] = useState(null)

  if (!mainLocation && visibleChecks.length === 0) return null

  return (
    <div className="d-grid gap-3">
      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">
            Emergency Response Auxiliary Equipment Checks
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
          No Emergency Response Auxiliary Equipment has been added for this location.
        </div>
      ) : (
        <div className="inspection-hydraulic-card-grid gap-5">
          {visibleChecks.map((row) => {
            const hasIssue = ['Defect', 'Missing', 'N/A'].includes(
              String(row.condition || '').trim(),
            )
            const isDefect = String(row.condition || '').trim() === 'Defect'
            const quantity = String(row.quantity ?? row.defaultQuantity ?? '')
            const rowId = String(row.id || row.equipment || '')
            const hasDefectRemarks = String(row.defectRemarks || '').trim() !== ''
            const hasAdditionalNotes = String(row.additionalNotes || '').trim() !== ''
            const photos = Array.isArray(row.photos) ? row.photos : []
            const defectPhotos = Array.isArray(row.defectPhotos) ? row.defectPhotos : []
            const missingQuantity = !String(quantity || '').trim()
            const missingCondition = !String(row.condition || '').trim()
            const missingRemark = isDefect && !hasDefectRemarks
            const missingPhoto = isDefect && defectPhotos.length === 0
            const showAdditionalNotes =
              readOnly || hasAdditionalNotes || expandedAdditionalNotes[rowId] === true
            const detailsLabel = 'Additional notes (optional)'
            const canShowEquipmentActions =
              !readOnly &&
              (row.canEdit || row.canDelete) &&
              (row.equipmentId || row.isLocalSeedEquipment)

            return (
              <CCard
                key={row.id || row.equipment}
                className="inspection-hydraulic-card inspection-check-card"
                data-inspection-er-aux-row-id={rowId}
              >
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
                  {canShowEquipmentActions ? (
                    <div className="d-flex flex-wrap align-items-center justify-content-end gap-1 flex-shrink-0">
                      <RowActions
                        iconSize={16}
                        hitArea={32}
                        toggleAriaLabel={`Equipment actions for ${row.equipment}`}
                        items={[
                          row.canEdit
                            ? {
                                key: 'edit',
                                label: 'Edit',
                                onClick: () => onEditEquipment?.(row),
                              }
                            : null,
                          row.canDelete
                            ? {
                                key: 'delete',
                                label: 'Delete',
                                className: 'text-danger',
                                onClick: () => onDeleteEquipment?.(row),
                              }
                            : null,
                        ].filter(Boolean)}
                      />
                    </div>
                  ) : null}
                </CCardHeader>
                <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
                  {readOnly ? (
                    <>
                      <ErAuxQuantityRow value={quantity} readOnly />
                      <ErAuxConditionSegment value={row.condition} readOnly />
                      {row.defectRemarks || defectPhotos.length > 0 ? (
                        <EvidenceBlock
                          title="Defect evidence"
                          remarks={row.defectRemarks}
                          photos={defectPhotos}
                          readOnly
                          onViewPhotos={() =>
                            setPhotoViewer({
                              title: `${row.equipment} - defect photos`,
                              photos: defectPhotos,
                              readOnly: true,
                              showDescriptionInput: false,
                            })
                          }
                        />
                      ) : null}
                      {row.additionalNotes || photos.length > 0 ? (
                        <EvidenceBlock
                          title="Additional info"
                          remarks={row.additionalNotes}
                          photos={photos}
                          readOnly
                          onViewPhotos={() =>
                            setPhotoViewer({
                              title: `${row.equipment} - additional photos`,
                              photos,
                              readOnly: true,
                              showDescriptionInput: false,
                            })
                          }
                        />
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div data-inspection-er-aux-detail-key="quantity">
                        <ErAuxQuantityRow
                          value={quantity}
                          onChange={(nextValue) => onUpdateCheck?.(row, { quantity: nextValue })}
                        />
                        {fieldError && missingQuantity ? (
                          <FormFieldError>Quantity is required.</FormFieldError>
                        ) : null}
                      </div>
                      <div data-inspection-er-aux-detail-key="condition">
                        <ErAuxConditionSegment
                          value={row.condition}
                          onChange={(nextValue) => onUpdateCheck?.(row, { condition: nextValue })}
                        />
                        {fieldError && missingCondition ? (
                          <FormFieldError>Condition is required.</FormFieldError>
                        ) : null}
                      </div>
                      {isDefect ? (
                        <div className="d-grid gap-1">
                          <div
                            className="inspection-evidence-action-row"
                            data-inspection-er-aux-detail-key="defectPhotos"
                          >
                            <CreateActionButton
                              label="Add defect photo"
                              className="inspection-compact-action-btn"
                              icon={<Camera size={13} className="me-1 align-text-bottom" />}
                              onClick={() => onRequestDefectPhotoUpload?.(row)}
                            />
                          </div>
                          <div className="d-flex align-items-center justify-content-between gap-2">
                            <CFormLabel className="small fw-semibold text-muted mb-0">
                              Defect remarks
                            </CFormLabel>
                            {hasDefectRemarks ? (
                              <CButton
                                type="button"
                                color="danger"
                                variant="outline"
                                size="sm"
                                className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
                                onClick={() => {
                                  onUpdateCheck?.(row, { defectRemarks: '' })
                                }}
                              >
                                <Trash2 size={13} />
                                Clear
                              </CButton>
                            ) : null}
                          </div>
                          <CFormTextarea
                            data-inspection-er-aux-detail-key="defectRemarks"
                            rows={2}
                            value={row.defectRemarks || ''}
                            placeholder="Describe the defect and the corrective action."
                            onChange={(event) =>
                              onUpdateCheck?.(row, { defectRemarks: event.target.value })
                            }
                          />
                          {remarksError && missingRemark ? (
                            <FormFieldError>Defect remarks are required.</FormFieldError>
                          ) : null}
                          {remarksError && missingPhoto ? (
                            <FormFieldError>Photo evidence is required for defects.</FormFieldError>
                          ) : null}
                          {defectPhotos.length > 0 ? (
                            <InspectionPhotoEvidenceSummary
                              photos={defectPhotos}
                              label="View defect photos"
                              onView={() =>
                                setPhotoViewer({
                                  title: `${row.equipment} - defect photos`,
                                  photos: defectPhotos,
                                  showDescriptionInput: false,
                                  onRemove: (photoId) =>
                                    onRemovePhoto?.(row, photoId, 'defectPhotos'),
                                  onChangeDescription: (photoId, description) =>
                                    onChangePhotoDescription?.(
                                      row,
                                      photoId,
                                      description,
                                      'defectPhotos',
                                    ),
                                  onApplyCaption: (photoId, caption) =>
                                    onApplyPhotoCaption?.(row, photoId, caption, 'defectPhotos'),
                                })
                              }
                            />
                          ) : null}
                        </div>
                      ) : null}
                      <div className="d-grid gap-2">
                        <div className="small fw-semibold text-muted">{detailsLabel}</div>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          {!showAdditionalNotes ? (
                            <CreateActionButton
                              label="Remark"
                              className="inspection-compact-action-btn justify-self-start"
                              icon={<MessageSquare size={13} className="me-1 align-text-bottom" />}
                              onClick={() =>
                                setExpandedAdditionalNotes((current) => ({
                                  ...current,
                                  [rowId]: true,
                                }))
                              }
                            />
                          ) : null}
                          <CreateActionButton
                            label={isDefect ? 'Additional photo' : 'Photo'}
                            className="inspection-compact-action-btn justify-self-start"
                            icon={<Camera size={13} className="me-1 align-text-bottom" />}
                            onClick={() => onRequestPhotoUpload?.(row)}
                          />
                        </div>
                        {showAdditionalNotes ? (
                          <div className="d-grid gap-1">
                            <div className="d-flex align-items-center justify-content-between gap-2">
                              <CFormLabel className="small fw-semibold text-muted mb-0">
                                Additional notes
                              </CFormLabel>
                              {hasAdditionalNotes ? (
                                <CButton
                                  type="button"
                                  color="danger"
                                  variant="outline"
                                  size="sm"
                                  className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
                                  onClick={() => onUpdateCheck?.(row, { additionalNotes: '' })}
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
                                    setExpandedAdditionalNotes((current) => ({
                                      ...current,
                                      [rowId]: false,
                                    }))
                                  }
                                >
                                  Cancel
                                </CButton>
                              )}
                            </div>
                            <CFormTextarea
                              rows={2}
                              value={row.additionalNotes || ''}
                              placeholder="Add optional context for this row."
                              onChange={(event) =>
                                onUpdateCheck?.(row, { additionalNotes: event.target.value })
                              }
                            />
                          </div>
                        ) : null}
                        {photos.length > 0 ? (
                          <InspectionPhotoEvidenceSummary
                            photos={photos}
                            label="View photos"
                            onView={() =>
                              setPhotoViewer({
                                title: `${row.equipment} - additional photos`,
                                photos,
                                onRemove: (photoId) => onRemovePhoto?.(row, photoId),
                                onChangeDescription: (photoId, description) =>
                                  onChangePhotoDescription?.(row, photoId, description),
                                onApplyCaption: (photoId, caption) =>
                                  onApplyPhotoCaption?.(row, photoId, caption),
                              })
                            }
                          />
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
            {fieldError ? (
              <>
                <div>Complete these Emergency Response Auxiliary Equipment fields:</div>
                {incompleteCheckDetails.length > 0 ? (
                  <ul className="mb-0 ps-3">
                    {incompleteCheckDetails.map((item) => (
                      <li key={item.id || item.equipment}>
                        {item.equipment}: {item.missing.join(', ')}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>No equipment rows are available for this location.</div>
                )}
              </>
            ) : (
              ''
            )}
          </FormFieldError>
          <FormFieldError>
            {remarksError ? (
              <>
                <div>Add defect evidence for these rows:</div>
                {incompleteEvidenceDetails.length > 0 ? (
                  <ul className="mb-0 ps-3">
                    {incompleteEvidenceDetails.map((item) => (
                      <li key={item.id || item.equipment}>
                        {item.equipment}: {item.missing.join(', ')}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>Each defect row needs remarks and at least one defect photo.</div>
                )}
              </>
            ) : (
              ''
            )}
          </FormFieldError>
        </>
      ) : null}
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
    </div>
  )
}

const HighAngleStatusSegment = ({ value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-status-group d-flex flex-nowrap justify-content-start gap-2 overflow-auto pb-1">
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
  onUpdateCheck,
  onMarkRowOk,
  onMarkAllOk,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  fieldError = false,
  remarksError = false,
  readOnly = false,
}) => {
  const displayKit = String(mainLocationLabel || mainLocation || '').trim()
  const visibleGroups = summary?.visibleGroups || []
  const [search, setSearch] = useState('')
  const [expandedGroupKeys, setExpandedGroupKeys] = useState(() => new Set())
  const [photoViewer, setPhotoViewer] = useState(null)
  const filteredGroups = visibleGroups
    .map((group) => ({
      ...group,
      rows: (group.rows || []).filter((row) =>
        rowContainsSearch(
          row,
          ['equipment', 'location', 'subLocation', 'condition', 'remarks', 'rowNumber'],
          search,
        ),
      ),
    }))
    .filter((group) => !search || group.rows.length > 0)
  const totalFilteredRows = filteredGroups.reduce((count, group) => count + group.rows.length, 0)
  const totalRows = visibleGroups.reduce((count, group) => count + (group.rows || []).length, 0)
  const shouldDefaultCollapseSections = isCompactInspectionViewport()

  const isHighAngleRowIncomplete = (row = {}) =>
    !String(row.condition || '').trim() ||
    (String(row.condition || '') === 'Not Good' && !String(row.remarks || '').trim())

  const expandHighAngleGroup = (groupKey) => {
    const normalizedKey = String(groupKey || '').trim()
    if (!normalizedKey) return
    setExpandedGroupKeys((current) => new Set([...current, normalizedKey]))
    window.setTimeout(() => {
      Array.from(document.querySelectorAll('[data-inspection-high-angle-group-id]'))
        .find(
          (element) =>
            element.getAttribute('data-inspection-high-angle-group-id') === normalizedKey,
        )
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  if (!mainLocation && visibleGroups.length === 0) return null

  return (
    <div className="d-grid gap-3">
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
                {!readOnly && summary.incompletePhotoCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.incompletePhotoCount} need photos
                  </span>
                ) : null}
                {summary.retainedEvidenceCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.retainedEvidenceCount} retained evidence
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

      <ManagedCheckToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search high angle equipment..."
        resultCount={totalFilteredRows}
        totalCount={totalRows}
        readOnly={readOnly}
        onNextIncomplete={() => {
          const group = visibleGroups.find((candidate) =>
            (candidate.rows || []).some(isHighAngleRowIncomplete),
          )
          if (group) expandHighAngleGroup(group.key)
        }}
        onExpandAll={() => setExpandedGroupKeys(new Set(visibleGroups.map((group) => group.key)))}
        onCollapseAll={() => setExpandedGroupKeys(new Set())}
      />

      {filteredGroups.map((group, groupIndex) => {
        const isExpanded =
          readOnly ||
          expandedGroupKeys.has(group.key) ||
          !shouldDefaultCollapseSections ||
          groupIndex === 0

        return (
          <CCard
            key={group.key}
            className="inspection-hydraulic-card inspection-check-card"
            data-inspection-high-angle-group-id={group.key}
          >
            <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="fw-semibold">{group.title}</div>
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
              {!readOnly ? (
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  className="inspection-compact-action-btn"
                  onClick={() =>
                    setExpandedGroupKeys((current) => {
                      const next = new Set(current)
                      if (next.has(group.key)) next.delete(group.key)
                      else next.add(group.key)
                      return next
                    })
                  }
                >
                  {isExpanded ? 'Collapse' : 'Open'}
                </CButton>
              ) : null}
            </CCardHeader>

            {isExpanded ? (
              <CCardBody className="inspection-hydraulic-card-body">
                <div className="inspection-hydraulic-card-grid inspection-check-card-grid--managed gap-5">
                  {group.rows.map((row) => {
                    const hasIssue = String(row.condition || '') === 'Not Good'
                    const conditionRemarks = String(
                      row.conditionRemarks || row.remarks || '',
                    ).trim()
                    const conditionPhotos = Array.isArray(row.conditionPhotos)
                      ? row.conditionPhotos
                      : []
                    const retainedEvidenceRows = getHighAngleRetainedEvidenceRows([row])
                    const hasRetainedEvidence = retainedEvidenceRows.length > 0
                    const storageLabel = formatHighAngleGroupLabel(row)

                    return (
                      <CCard
                        key={row.id || `${row.mainLocation}:${row.rowNumber}`}
                        className="inspection-hydraulic-card"
                      >
                        <CCardHeader className="inspection-hydraulic-card-header d-flex align-items-center justify-content-between gap-2">
                          <div style={{ minWidth: 0 }}>
                            <div className="d-flex flex-wrap align-items-center gap-2">
                              <div className="fw-semibold text-break">
                                {row.equipment || 'Equipment'}
                              </div>
                              {hasIssue ? (
                                <span className="badge text-bg-danger-subtle text-danger border border-danger-subtle">
                                  Issue
                                </span>
                              ) : null}
                              {hasRetainedEvidence ? (
                                <span className="badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                                  Retained evidence
                                </span>
                              ) : null}
                            </div>
                            <div className="small text-body-secondary mt-1 text-break">
                              Row {row.rowNumber || '--'} - Qty {row.quantity || '--'}
                            </div>
                            <div className="small text-body-secondary text-break">
                              {storageLabel}
                            </div>
                          </div>
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
                              {hasIssue ? (
                                <EvidenceBlock
                                  title="Condition issue evidence"
                                  remarks={conditionRemarks}
                                  photos={conditionPhotos}
                                  readOnly
                                  onViewPhotos={() =>
                                    setPhotoViewer({
                                      title: `${row.equipment} - condition issue photos`,
                                      photos: conditionPhotos,
                                      readOnly: true,
                                      showDescriptionInput: false,
                                    })
                                  }
                                />
                              ) : null}
                              {hasRetainedEvidence ? (
                                <EvidenceBlock
                                  title="Condition retained evidence from earlier status"
                                  remarks={conditionRemarks}
                                  photos={conditionPhotos}
                                  readOnly
                                  onViewPhotos={() =>
                                    setPhotoViewer({
                                      title: `${row.equipment} - retained evidence photos`,
                                      photos: conditionPhotos,
                                      readOnly: true,
                                      showDescriptionInput: false,
                                    })
                                  }
                                >
                                  <div className="small text-body-secondary">
                                    Audit context only. Current condition is not Not Good.
                                  </div>
                                </EvidenceBlock>
                              ) : null}
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
                                  <CFormLabel className="small fw-semibold text-muted mb-1">
                                    Condition
                                  </CFormLabel>
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
                                <div className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2">
                                  <CFormLabel className="small fw-semibold text-muted mb-1">
                                    Issue evidence
                                  </CFormLabel>
                                  <CFormTextarea
                                    rows={2}
                                    value={conditionRemarks}
                                    placeholder="Issue remarks"
                                    onChange={(event) =>
                                      onUpdateCheck?.(row, {
                                        remarks: event.target.value,
                                        [HIGH_ANGLE_CONDITION_FIELD.remarksKey]: event.target.value,
                                      })
                                    }
                                  />
                                  <div className="d-flex flex-wrap justify-content-end gap-2">
                                    <CreateActionButton
                                      label="Add issue photo"
                                      className="inspection-compact-action-btn"
                                      icon={<Camera size={13} className="me-1 align-text-bottom" />}
                                      onClick={() => onRequestIssuePhotoUpload?.(row)}
                                    />
                                  </div>
                                  {remarksError && !conditionRemarks ? (
                                    <FormFieldError>
                                      Remarks are required for issue rows.
                                    </FormFieldError>
                                  ) : null}
                                  {remarksError && conditionPhotos.length === 0 ? (
                                    <FormFieldError>Issue photo is required.</FormFieldError>
                                  ) : null}
                                  {conditionPhotos.length > 0 ? (
                                    <InspectionPhotoEvidenceSummary
                                      photos={conditionPhotos}
                                      label="View photos"
                                      onView={() =>
                                        setPhotoViewer({
                                          title: `${row.equipment} - condition issue photos`,
                                          photos: conditionPhotos,
                                          onRemove: (photoId) =>
                                            onRemovePhoto?.(
                                              row,
                                              photoId,
                                              HIGH_ANGLE_CONDITION_FIELD.photosKey,
                                            ),
                                          onChangeDescription: (photoId, description) =>
                                            onChangePhotoDescription?.(
                                              row,
                                              photoId,
                                              description,
                                              HIGH_ANGLE_CONDITION_FIELD.photosKey,
                                            ),
                                          onApplyCaption: (photoId, caption) =>
                                            onApplyPhotoCaption?.(
                                              row,
                                              photoId,
                                              caption,
                                              HIGH_ANGLE_CONDITION_FIELD.photosKey,
                                            ),
                                        })
                                      }
                                    />
                                  ) : null}
                                </div>
                              ) : null}
                              {hasRetainedEvidence ? (
                                <EvidenceBlock
                                  title="Condition retained evidence from earlier status"
                                  remarks={conditionRemarks}
                                  photos={conditionPhotos}
                                  onViewPhotos={() =>
                                    setPhotoViewer({
                                      title: `${row.equipment} - retained evidence photos`,
                                      photos: conditionPhotos,
                                      onRemove: (photoId) =>
                                        onRemovePhoto?.(
                                          row,
                                          photoId,
                                          HIGH_ANGLE_CONDITION_FIELD.photosKey,
                                        ),
                                      onChangeDescription: (photoId, description) =>
                                        onChangePhotoDescription?.(
                                          row,
                                          photoId,
                                          description,
                                          HIGH_ANGLE_CONDITION_FIELD.photosKey,
                                        ),
                                      onApplyCaption: (photoId, caption) =>
                                        onApplyPhotoCaption?.(
                                          row,
                                          photoId,
                                          caption,
                                          HIGH_ANGLE_CONDITION_FIELD.photosKey,
                                        ),
                                    })
                                  }
                                >
                                  <div className="d-flex flex-wrap justify-content-end gap-2">
                                    <CButton
                                      type="button"
                                      color="warning"
                                      variant="outline"
                                      size="sm"
                                      className="inspection-compact-action-btn"
                                      onClick={() =>
                                        onUpdateCheck?.(row, {
                                          remarks: '',
                                          [HIGH_ANGLE_CONDITION_FIELD.remarksKey]: '',
                                          [HIGH_ANGLE_CONDITION_FIELD.photosKey]: [],
                                        })
                                      }
                                    >
                                      Clear retained evidence
                                    </CButton>
                                  </div>
                                </EvidenceBlock>
                              ) : null}
                            </>
                          )}
                        </CCardBody>
                      </CCard>
                    )
                  })}
                </div>
              </CCardBody>
            ) : (
              <div className="inspection-check-card__collapsed-summary">
                {group.rows.length} row{group.rows.length === 1 ? '' : 's'} in this group
              </div>
            )}
          </CCard>
        )
      })}

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldError ? 'Complete all High Angle rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {remarksError
              ? 'Add remarks and issue photos for High Angle issue rows before review.'
              : ''}
          </FormFieldError>
        </>
      ) : null}
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
    </div>
  )
}

const FrtStatusSegment = ({ options, value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-status-group d-flex flex-nowrap justify-content-start gap-2 overflow-auto pb-1">
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
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  selectedTruckOption,
  onEditTruck,
  onDeleteTruck,
  fieldErrors = {},
  readOnly = false,
}) => {
  const displayTruck = String(mainLocationLabel || mainLocation || '').trim()
  const dailySections = summary?.visibleDailySections || []
  const oneOffSections = summary?.visibleOneOffSections || []
  const truckReference = summary?.truckReference || form?.frtTruckReference || {}
  const selectedTruck = selectedTruckOption || truckReference
  const canEditTruck = selectedTruck?.canEdit === true || truckReference?.canEdit === true
  const canDeleteTruck = selectedTruck?.canDelete === true || truckReference?.canDelete === true
  const truckActionItems = !readOnly
    ? [
        canEditTruck
          ? {
              key: 'edit-truck',
              label: 'Edit Truck',
              onClick: () => onEditTruck?.(selectedTruck),
            }
          : null,
        canDeleteTruck
          ? {
              key: 'delete-truck',
              label: 'Delete Truck',
              className: 'text-danger',
              onClick: () => onDeleteTruck?.(selectedTruck),
            }
          : null,
      ].filter(Boolean)
    : []
  const dailyRemarks = String(form?.frtDailyRemarks || '').trim()
  const oneOffRemarks = String(form?.frtOneOffRemarks || '').trim()
  const [search, setSearch] = useState('')
  const [expandedDailyKeys, setExpandedDailyKeys] = useState(() => new Set())
  const [expandedOneOffKeys, setExpandedOneOffKeys] = useState(() => new Set())
  const [photoViewer, setPhotoViewer] = useState(null)
  const filteredDailySections = dailySections
    .map((section) => ({
      ...section,
      visibleRows: (section.visibleRows || []).filter((row) =>
        rowContainsSearch(
          row,
          ['equipment', 'rowNumber', 'status', 'condition', 'remarks', 'readingValue'],
          search,
        ),
      ),
    }))
    .filter((section) => !search || section.visibleRows.length > 0)
  const filteredOneOffSections = oneOffSections
    .map((section) => ({
      ...section,
      visibleRows: (section.visibleRows || []).filter((row) =>
        rowContainsSearch(row, ['equipment', 'rowNumber', 'condition', 'remarks'], search),
      ),
    }))
    .filter((section) => !search || section.visibleRows.length > 0)
  const filteredRowCount =
    filteredDailySections.reduce((count, section) => count + section.visibleRows.length, 0) +
    filteredOneOffSections.reduce((count, section) => count + section.visibleRows.length, 0)
  const totalRowCount =
    dailySections.reduce((count, section) => count + section.visibleRows.length, 0) +
    oneOffSections.reduce((count, section) => count + section.visibleRows.length, 0)
  const shouldDefaultCollapseSections = isCompactInspectionViewport()

  const isFrtRowIncomplete = (row = {}) => {
    if (row.rowKind === 'reading') return !String(row.readingValue || '').trim()
    const status = String(row.status || row.condition || '').trim()
    const issue = status === 'Issue' || status === 'Not Good'
    return !status || (issue && !String(row.remarks || '').trim())
  }

  const toggleSectionKey = (setter, key) => {
    setter((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const expandFrtSection = (kind, key) => {
    const normalizedKey = String(key || '').trim()
    if (!normalizedKey) return
    const setter = kind === 'daily' ? setExpandedDailyKeys : setExpandedOneOffKeys
    setter((current) => new Set([...current, normalizedKey]))
    window.setTimeout(() => {
      Array.from(document.querySelectorAll('[data-inspection-frt-section-id]'))
        .find((element) => element.getAttribute('data-inspection-frt-section-id') === normalizedKey)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  useEffect(() => {
    const handleFocusRequest = (event) => {
      const rowId = String(event?.detail?.rowId || '').trim()
      if (!rowId) return
      const dailySection = dailySections.find((section) =>
        (section.visibleRows || []).some((row) => String(row.id || '') === rowId),
      )
      if (dailySection) {
        setExpandedDailyKeys((current) => new Set([...current, dailySection.key]))
        return
      }
      const oneOffSection = oneOffSections.find((section) =>
        (section.visibleRows || []).some((row) => String(row.id || '') === rowId),
      )
      if (oneOffSection) {
        setExpandedOneOffKeys((current) => new Set([...current, oneOffSection.key]))
      }
    }

    window.addEventListener('inspection:focus-frt-row', handleFocusRequest)
    return () => window.removeEventListener('inspection:focus-frt-row', handleFocusRequest)
  }, [dailySections, oneOffSections])

  if (!mainLocation && dailySections.length === 0 && oneOffSections.length === 0) return null

  return (
    <div className="d-grid gap-3">
      <CCard className="inspection-hydraulic-card">
        <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex flex-wrap align-items-center gap-2" style={{ minWidth: 0 }}>
            <div className="fw-semibold text-muted">Truck Details</div>
            <div className="inspection-hydraulic-summary-pills d-flex flex-wrap gap-1">
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {truckReference.plateNo || displayTruck || 'Plate --'}
              </span>
            </div>
          </div>
          {truckActionItems.length > 0 ? (
            <RowActions
              iconSize={16}
              hitArea={32}
              toggleAriaLabel={`Truck actions for ${truckReference.plateNo || displayTruck}`}
              items={truckActionItems}
            />
          ) : null}
        </CCardHeader>
        <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
          <div className="row g-3 align-items-end" data-inspection-frt-detail-key="truck">
            {[
              ['Plate No.', truckReference.plateNo || displayTruck],
              ['Truck', truckReference.name],
              ['Road Tax Expiry', truckReference.roadTaxExpiry],
              ['Insurance Expiry', truckReference.insuranceExpiry],
              ['Puspakom Expiry', truckReference.puspakomExpiry],
            ].map(([label, value]) => (
              <div key={label} className="col-6 col-md">
                <div className="small text-body-secondary">{label}</div>
                <div className="fw-semibold text-break">{value || '--'}</div>
              </div>
            ))}
          </div>
          {!readOnly && fieldErrors.frtSession ? (
            <FormFieldError>Choose a truck before review.</FormFieldError>
          ) : null}
        </CCardBody>
      </CCard>

      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">Daily Readiness Roster</div>
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
                {!readOnly && summary.dailyIncompletePhotoCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.dailyIncompletePhotoCount} need photos
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {!readOnly ? (
          <CreateActionButton
            label="Mark status rows Checked + one-off Good"
            className="inspection-compact-action-btn"
            onClick={onMarkAllOk}
          />
        ) : null}
      </div>

      <ManagedCheckToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search truck readiness rows..."
        resultCount={filteredRowCount}
        totalCount={totalRowCount}
        readOnly={readOnly}
        onNextIncomplete={() => {
          const dailySection = dailySections.find((section) =>
            (section.visibleRows || []).some(isFrtRowIncomplete),
          )
          if (dailySection) {
            expandFrtSection('daily', dailySection.key)
            return
          }
          const oneOffSection = oneOffSections.find((section) =>
            (section.visibleRows || []).some(isFrtRowIncomplete),
          )
          if (oneOffSection) expandFrtSection('oneOff', oneOffSection.key)
        }}
        onExpandAll={() => {
          setExpandedDailyKeys(new Set(dailySections.map((section) => section.key)))
          setExpandedOneOffKeys(new Set(oneOffSections.map((section) => section.key)))
        }}
        onCollapseAll={() => {
          setExpandedDailyKeys(new Set())
          setExpandedOneOffKeys(new Set())
        }}
      />

      {filteredDailySections.map((section, sectionIndex) => {
        const isExpanded =
          readOnly ||
          expandedDailyKeys.has(section.key) ||
          !shouldDefaultCollapseSections ||
          sectionIndex === 0

        return (
          <CCard
            key={section.key}
            className="inspection-hydraulic-card inspection-check-card"
            data-inspection-frt-section-id={section.key}
          >
            <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="fw-semibold">{section.title}</div>
              <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
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
                {!readOnly ? (
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    className="inspection-compact-action-btn"
                    onClick={() => toggleSectionKey(setExpandedDailyKeys, section.key)}
                  >
                    {isExpanded ? 'Collapse' : 'Open'}
                  </CButton>
                ) : null}
              </div>
            </CCardHeader>
            {isExpanded ? (
              <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
                {section.visibleRows.map((row) => {
                  const isReadingRow = row.rowKind === 'reading'
                  const hasIssue = row.status === 'Issue'
                  const photos = Array.isArray(row.photos) ? row.photos : []
                  return (
                    <CCard
                      key={row.id}
                      className="inspection-hydraulic-card"
                      data-inspection-frt-row-id={row.id}
                    >
                      <CCardHeader className="inspection-hydraulic-card-header d-flex align-items-center justify-content-between gap-2">
                        <div style={{ minWidth: 0 }}>
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <div className="fw-semibold text-break">{row.equipment}</div>
                            {hasIssue ? (
                              <span className="badge text-bg-danger-subtle text-danger border border-danger-subtle">
                                Issue
                              </span>
                            ) : null}
                          </div>
                          <div className="small text-body-secondary">
                            Row {row.rowNumber || '--'}
                            {!isReadingRow ? ` - Qty ${row.quantity || '--'}` : ''}
                          </div>
                        </div>
                      </CCardHeader>

                      <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
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
                            {!isReadingRow && hasIssue && photos.length > 0 ? (
                              <InspectionPhotoEvidenceSummary
                                photos={photos}
                                readOnly
                                onView={() =>
                                  setPhotoViewer({
                                    title: `${row.equipment} - issue photos`,
                                    photos,
                                    readOnly: true,
                                    showDescriptionInput: false,
                                  })
                                }
                              />
                            ) : null}
                          </>
                        ) : isReadingRow ? (
                          <div
                            className="d-grid gap-1"
                            data-inspection-frt-detail-key="readingValue"
                          >
                            <CFormLabel className="small fw-semibold text-muted mb-1">
                              Reading
                            </CFormLabel>
                            <CFormInput
                              value={row.readingValue || ''}
                              inputMode="numeric"
                              placeholder={
                                row.equipment === 'FUEL LEVEL (%)'
                                  ? 'Fuel level %'
                                  : 'Enter reading'
                              }
                              onChange={(event) =>
                                onUpdateCheck?.(row, { readingValue: event.target.value })
                              }
                            />
                            {fieldErrors.frtDailyChecks &&
                            !String(row.readingValue || '').trim() ? (
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
                                <CFormLabel className="small fw-semibold text-muted mb-1">
                                  Status
                                </CFormLabel>
                                <div data-inspection-frt-detail-key="status">
                                  <FrtStatusSegment
                                    options={FRT_DAILY_STATUS_OPTIONS}
                                    value={row.status}
                                    onChange={(nextValue) =>
                                      onUpdateCheck?.(row, { status: nextValue })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                            {hasIssue ? (
                              <div
                                className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2"
                                data-inspection-frt-detail-key="remarks"
                              >
                                <CFormLabel className="small fw-semibold text-muted mb-1">
                                  Issue evidence
                                </CFormLabel>
                                <CFormTextarea
                                  rows={2}
                                  value={row.remarks || ''}
                                  placeholder="Issue remarks"
                                  onChange={(event) =>
                                    onUpdateCheck?.(row, { remarks: event.target.value })
                                  }
                                />
                                {fieldErrors.frtDailyRemarks &&
                                !String(row.remarks || '').trim() ? (
                                  <FormFieldError>
                                    Remarks are required for issue rows.
                                  </FormFieldError>
                                ) : null}
                                <div data-inspection-frt-detail-key="photos">
                                  <div className="d-flex flex-wrap justify-content-end gap-2">
                                    <CreateActionButton
                                      label="Add issue photo"
                                      className="inspection-compact-action-btn"
                                      icon={<Camera size={13} className="me-1 align-text-bottom" />}
                                      onClick={() => onRequestIssuePhotoUpload?.(row)}
                                    />
                                  </div>
                                  {fieldErrors.frtDailyRemarks && photos.length === 0 ? (
                                    <FormFieldError>Issue photo is required.</FormFieldError>
                                  ) : null}
                                </div>
                                {photos.length > 0 ? (
                                  <InspectionPhotoEvidenceSummary
                                    photos={photos}
                                    label="View photos"
                                    onView={() =>
                                      setPhotoViewer({
                                        title: `${row.equipment} - issue photos`,
                                        photos,
                                        showDescriptionInput: false,
                                        onRemove: (photoId) => onRemovePhoto?.(row, photoId),
                                        onChangeDescription: (photoId, description) =>
                                          onChangePhotoDescription?.(row, photoId, description),
                                        onApplyCaption: (photoId, caption) =>
                                          onApplyPhotoCaption?.(row, photoId, caption),
                                      })
                                    }
                                  />
                                ) : null}
                              </div>
                            ) : null}
                          </>
                        )}
                      </CCardBody>
                    </CCard>
                  )
                })}
              </CCardBody>
            ) : (
              <div className="inspection-check-card__collapsed-summary">
                {section.visibleRows.length} row{section.visibleRows.length === 1 ? '' : 's'} in
                this locker
              </div>
            )}
          </CCard>
        )
      })}

      <div className="d-grid gap-1">
        {readOnly ? (
          <>
            <div className="small fw-semibold text-muted">Daily Remarks</div>
            <div
              className="rounded-3 border bg-light-subtle p-3"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {dailyRemarks || '--'}
            </div>
          </>
        ) : (
          <>
            <CFormLabel className="small fw-semibold text-muted mb-1">Daily Remarks</CFormLabel>
            <CFormTextarea
              rows={3}
              value={dailyRemarks}
              placeholder="Optional daily roster remarks"
              onChange={(event) => onUpdateSessionMeta?.('frtDailyRemarks', event.target.value)}
            />
          </>
        )}
      </div>

      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center gap-2">
        <div className="fw-semibold text-muted">One-Off Readiness Checklist</div>
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
              {!readOnly && summary.oneOffIncompletePhotoCount > 0 ? (
                <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                  {summary.oneOffIncompletePhotoCount} need photos
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {filteredOneOffSections.map((section, sectionIndex) => {
        const isExpanded =
          readOnly ||
          expandedOneOffKeys.has(section.key) ||
          !shouldDefaultCollapseSections ||
          (filteredDailySections.length === 0 && sectionIndex === 0)

        return (
          <CCard
            key={section.key}
            className="inspection-hydraulic-card inspection-check-card"
            data-inspection-frt-section-id={section.key}
          >
            <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="fw-semibold">{section.title}</div>
              <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
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
                {!readOnly ? (
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    className="inspection-compact-action-btn"
                    onClick={() => toggleSectionKey(setExpandedOneOffKeys, section.key)}
                  >
                    {isExpanded ? 'Collapse' : 'Open'}
                  </CButton>
                ) : null}
              </div>
            </CCardHeader>
            {isExpanded ? (
              <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
                {section.visibleRows.map((row) => {
                  const hasIssue = row.condition === 'Not Good'
                  const photos = Array.isArray(row.photos) ? row.photos : []
                  return (
                    <CCard
                      key={row.id}
                      className="inspection-hydraulic-card"
                      data-inspection-frt-row-id={row.id}
                    >
                      <CCardHeader className="inspection-hydraulic-card-header d-flex align-items-center justify-content-between gap-2">
                        <div style={{ minWidth: 0 }}>
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <div className="fw-semibold text-break">{row.equipment}</div>
                            {hasIssue ? (
                              <span className="badge text-bg-danger-subtle text-danger border border-danger-subtle">
                                Issue
                              </span>
                            ) : null}
                          </div>
                          <div className="small text-body-secondary">
                            Row {row.rowNumber || '--'}
                          </div>
                        </div>
                      </CCardHeader>
                      <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
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
                            {hasIssue && photos.length > 0 ? (
                              <InspectionPhotoEvidenceSummary
                                photos={photos}
                                readOnly
                                onView={() =>
                                  setPhotoViewer({
                                    title: `${row.equipment} - issue photos`,
                                    photos,
                                    readOnly: true,
                                    showDescriptionInput: false,
                                  })
                                }
                              />
                            ) : null}
                          </>
                        ) : (
                          <>
                            <div
                              className="d-grid gap-1"
                              data-inspection-frt-detail-key="condition"
                            >
                              <CFormLabel className="small fw-semibold text-muted mb-1">
                                Condition
                              </CFormLabel>
                              <FrtStatusSegment
                                options={FRT_ONE_OFF_STATUS_OPTIONS}
                                value={row.condition}
                                onChange={(nextValue) =>
                                  onUpdateCheck?.(row, { condition: nextValue })
                                }
                              />
                            </div>
                            {hasIssue ? (
                              <div
                                className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2"
                                data-inspection-frt-detail-key="remarks"
                              >
                                <CFormLabel className="small fw-semibold text-muted mb-1">
                                  Issue evidence
                                </CFormLabel>
                                <CFormTextarea
                                  rows={2}
                                  value={row.remarks || ''}
                                  placeholder="Issue remarks"
                                  onChange={(event) =>
                                    onUpdateCheck?.(row, { remarks: event.target.value })
                                  }
                                />
                                {fieldErrors.frtOneOffRemarks &&
                                !String(row.remarks || '').trim() ? (
                                  <FormFieldError>
                                    Remarks are required for Not Good rows.
                                  </FormFieldError>
                                ) : null}
                                <div data-inspection-frt-detail-key="photos">
                                  <div className="d-flex flex-wrap justify-content-end gap-2">
                                    <CreateActionButton
                                      label="Add issue photo"
                                      className="inspection-compact-action-btn"
                                      icon={<Camera size={13} className="me-1 align-text-bottom" />}
                                      onClick={() => onRequestIssuePhotoUpload?.(row)}
                                    />
                                  </div>
                                  {fieldErrors.frtOneOffRemarks && photos.length === 0 ? (
                                    <FormFieldError>Issue photo is required.</FormFieldError>
                                  ) : null}
                                </div>
                                {photos.length > 0 ? (
                                  <InspectionPhotoEvidenceSummary
                                    photos={photos}
                                    label="View photos"
                                    onView={() =>
                                      setPhotoViewer({
                                        title: `${row.equipment} - issue photos`,
                                        photos,
                                        showDescriptionInput: false,
                                        onRemove: (photoId) => onRemovePhoto?.(row, photoId),
                                        onChangeDescription: (photoId, description) =>
                                          onChangePhotoDescription?.(row, photoId, description),
                                        onApplyCaption: (photoId, caption) =>
                                          onApplyPhotoCaption?.(row, photoId, caption),
                                      })
                                    }
                                  />
                                ) : null}
                              </div>
                            ) : null}
                          </>
                        )}
                      </CCardBody>
                    </CCard>
                  )
                })}
              </CCardBody>
            ) : (
              <div className="inspection-check-card__collapsed-summary">
                {section.visibleRows.length} row{section.visibleRows.length === 1 ? '' : 's'} in
                this section
              </div>
            )}
          </CCard>
        )
      })}

      <div className="d-grid gap-1">
        {readOnly ? (
          <>
            <div className="small fw-semibold text-muted">One-Off Remarks</div>
            <div
              className="rounded-3 border bg-light-subtle p-3"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {oneOffRemarks || '--'}
            </div>
          </>
        ) : (
          <>
            <CFormLabel className="small fw-semibold text-muted mb-1">One-Off Remarks</CFormLabel>
            <CFormTextarea
              rows={3}
              value={oneOffRemarks}
              placeholder="Optional one-off checklist remarks"
              onChange={(event) => onUpdateSessionMeta?.('frtOneOffRemarks', event.target.value)}
            />
          </>
        )}
      </div>

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldErrors.frtDailyChecks ? 'Complete all daily roster rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {fieldErrors.frtDailyRemarks
              ? 'Add remarks and issue photos for daily issue rows before review.'
              : ''}
          </FormFieldError>
          <FormFieldError>
            {fieldErrors.frtOneOffChecks ? 'Complete all one-off rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {fieldErrors.frtOneOffRemarks
              ? 'Add remarks and issue photos for one-off issue rows before review.'
              : ''}
          </FormFieldError>
        </>
      ) : null}
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
    </div>
  )
}

const ScbaStatusSegment = ({ label, value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2">
    <div className="inspection-hydraulic-check-label small fw-semibold text-muted">{label}</div>
    <div className="inspection-hydraulic-status-group d-flex flex-nowrap justify-content-start gap-2 overflow-auto pb-1">
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
  onUpdateGroupedCheck,
  onMarkRowOk,
  onMarkAllOk,
  onAddSection,
  onEditSection,
  onDeleteSection,
  onArchiveSection,
  onRestoreSection,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onArchiveItem,
  onRestoreItem,
  onRequestPhotoUpload,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  fieldError = false,
  remarksError = false,
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
  const [search, setSearch] = useState('')
  const [expandedSectionKeys, setExpandedSectionKeys] = useState(() => new Set())
  const [hasManualSectionExpansion, setHasManualSectionExpansion] = useState(false)
  const [expandedAdditionalRemarks, setExpandedAdditionalRemarks] = useState({})
  const [photoViewer, setPhotoViewer] = useState(null)
  const filteredSections = visibleSections
    .map((section) => ({
      ...section,
      visibleRows: (section.visibleRows || []).filter((row) =>
        rowContainsSearch(
          row,
          [
            'brand',
            'serialNo',
            'size',
            'cylinderType',
            'remarks',
            ...(section.fields || getScbaSectionFields(section.key, form)).map(
              (field) => field.key,
            ),
          ],
          search,
        ),
      ),
    }))
    .filter((section) => !search || section.visibleRows.length > 0)
  const filteredRowCount = filteredSections.reduce(
    (count, section) => count + section.visibleRows.length,
    0,
  )
  const totalRowCount = visibleSections.reduce(
    (count, section) => count + (section.visibleRows || []).length,
    0,
  )
  const shouldDefaultCollapseSections = isCompactInspectionViewport()
  const removedCustomSections = normalizeScbaCustomSections(
    form?.scbaCustomSections || form?.scba_custom_sections,
  )
    .map((section) => ({
      ...section,
      removedRows: (section.rows || []).filter((row) => row.removed === true),
    }))
    .filter((section) => section.removed === true || section.removedRows.length > 0)
  const defaultExpandedSectionKeys = new Set(
    shouldDefaultCollapseSections
      ? filteredSections.slice(0, 1).map((section) => section.key)
      : filteredSections.map((section) => section.key),
  )

  const isScbaRowIncomplete = (section, row = {}) => {
    const fields = section.fields || getScbaSectionFields(section.key, form)
    const hasMissingValue = fields.some((field) => !String(row[field.key] || '').trim())
    const hasIncompleteIssueEvidence = fields.some((field) => {
      if (field.kind !== 'status' || String(row[field.key] || '') !== 'Not Good') return false
      const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
      const photos = Array.isArray(row[photosKey]) ? row[photosKey] : []
      return !String(row[remarksKey] || '').trim() || photos.length === 0
    })
    return hasMissingValue || hasIncompleteIssueEvidence
  }

  const expandScbaSection = (sectionKey) => {
    const normalizedKey = String(sectionKey || '').trim()
    if (!normalizedKey) return
    setHasManualSectionExpansion(true)
    setExpandedSectionKeys((current) => {
      const next = hasManualSectionExpansion
        ? new Set(current)
        : new Set(defaultExpandedSectionKeys)
      next.add(normalizedKey)
      return next
    })
    window.setTimeout(() => {
      Array.from(document.querySelectorAll('[data-inspection-scba-section-id]'))
        .find(
          (element) => element.getAttribute('data-inspection-scba-section-id') === normalizedKey,
        )
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const renderScbaIssueEvidence = (sectionKey, row, field) => {
    const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
    const remarks = String(row[remarksKey] || '').trim()
    const photos = Array.isArray(row[photosKey]) ? row[photosKey] : []

    if (readOnly) {
      return (
        <EvidenceBlock
          title={`${field.label} issue evidence`}
          remarks={remarks}
          photos={photos}
          readOnly
          onViewPhotos={() =>
            setPhotoViewer({
              title: `${getScbaDisplayLabel(row)} - ${field.label} issue photos`,
              photos,
              readOnly: true,
              showDescriptionInput: false,
            })
          }
        />
      )
    }

    return (
      <div className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2">
        <CFormTextarea
          rows={2}
          value={remarks}
          placeholder={`${field.label} issue remarks`}
          aria-label={`${field.label} issue remarks`}
          onChange={(event) =>
            onUpdateGroupedCheck?.(sectionKey, row, {
              [remarksKey]: event.target.value,
            })
          }
        />
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <CreateActionButton
            label="Add issue photo"
            className="inspection-compact-action-btn"
            icon={<Camera size={13} className="me-1 align-text-bottom" />}
            onClick={() => onRequestIssuePhotoUpload?.(sectionKey, row, field)}
          />
        </div>
        {remarksError && !remarks ? (
          <FormFieldError>{field.label} issue remarks are required.</FormFieldError>
        ) : null}
        {remarksError && photos.length === 0 ? (
          <FormFieldError>{field.label} issue photo is required.</FormFieldError>
        ) : null}
        {photos.length > 0 ? (
          <InspectionPhotoEvidenceSummary
            photos={photos}
            label="View photos"
            onView={() =>
              setPhotoViewer({
                title: `${getScbaDisplayLabel(row)} - ${field.label} issue photos`,
                photos,
                onRemove: (photoId) => onRemovePhoto?.(sectionKey, row, photoId, photosKey),
                onChangeDescription: (photoId, description) =>
                  onChangePhotoDescription?.(sectionKey, row, photoId, description, photosKey),
                onApplyCaption: (photoId, caption) =>
                  onApplyPhotoCaption?.(sectionKey, row, photoId, caption, photosKey),
              })
            }
          />
        ) : null}
      </div>
    )
  }

  const renderScbaRetainedEvidence = (sectionKey, row, field) => {
    const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
    const remarks = String(row[remarksKey] || '').trim()
    const photos = Array.isArray(row[photosKey]) ? row[photosKey] : []

    return (
      <EvidenceBlock
        title={`${field.label} retained evidence from earlier status`}
        remarks={remarks}
        photos={photos}
        readOnly={readOnly}
        onViewPhotos={() =>
          setPhotoViewer({
            title: `${getScbaDisplayLabel(row)} - ${field.label} retained evidence photos`,
            photos,
            readOnly,
            showDescriptionInput: !readOnly,
            onRemove: readOnly
              ? undefined
              : (photoId) => onRemovePhoto?.(sectionKey, row, photoId, photosKey),
            onChangeDescription: readOnly
              ? undefined
              : (photoId, description) =>
                  onChangePhotoDescription?.(sectionKey, row, photoId, description, photosKey),
            onApplyCaption: readOnly
              ? undefined
              : (photoId, caption) =>
                  onApplyPhotoCaption?.(sectionKey, row, photoId, caption, photosKey),
          })
        }
      >
        {readOnly ? (
          <div className="small text-body-secondary">
            Audit context only. Current status is not Not Good.
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
                onUpdateGroupedCheck?.(sectionKey, row, {
                  [remarksKey]: '',
                  [photosKey]: [],
                })
              }
            >
              Clear retained evidence
            </CButton>
          </div>
        )}
      </EvidenceBlock>
    )
  }

  const renderScbaAdditionalInfo = (sectionKey, row) => {
    const rowId = row.id || `${sectionKey}:${row.serialNo || row.brand || 'scba'}`
    const remarks = String(row.remarks || '').trim()
    const photos = Array.isArray(row.photos) ? row.photos : []
    const showRemarks = readOnly ? remarks : expandedAdditionalRemarks[rowId] || remarks

    if (readOnly && !remarks && photos.length === 0) return null

    return (
      <div className="d-grid gap-2">
        <div className="small fw-semibold text-muted">Additional Info (optional)</div>
        {!readOnly ? (
          <div className="d-flex flex-wrap justify-content-start gap-2">
            {!showRemarks ? (
              <CreateActionButton
                label="Remark"
                className="inspection-compact-action-btn"
                icon={<MessageSquare size={13} className="me-1 align-text-bottom" />}
                onClick={() =>
                  setExpandedAdditionalRemarks((current) => ({
                    ...current,
                    [rowId]: true,
                  }))
                }
              />
            ) : null}
            <CreateActionButton
              label="Photo"
              className="inspection-compact-action-btn"
              icon={<Camera size={13} className="me-1 align-text-bottom" />}
              onClick={() => onRequestPhotoUpload?.(sectionKey, row)}
            />
          </div>
        ) : null}
        {showRemarks ? (
          readOnly ? (
            <div className="small">
              <div className="fw-semibold text-body-secondary">General equipment remarks</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{remarks}</div>
            </div>
          ) : (
            <div className="d-grid gap-1">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <CFormLabel className="small fw-semibold text-muted mb-0">
                  General equipment remarks
                </CFormLabel>
                {remarks ? (
                  <CButton
                    type="button"
                    color="danger"
                    variant="outline"
                    size="sm"
                    className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
                    onClick={() => {
                      onUpdateGroupedCheck?.(sectionKey, row, { remarks: '' })
                      setExpandedAdditionalRemarks((current) => ({
                        ...current,
                        [rowId]: false,
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
                      setExpandedAdditionalRemarks((current) => ({
                        ...current,
                        [rowId]: false,
                      }))
                    }
                  >
                    Cancel
                  </CButton>
                )}
              </div>
              <CFormTextarea
                rows={2}
                value={String(row.remarks || '')}
                placeholder="General equipment remarks"
                onChange={(event) =>
                  onUpdateGroupedCheck?.(sectionKey, row, { remarks: event.target.value })
                }
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
                title: `${getScbaDisplayLabel(row)} - additional photos`,
                photos,
                readOnly,
                showDescriptionInput: !readOnly,
                onRemove: readOnly
                  ? undefined
                  : (photoId) => onRemovePhoto?.(sectionKey, row, photoId, 'photos'),
                onChangeDescription: readOnly
                  ? undefined
                  : (photoId, description) =>
                      onChangePhotoDescription?.(sectionKey, row, photoId, description, 'photos'),
                onApplyCaption: readOnly
                  ? undefined
                  : (photoId, caption) =>
                      onApplyPhotoCaption?.(sectionKey, row, photoId, caption, 'photos'),
              })
            }
          />
        ) : null}
      </div>
    )
  }

  if (!mainLocation && visibleSections.every((section) => section.visibleRows.length === 0))
    return null

  return (
    <div className="d-grid gap-3">
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
                {!readOnly && summary.incompletePhotoCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.incompletePhotoCount} need photos
                  </span>
                ) : null}
                {summary.retainedEvidenceCount > 0 ? (
                  <span className="inspection-hydraulic-summary-pill badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    {summary.retainedEvidenceCount} retained evidence
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {!readOnly ? (
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
            <CreateActionButton
              label="Mark all Good"
              className="inspection-compact-action-btn"
              onClick={onMarkAllOk}
            />
            <CreateActionButton
              label="Add section"
              className="inspection-compact-action-btn"
              onClick={onAddSection}
            />
          </div>
        ) : null}
      </div>

      <ManagedCheckToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search SCBA items..."
        resultCount={filteredRowCount}
        totalCount={totalRowCount}
        readOnly={readOnly}
        onNextIncomplete={() => {
          const section = filteredSections.find((candidate) =>
            (candidate.visibleRows || []).some((row) => isScbaRowIncomplete(candidate, row)),
          )
          if (section) expandScbaSection(section.key)
        }}
        onExpandAll={() => {
          setHasManualSectionExpansion(true)
          setExpandedSectionKeys(new Set(filteredSections.map((section) => section.key)))
        }}
        onCollapseAll={() => {
          setHasManualSectionExpansion(true)
          setExpandedSectionKeys(new Set())
        }}
      />

      {filteredSections.map((section) => {
        const rows = section.visibleRows || []
        if (rows.length === 0 && !section.isCustomSection) return null
        const isExpanded =
          readOnly ||
          (hasManualSectionExpansion
            ? expandedSectionKeys.has(section.key)
            : defaultExpandedSectionKeys.has(section.key))

        return (
          <CCard
            key={section.key}
            className="inspection-hydraulic-card inspection-check-card"
            data-inspection-scba-section-id={section.key}
          >
            <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="fw-semibold text-muted">
                  {section.title || getScbaSectionTitle(section.key)}
                </div>
                {section.isCustomSection ? (
                  <span className="badge text-bg-light border text-body">Custom</span>
                ) : null}
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
                {section.isCustomSection &&
                Array.isArray(section.fields) &&
                section.fields.length > 0 ? (
                  <div className="small text-body-secondary w-100">
                    Checks: {section.fields.map((field) => field.label).join(', ')}
                  </div>
                ) : null}
              </div>
              {!readOnly ? (
                <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
                  <CreateActionButton
                    label="Add item"
                    className="inspection-compact-action-btn"
                    onClick={() => onAddItem?.(section.key)}
                  />
                  {section.isCustomSection ? (
                    <RowActions
                      iconSize={16}
                      hitArea={32}
                      toggleAriaLabel={`Section actions for ${
                        section.title || getScbaSectionTitle(section.key)
                      }`}
                      items={[
                        {
                          key: 'edit',
                          label: 'Edit section',
                          onClick: () => onEditSection?.(section),
                        },
                        {
                          key: 'remove',
                          label: 'Remove from this inspection',
                          className: 'text-danger',
                          onClick: () => onDeleteSection?.(section),
                        },
                        section.catalogSectionId
                          ? {
                              key: 'archive',
                              label: 'Archive from future inspections',
                              className: 'text-danger',
                              onClick: () => onArchiveSection?.(section),
                            }
                          : null,
                      ].filter(Boolean)}
                    />
                  ) : null}
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    className="inspection-compact-action-btn"
                    onClick={() => {
                      setHasManualSectionExpansion(true)
                      setExpandedSectionKeys((current) => {
                        const next = hasManualSectionExpansion
                          ? new Set(current)
                          : new Set(defaultExpandedSectionKeys)
                        if (next.has(section.key)) next.delete(section.key)
                        else next.add(section.key)
                        return next
                      })
                    }}
                  >
                    {isExpanded ? 'Collapse' : 'Open'}
                  </CButton>
                </div>
              ) : null}
            </CCardHeader>

            {isExpanded ? (
              <CCardBody className="inspection-hydraulic-card-body">
                {rows.length === 0 ? (
                  <div className="inspection-check-card__collapsed-summary">
                    No items in this section yet. Add an item to inspect{' '}
                    {Array.isArray(section.fields) && section.fields.length > 0
                      ? section.fields.map((field) => field.label).join(', ')
                      : 'the configured checks'}
                    .
                  </div>
                ) : null}
                <div className="inspection-hydraulic-card-grid inspection-check-card-grid--managed gap-5">
                  {rows.map((row) => {
                    const issueFields = (
                      section.fields || getScbaSectionFields(section.key, form)
                    ).filter(
                      (field) =>
                        field.kind === 'status' && String(row[field.key] || '') === 'Not Good',
                    )
                    const hasIssue = issueFields.length > 0
                    const retainedEvidenceFields = getScbaRowRetainedEvidenceFields(
                      row,
                      section.fields,
                    )
                    const hasRetainedEvidence = retainedEvidenceFields.length > 0

                    return (
                      <CCard key={row.id || row.serialNo} className="inspection-hydraulic-card">
                        <CCardHeader className="inspection-hydraulic-card-header d-flex align-items-center justify-content-between gap-2">
                          <div style={{ minWidth: 0 }}>
                            <div className="d-flex flex-wrap align-items-center gap-2">
                              <div className="fw-semibold text-break">
                                {getScbaDisplayLabel(row)}
                              </div>
                              {hasIssue ? (
                                <span className="badge text-bg-danger-subtle text-danger border border-danger-subtle">
                                  Issue
                                </span>
                              ) : null}
                              {hasRetainedEvidence ? (
                                <span className="badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                                  Retained evidence
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {!readOnly ? (
                            <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
                              {Array.isArray(section.fields) && section.fields.length > 1 ? (
                                <CButton
                                  type="button"
                                  color="secondary"
                                  variant="outline"
                                  size="sm"
                                  className="inspection-compact-action-btn"
                                  onClick={() => onMarkRowOk?.(section.key, row)}
                                >
                                  All Good
                                </CButton>
                              ) : null}
                              {row.isCustomEquipment ? (
                                <RowActions
                                  iconSize={16}
                                  hitArea={32}
                                  toggleAriaLabel={`Item actions for ${getScbaDisplayLabel(row)}`}
                                  items={[
                                    {
                                      key: 'edit',
                                      label: 'Edit item',
                                      onClick: () => onEditItem?.(section.key, row),
                                    },
                                    {
                                      key: 'remove',
                                      label: 'Remove from this inspection',
                                      className: 'text-danger',
                                      onClick: () => onDeleteItem?.(section.key, row),
                                    },
                                    row.catalogItemId
                                      ? {
                                          key: 'archive',
                                          label: 'Archive from future inspections',
                                          className: 'text-danger',
                                          onClick: () => onArchiveItem?.(section.key, row),
                                        }
                                      : null,
                                  ].filter(Boolean)}
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </CCardHeader>
                        <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
                          {section.fields.map((field) => {
                            const isStatusField = field.kind === 'status'
                            const isIssue =
                              isStatusField && String(row[field.key] || '') === 'Not Good'
                            const hasFieldRetainedEvidence = retainedEvidenceFields.some(
                              (retainedField) => retainedField.key === field.key,
                            )

                            if (readOnly) {
                              return (
                                <div
                                  key={field.key}
                                  className="inspection-hydraulic-check-with-evidence d-grid gap-2"
                                >
                                  <div className="row g-3">
                                    <div className="col-12">
                                      <div className="small text-body-secondary">{field.label}</div>
                                      <div className="fw-semibold">
                                        {String(row[field.key] || '--')}
                                      </div>
                                    </div>
                                  </div>
                                  {isIssue
                                    ? renderScbaIssueEvidence(section.key, row, field)
                                    : null}
                                  {hasFieldRetainedEvidence
                                    ? renderScbaRetainedEvidence(section.key, row, field)
                                    : null}
                                </div>
                              )
                            }

                            if (isStatusField) {
                              return (
                                <div
                                  key={field.key}
                                  className="inspection-hydraulic-check-with-evidence d-grid gap-2"
                                >
                                  <ScbaStatusSegment
                                    label={field.label}
                                    value={row[field.key]}
                                    onChange={(nextValue) =>
                                      onUpdateGroupedCheck?.(section.key, row, {
                                        [field.key]: nextValue,
                                      })
                                    }
                                  />
                                  {isIssue
                                    ? renderScbaIssueEvidence(section.key, row, field)
                                    : null}
                                  {hasFieldRetainedEvidence
                                    ? renderScbaRetainedEvidence(section.key, row, field)
                                    : null}
                                </div>
                              )
                            }

                            return (
                              <div key={field.key} className="col-12 col-md-6">
                                <CFormLabel className="small fw-semibold text-muted mb-1">
                                  {field.label}
                                </CFormLabel>
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
                            )
                          })}
                          {renderScbaAdditionalInfo(section.key, row)}
                        </CCardBody>
                      </CCard>
                    )
                  })}
                </div>
              </CCardBody>
            ) : (
              <div className="inspection-check-card__collapsed-summary">
                {rows.length} item{rows.length === 1 ? '' : 's'} in this section
                {section.isCustomSection &&
                Array.isArray(section.fields) &&
                section.fields.length > 0
                  ? ` - Checks: ${section.fields.map((field) => field.label).join(', ')}`
                  : ''}
              </div>
            )}
          </CCard>
        )
      })}

      {!readOnly && removedCustomSections.length > 0 ? (
        <CCard className="inspection-hydraulic-card inspection-check-card">
          <CCardHeader className="inspection-hydraulic-card-header">
            <div className="fw-semibold text-muted">Removed custom SCBA items</div>
          </CCardHeader>
          <CCardBody className="d-grid gap-2">
            {removedCustomSections.map((section) => (
              <div key={`removed-${section.key}`} className="border rounded-2 p-2 d-grid gap-2">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <div className="small fw-semibold">{section.title}</div>
                  {section.removed === true ? (
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      className="inspection-compact-action-btn"
                      onClick={() => onRestoreSection?.(section)}
                    >
                      Restore
                    </CButton>
                  ) : null}
                </div>
                {section.removed !== true && section.removedRows.length > 0 ? (
                  <div className="d-grid gap-1">
                    {section.removedRows.map((row) => (
                      <div
                        key={`removed-${section.key}-${row.id}`}
                        className="d-flex flex-wrap align-items-center justify-content-between gap-2 small"
                      >
                        <span>{getScbaDisplayLabel(row)}</span>
                        <CButton
                          type="button"
                          color="secondary"
                          variant="outline"
                          size="sm"
                          className="inspection-compact-action-btn"
                          onClick={() => onRestoreItem?.(section.key, row)}
                        >
                          Restore
                        </CButton>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CCardBody>
        </CCard>
      ) : null}

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldError ? 'Complete all SCBA rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {remarksError
              ? 'Add remarks and issue photos for SCBA issue fields before review.'
              : ''}
          </FormFieldError>
        </>
      ) : null}
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
    </div>
  )
}
