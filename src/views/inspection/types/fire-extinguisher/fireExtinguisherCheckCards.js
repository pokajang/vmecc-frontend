import React, { useState } from 'react'
import { CBadge, CButton, CFormLabel, CFormTextarea } from '@coreui/react'
import { Camera, CheckCircle2, Circle, MessageSquare, Trash2, TriangleAlert } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import { buildPhotoViewerUploadOptions } from '../../form/inspectionPhotoFlow'
import {
  FormFieldError,
  InspectionPhotoActionRow,
  InspectionPhotoEvidenceSummary,
} from '../../form/components/InspectionFormDisplaySections'
import {
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  formatFireExtinguisherDaysLeft,
  formatFireExtinguisherLastInspection,
  getFireExtinguisherCurrentCheckLabel,
  getFireExtinguisherRowWorkflowState,
  isFireExtinguisherDefectStatus,
  shouldShowFireExtinguisherLastInspection,
} from './helpers'
import InspectionStatusSegment from '../../form/components/patterns/InspectionStatusSegment'
import { InspectionElementCard } from '../../form/components/InspectionElementUi'
export { AddFireExtinguisherForm } from './fireExtinguisherEditForm'

const text = (value) => String(value || '').trim()

export const getFireExtinguisherRowTitle = (row = {}) =>
  row.idLocNo || row.barcodeNo || 'Fire Extinguisher'

const getFireExtinguisherDefectCount = (row = {}) =>
  FIRE_EXTINGUISHER_CHECK_FIELDS.filter((field) => isFireExtinguisherDefectStatus(row[field.key]))
    .length

const FireExtinguisherInspectionStatusInline = ({ row, defectCount = 0, workflowState }) => {
  const hasDefect = workflowState?.hasDefect === true
  const sessionCompleted =
    text(row?.sessionResult?.status || row?.sessionStatus).toLowerCase() === 'completed'
  const isComplete =
    workflowState?.isComplete === true || sessionCompleted || row?.sessionSyncPending === true
  const completionLabel = getFireExtinguisherCurrentCheckLabel(row)

  return (
    <span
      className="inspection-fire-extinguisher-status-inline d-inline-flex flex-wrap align-items-center gap-2 small"
      data-testid="fire-extinguisher-status-inline"
    >
      <span
        className={`d-inline-flex align-items-center gap-1 ${
          isComplete ? 'text-muted' : 'text-body-secondary'
        }`}
        aria-label={completionLabel}
        title={completionLabel}
        data-testid={
          isComplete
            ? 'fire-extinguisher-status-inspected'
            : 'fire-extinguisher-status-not-inspected'
        }
      >
        {isComplete ? (
          <CheckCircle2 size={14} className="text-success" aria-hidden="true" />
        ) : (
          <Circle size={14} aria-hidden="true" />
        )}
        <span className="fw-normal">{completionLabel}</span>
      </span>
      {hasDefect ? (
        <span
          className="d-inline-flex align-items-center gap-1 text-danger"
          aria-label={`Defect (${defectCount})`}
          title={`Defect (${defectCount})`}
          data-testid="fire-extinguisher-status-defect"
        >
          <TriangleAlert size={14} aria-hidden="true" />
          <span className="fw-normal">Defect ({defectCount})</span>
        </span>
      ) : null}
    </span>
  )
}

const FireExtinguisherLegacyStatusBadges = ({ missingCount, missingRemarkKeys, row }) => (
  <>
    {row.equipmentSource === 'seed' ? (
      <CBadge color="warning" className="d-none d-md-inline-flex">
        Shared
      </CBadge>
    ) : null}
    {row.equipmentSource === 'custom' ? (
      <CBadge color="info" className="d-none d-md-inline-flex">
        Custom
      </CBadge>
    ) : null}
    {missingCount > 0 ? (
      <CBadge color="warning" className="d-inline-flex">
        {missingCount} missing
      </CBadge>
    ) : null}
    {missingRemarkKeys.length > 0 ? (
      <span className="badge rounded-pill text-bg-danger d-inline-flex align-items-center">
        Needs evidence
      </span>
    ) : null}
  </>
)

const FireExtinguisherStatusSegment = ({
  field,
  value,
  readOnly = false,
  onChange,
  invalid = false,
  describedBy,
}) => (
  <InspectionStatusSegment
    label={field.label}
    value={value}
    options={field.options}
    onChange={onChange}
    readOnly={readOnly}
    invalid={invalid}
    describedBy={describedBy}
  />
)

