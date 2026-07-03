import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormLabel,
  CFormTextarea,
} from '@coreui/react'
import { Camera, MessageSquare, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import RowActions from 'src/components/RowActions'
import {
  FormFieldError,
  InspectionPhotoEvidenceSummary,
  InspectionPhotoViewerModal,
} from '../../components/InspectionFormDisplaySections'
import {
  filterFireExtinguisherRows,
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  getFireExtinguisherRowWorkflowState,
  getFirstIncompleteFireExtinguisherRow,
  isFireExtinguisherDefectStatus,
} from './helpers'

const text = (value) => String(value || '').trim()

const GOOD_FIRE_EXTINGUISHER_VALUES = {
  physicalCondition: 'Good',
  signageCondition: 'Good',
  boxKeyAvailability: 'Yes',
  boxGlassAvailability: 'Yes',
  operationalCondition: 'Operational',
}

const FireExtinguisherStatusSegment = ({ field, value, readOnly = false, onChange }) => (
  <div className="inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2">
    <div className="inspection-hydraulic-check-label small fw-semibold text-muted">
      {field.label}
    </div>
    <div className="inspection-hydraulic-status-group d-flex flex-nowrap justify-content-start gap-2 overflow-auto pb-1">
      {field.options.map((option) => {
        const active = text(value).toLowerCase() === option.toLowerCase()
        const className = `inspection-hydraulic-status-btn btn btn-sm ${
          active ? 'btn-primary' : 'btn-outline-secondary'
        } ${readOnly ? 'pe-none' : ''}`.trim()

        return readOnly ? (
          <span key={option} className={className} aria-current={active ? 'true' : undefined}>
            {option}
          </span>
        ) : (
          <CButton
            key={option}
            type="button"
            size="sm"
            color={active ? 'primary' : 'secondary'}
            variant={active ? undefined : 'outline'}
            className="inspection-hydraulic-status-btn"
            onClick={() => onChange?.(option)}
          >
            {option}
          </CButton>
        )
      })}
    </div>
  </div>
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

const formatFireExtinguisherMeta = (row) =>
  [row.feType, row.barcodeNo, row.subLocation || row.mainLocation].filter(Boolean).join(' - ')

const formatFireExtinguisherCertification = (row) => {
  const value = row.certificationValidity || row.certificationValidityRaw || '--'
  return `Certification: ${value}${row.daysLeftToExpire ? ` (${row.daysLeftToExpire} days)` : ''}`
}

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
}) => ({
  title,
  photos,
  readOnly,
  showDescriptionInput,
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
  const hasRemarks = text(row.remarks) !== ''
  const showRemarks = readOnly ? hasRemarks : expanded || hasRemarks
  const photos = getFireExtinguisherPhotos(row, 'photos')

  if (readOnly && !showRemarks && photos.length === 0) return null

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
              onClick={() => setExpanded(true)}
            />
          ) : null}
          <CreateActionButton
            label="Photo"
            className="inspection-compact-action-btn"
            icon={<Camera size={13} className="me-1 align-text-bottom" />}
            onClick={() => handlers.onRequestPhotoUpload?.(row)}
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
              ) : (
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  className="inspection-compact-action-btn"
                  onClick={() => setExpanded(false)}
                >
                  Cancel
                </CButton>
              )}
            </div>
            <CFormTextarea
              rows={2}
              placeholder="General extinguisher remarks"
              value={text(row.remarks)}
              onChange={(event) => handlers.onUpdateCheck?.(row, { remarks: event.target.value })}
            />
          </div>
        )
      ) : null}
      {photos.length > 0 ? (
        <InspectionPhotoEvidenceSummary
          photos={photos}
          label="View photos"
          readOnly={readOnly}
          onView={() =>
            onViewPhotos?.(
              getFireExtinguisherPhotoViewer({
                row,
                title: `${row.idLocNo || row.barcodeNo || 'Fire extinguisher'} - additional photos`,
                photos,
                photosKey: 'photos',
                readOnly,
                handlers,
              }),
            )
          }
        />
      ) : null}
    </div>
  )
}

