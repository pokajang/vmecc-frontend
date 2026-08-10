import React, { useState } from 'react'
import { CButton, CFormInput, CFormLabel, CFormTextarea } from '@coreui/react'
import { Camera, CheckCircle2, Circle, MessageSquare, Trash2, TriangleAlert } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import RowActions from 'src/components/RowActions'
import useMediaQuery from 'src/hooks/useMediaQuery'
import { ER_AUX_CONDITION_OPTIONS } from 'src/views/inspection/inspectionErAuxHelpers'
import { getActionCountLabel } from '../inspectionCountLabels'
import {
  buildPhotoViewerUploadOptions,
  buildStagedPhotoUploadOptions,
} from '../inspectionPhotoFlow'
import {
  buildInspectionPhotoListPatch,
  mergeInspectionPhotoLists,
  removePhotoById,
  updatePhotoDescriptionById,
} from '../inspectionPhotoUtils'
import {
  EvidenceBlock,
  FormFieldError,
  InspectionPhotoActionRow,
  InspectionPhotoEvidenceSummary,
  InspectionPhotoViewerModal,
  ManagedCheckToolbar,
  rowContainsSearch,
} from './InspectionDisplayShared'
import {
  buildInspectionElementActions,
  InspectionElementCard,
  InspectionElementDrawerFooter,
  InspectionElementValidationBadges,
} from './InspectionElementUi'
import InspectionResetConfirmDrawer from './InspectionResetConfirmDrawer'
import InspectionStatusSegment from './patterns/InspectionStatusSegment'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { isInspectionIssueStatus } from '../../domain/inspectionStatusSemantics'

const cloneRow = (row) => (row ? JSON.parse(JSON.stringify(row)) : null)
const getRowSignature = (row) => JSON.stringify(row || {})

const ErAuxConditionSegment = ({
  value,
  onChange,
  readOnly = false,
  invalid = false,
  describedBy,
}) => (
  <InspectionStatusSegment
    label="Condition"
    value={value}
    options={ER_AUX_CONDITION_OPTIONS}
    onChange={onChange}
    readOnly={readOnly}
    invalid={invalid}
    describedBy={describedBy}
  />
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
        aria-label="Equipment quantity"
        placeholder="Quantity"
        style={{ width: '5.5rem' }}
        onChange={(event) => onChange?.(event.target.value)}
      />
    )}
  </div>
)

const getErAuxWorkflowState = (row = {}) => {
  const condition = String(row.condition || '').trim()
  const quantity = String(row.quantity ?? row.defaultQuantity ?? '').trim()
  const isIssue = isInspectionIssueStatus(condition)
  const isDefect = condition === 'Defect'
  const hasDefectRemarks = String(row.defectRemarks || '').trim() !== ''
  const defectPhotos = Array.isArray(row.defectPhotos) ? row.defectPhotos : []
  const missingEvidenceCount = isDefect && !hasDefectRemarks ? 1 : 0
  const missingCount = (condition ? 0 : 1) + (quantity ? 0 : 1) + missingEvidenceCount

  return {
    hasIssue: isIssue,
    isComplete: missingCount === 0,
    missingCount,
    needsEvidence: missingEvidenceCount > 0,
  }
}

