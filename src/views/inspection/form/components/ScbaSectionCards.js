import React, { useState } from 'react'
import { CButton, CFormInput, CFormLabel, CFormTextarea } from '@coreui/react'
import { CheckCircle2, Circle, TriangleAlert } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import RowActions from 'src/components/RowActions'
import useMediaQuery from 'src/hooks/useMediaQuery'
import { hasScbaInspectionData } from '../inspectionResetActions'
import {
  getScbaFieldEvidenceKeys,
  getScbaRowRetainedEvidenceFields,
  getScbaSectionFields,
  getScbaSectionTitle,
} from 'src/views/inspection/types/scba/helpers'
import { EvidenceBlock, FormFieldError, InspectionPhotoActionRow } from './InspectionDisplayShared'
import {
  buildInspectionElementActions,
  InspectionElementCard,
  InspectionElementDrawerFooter,
  InspectionElementValidationBadges,
} from './InspectionElementUi'
import ScbaStatusSegment from './ScbaStatusSegment'
import {
  getScbaDisplayLabel,
  RemovedScbaCustomSections,
  ScbaAdditionalInfo,
} from './ScbaSectionSupport'
import InspectionResetConfirmDrawer from './InspectionResetConfirmDrawer'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { buildScbaAllGoodPatch } from '../inspectionCheckBuilders'

const getScbaRowId = (row = {}) => {
  const source = row || {}
  return String(source.id || source.serialNo || getScbaDisplayLabel(source) || '')
}
const cloneRow = (row) => (row ? JSON.parse(JSON.stringify(row)) : null)
const getRowSignature = (row) => JSON.stringify(row || {})

const shouldIgnoreCardToggle = (event) => {
  const target = event?.target
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'button, a, input, textarea, select, option, label, summary, [data-prevent-card-toggle="true"]',
    ),
  )
}

const getScbaWorkflowState = (row = {}, fields = []) => {
  const visibleFields = Array.isArray(fields) ? fields : []
  const issueCount = visibleFields.filter(
    (field) => field.kind === 'status' && String(row[field.key] || '') === 'Not Good',
  ).length
  const missingValueCount = visibleFields.filter(
    (field) => !String(row[field.key] || '').trim(),
  ).length
  const missingEvidenceCount = visibleFields.reduce((count, field) => {
    if (field.kind !== 'status' || String(row[field.key] || '') !== 'Not Good') return count
    const { remarksKey } = getScbaFieldEvidenceKeys(field)
    const hasRemarks = String(row[remarksKey] || '').trim() !== ''
    return count + (hasRemarks ? 0 : 1)
  }, 0)
  const missingCount = missingValueCount + missingEvidenceCount

  return {
    hasIssue: issueCount > 0,
    isComplete: missingCount === 0,
    issueCount,
    missingCount,
    needsEvidence: missingEvidenceCount > 0,
  }
}

const isScbaRowAllGood = (row = {}, fields = [], goodStatus = 'Good') => {
  const statusFields = (Array.isArray(fields) ? fields : []).filter(
    (field) => field.kind === 'status',
  )
  return (
    statusFields.length > 0 &&
    statusFields.every((field) => String(row?.[field.key] || '') === goodStatus)
  )
}

const getScbaTextFields = (fields = []) =>
  (Array.isArray(fields) ? fields : []).filter((field) => field.kind !== 'status')

const getScbaStatusFields = (fields = []) =>
  (Array.isArray(fields) ? fields : []).filter((field) => field.kind === 'status')

const ScbaInspectionStatusInline = ({ workflowState }) => {
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
      {workflowState?.hasIssue ? (
        <span
          className="d-inline-flex align-items-center gap-1 text-danger"
          aria-label={`Issue (${workflowState.issueCount})`}
          title={`Issue (${workflowState.issueCount})`}
        >
          <TriangleAlert size={14} aria-hidden="true" />
          <span className="fw-normal">Issue ({workflowState.issueCount})</span>
        </span>
      ) : null}
    </span>
  )
}