const FireExtinguisherRowCard = ({
  row,
  readOnly = false,
  expanded = true,
  active = false,
  missingStatusKeys = [],
  missingRemarkKeys = [],
  missingPhotoKeys = [],
  onToggleExpanded,
  onViewPhotos,
  handlers = {},
}) => {
  const workflowState = getFireExtinguisherRowWorkflowState(row)
  const hasDefect = workflowState.hasDefect
  const isComplete = workflowState.isComplete
  const title = row.idLocNo || row.barcodeNo || 'Fire Extinguisher'
  const statusTone = hasDefect ? 'danger' : isComplete ? 'success' : 'warning'
  const statusLabel = hasDefect ? 'Defect' : isComplete ? 'Complete' : 'Incomplete'

  return (
    <CCard
      className={`inspection-hydraulic-card inspection-check-card ${
        active ? 'border-primary shadow-sm' : ''
      }`.trim()}
      data-fire-extinguisher-row-id={row.id}
    >
      <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="d-grid gap-1" style={{ minWidth: 0 }}>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="fw-semibold text-break">{title}</div>
            <CBadge color={statusTone}>{statusLabel}</CBadge>
            {row.equipmentSource === 'seed' ? <CBadge color="warning">Shared</CBadge> : null}
            {row.equipmentSource === 'custom' ? <CBadge color="info">Custom</CBadge> : null}
          </div>
          {formatFireExtinguisherMeta(row) ? (
            <div className="small text-body-secondary text-break">
              {formatFireExtinguisherMeta(row)}
            </div>
          ) : null}
          <div className="small text-body-secondary">
            {formatFireExtinguisherCertification(row)}
          </div>
        </div>
        {!readOnly ? (
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-1 flex-shrink-0">
            {workflowState.canMarkAllGood ? (
              <CButton
                type="button"
                color="success"
                variant="outline"
                size="sm"
                className="inspection-compact-action-btn"
                onClick={() => handlers.onMarkAllGood?.(row)}
              >
                Mark all Good
              </CButton>
            ) : null}
            <CButton
              type="button"
              color="secondary"
              variant="outline"
              size="sm"
              className="inspection-compact-action-btn"
              onClick={() => onToggleExpanded?.(row)}
            >
              {expanded ? 'Collapse' : 'Open'}
            </CButton>
            {row.canEdit || row.canDelete ? (
              <RowActions
                iconSize={16}
                hitArea={32}
                toggleAriaLabel={`Extinguisher actions for ${title}`}
                items={[
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
                ].filter(Boolean)}
              />
            ) : null}
          </div>
        ) : null}
      </CCardHeader>
      {expanded || readOnly ? (
        <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
          {FIRE_EXTINGUISHER_CHECK_FIELDS.map((field) => {
            const status = row[field.key]
            const isDefect = isFireExtinguisherDefectStatus(status)
            const missingStatus = missingStatusKeys.includes(field.key)
            const missingRemarks = missingRemarkKeys.includes(field.remarksKey)
            const missingPhotos = missingPhotoKeys.includes(field.photosKey)
            const defectRemarks = text(row[field.remarksKey])
            const defectPhotos = getFireExtinguisherPhotos(row, field.photosKey)
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
                  onChange={(nextValue) =>
                    handlers.onUpdateCheck?.(row, { [field.key]: nextValue })
                  }
                />
                <FormFieldError>
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
                      <div className="d-flex flex-wrap justify-content-end gap-2">
                        <CreateActionButton
                          label="Add defect photo"
                          className="inspection-compact-action-btn"
                          icon={<Camera size={13} className="me-1 align-text-bottom" />}
                          data-fire-extinguisher-detail-key={field.photosKey}
                          onClick={() => handlers.onRequestDefectPhotoUpload?.(row, field)}
                        />
                      </div>
                      <FormFieldError>
                        {missingRemarks
                          ? `${field.label} remarks are required for this status.`
                          : ''}
                      </FormFieldError>
                      <FormFieldError>
                        {missingPhotos ? `${field.label} defect photo is required.` : ''}
                      </FormFieldError>
                      {defectPhotos.length > 0 ? (
                        <InspectionPhotoEvidenceSummary
                          photos={defectPhotos}
                          label="View photos"
                          onView={() =>
                            onViewPhotos?.(
                              getFireExtinguisherPhotoViewer({
                                row,
                                title: `${title} - ${field.label} defect photos`,
                                photos: defectPhotos,
                                photosKey: field.photosKey,
                                readOnly,
                                handlers,
                              }),
                            )
                          }
                        />
                      ) : null}
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
        </CCardBody>
      ) : null}
    </CCard>
  )
}

const AddFireExtinguisherForm = ({
  mainLocation,
  subLocation,
  onSave,
  onCancel,
  initialValue = {},
}) => {
  const [draft, setDraft] = useState({
    zone: text(initialValue.zone),
    mainLocation: text(initialValue.mainLocation || mainLocation),
    subLocation: text(initialValue.subLocation || subLocation),
    idLocNo: text(initialValue.idLocNo),
    barcodeNo: text(initialValue.barcodeNo),
    feType: text(initialValue.feType),
    certificationValidity: text(initialValue.certificationValidity),
    certificationValidityRaw: text(initialValue.certificationValidityRaw),
    daysLeftToExpire: text(initialValue.daysLeftToExpire),
  })
  const [error, setError] = useState('')
  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }))
  const save = () => {
    if (!text(draft.mainLocation)) {
      setError('Main location is required.')
      return
    }
    if (!text(draft.idLocNo) && !text(draft.barcodeNo)) {
      setError('Enter ID Loc. No. or barcode.')
      return
    }
    onSave?.(draft)
  }

  return (
    <CCard className="border-primary">
      <CCardBody className="d-grid gap-3">
        <div className="fw-semibold">
          {initialValue?.catalogId ? 'Edit extinguisher' : 'Add extinguisher'}
        </div>
        {initialValue?.equipmentSource === 'seed' ? (
          <div className="small rounded border border-warning-subtle bg-warning-subtle text-body px-3 py-2">
            This item is shared across inspections. Changes will affect future inspections.
          </div>
        ) : null}
        <div className="row g-2">
          {[
            ['zone', 'Zone'],
            ['mainLocation', 'Main Location'],
            ['subLocation', 'Sub-location'],
            ['idLocNo', 'ID Loc. No.'],
            ['barcodeNo', 'Barcode No.'],
            ['feType', 'FE Type'],
            ['certificationValidity', 'Certification Validity'],
            ['certificationValidityRaw', 'Validity Raw'],
            ['daysLeftToExpire', 'Days left'],
          ].map(([field, label]) => (
            <div key={field} className="col-12 col-md-4">
              <CFormInput
                size="sm"
                label={label}
                value={draft[field]}
                onChange={(event) => {
                  setError('')
                  setField(field, event.target.value)
                }}
              />
            </div>
          ))}
        </div>
        <FormFieldError>{error}</FormFieldError>
        <div className="d-flex gap-2 justify-content-end">
          <CButton color="secondary" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </CButton>
          <CButton color="primary" size="sm" onClick={save}>
            {initialValue?.equipmentSource === 'seed' ? 'Save global change' : 'Save extinguisher'}
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}

const FireExtinguisherInspectionChecks = ({
  readOnly = false,
  mainLocation,
  subLocation = '',
  mainLocationLabel,
  summary,
  fieldError = false,
  remarksError = false,
  validationState = null,
  handlers = {},
}) => {
  const [search, setSearch] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [expandedRowIds, setExpandedRowIds] = useState(() => new Set())
  const [activeRowId, setActiveRowId] = useState('')
  const [photoViewer, setPhotoViewer] = useState(null)
  const lastValidationTargetRef = useRef('')
  const allRows = useMemo(() => summary?.visibleChecks || [], [summary?.visibleChecks])
  const rows = filterFireExtinguisherRows(allRows, search)
  const validationTarget = validationState?.fireExtinguisher?.firstTarget || null

  const expandAndFocusRow = (rowId) => {
    const normalizedRowId = text(rowId)
    if (!normalizedRowId) return
    setExpandedRowIds((current) => new Set([...current, normalizedRowId]))
    setActiveRowId(normalizedRowId)
    window.setTimeout(() => {
      const target = Array.from(document.querySelectorAll('[data-fire-extinguisher-row-id]')).find(
        (element) => element.getAttribute('data-fire-extinguisher-row-id') === normalizedRowId,
      )
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      target?.querySelector?.('button, textarea, input, [tabindex]')?.focus?.()
    }, 50)
  }

  useEffect(() => {
    const targetRowId = text(validationTarget?.rowId)
    if (!targetRowId || lastValidationTargetRef.current === targetRowId) return
    lastValidationTargetRef.current = targetRowId
    const rowVisibleInSearch = rows.some((row) => text(row.id) === targetRowId)
    const timer = window.setTimeout(() => {
      if (!rowVisibleInSearch) setSearch('')
      expandAndFocusRow(targetRowId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [rows, validationTarget?.rowId])

  const goToNextIncomplete = () => {
    const row = getFirstIncompleteFireExtinguisherRow(allRows)
    if (!row) return
    const rowVisibleInSearch = rows.some((candidate) => text(candidate.id) === text(row.id))
    if (!rowVisibleInSearch) setSearch('')
    expandAndFocusRow(row.id)
  }

  const markAllGood = (row) => {
    if (!getFireExtinguisherRowWorkflowState(row).canMarkAllGood) return
    handlers.onUpdateCheck?.(row, GOOD_FIRE_EXTINGUISHER_VALUES)
  }

  return (
    <div className="d-grid gap-3">
      <div className="inspection-hydraulic-section-heading d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">Fire Extinguisher Checks</div>
          <div className="inspection-hydraulic-summary-pills d-flex flex-wrap align-items-center gap-1">
            {mainLocationLabel || mainLocation ? (
              <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
                {mainLocationLabel || mainLocation}
              </span>
            ) : null}
            <span className="inspection-hydraulic-summary-pill badge text-bg-light border text-body">
              {summary?.completedCount || 0} of {summary?.totalCount || 0} complete
            </span>
            <span
              className={`inspection-hydraulic-summary-pill badge border ${
                summary?.defectCount
                  ? 'text-bg-danger-subtle text-danger border-danger-subtle'
                  : 'text-bg-light text-body'
              }`}
            >
              {summary?.defectCount ? `${summary.defectCount} with defects` : 'No defects'}
            </span>
          </div>
        </div>
        {!readOnly ? (
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            <CreateActionButton
              label={`Add extinguisher (${summary?.totalCount || allRows.length})`}
              className="inspection-compact-action-btn"
              onClick={() => setShowAdd(true)}
            />
          </div>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="inspection-check-toolbar">
          <CFormInput
            size="sm"
            value={search}
            placeholder="Search extinguisher ID, barcode, type, sub-location..."
            aria-label="Search fire extinguisher rows"
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="inspection-check-toolbar__actions">
            {allRows.length > 0 ? (
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                className="inspection-compact-action-btn"
                onClick={goToNextIncomplete}
              >
                Next incomplete
              </CButton>
            ) : null}
            {search ? (
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                className="inspection-compact-action-btn"
                aria-label="Clear fire extinguisher row search"
                onClick={() => setSearch('')}
              >
                Clear
              </CButton>
            ) : null}
          </div>
          {search ? (
            <div className="small text-body-secondary">
              Showing {rows.length} of {allRows.length}
            </div>
          ) : null}
        </div>
      ) : null}

      {showAdd || editingRow ? (
        <AddFireExtinguisherForm
          mainLocation={mainLocation}
          subLocation={subLocation}
          initialValue={editingRow || { mainLocation }}
          onCancel={() => {
            setShowAdd(false)
            setEditingRow(null)
          }}
          onSave={(payload) => {
            if (editingRow) {
              handlers.onUpdateExtinguisher?.(editingRow, payload)
            } else {
              handlers.onAddExtinguisher?.(payload)
            }
            setShowAdd(false)
            setEditingRow(null)
          }}
        />
      ) : null}

      <FormFieldError>
        {fieldError ? 'Complete all fire extinguisher statuses before review.' : ''}
      </FormFieldError>
      <FormFieldError>
        {remarksError
          ? 'Add remarks and photos for every defect or failed extinguisher status.'
          : ''}
      </FormFieldError>

      {rows.length > 0 ? (
        <div className="inspection-hydraulic-card-grid inspection-check-card-grid--managed gap-5">
          {rows.map((row) => {
            const rowState = getFireExtinguisherRowWorkflowState(row)
            const rowId = text(row.id)
            const expanded =
              readOnly ||
              expandedRowIds.has(rowId) ||
              !rowState.isComplete ||
              rowState.hasDefect ||
              activeRowId === rowId
            return (
              <FireExtinguisherRowCard
                key={row.id}
                row={row}
                readOnly={readOnly}
                expanded={expanded}
                active={activeRowId === rowId}
                missingStatusKeys={
                  validationState?.fireExtinguisher?.missingStatusesByRow?.[rowId] || []
                }
                missingRemarkKeys={
                  validationState?.fireExtinguisher?.missingRemarksByRow?.[rowId] || []
                }
                missingPhotoKeys={
                  validationState?.fireExtinguisher?.missingPhotosByRow?.[rowId] || []
                }
                onToggleExpanded={(nextRow) => {
                  const nextRowId = text(nextRow.id)
                  setExpandedRowIds((current) => {
                    const next = new Set(current)
                    if (next.has(nextRowId)) next.delete(nextRowId)
                    else next.add(nextRowId)
                    return next
                  })
                  setActiveRowId(nextRowId)
                }}
                onViewPhotos={setPhotoViewer}
                handlers={{
                  ...handlers,
                  onMarkAllGood: markAllGood,
                  onEditExtinguisher: (nextRow) => setEditingRow(nextRow),
                }}
              />
            )
          })}
        </div>
      ) : (
        <div className="rounded-3 border bg-light-subtle p-3 d-grid gap-2 text-body-secondary">
          <div>No fire extinguishers match this location or search.</div>
          {!readOnly ? (
            <CreateActionButton
              label="Add extinguisher"
              className="inspection-compact-action-btn justify-self-start"
              onClick={() => setShowAdd(true)}
            />
          ) : null}
        </div>
      )}
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
    </div>
  )
}

export const FireExtinguisherEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  validationState = null,
  handlers = {},
}) => (
  <FireExtinguisherInspectionChecks
    mainLocation={mainLocation}
    subLocation={form.subLocation}
    mainLocationLabel={mainLocationLabel}
    summary={summary}
    handlers={handlers}
    validationState={validationState}
    fieldError={fieldErrors.fireExtinguisherChecks}
    remarksError={fieldErrors.fireExtinguisherRemarks}
  />
)

export const FireExtinguisherReadOnlySection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
}) => (
  <div className="inspection-form-section d-grid gap-3">
    <FireExtinguisherInspectionChecks
      readOnly
      mainLocation={mainLocation}
      mainLocationLabel={mainLocationLabel}
      summary={summary}
    />
  </div>
)