const ErAuxInspectionStatusInline = ({ workflowState }) => {
  const completionLabel = workflowState?.isComplete ? 'Checked' : 'Not checked'

  return (
    <span className="inspection-fire-extinguisher-status-inline d-inline-flex flex-wrap align-items-center gap-2 small">
      <span
        className={`d-inline-flex align-items-center gap-1 ${
          workflowState?.isComplete ? 'text-muted' : 'text-body-secondary'
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
        <span className="d-inline-flex align-items-center gap-1 text-danger" aria-label="Issue">
          <TriangleAlert size={14} aria-hidden="true" />
          <span className="fw-normal">Issue</span>
        </span>
      ) : null}
    </span>
  )
}

const getErAuxRowState = (row = {}, expandedAdditionalNotes = {}, readOnly = false) => {
  const isDefect = String(row.condition || '').trim() === 'Defect'
  const quantity = String(row.quantity ?? row.defaultQuantity ?? '')
  const rowId = String(row.id || row.equipment || '')
  const hasDefectRemarks = String(row.defectRemarks || '').trim() !== ''
  const hasAdditionalNotes = String(row.additionalNotes || '').trim() !== ''
  const photos = Array.isArray(row.photos) ? row.photos : []
  const defectPhotos = Array.isArray(row.defectPhotos) ? row.defectPhotos : []

  return {
    defectPhotos,
    detailsLabel: 'Additional Info (optional)',
    hasAdditionalNotes,
    hasDefectRemarks,
    isDefect,
    missingCondition: !String(row.condition || '').trim(),
    missingQuantity: !String(quantity || '').trim(),
    missingRemark: isDefect && !hasDefectRemarks,
    photos,
    quantity,
    rowId,
    showAdditionalNotes: readOnly || hasAdditionalNotes || expandedAdditionalNotes[rowId] === true,
  }
}

const ErAuxEquipmentCheckDetails = ({
  row,
  expandedAdditionalNotes,
  setExpandedAdditionalNotes,
  setPhotoViewer,
  onUpdateCheck,
  onRequestPhotoUpload,
  onRequestDefectPhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  fieldError = false,
  remarksError = false,
  readOnly = false,
}) => {
  const {
    defectPhotos,
    detailsLabel,
    hasAdditionalNotes,
    hasDefectRemarks,
    isDefect,
    missingCondition,
    missingQuantity,
    missingRemark,
    photos,
    quantity,
    rowId,
    showAdditionalNotes,
  } = getErAuxRowState(row, expandedAdditionalNotes, readOnly)
  const openDefectPhotoViewer = (nextPhotos = defectPhotos) =>
    setPhotoViewer({
      title: `${row.equipment} - defect photos`,
      photos: nextPhotos,
      showCaptionChips: false,
      onAddMorePhoto: (currentPhotos) =>
        onRequestDefectPhotoUpload?.(
          row,
          buildPhotoViewerUploadOptions(openDefectPhotoViewer, { currentPhotos }),
        ),
      onSave: (savedPhotos) =>
        onUpdateCheck?.(row, { defectPhotos: Array.isArray(savedPhotos) ? savedPhotos : [] }),
      onRemove: (photoId) => onRemovePhoto?.(row, photoId, 'defectPhotos'),
      onChangeDescription: (photoId, description) =>
        onChangePhotoDescription?.(row, photoId, description, 'defectPhotos'),
      onApplyCaption: (photoId, caption) =>
        onApplyPhotoCaption?.(row, photoId, caption, 'defectPhotos'),
    })
  const requestDefectPhoto = () =>
    onRequestDefectPhotoUpload?.(
      row,
      buildPhotoViewerUploadOptions(openDefectPhotoViewer, { currentPhotos: defectPhotos }),
    )
  const openAdditionalPhotoViewer = (nextPhotos = photos) =>
    setPhotoViewer({
      title: `${row.equipment} - additional photos`,
      photos: nextPhotos,
      onAddMorePhoto: (currentPhotos) =>
        onRequestPhotoUpload?.(
          row,
          buildPhotoViewerUploadOptions(openAdditionalPhotoViewer, { currentPhotos }),
        ),
      onRemove: (photoId) => onRemovePhoto?.(row, photoId),
      onChangeDescription: (photoId, description) =>
        onChangePhotoDescription?.(row, photoId, description),
      onApplyCaption: (photoId, caption) => onApplyPhotoCaption?.(row, photoId, caption),
    })

  if (readOnly) {
    return (
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
            title="General equipment remarks"
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
    )
  }

  return (
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
          invalid={fieldError && missingCondition}
          describedBy={fieldError && missingCondition ? `${row.id}-condition-error` : undefined}
          onChange={(nextValue) => onUpdateCheck?.(row, { condition: nextValue })}
        />
        {fieldError && missingCondition ? (
          <FormFieldError id={`${row.id}-condition-error`}>Condition is required.</FormFieldError>
        ) : null}
      </div>
      {isDefect ? (
        <div className="d-grid gap-1">
          <div className="d-flex align-items-center justify-content-between gap-2">
            <CFormLabel className="small fw-semibold text-muted mb-0">Defect remarks</CFormLabel>
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
            aria-label="Defect and corrective action"
            value={row.defectRemarks || ''}
            placeholder="Describe the defect and the corrective action."
            onChange={(event) => onUpdateCheck?.(row, { defectRemarks: event.target.value })}
          />
          {remarksError && missingRemark ? (
            <FormFieldError>Defect remarks are required.</FormFieldError>
          ) : null}
          <div data-inspection-er-aux-detail-key="defectPhotos">
            <InspectionPhotoActionRow
              photos={defectPhotos}
              onView={() => openDefectPhotoViewer(defectPhotos)}
              onAddPhoto={requestDefectPhoto}
            />
          </div>
        </div>
      ) : null}
      <div className="inspection-equipment-additional-info d-grid gap-2">
        <div className="small fw-semibold text-muted">{detailsLabel}</div>
        <div className="inspection-equipment-additional-actions d-flex flex-wrap align-items-center gap-2">
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
          <div data-inspection-er-aux-detail-key="additionalPhotos">
            <CreateActionButton
              label="Photo"
              className="inspection-compact-action-btn justify-self-start"
              icon={<Camera size={13} className="me-1 align-text-bottom" />}
              onClick={() =>
                onRequestPhotoUpload?.(
                  row,
                  buildPhotoViewerUploadOptions(openAdditionalPhotoViewer, {
                    currentPhotos: photos,
                  }),
                )
              }
            />
          </div>
        </div>
        {showAdditionalNotes ? (
          <div className="d-grid gap-1" data-inspection-er-aux-detail-key="additionalNotes">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <CFormLabel className="small fw-semibold text-muted mb-0">
                General equipment remarks
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
              ) : null}
            </div>
            <CFormTextarea
              rows={2}
              aria-label="General equipment remarks"
              value={row.additionalNotes || ''}
              placeholder="General equipment remarks"
              onChange={(event) => onUpdateCheck?.(row, { additionalNotes: event.target.value })}
            />
            {!hasAdditionalNotes ? (
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                className="inspection-compact-action-btn justify-self-start"
                onClick={() =>
                  setExpandedAdditionalNotes((current) => ({
                    ...current,
                    [rowId]: false,
                  }))
                }
              >
                Cancel
              </CButton>
            ) : null}
          </div>
        ) : null}
        {photos.length > 0 ? (
          <InspectionPhotoEvidenceSummary
            photos={photos}
            label="View photos"
            onView={() => openAdditionalPhotoViewer(photos)}
          />
        ) : null}
      </div>
    </>
  )
}

export const ErAuxEquipmentChecks = ({
  mainLocation,
  checks,
  summary,
  onUpdateCheck,
  onSaveRowDraft,
  onResetCheck,
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
  isLoadingRows = false,
  readOnly = false,
}) => {
  const visibleChecks = summary?.visibleChecks || checks || []
  const incompleteCheckDetails = summary?.incompleteCheckDetails || []
  const incompleteEvidenceDetails = summary?.incompleteEvidenceDetails || []
  const [search, setSearch] = useState('')
  const [expandedAdditionalNotes, setExpandedAdditionalNotes] = useState({})
  const [mobileDetailRowId, setMobileDetailRowId] = useState('')
  const [mobileDraftRow, setMobileDraftRow] = useState(null)
  const [mobileDraftBaseRow, setMobileDraftBaseRow] = useState(null)
  const [mobileSaveStatus, setMobileSaveStatus] = useState('')
  const [showDiscardChanges, setShowDiscardChanges] = useState(false)
  const [photoViewer, setPhotoViewer] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')

  const hasReliableRows = visibleChecks.length > 0
  const countLabel = getActionCountLabel(
    summary?.totalCount ?? visibleChecks.length,
    isLoadingRows && !hasReliableRows,
  )
  const mobileDetailRow = mobileDetailRowId
    ? visibleChecks.find((row) => String(row.id || row.equipment || '') === mobileDetailRowId) ||
      null
    : null
  const mobileDraftDirty =
    Boolean(mobileDraftRow) &&
    getRowSignature(mobileDraftRow) !== getRowSignature(mobileDraftBaseRow)

  const patchMobileDraftRow = (patch = {}) => {
    setMobileDraftRow((current) => {
      if (!current) return current
      const resolvedPatch = typeof patch === 'function' ? patch(current) : patch
      return { ...current, ...(resolvedPatch || {}) }
    })
    setMobileSaveStatus('Unsaved changes')
  }

  const openMobileDetailDrawer = (row) => {
    const rowId = String(row?.id || row?.equipment || '')
    if (!rowId) return
    const nextDraft = cloneRow(row)
    setMobileDetailRowId(rowId)
    setMobileDraftRow(nextDraft)
    setMobileDraftBaseRow(cloneRow(nextDraft))
    setMobileSaveStatus('')
  }

  const closeMobileDetailDrawer = () => {
    setMobileDetailRowId('')
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
    if (!mobileDetailRow || !mobileDraftRow || !mobileDraftDirty) return
    const result =
      typeof onSaveRowDraft === 'function'
        ? onSaveRowDraft(mobileDetailRow, mobileDraftRow)
        : onUpdateCheck?.(mobileDetailRow, mobileDraftRow)
    if (result === false) {
      setMobileSaveStatus('Sync pending')
      return
    }
    setMobileSaveStatus('Saved')
    closeMobileDetailDrawer()
  }

  const mobileDraftHandlers = {
    onUpdateCheck: (_row, patch) => patchMobileDraftRow(patch),
    onRequestPhotoUpload: (row, photosKeyOrOptions = {}, options = {}) =>
      onRequestPhotoUpload?.(
        row,
        buildStagedPhotoUploadOptions(
          photosKeyOrOptions && typeof photosKeyOrOptions === 'object'
            ? photosKeyOrOptions
            : options,
          (_targetRow, photosKey, photos) =>
            patchMobileDraftRow((current) =>
              buildInspectionPhotoListPatch(current, photosKey, (currentPhotos) =>
                mergeInspectionPhotoLists(currentPhotos, photos),
              ),
            ),
        ),
      ),
    onRequestDefectPhotoUpload: (row, options = {}) =>
      onRequestDefectPhotoUpload?.(
        row,
        buildStagedPhotoUploadOptions(options, (_targetRow, photosKey, photos) =>
          patchMobileDraftRow((current) =>
            buildInspectionPhotoListPatch(current, photosKey, (currentPhotos) =>
              mergeInspectionPhotoLists(currentPhotos, photos),
            ),
          ),
        ),
      ),
    onRemovePhoto: (_row, photoId, photosKey = 'photos') =>
      patchMobileDraftRow((current) =>
        buildInspectionPhotoListPatch(current, photosKey, (currentPhotos) =>
          removePhotoById(currentPhotos, photoId),
        ),
      ),
    onChangePhotoDescription: (_row, photoId, description, photosKey = 'photos') =>
      patchMobileDraftRow((current) =>
        buildInspectionPhotoListPatch(current, photosKey, (currentPhotos) =>
          updatePhotoDescriptionById(currentPhotos, photoId, description),
        ),
      ),
    onApplyPhotoCaption: (_row, photoId, caption, photosKey = 'photos') =>
      patchMobileDraftRow((current) =>
        buildInspectionPhotoListPatch(current, photosKey, (currentPhotos) =>
          currentPhotos.map((photo) =>
            String(photo?.id || '') === String(photoId || '')
              ? { ...photo, description: [photo.description, caption].filter(Boolean).join('\n') }
              : photo,
          ),
        ),
      ),
  }
  const filteredChecks = visibleChecks.filter((row) =>
    rowContainsSearch(
      row,
      [
        'equipment',
        'equipmentDescription',
        'quantity',
        'condition',
        'defectRemarks',
        'additionalNotes',
      ],
      search,
    ),
  )

  const requestResetCheck = (row, options = {}) => {
    if (!row) return
    setResetTarget({ row, ...options })
  }

  const confirmResetCheck = () => {
    if (!resetTarget?.row) return
    onResetCheck?.(resetTarget.row)
    resetTarget.onAfterConfirm?.()
    setResetTarget(null)
  }

  if (!mainLocation && visibleChecks.length === 0 && !isLoadingRows) return null

  return (
    <div className="d-grid gap-3">
      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">Equipment</div>
        </div>
        {!readOnly ? (
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
            <CreateActionButton
              label="Mark all OK"
              className="inspection-compact-action-btn d-none d-md-inline-flex"
              onClick={onMarkAllOk}
            />
            <CreateActionButton
              label={`Add equipment (${countLabel})`}
              className="inspection-compact-action-btn"
              onClick={onAddEquipment}
            />
          </div>
        ) : null}
      </div>

      {isLoadingRows && hasReliableRows ? (
        <div className="small text-body-secondary" aria-live="polite">
          Refreshing equipment...
        </div>
      ) : null}

      {!readOnly && visibleChecks.length > 0 ? (
        <ManagedCheckToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search ER Aux equipment..."
          searchLabel="Search ER Aux equipment rows"
          onClearSearch={() => setSearch('')}
          clearSearchLabel="Clear ER Aux equipment row search"
          resultCount={filteredChecks.length}
          totalCount={visibleChecks.length}
        />
      ) : null}

      {visibleChecks.length === 0 && isLoadingRows ? (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          Loading equipment...
        </div>
      ) : visibleChecks.length === 0 ? (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          No Emergency Response Auxiliary Equipment has been added for this location.
        </div>
      ) : filteredChecks.length === 0 ? (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          No Emergency Response Auxiliary Equipment rows match this search.
        </div>
      ) : (
        <div className="inspection-hydraulic-card-grid inspection-check-card-grid--managed inspection-fire-extinguisher-card-stack">
          {filteredChecks.map((row) => {
            const workflowState = getErAuxWorkflowState(row)
            const rowId = String(row.id || row.equipment || '')
            const actionItems = buildInspectionElementActions({
              canReset: !readOnly && typeof onResetCheck === 'function',
              onReset: () => requestResetCheck(row),
              canEdit: row.canEdit && (row.equipmentId || row.isLocalSeedEquipment),
              onEdit: () => onEditEquipment?.(row),
              canDelete: row.canDelete && (row.equipmentId || row.isLocalSeedEquipment),
              onDelete: () => onDeleteEquipment?.(row),
            })

            return (
              <InspectionElementCard
                key={row.id || row.equipment}
                title={row.equipment}
                meta={row.equipmentDescription}
                status={<ErAuxInspectionStatusInline workflowState={workflowState} />}
                badges={
                  <>
                    {row.isCustomEquipment || row.equipmentSource === 'custom' ? (
                      <span className="badge text-bg-light border text-body-secondary">Custom</span>
                    ) : null}
                    <InspectionElementValidationBadges
                      missingCount={workflowState.missingCount}
                      needsEvidence={workflowState.needsEvidence}
                    />
                  </>
                }
                actions={actionItems}
                actionLabel={`Equipment actions for ${row.equipment}`}
                expanded={!useMobileDrawer || readOnly}
                active={useMobileDrawer && mobileDetailRowId === rowId}
                readOnly={readOnly}
                onToggle={
                  useMobileDrawer && !readOnly ? () => openMobileDetailDrawer(row) : undefined
                }
                showBody={!useMobileDrawer || readOnly}
                dataAttributes={{
                  'data-inspection-er-aux-row-id': rowId,
                }}
              >
                <ErAuxEquipmentCheckDetails
                  row={row}
                  expandedAdditionalNotes={expandedAdditionalNotes}
                  setExpandedAdditionalNotes={setExpandedAdditionalNotes}
                  setPhotoViewer={setPhotoViewer}
                  onUpdateCheck={onUpdateCheck}
                  onRequestPhotoUpload={onRequestPhotoUpload}
                  onRequestDefectPhotoUpload={onRequestDefectPhotoUpload}
                  onRemovePhoto={onRemovePhoto}
                  onChangePhotoDescription={onChangePhotoDescription}
                  onApplyPhotoCaption={onApplyPhotoCaption}
                  fieldError={fieldError}
                  remarksError={remarksError}
                  readOnly={readOnly}
                />
              </InspectionElementCard>
            )
          })}
        </div>
      )}

      {useMobileDrawer && mobileDetailRow ? (
        <MobileBottomDrawer
          visible
          title={mobileDetailRow.equipment || 'Equipment'}
          bodyClassName="inspection-equipment-detail-drawer-shell"
          headerAction={
            !readOnly ? (
              <RowActions
                iconSize={16}
                hitArea={44}
                toggleAriaLabel={`Equipment actions for ${mobileDetailRow.equipment || 'Equipment'}`}
                items={[
                  typeof onResetCheck === 'function'
                    ? {
                        key: 'reset',
                        label: 'Reset check',
                        className: 'text-danger',
                        onClick: () =>
                          requestResetCheck(mobileDetailRow, {
                            onAfterConfirm: closeMobileDetailDrawer,
                          }),
                      }
                    : null,
                  mobileDetailRow.canEdit &&
                  (mobileDetailRow.equipmentId || mobileDetailRow.isLocalSeedEquipment)
                    ? {
                        key: 'edit',
                        label: 'Edit',
                        disabled: mobileDraftDirty,
                        disabledReason: mobileDraftDirty ? 'Save or cancel changes first.' : '',
                        onClick: () => {
                          onEditEquipment?.(mobileDetailRow)
                          closeMobileDetailDrawer()
                        },
                      }
                    : null,
                  mobileDetailRow.canDelete &&
                  (mobileDetailRow.equipmentId || mobileDetailRow.isLocalSeedEquipment)
                    ? {
                        key: 'delete',
                        label: 'Delete',
                        className: 'text-danger',
                        disabled: mobileDraftDirty,
                        disabledReason: mobileDraftDirty ? 'Save or cancel changes first.' : '',
                        onClick: () => {
                          onDeleteEquipment?.(mobileDetailRow)
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
            {mobileDetailRow.equipmentDescription ? (
              <div className="inspection-equipment-detail-drawer-summary small text-body-secondary">
                {mobileDetailRow.equipmentDescription}
              </div>
            ) : null}
            <ErAuxEquipmentCheckDetails
              row={mobileDraftRow || mobileDetailRow}
              expandedAdditionalNotes={expandedAdditionalNotes}
              setExpandedAdditionalNotes={setExpandedAdditionalNotes}
              setPhotoViewer={setPhotoViewer}
              onUpdateCheck={mobileDraftHandlers.onUpdateCheck}
              onRequestPhotoUpload={mobileDraftHandlers.onRequestPhotoUpload}
              onRequestDefectPhotoUpload={mobileDraftHandlers.onRequestDefectPhotoUpload}
              onRemovePhoto={mobileDraftHandlers.onRemovePhoto}
              onChangePhotoDescription={mobileDraftHandlers.onChangePhotoDescription}
              onApplyPhotoCaption={mobileDraftHandlers.onApplyPhotoCaption}
              fieldError={fieldError}
              remarksError={remarksError}
              readOnly={readOnly}
            />
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
                  <div>Each defect row needs remarks.</div>
                )}
              </>
            ) : (
              ''
            )}
          </FormFieldError>
        </>
      ) : null}
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
      <InspectionResetConfirmDrawer
        visible={Boolean(resetTarget)}
        row={resetTarget?.row}
        fallbackLabel="this equipment"
        onClose={() => setResetTarget(null)}
        onConfirm={confirmResetCheck}
      />
      <ActionConfirmModal
        visible={showDiscardChanges}
        title="Discard changes?"
        message="Your ER Aux equipment changes have not been saved."
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
    </div>
  )
}