const ScbaSectionCards = ({
  filteredSections,
  removedCustomSections,
  readOnly = false,
  form,
  remarksError = false,
  expandedSectionKeys,
  hasManualSectionExpansion,
  defaultExpandedSectionKeys,
  setExpandedSectionKeys,
  setHasManualSectionExpansion,
  setPhotoViewer,
  statusOptions,
  onUpdateGroupedCheck,
  onSaveGroupedRowDraft,
  onResetGroupedCheck,
  onMarkRowOk,
  onEditSection,
  onDeleteSection,
  onArchiveSection,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onArchiveItem,
  onRequestPhotoUpload,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  onRestoreSection,
  onRestoreItem,
}) => {
  const [mobileDetailTarget, setMobileDetailTarget] = useState(null)
  const [mobileDraftRow, setMobileDraftRow] = useState(null)
  const [mobileDraftBaseRow, setMobileDraftBaseRow] = useState(null)
  const [mobileSaveStatus, setMobileSaveStatus] = useState('')
  const [showDiscardChanges, setShowDiscardChanges] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const scbaGoodStatus = (Array.isArray(statusOptions) ? statusOptions : [])[0]?.value || 'Good'
  const mobileDetailSection = mobileDetailTarget
    ? filteredSections.find((section) => section.key === mobileDetailTarget.sectionKey) || null
    : null
  const mobileDetailRow = mobileDetailSection
    ? (mobileDetailSection.visibleRows || []).find(
        (row) => getScbaRowId(row) === mobileDetailTarget?.rowId,
      ) || null
    : null
  const mobileDraftDirty =
    Boolean(mobileDraftRow) &&
    getRowSignature(mobileDraftRow) !== getRowSignature(mobileDraftBaseRow)
  const mobileDetailFields = mobileDetailSection
    ? mobileDetailSection.fields || getScbaSectionFields(mobileDetailSection.key, form)
    : []
  const mobileDisplayRow = mobileDraftRow || mobileDetailRow || {}
  const mobileAllGoodActive = isScbaRowAllGood(mobileDisplayRow, mobileDetailFields, scbaGoodStatus)

  const patchMobileDraftRow = (patch = {}) => {
    setMobileDraftRow((current) => (current ? { ...current, ...patch } : current))
    setMobileSaveStatus('Unsaved changes')
  }

  const openMobileDetailDrawer = (sectionKey, row) => {
    const rowId = getScbaRowId(row)
    if (!sectionKey || !rowId) return
    const nextDraft = cloneRow(row)
    setMobileDetailTarget({ sectionKey, rowId })
    setMobileDraftRow(nextDraft)
    setMobileDraftBaseRow(cloneRow(nextDraft))
    setMobileSaveStatus('')
  }

  const closeMobileDetailDrawer = () => {
    setMobileDetailTarget(null)
    setMobileDraftRow(null)
    setMobileDraftBaseRow(null)
    setMobileSaveStatus('')
  }

  const requestCloseMobileDetailDrawer = () => {
    if (mobileDraftDirty) {
      setShowDiscardChanges(true)
      return
    }
    closeMobileDetailDrawer()
  }

  const saveMobileDraftRow = () => {
    if (!mobileDetailSection || !mobileDetailRow || !mobileDraftRow || !mobileDraftDirty) return
    const result =
      typeof onSaveGroupedRowDraft === 'function'
        ? onSaveGroupedRowDraft(mobileDetailSection.key, mobileDetailRow, mobileDraftRow)
        : onUpdateGroupedCheck?.(mobileDetailSection.key, mobileDetailRow, mobileDraftRow)
    if (result === false) {
      setMobileSaveStatus('Sync pending')
      return
    }
    setMobileSaveStatus('Saved')
    closeMobileDetailDrawer()
  }

  const mobileDraftHandlers = {
    onUpdateGroupedCheck: (_sectionKey, _row, patch) => patchMobileDraftRow(patch),
    onRequestPhotoUpload: (sectionKey, row) =>
      onRequestPhotoUpload?.(sectionKey, row, {
        onAddPhotos: (_targetSectionKey, _targetRow, photosKey, photos) =>
          patchMobileDraftRow({ [photosKey]: photos }),
      }),
    onRequestIssuePhotoUpload: (sectionKey, row, field) =>
      onRequestIssuePhotoUpload?.(sectionKey, row, field, {
        onAddPhotos: (_targetSectionKey, _targetRow, photosKey, photos) =>
          patchMobileDraftRow({ [photosKey]: photos }),
      }),
    onRemovePhoto: (_sectionKey, row, photoId, photosKey = 'photos') => {
      const photos = Array.isArray(row?.[photosKey]) ? row[photosKey] : []
      patchMobileDraftRow({
        [photosKey]: photos.filter((photo) => String(photo?.id || '') !== String(photoId || '')),
      })
    },
    onChangePhotoDescription: (_sectionKey, row, photoId, description, photosKey = 'photos') => {
      const photos = Array.isArray(row?.[photosKey]) ? row[photosKey] : []
      patchMobileDraftRow({
        [photosKey]: photos.map((photo) =>
          String(photo?.id || '') === String(photoId || '') ? { ...photo, description } : photo,
        ),
      })
    },
    onApplyPhotoCaption: (_sectionKey, row, photoId, caption, photosKey = 'photos') => {
      const photos = Array.isArray(row?.[photosKey]) ? row[photosKey] : []
      patchMobileDraftRow({
        [photosKey]: photos.map((photo) =>
          String(photo?.id || '') === String(photoId || '')
            ? { ...photo, description: [photo.description, caption].filter(Boolean).join('\n') }
            : photo,
        ),
      })
    },
  }

  const requestResetGroupedCheck = (sectionKey, row, options = {}) => {
    if (!sectionKey || !row) return
    setResetTarget({ sectionKey, row, ...options })
  }

  const confirmResetGroupedCheck = () => {
    if (!resetTarget?.sectionKey || !resetTarget?.row) return
    onResetGroupedCheck?.(resetTarget.sectionKey, resetTarget.row)
    resetTarget.onAfterConfirm?.()
    setResetTarget(null)
  }

  const renderScbaIssueEvidence = (sectionKey, row, field, handlers = {}) => {
    const activeOnUpdateGroupedCheck = handlers.onUpdateGroupedCheck || onUpdateGroupedCheck
    const activeOnRequestIssuePhotoUpload =
      handlers.onRequestIssuePhotoUpload || onRequestIssuePhotoUpload
    const activeOnRemovePhoto = handlers.onRemovePhoto || onRemovePhoto
    const activeOnChangePhotoDescription =
      handlers.onChangePhotoDescription || onChangePhotoDescription
    const activeOnApplyPhotoCaption = handlers.onApplyPhotoCaption || onApplyPhotoCaption
    const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
    const remarks = String(row[remarksKey] || '')
    const hasRemarks = remarks.trim() !== ''
    const photos = Array.isArray(row[photosKey]) ? row[photosKey] : []
    const openIssuePhotoViewer = (nextPhotos = photos) =>
      setPhotoViewer?.({
        title: `${getScbaDisplayLabel(row)} - ${field.label} issue photos`,
        photos: nextPhotos,
        showCaptionChips: false,
        onAddMorePhoto: () =>
          activeOnRequestIssuePhotoUpload?.(sectionKey, row, field, {
            onAfterAddPhotos: ({ photos: addedPhotos }) => openIssuePhotoViewer(addedPhotos),
          }),
        onSave: (savedPhotos) =>
          activeOnUpdateGroupedCheck?.(sectionKey, row, {
            [photosKey]: Array.isArray(savedPhotos) ? savedPhotos : [],
          }),
        onRemove: (photoId) => activeOnRemovePhoto?.(sectionKey, row, photoId, photosKey),
        onChangeDescription: (photoId, description) =>
          activeOnChangePhotoDescription?.(sectionKey, row, photoId, description, photosKey),
        onApplyCaption: (photoId, caption) =>
          activeOnApplyPhotoCaption?.(sectionKey, row, photoId, caption, photosKey),
      })
    const requestIssuePhoto = () =>
      activeOnRequestIssuePhotoUpload?.(sectionKey, row, field, {
        onAfterAddPhotos: ({ photos: nextPhotos }) => openIssuePhotoViewer(nextPhotos),
      })

    if (readOnly) {
      return (
        <EvidenceBlock
          title={`${field.label} issue evidence`}
          remarks={remarks}
          photos={photos}
          readOnly
          onViewPhotos={() =>
            setPhotoViewer?.({
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
            activeOnUpdateGroupedCheck?.(sectionKey, row, {
              [remarksKey]: event.target.value,
            })
          }
        />
        {remarksError && !hasRemarks ? (
          <FormFieldError>{field.label} issue remarks are required.</FormFieldError>
        ) : null}
        <InspectionPhotoActionRow
          photos={photos}
          onView={() => openIssuePhotoViewer(photos)}
          onAddPhoto={requestIssuePhoto}
        />
      </div>
    )
  }

  const renderScbaRetainedEvidence = (sectionKey, row, field, handlers = {}) => {
    const activeOnUpdateGroupedCheck = handlers.onUpdateGroupedCheck || onUpdateGroupedCheck
    const activeOnRemovePhoto = handlers.onRemovePhoto || onRemovePhoto
    const activeOnChangePhotoDescription =
      handlers.onChangePhotoDescription || onChangePhotoDescription
    const activeOnApplyPhotoCaption = handlers.onApplyPhotoCaption || onApplyPhotoCaption
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
          setPhotoViewer?.({
            title: `${getScbaDisplayLabel(row)} - ${field.label} retained evidence photos`,
            photos,
            readOnly,
            showDescriptionInput: !readOnly,
            onRemove: readOnly
              ? undefined
              : (photoId) => activeOnRemovePhoto?.(sectionKey, row, photoId, photosKey),
            onChangeDescription: readOnly
              ? undefined
              : (photoId, description) =>
                  activeOnChangePhotoDescription?.(
                    sectionKey,
                    row,
                    photoId,
                    description,
                    photosKey,
                  ),
            onApplyCaption: readOnly
              ? undefined
              : (photoId, caption) =>
                  activeOnApplyPhotoCaption?.(sectionKey, row, photoId, caption, photosKey),
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
                activeOnUpdateGroupedCheck?.(sectionKey, row, {
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

  const renderScbaRowDetails = (
    section,
    row,
    retainedEvidenceFields,
    handlers = {},
    options = {},
  ) => {
    const activeOnUpdateGroupedCheck = handlers.onUpdateGroupedCheck || onUpdateGroupedCheck
    const activeOnRequestPhotoUpload = handlers.onRequestPhotoUpload || onRequestPhotoUpload
    const activeOnRequestIssuePhotoUpload =
      handlers.onRequestIssuePhotoUpload || onRequestIssuePhotoUpload
    const activeOnRemovePhoto = handlers.onRemovePhoto || onRemovePhoto
    const activeOnChangePhotoDescription =
      handlers.onChangePhotoDescription || onChangePhotoDescription
    const activeOnApplyPhotoCaption = handlers.onApplyPhotoCaption || onApplyPhotoCaption
    const sectionFields = section.fields || getScbaSectionFields(section.key, form)
    const textFields = getScbaTextFields(sectionFields)
    const statusFields = getScbaStatusFields(sectionFields)
    const afterTextFields = options.afterTextFields || null
    const rowControlPrefix = `scba-${section.key}-${getScbaRowId(row)}`.replace(
      /[^A-Za-z0-9_-]/g,
      '-',
    )

    return (
      <>
        {textFields.length > 0 ? (
          <div className="row g-2">
            {textFields.map((field) =>
              readOnly ? (
                <div key={field.key} className="col-6">
                  <div className="small text-body-secondary">{field.label}</div>
                  <div className="fw-semibold">{String(row[field.key] || '--')}</div>
                </div>
              ) : (
                <div key={field.key} className="col-6">
                  <CFormLabel
                    htmlFor={`${rowControlPrefix}-${field.key}`}
                    className="small fw-semibold text-muted mb-1"
                  >
                    {field.label}
                  </CFormLabel>
                  <CFormInput
                    id={`${rowControlPrefix}-${field.key}`}
                    value={String(row[field.key] || '')}
                    inputMode="numeric"
                    placeholder={field.label}
                    onChange={(event) =>
                      activeOnUpdateGroupedCheck?.(section.key, row, {
                        [field.key]: event.target.value,
                      })
                    }
                  />
                </div>
              ),
            )}
          </div>
        ) : null}
        {afterTextFields}

        {statusFields.map((field) => {
          const isIssue = String(row[field.key] || '') === 'Not Good'
          const hasFieldRetainedEvidence = retainedEvidenceFields.some(
            (retainedField) => retainedField.key === field.key,
          )

          return (
            <div key={field.key} className="inspection-hydraulic-check-with-evidence d-grid gap-2">
              {readOnly ? (
                <div className="row g-3">
                  <div className="col-12">
                    <div className="small text-body-secondary">{field.label}</div>
                    <div className="fw-semibold">{String(row[field.key] || '--')}</div>
                  </div>
                </div>
              ) : (
                <ScbaStatusSegment
                  label={field.label}
                  value={row[field.key]}
                  onChange={(nextValue) =>
                    activeOnUpdateGroupedCheck?.(section.key, row, {
                      [field.key]: nextValue,
                    })
                  }
                  statusOptions={statusOptions}
                />
              )}
              {isIssue ? renderScbaIssueEvidence(section.key, row, field, handlers) : null}
              {hasFieldRetainedEvidence
                ? renderScbaRetainedEvidence(section.key, row, field, handlers)
                : null}
            </div>
          )
        })}
        <ScbaAdditionalInfo
          sectionKey={section.key}
          row={row}
          readOnly={readOnly}
          onUpdateGroupedCheck={activeOnUpdateGroupedCheck}
          onRequestPhotoUpload={activeOnRequestPhotoUpload}
          onRemovePhoto={activeOnRemovePhoto}
          onChangePhotoDescription={activeOnChangePhotoDescription}
          onApplyPhotoCaption={activeOnApplyPhotoCaption}
          setPhotoViewer={setPhotoViewer}
        />
      </>
    )
  }

  return (
    <>
      {filteredSections.map((section) => {
        const rows = section.visibleRows || []
        if (rows.length === 0 && !section.isCustomSection) return null
        const isExpanded =
          readOnly ||
          (hasManualSectionExpansion
            ? expandedSectionKeys.has(section.key)
            : defaultExpandedSectionKeys.has(section.key))

        return (
          <div
            key={section.key}
            className="d-grid gap-2"
            data-inspection-scba-section-id={section.key}
          >
            <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="fw-semibold text-muted">
                  {section.title || getScbaSectionTitle(section.key)}
                </div>
                {section.isCustomSection ? (
                  <span className="badge text-bg-light border text-body">Custom</span>
                ) : null}
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
                    className="inspection-compact-action-btn d-none d-md-inline-flex"
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
            </div>
            {isExpanded ? (
              <>
                {rows.length === 0 ? (
                  <div className="inspection-check-card__collapsed-summary">
                    No items in this section yet. Add an item to inspect{' '}
                    {Array.isArray(section.fields) && section.fields.length > 0
                      ? section.fields.map((field) => field.label).join(', ')
                      : 'the configured checks'}
                    .
                  </div>
                ) : null}
                <div className="inspection-hydraulic-card-grid inspection-check-card-grid--managed inspection-fire-extinguisher-card-stack">
                  {rows.map((row) => {
                    const sectionFields = section.fields || getScbaSectionFields(section.key, form)
                    const workflowState = getScbaWorkflowState(row, sectionFields)
                    const rowAllGoodActive = isScbaRowAllGood(row, sectionFields, scbaGoodStatus)
                    const retainedEvidenceFields = getScbaRowRetainedEvidenceFields(
                      row,
                      section.fields,
                    )
                    const hasRetainedEvidence = retainedEvidenceFields.length > 0
                    const hasTextFields = getScbaTextFields(sectionFields).length > 0
                    const isCylinderWithTextFields = section.key === 'cylinder' && hasTextFields
                    const hasTextAndStatusFields = sectionFields.length > 1
                    const shouldRenderTopAllGood =
                      !readOnly && hasTextAndStatusFields && !isCylinderWithTextFields
                    const shouldRenderBottomAllGood =
                      !readOnly && hasTextAndStatusFields && isCylinderWithTextFields
                    const allGoodButton = (
                      <div className="d-flex justify-content-end">
                        <CButton
                          type="button"
                          color={rowAllGoodActive ? 'primary' : 'secondary'}
                          variant={rowAllGoodActive ? undefined : 'outline'}
                          size="sm"
                          className="inspection-compact-action-btn"
                          aria-pressed={rowAllGoodActive}
                          onClick={() => onMarkRowOk?.(section.key, row)}
                        >
                          All Good
                        </CButton>
                      </div>
                    )
                    const rowId = getScbaRowId(row)
                    const canReset =
                      typeof onResetGroupedCheck === 'function' &&
                      hasScbaInspectionData(row, sectionFields)
                    const itemActions = buildInspectionElementActions({
                      canReset,
                      onReset: () => requestResetGroupedCheck(section.key, row),
                      canEdit: row.isCustomEquipment,
                      onEdit: () => onEditItem?.(section.key, row),
                      canDelete: row.isCustomEquipment,
                      onDelete: () => onDeleteItem?.(section.key, row),
                      extraActions:
                        row.isCustomEquipment && row.catalogItemId
                          ? [
                              {
                                key: 'archive',
                                label: 'Archive from future inspections',
                                className: 'text-danger',
                                onClick: () => onArchiveItem?.(section.key, row),
                              },
                            ]
                          : [],
                    })
                    const isMobileActive =
                      useMobileDrawer &&
                      mobileDetailTarget?.sectionKey === section.key &&
                      mobileDetailTarget?.rowId === rowId

                    return (
                      <InspectionElementCard
                        key={row.id || row.serialNo}
                        title={getScbaDisplayLabel(row)}
                        status={<ScbaInspectionStatusInline workflowState={workflowState} />}
                        badges={
                          <>
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
                        actions={itemActions}
                        actionLabel={`Item actions for ${getScbaDisplayLabel(row)}`}
                        expanded={!useMobileDrawer || readOnly}
                        active={isMobileActive}
                        readOnly={readOnly}
                        onToggle={
                          useMobileDrawer && !readOnly
                            ? () => openMobileDetailDrawer(section.key, row)
                            : undefined
                        }
                        showBody={!useMobileDrawer || readOnly}
                      >
                        {shouldRenderTopAllGood ? allGoodButton : null}
                        {renderScbaRowDetails(
                          section,
                          row,
                          retainedEvidenceFields,
                          {},
                          { afterTextFields: shouldRenderBottomAllGood ? allGoodButton : null },
                        )}
                      </InspectionElementCard>
                    )
                  })}
                </div>
              </>
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
          </div>
        )
      })}

      {useMobileDrawer && mobileDetailSection && mobileDetailRow ? (
        <MobileBottomDrawer
          visible
          title={getScbaDisplayLabel(mobileDetailRow)}
          bodyClassName="inspection-equipment-detail-drawer-shell"
          headerAction={
            !readOnly ? (
              <RowActions
                iconSize={16}
                hitArea={32}
                toggleAriaLabel={`Item actions for ${getScbaDisplayLabel(mobileDetailRow)}`}
                items={[
                  typeof onResetGroupedCheck === 'function' &&
                  hasScbaInspectionData(mobileDetailRow, mobileDetailSection.fields)
                    ? {
                        key: 'reset',
                        label: 'Reset check',
                        className: 'text-danger',
                        onClick: () =>
                          requestResetGroupedCheck(mobileDetailSection.key, mobileDetailRow, {
                            onAfterConfirm: closeMobileDetailDrawer,
                          }),
                      }
                    : null,
                  mobileDetailRow.isCustomEquipment
                    ? {
                        key: 'edit',
                        label: 'Edit',
                        disabled: mobileDraftDirty,
                        disabledReason: mobileDraftDirty ? 'Save or cancel changes first.' : '',
                        onClick: () => {
                          onEditItem?.(mobileDetailSection.key, mobileDetailRow)
                          closeMobileDetailDrawer()
                        },
                      }
                    : null,
                  mobileDetailRow.isCustomEquipment
                    ? {
                        key: 'delete',
                        label: 'Delete',
                        className: 'text-danger',
                        disabled: mobileDraftDirty,
                        disabledReason: mobileDraftDirty ? 'Save or cancel changes first.' : '',
                        onClick: () => {
                          onDeleteItem?.(mobileDetailSection.key, mobileDetailRow)
                          closeMobileDetailDrawer()
                        },
                      }
                    : null,
                  mobileDetailRow.isCustomEquipment && mobileDetailRow.catalogItemId
                    ? {
                        key: 'archive',
                        label: 'Archive from future inspections',
                        className: 'text-danger',
                        disabled: mobileDraftDirty,
                        disabledReason: mobileDraftDirty ? 'Save or cancel changes first.' : '',
                        onClick: () => {
                          onArchiveItem?.(mobileDetailSection.key, mobileDetailRow)
                          closeMobileDetailDrawer()
                        },
                      }
                    : null,
                ].filter(Boolean)}
              />
            ) : null
          }
          onClose={requestCloseMobileDetailDrawer}
        >
          <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
            <div className="inspection-equipment-detail-drawer-summary small text-body-secondary">
              {mobileDetailSection.title || getScbaSectionTitle(mobileDetailSection.key)}
            </div>
            {!readOnly &&
            mobileDetailSection.key !== 'cylinder' &&
            Array.isArray(mobileDetailSection.fields) &&
            mobileDetailSection.fields.length > 1 &&
            !getScbaTextFields(mobileDetailSection.fields).length ? (
              <div className="d-flex justify-content-end">
                <CButton
                  type="button"
                  color={mobileAllGoodActive ? 'primary' : 'secondary'}
                  variant={mobileAllGoodActive ? undefined : 'outline'}
                  size="sm"
                  className="inspection-compact-action-btn"
                  aria-pressed={mobileAllGoodActive}
                  onClick={() =>
                    patchMobileDraftRow(buildScbaAllGoodPatch(mobileDetailFields, scbaGoodStatus))
                  }
                >
                  All Good
                </CButton>
              </div>
            ) : null}
            {renderScbaRowDetails(
              mobileDetailSection,
              mobileDraftRow || mobileDetailRow,
              getScbaRowRetainedEvidenceFields(
                mobileDraftRow || mobileDetailRow,
                mobileDetailSection.fields,
              ),
              mobileDraftHandlers,
              {
                afterTextFields:
                  !readOnly &&
                  mobileDetailSection.key === 'cylinder' &&
                  Array.isArray(mobileDetailSection.fields) &&
                  mobileDetailSection.fields.length > 1 &&
                  getScbaTextFields(mobileDetailSection.fields).length > 0 ? (
                    <div className="d-flex justify-content-end">
                      <CButton
                        type="button"
                        color={mobileAllGoodActive ? 'primary' : 'secondary'}
                        variant={mobileAllGoodActive ? undefined : 'outline'}
                        size="sm"
                        className="inspection-compact-action-btn"
                        aria-pressed={mobileAllGoodActive}
                        onClick={() =>
                          patchMobileDraftRow(
                            buildScbaAllGoodPatch(mobileDetailFields, scbaGoodStatus),
                          )
                        }
                      >
                        All Good
                      </CButton>
                    </div>
                  ) : null,
              },
            )}
          </div>
          {!readOnly ? (
            <InspectionElementDrawerFooter
              statusText={mobileSaveStatus}
              dirty={mobileDraftDirty}
              onCancel={requestCloseMobileDetailDrawer}
              onSave={saveMobileDraftRow}
            />
          ) : null}
        </MobileBottomDrawer>
      ) : null}

      {!readOnly ? (
        <RemovedScbaCustomSections
          removedCustomSections={removedCustomSections}
          onRestoreSection={onRestoreSection}
          onRestoreItem={onRestoreItem}
        />
      ) : null}
      <InspectionResetConfirmDrawer
        visible={Boolean(resetTarget)}
        row={resetTarget?.row}
        fallbackLabel="this SCBA item"
        onClose={() => setResetTarget(null)}
        onConfirm={confirmResetGroupedCheck}
      />
      <ActionConfirmModal
        visible={showDiscardChanges}
        title="Discard changes?"
        message="Your SCBA item changes have not been saved."
        confirmLabel="Discard"
        confirmColor="danger"
        cancelLabel="Keep editing"
        mobileDrawer
        onClose={() => setShowDiscardChanges(false)}
        onConfirm={() => {
          setShowDiscardChanges(false)
          closeMobileDetailDrawer()
        }}
      />
    </>
  )
}

export default ScbaSectionCards
