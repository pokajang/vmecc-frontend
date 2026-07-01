import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormTextarea,
  CInputGroup,
} from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import { FormFieldError, PhotoGallery } from '../../components/InspectionFormDisplaySections'
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

const StatusButtons = ({ value, options = [], readOnly = false, onChange }) => (
  <div className="d-flex flex-wrap gap-2 justify-content-start justify-content-sm-end">
    {options.map((option) => {
      const active = text(value).toLowerCase() === option.toLowerCase()
      return (
        <CButton
          key={option}
          type="button"
          size="sm"
          color={active ? 'primary' : 'secondary'}
          variant={active ? undefined : 'outline'}
          disabled={readOnly}
          onClick={() => onChange?.(option)}
        >
          {option}
        </CButton>
      )
    })}
  </div>
)

const FireExtinguisherRowCard = ({
  row,
  readOnly = false,
  expanded = true,
  active = false,
  missingStatusKeys = [],
  missingRemarkKeys = [],
  onToggleExpanded,
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
      className={`inspection-hydraulic-card ${active ? 'border-primary shadow-sm' : ''}`.trim()}
      data-fire-extinguisher-row-id={row.id}
    >
      <CCardHeader className="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div className="d-grid gap-1" style={{ minWidth: 0 }}>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="fw-semibold text-break">{title}</div>
            <CBadge color={statusTone}>{statusLabel}</CBadge>
            {row.equipmentSource === 'custom' ? <CBadge color="info">Custom</CBadge> : null}
          </div>
          <div className="small text-body-secondary text-break">
            {[row.feType, row.barcodeNo, row.subLocation || row.mainLocation]
              .filter(Boolean)
              .join(' - ')}
          </div>
          <div className="small text-body-secondary">
            Certification: {row.certificationValidity || row.certificationValidityRaw || '--'}
            {row.daysLeftToExpire ? ` (${row.daysLeftToExpire} days)` : ''}
          </div>
        </div>
        {!readOnly ? (
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            {workflowState.canMarkAllGood ? (
              <CButton
                type="button"
                color="success"
                variant="outline"
                size="sm"
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
              onClick={() => onToggleExpanded?.(row)}
            >
              {expanded ? 'Collapse' : 'Open'}
            </CButton>
            {row.canEdit ? (
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => handlers.onEditExtinguisher?.(row)}
              >
                Edit
              </CButton>
            ) : null}
            {row.canDelete ? (
              <CButton
                color="danger"
                variant="outline"
                size="sm"
                onClick={() => handlers.onDeleteExtinguisher?.(row)}
              >
                Delete
              </CButton>
            ) : null}
          </div>
        ) : null}
      </CCardHeader>
      {expanded || readOnly ? (
        <CCardBody className="d-grid gap-3">
          {FIRE_EXTINGUISHER_CHECK_FIELDS.map((field) => {
            const status = row[field.key]
            const isDefect = isFireExtinguisherDefectStatus(status)
            const missingStatus = missingStatusKeys.includes(field.key)
            const missingRemarks = missingRemarkKeys.includes(field.remarksKey)
            return (
              <div
                key={field.key}
                className="d-grid gap-2 rounded-3 border bg-light-subtle p-3"
                data-fire-extinguisher-check-key={field.key}
              >
                <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
                  <div className="fw-semibold">{field.label}</div>
                  <StatusButtons
                    value={status}
                    options={field.options}
                    readOnly={readOnly}
                    onChange={(nextValue) =>
                      handlers.onUpdateCheck?.(row, { [field.key]: nextValue })
                    }
                  />
                </div>
                <FormFieldError>
                  {missingStatus ? `${field.label} is required.` : ''}
                </FormFieldError>
                {isDefect ? (
                  <div className="d-grid gap-2">
                    <CFormTextarea
                      rows={2}
                      disabled={readOnly}
                      placeholder={`${field.label} defect remarks`}
                      value={text(row[field.remarksKey])}
                      data-fire-extinguisher-detail-key={field.remarksKey}
                      onChange={(event) =>
                        handlers.onUpdateCheck?.(row, { [field.remarksKey]: event.target.value })
                      }
                    />
                    <FormFieldError>
                      {missingRemarks ? `${field.label} remarks are required for this status.` : ''}
                    </FormFieldError>
                    {readOnly || !handlers.onRequestDefectPhotoUpload ? null : (
                      <CreateActionButton
                        label="Add defect photo"
                        className="inspection-compact-action-btn justify-self-start"
                        onClick={() => handlers.onRequestDefectPhotoUpload?.(row, field)}
                      />
                    )}
                    <PhotoGallery
                      readOnly={readOnly}
                      photos={Array.isArray(row[field.photosKey]) ? row[field.photosKey] : []}
                      emptyMessage="No defect photos."
                      onRemove={(photoId) =>
                        handlers.onRemovePhoto?.(row, photoId, field.photosKey)
                      }
                      onChangeDescription={(photoId, description) =>
                        handlers.onChangePhotoDescription?.(
                          row,
                          photoId,
                          description,
                          field.photosKey,
                        )
                      }
                      onApplyCaption={(photoId, caption) =>
                        handlers.onApplyPhotoCaption?.(row, photoId, caption, field.photosKey)
                      }
                    />
                  </div>
                ) : null}
              </div>
            )
          })}

          <div className="d-grid gap-2">
            <div className="fw-semibold small text-muted">General extinguisher remarks</div>
            <CFormTextarea
              rows={2}
              disabled={readOnly}
              placeholder="Optional row remarks"
              value={text(row.remarks)}
              onChange={(event) => handlers.onUpdateCheck?.(row, { remarks: event.target.value })}
            />
            {readOnly || !handlers.onRequestPhotoUpload ? null : (
              <CreateActionButton
                label="Add extinguisher photo"
                className="inspection-compact-action-btn justify-self-start"
                onClick={() => handlers.onRequestPhotoUpload?.(row)}
              />
            )}
            <PhotoGallery
              readOnly={readOnly}
              photos={Array.isArray(row.photos) ? row.photos : []}
              emptyMessage="No extinguisher photos."
              onRemove={(photoId) => handlers.onRemovePhoto?.(row, photoId, 'photos')}
              onChangeDescription={(photoId, description) =>
                handlers.onChangePhotoDescription?.(row, photoId, description, 'photos')
              }
              onApplyCaption={(photoId, caption) =>
                handlers.onApplyPhotoCaption?.(row, photoId, caption, 'photos')
              }
            />
          </div>
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
            Save extinguisher
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
  inspectedBy,
  inspectionDate,
  fieldError = false,
  remarksError = false,
  sessionError = false,
  validationState = null,
  handlers = {},
}) => {
  const [search, setSearch] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [expandedRowIds, setExpandedRowIds] = useState(() => new Set())
  const [activeRowId, setActiveRowId] = useState('')
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
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div>
          <div className="fw-semibold">Fire Extinguisher Checks</div>
          <div className="small text-body-secondary">
            {mainLocationLabel || mainLocation} - {summary?.completedCount || 0}/
            {summary?.totalCount || 0} complete
            {summary?.defectCount ? ` - ${summary.defectCount} with defects` : ''}
          </div>
        </div>
        {!readOnly ? (
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            <CreateActionButton
              label="Next incomplete"
              className="inspection-compact-action-btn"
              showIcon={false}
              onClick={goToNextIncomplete}
            />
            <CreateActionButton
              label="Add extinguisher"
              className="inspection-compact-action-btn"
              onClick={() => setShowAdd(true)}
            />
          </div>
        ) : null}
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <CFormInput
            disabled={readOnly}
            label="Inspected by"
            value={inspectedBy || ''}
            onChange={(event) =>
              handlers.onUpdateSessionMeta?.('fireExtinguisherInspectedBy', event.target.value)
            }
          />
        </div>
        <div className="col-12 col-md-6">
          <CFormInput
            disabled={readOnly}
            type="date"
            label="Inspection date"
            value={inspectionDate || ''}
            onChange={(event) =>
              handlers.onUpdateSessionMeta?.('fireExtinguisherInspectionDate', event.target.value)
            }
          />
        </div>
      </div>
      <FormFieldError>
        {sessionError ? 'Inspected by and inspection date are required.' : ''}
      </FormFieldError>

      {!readOnly ? (
        <CInputGroup>
          <CFormInput
            value={search}
            placeholder="Search extinguisher ID, barcode, type, sub-location..."
            aria-label="Search fire extinguisher rows"
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <CButton
              type="button"
              color="secondary"
              variant="outline"
              aria-label="Clear fire extinguisher row search"
              onClick={() => setSearch('')}
            >
              Clear
            </CButton>
          ) : null}
        </CInputGroup>
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
        {remarksError ? 'Add remarks for every defect or failed extinguisher status.' : ''}
      </FormFieldError>

      {rows.length > 0 ? (
        rows.map((row) => {
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
              handlers={{
                ...handlers,
                onMarkAllGood: markAllGood,
                onEditExtinguisher: (nextRow) => setEditingRow(nextRow),
              }}
            />
          )
        })
      ) : (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          No fire extinguishers match this location or search.
        </div>
      )}
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
    inspectedBy={form.fireExtinguisherInspectedBy}
    inspectionDate={form.fireExtinguisherInspectionDate}
    handlers={handlers}
    validationState={validationState}
    fieldError={fieldErrors.fireExtinguisherChecks}
    remarksError={fieldErrors.fireExtinguisherRemarks}
    sessionError={fieldErrors.fireExtinguisherSession}
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
      inspectedBy={form.fireExtinguisherInspectedBy}
      inspectionDate={form.fireExtinguisherInspectionDate}
    />
  </div>
)