const FireExtinguisherEvidenceBlock = ({
  title,
  remarks = '',
  photos = [],
  readOnly = false,
  children = null,
  onViewPhotos,
}) => {
  const visiblePhotos = Array.isArray(photos) ? photos.filter(Boolean) : []
  const hasRemarks = text(remarks)
  const visiblePhotoCaptions = visiblePhotos
    .map((photo) => text(photo?.description || photo?.caption || photo?.fileName))
    .filter(Boolean)
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
      {readOnly && visiblePhotoCaptions.length > 0 ? (
        <div className="d-grid gap-1">
          {visiblePhotoCaptions.map((caption, index) => (
            <div key={`${caption}-${index}`} className="small text-body-secondary">
              {caption}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export const formatFireExtinguisherMeta = (row) =>
  [row.feType, row.barcodeNo, row.subLocation || row.mainLocation].filter(Boolean).join(' - ')

const formatFireExtinguisherMobileMeta = (row) =>
  [row.feType, row.barcodeNo].filter(Boolean).join(' - ')

export const formatFireExtinguisherCertification = (row) => {
  const value = row.certificationValidity || '--'
  const daysLeft = formatFireExtinguisherDaysLeft(row.certificationValidity)
  return `Certification: ${value}${daysLeft ? ` (${daysLeft})` : ''}`
}

const formatFireExtinguisherMobileSummary = (row) =>
  [formatFireExtinguisherMobileMeta(row), formatFireExtinguisherCertification(row)]
    .filter(Boolean)
    .join(' | ')

const getFireExtinguisherPhotos = (row, photosKey) =>
  Array.isArray(row?.[photosKey]) ? row[photosKey] : []

const getFireExtinguisherPhotoViewer = ({
  row,
  title,
  photos,
  photosKey,
  readOnly,
  handlers,
  showDescriptionInput = true,
  onAddMorePhoto,
}) => ({
  title,
  photos,
  readOnly,
  showDescriptionInput,
  showCaptionChips: false,
  onAddMorePhoto: readOnly ? undefined : onAddMorePhoto,
  onSave: readOnly
    ? undefined
    : (nextPhotos) => handlers.onUpdateCheck?.(row, { [photosKey]: nextPhotos }),
  onRemove: readOnly ? undefined : (photoId) => handlers.onRemovePhoto?.(row, photoId, photosKey),
  onChangeDescription: readOnly
    ? undefined
    : (photoId, description) =>
        handlers.onChangePhotoDescription?.(row, photoId, description, photosKey),
  onApplyCaption: readOnly
    ? undefined
    : (photoId, caption) => handlers.onApplyPhotoCaption?.(row, photoId, caption, photosKey),
})

const FireExtinguisherAdditionalInfo = ({ row, readOnly = false, handlers = {}, onViewPhotos }) => {
  const [expanded, setExpanded] = useState(() => text(row.remarks) !== '')
  const rawRemarks = String(row.remarks || '')
  const hasRemarks = text(rawRemarks) !== ''
  const showRemarks = readOnly ? hasRemarks : expanded || hasRemarks
  const photos = getFireExtinguisherPhotos(row, 'photos')
  const openAdditionalPhotoViewer = (nextPhotos = photos) =>
    onViewPhotos?.(
      getFireExtinguisherPhotoViewer({
        row,
        title: `${row.idLocNo || row.barcodeNo || 'Fire extinguisher'} - additional photos`,
        photos: nextPhotos,
        photosKey: 'photos',
        readOnly,
        handlers,
        onAddMorePhoto: readOnly
          ? undefined
          : (currentPhotos) =>
              handlers.onRequestPhotoUpload?.(
                row,
                buildPhotoViewerUploadOptions(openAdditionalPhotoViewer, { currentPhotos }),
              ),
      }),
    )

  if (readOnly && !showRemarks && photos.length === 0) return null

  return (
    <div className="inspection-fire-extinguisher-additional-info d-grid gap-2">
      <div className="small fw-semibold text-muted">Additional Info (optional)</div>
      {!readOnly ? (
        <div className="inspection-fire-extinguisher-additional-actions d-flex flex-wrap justify-content-start gap-2">
          {!showRemarks ? (
            <CreateActionButton
              label="Remark"
              className="inspection-compact-action-btn"
              icon={<MessageSquare size={13} className="me-1 align-text-bottom" />}
              onClick={() => setExpanded(true)}
            />
          ) : null}
          <CreateActionButton
            label="Photo"
            className="inspection-compact-action-btn"
            icon={<Camera size={13} className="me-1 align-text-bottom" />}
            onClick={() =>
              handlers.onRequestPhotoUpload?.(
                row,
                buildPhotoViewerUploadOptions(openAdditionalPhotoViewer, {
                  currentPhotos: photos,
                }),
              )
            }
          />
        </div>
      ) : null}
      {showRemarks ? (
        readOnly ? (
          <div className="small">
            <div className="fw-semibold text-body-secondary">General extinguisher remarks</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{row.remarks}</div>
          </div>
        ) : (
          <div className="d-grid gap-1">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <CFormLabel className="small fw-semibold text-muted mb-0">
                General extinguisher remarks
              </CFormLabel>
              {hasRemarks ? (
                <CButton
                  type="button"
                  color="danger"
                  variant="outline"
                  size="sm"
                  className="inspection-compact-action-btn d-inline-flex align-items-center gap-1"
                  onClick={() => {
                    handlers.onUpdateCheck?.(row, { remarks: '' })
                    setExpanded(false)
                  }}
                >
                  <Trash2 size={13} />
                  Clear
                </CButton>
              ) : null}
            </div>
            <CFormTextarea
              rows={2}
              aria-label="General extinguisher remarks"
              placeholder="General extinguisher remarks"
              value={rawRemarks}
              onChange={(event) => handlers.onUpdateCheck?.(row, { remarks: event.target.value })}
            />
            {!hasRemarks ? (
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                className="inspection-compact-action-btn justify-self-start"
                onClick={() => setExpanded(false)}
              >
                Cancel
              </CButton>
            ) : null}
          </div>
        )
      ) : null}
      {photos.length > 0 ? (
        <InspectionPhotoEvidenceSummary
          photos={photos}
          label="View photos"
          readOnly={readOnly}
          onView={() => openAdditionalPhotoViewer(photos)}
        />
      ) : null}
    </div>
  )
}

export const FireExtinguisherRowDetails = ({
  row,
  readOnly = false,
  missingStatusKeys = [],
  missingRemarkKeys = [],
  onViewPhotos,
  handlers = {},
}) => {
  const title = getFireExtinguisherRowTitle(row)

  return (
    <>
      {FIRE_EXTINGUISHER_CHECK_FIELDS.map((field) => {
        const status = row[field.key]
        const isDefect = isFireExtinguisherDefectStatus(status)
        const missingStatus = missingStatusKeys.includes(field.key)
        const missingRemarks = missingRemarkKeys.includes(field.remarksKey)
        const statusErrorId = `${row.id}-${field.key}-status-error`
        const defectRemarks = String(row[field.remarksKey] || '')
        const defectPhotos = getFireExtinguisherPhotos(row, field.photosKey)
        const openDefectPhotoViewer = (photos = defectPhotos) =>
          onViewPhotos?.(
            getFireExtinguisherPhotoViewer({
              row,
              title: `${title} - ${field.label} defect photos`,
              photos,
              photosKey: field.photosKey,
              readOnly,
              handlers,
              onAddMorePhoto: (currentPhotos) =>
                handlers.onRequestDefectPhotoUpload?.(
                  row,
                  field,
                  buildPhotoViewerUploadOptions(openDefectPhotoViewer, { currentPhotos }),
                ),
            }),
          )
        const requestDefectPhoto = () =>
          handlers.onRequestDefectPhotoUpload?.(
            row,
            field,
            buildPhotoViewerUploadOptions(openDefectPhotoViewer, { currentPhotos: defectPhotos }),
          )

        return (
          <div
            key={field.key}
            className="inspection-hydraulic-check-with-evidence d-grid gap-2"
            data-fire-extinguisher-check-key={field.key}
          >
            <FireExtinguisherStatusSegment
              field={field}
              value={status}
              readOnly={readOnly}
              invalid={missingStatus}
              describedBy={missingStatus ? statusErrorId : undefined}
              onChange={(nextValue) => handlers.onUpdateCheck?.(row, { [field.key]: nextValue })}
            />
            <FormFieldError id={statusErrorId}>
              {missingStatus ? `${field.label} is required.` : ''}
            </FormFieldError>
            {isDefect ? (
              readOnly ? (
                <FireExtinguisherEvidenceBlock
                  title={`${field.label} defect evidence`}
                  remarks={defectRemarks}
                  photos={defectPhotos}
                  readOnly
                  onViewPhotos={() =>
                    onViewPhotos?.(
                      getFireExtinguisherPhotoViewer({
                        row,
                        title: `${title} - ${field.label} defect photos`,
                        photos: defectPhotos,
                        photosKey: field.photosKey,
                        readOnly: true,
                        handlers,
                        showDescriptionInput: false,
                      }),
                    )
                  }
                />
              ) : (
                <div className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2">
                  <CFormTextarea
                    rows={2}
                    placeholder={`${field.label} defect remarks`}
                    aria-label={`${field.label} defect remarks`}
                    value={defectRemarks}
                    data-fire-extinguisher-detail-key={field.remarksKey}
                    onChange={(event) =>
                      handlers.onUpdateCheck?.(row, { [field.remarksKey]: event.target.value })
                    }
                  />
                  <FormFieldError>
                    {missingRemarks ? `${field.label} remarks are required for this status.` : ''}
                  </FormFieldError>
                  <div data-fire-extinguisher-detail-key={field.photosKey}>
                    <InspectionPhotoActionRow
                      photos={defectPhotos}
                      onView={() => openDefectPhotoViewer(defectPhotos)}
                      onAddPhoto={requestDefectPhoto}
                    />
                  </div>
                </div>
              )
            ) : null}
          </div>
        )
      })}
      <FireExtinguisherAdditionalInfo
        row={row}
        readOnly={readOnly}
        handlers={handlers}
        onViewPhotos={onViewPhotos}
      />
    </>
  )
}

export const FireExtinguisherRowCard = ({
  row,
  readOnly = false,
  expanded = true,
  active = false,
  missingStatusKeys = [],
  missingRemarkKeys = [],
  onToggleExpanded,
  onViewPhotos,
  handlers = {},
}) => {
  const workflowState = getFireExtinguisherRowWorkflowState(row)
  const defectCount = getFireExtinguisherDefectCount(row)
  const title = getFireExtinguisherRowTitle(row)
  const missingCount = missingStatusKeys.length + missingRemarkKeys.length
  const bodyId = `fire-extinguisher-checks-${String(row.id || '').replace(/[^A-Za-z0-9_-]/g, '-')}`
  const toggleExpanded = () => onToggleExpanded?.(row)
  const canReset = !readOnly && typeof handlers.onResetCheck === 'function'
  const actionItems = [
    canReset
      ? {
          key: 'reset',
          label: 'Reset check',
          className: 'text-danger',
          onClick: () => handlers.onResetCheck?.(row),
        }
      : null,
    row.canEdit
      ? {
          key: 'edit',
          label: 'Edit',
          onClick: () => handlers.onEditExtinguisher?.(row),
        }
      : null,
    row.canDelete
      ? {
          key: 'delete',
          label: 'Delete',
          className: 'text-danger',
          onClick: () => handlers.onDeleteExtinguisher?.(row),
        }
      : null,
  ].filter(Boolean)

  const helperLines = [
    formatFireExtinguisherCertification(row),
    shouldShowFireExtinguisherLastInspection(row)
      ? formatFireExtinguisherLastInspection(row.lastInspection)
      : !readOnly
        ? row?.sessionSyncPending === true
          ? 'Current check saved on this device and still syncing.'
          : 'Current check not submitted yet.'
        : '',
  ].filter(Boolean)

  return (
    <InspectionElementCard
      title={title}
      meta={formatFireExtinguisherMeta(row)}
      mobileMeta={formatFireExtinguisherMobileSummary(row)}
      helperLines={helperLines}
      status={
        <FireExtinguisherInspectionStatusInline
          row={row}
          defectCount={defectCount}
          workflowState={workflowState}
        />
      }
      badges={
        <FireExtinguisherLegacyStatusBadges
          missingCount={missingCount}
          missingRemarkKeys={missingRemarkKeys}
          row={row}
        />
      }
      actions={actionItems}
      actionLabel={`Extinguisher actions for ${title}`}
      expanded={expanded}
      active={active}
      readOnly={readOnly}
      onToggle={toggleExpanded}
      bodyId={bodyId}
      dataAttributes={{ 'data-fire-extinguisher-row-id': row.id }}
    >
      <FireExtinguisherRowDetails
        row={row}
        readOnly={readOnly}
        missingStatusKeys={missingStatusKeys}
        missingRemarkKeys={missingRemarkKeys}
        handlers={handlers}
        onViewPhotos={onViewPhotos}
      />
    </InspectionElementCard>
  )
}
