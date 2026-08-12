import React from 'react'
import { CButton, CFormLabel, CFormTextarea } from '@coreui/react'
import { CheckCircle2, Circle, TriangleAlert } from 'lucide-react'
import { buildPhotoViewerUploadOptions } from '../inspectionPhotoFlow'
import InspectionItemAdditionalInfo from './InspectionItemAdditionalInfo'
import {
  buildInspectionElementActions,
  InspectionElementCard,
  InspectionElementValidationBadges,
} from './InspectionElementUi'
import {
  HIGH_ANGLE_CONDITION_FIELD,
  HIGH_ANGLE_STATUS_OPTIONS,
  getHighAngleRetainedEvidenceRows,
} from 'src/views/inspection/types/high-angle/helpers'
import { EvidenceBlock, FormFieldError, InspectionPhotoActionRow } from './InspectionDisplayShared'
import InspectionStatusSegment from './patterns/InspectionStatusSegment'

const text = (value) => String(value || '').trim()

const getHighAngleRowId = (row = {}) =>
  text(row.id) || `${text(row.mainLocation)}:${text(row.rowNumber)}`

const stripHighAngleDisplayMeta = (row = {}) => {
  const { groupKey, groupTitle, ...sourceRow } = row
  return sourceRow
}

const formatHighAngleRowMeta = (row = {}) =>
  `Row ${row.rowNumber || '--'} - Qty ${row.quantity || '--'}`

export const getHighAngleWorkflowState = (row = {}) => {
  const condition = text(row.condition)
  const hasIssue = condition === 'Not Good'
  const hasRemarks = text(row.conditionRemarks || row.remarks) !== ''
  const missingEvidenceCount = hasIssue && !hasRemarks ? 1 : 0
  const missingCount = (condition ? 0 : 1) + missingEvidenceCount

  return {
    hasIssue,
    isComplete: missingCount === 0,
    missingCount,
    needsEvidence: missingEvidenceCount > 0,
  }
}

const HighAngleStatusSegment = ({
  value,
  onChange,
  readOnly = false,
  invalid = false,
  describedBy,
}) => (
  <InspectionStatusSegment
    ariaLabel="Condition"
    showLabel={false}
    value={value}
    options={HIGH_ANGLE_STATUS_OPTIONS}
    onChange={onChange}
    readOnly={readOnly}
    invalid={invalid}
    describedBy={describedBy}
  />
)

const HighAngleStatusInline = ({ workflowState, hasRetainedEvidence = false }) => {
  const isComplete = workflowState?.isComplete
  const completionLabel = isComplete ? 'Checked' : 'Not checked'

  return (
    <span className="inspection-fire-extinguisher-status-inline d-inline-flex flex-wrap align-items-center gap-2 small">
      <span
        className={`d-inline-flex align-items-center gap-1 ${
          isComplete ? 'text-muted' : 'text-body-secondary'
        }`}
        aria-label={completionLabel}
        title={completionLabel}
      >
        {isComplete ? (
          <CheckCircle2 size={14} className="text-success" aria-hidden="true" />
        ) : (
          <Circle size={14} aria-hidden="true" />
        )}
        <span className="fw-normal">{completionLabel}</span>
      </span>
      {workflowState?.hasIssue ? (
        <span
          className="d-inline-flex align-items-center gap-1 text-danger"
          aria-label="Issue"
          title="Issue"
        >
          <TriangleAlert size={14} aria-hidden="true" />
          <span className="fw-normal">Issue</span>
        </span>
      ) : null}
      {hasRetainedEvidence ? (
        <span
          className="d-inline-flex align-items-center gap-1 text-warning-emphasis"
          aria-label="Retained evidence"
          title="Retained evidence"
        >
          <TriangleAlert size={14} aria-hidden="true" />
          <span className="fw-normal">Retained evidence</span>
        </span>
      ) : null}
    </span>
  )
}

export const HighAngleInspectionRowDetails = ({
  row,
  bodyId,
  readOnly = false,
  remarksError = false,
  setPhotoViewer,
  onUpdateCheck,
  onRequestPhotoUpload,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
}) => {
  const hasIssue = text(row.condition) === 'Not Good'
  const conditionRemarks = String(row.conditionRemarks || row.remarks || '')
  const hasConditionRemarks = text(conditionRemarks) !== ''
  const conditionPhotos = Array.isArray(row.conditionPhotos) ? row.conditionPhotos : []
  const retainedEvidenceRows = getHighAngleRetainedEvidenceRows([row])
  const hasRetainedEvidence = retainedEvidenceRows.length > 0
  const sourceRow = stripHighAngleDisplayMeta(row)
  const openConditionPhotoViewer = (photos = conditionPhotos) =>
    setPhotoViewer({
      title: `${row.equipment} - condition issue photos`,
      photos,
      showCaptionChips: false,
      onAddMorePhoto: (currentPhotos) =>
        onRequestIssuePhotoUpload?.(
          sourceRow,
          buildPhotoViewerUploadOptions(openConditionPhotoViewer, { currentPhotos }),
        ),
      onSave: (nextPhotos) =>
        onUpdateCheck?.(sourceRow, {
          [HIGH_ANGLE_CONDITION_FIELD.photosKey]: Array.isArray(nextPhotos) ? nextPhotos : [],
        }),
      onRemove: (photoId) =>
        onRemovePhoto?.(sourceRow, photoId, HIGH_ANGLE_CONDITION_FIELD.photosKey),
      onChangeDescription: (photoId, description) =>
        onChangePhotoDescription?.(
          sourceRow,
          photoId,
          description,
          HIGH_ANGLE_CONDITION_FIELD.photosKey,
        ),
      onApplyCaption: (photoId, caption) =>
        onApplyPhotoCaption?.(sourceRow, photoId, caption, HIGH_ANGLE_CONDITION_FIELD.photosKey),
    })
  const requestConditionPhoto = () =>
    onRequestIssuePhotoUpload?.(
      sourceRow,
      buildPhotoViewerUploadOptions(openConditionPhotoViewer, {
        currentPhotos: conditionPhotos,
      }),
    )
  const missingCondition = remarksError && !text(row.condition)
  const conditionErrorId = `${bodyId}-condition-error`

  return readOnly ? (
    <>
      <div className="inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2">
        <div className="inspection-hydraulic-check-label small fw-semibold text-muted">
          Condition
        </div>
        <div className="fw-semibold">{row.condition || '--'}</div>
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
      <InspectionItemAdditionalInfo
        row={row}
        readOnly
        remarksKey="additionalNotes"
        photosKey="additionalPhotos"
        remarksTitle="General equipment remarks"
        setPhotoViewer={setPhotoViewer}
      />
    </>
  ) : (
    <>
      <div className="inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2">
        <CFormLabel className="inspection-hydraulic-check-label small fw-semibold text-muted mb-0">
          Condition
        </CFormLabel>
        <HighAngleStatusSegment
          value={row.condition}
          invalid={missingCondition}
          describedBy={missingCondition ? conditionErrorId : undefined}
          onChange={(nextValue) =>
            onUpdateCheck?.(sourceRow, {
              condition: nextValue,
            })
          }
        />
        <FormFieldError id={conditionErrorId}>
          {missingCondition ? 'Condition is required.' : ''}
        </FormFieldError>
      </div>
      {hasIssue ? (
        <div className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2">
          <CFormLabel
            htmlFor={`${bodyId}-issue-remarks`}
            className="small fw-semibold text-muted mb-1"
          >
            Issue evidence
          </CFormLabel>
          <CFormTextarea
            id={`${bodyId}-issue-remarks`}
            rows={2}
            value={conditionRemarks}
            placeholder="Issue remarks"
            onChange={(event) =>
              onUpdateCheck?.(sourceRow, {
                remarks: event.target.value,
                [HIGH_ANGLE_CONDITION_FIELD.remarksKey]: event.target.value,
              })
            }
          />
          {remarksError && !hasConditionRemarks ? (
            <FormFieldError>Remarks are required for issue rows.</FormFieldError>
          ) : null}
          <InspectionPhotoActionRow
            photos={conditionPhotos}
            onView={() => openConditionPhotoViewer(conditionPhotos)}
            onAddPhoto={requestConditionPhoto}
          />
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
                onRemovePhoto?.(sourceRow, photoId, HIGH_ANGLE_CONDITION_FIELD.photosKey),
              onChangeDescription: (photoId, description) =>
                onChangePhotoDescription?.(
                  sourceRow,
                  photoId,
                  description,
                  HIGH_ANGLE_CONDITION_FIELD.photosKey,
                ),
              onApplyCaption: (photoId, caption) =>
                onApplyPhotoCaption?.(
                  sourceRow,
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
                onUpdateCheck?.(sourceRow, {
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
      <InspectionItemAdditionalInfo
        row={sourceRow}
        remarksKey="additionalNotes"
        photosKey="additionalPhotos"
        remarksTitle="General equipment remarks"
        remarksPlaceholder="General equipment remarks"
        photoTitle={`${row.equipment || 'Equipment'} - additional photos`}
        setPhotoViewer={setPhotoViewer}
        onUpdateCheck={onUpdateCheck}
        onRequestPhotoUpload={onRequestPhotoUpload}
        onRemovePhoto={onRemovePhoto}
        onChangePhotoDescription={onChangePhotoDescription}
        onApplyPhotoCaption={onApplyPhotoCaption}
      />
    </>
  )
}

const HighAngleInspectionRowCard = ({
  row,
  readOnly = false,
  remarksError = false,
  setPhotoViewer,
  onUpdateCheck,
  onRequestPhotoUpload,
  onResetCheck,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  onEditItem,
  onDeleteItem,
  active = false,
  expanded = true,
  onToggleExpanded,
  interactionMode = 'inline',
}) => {
  const hasIssue = text(row.condition) === 'Not Good'
  const hasRetainedEvidence = getHighAngleRetainedEvidenceRows([row]).length > 0
  const workflowState = getHighAngleWorkflowState(row)
  const rowId = getHighAngleRowId(row)
  const bodyId = `high-angle-checks-${rowId.replace(/[^A-Za-z0-9_-]/g, '-')}`
  const canToggle = !readOnly && typeof onToggleExpanded === 'function'
  const sourceRow = stripHighAngleDisplayMeta(row)
  const canReset = !readOnly && typeof onResetCheck === 'function'
  const canManageItem =
    !readOnly &&
    (row.isExtensionRow === true || row.equipmentSource === 'custom') &&
    (typeof onEditItem === 'function' || typeof onDeleteItem === 'function')
  const actionItems = buildInspectionElementActions({
    canReset,
    onReset: () => onResetCheck(sourceRow),
    canEdit: canManageItem && typeof onEditItem === 'function',
    onEdit: () => onEditItem(sourceRow),
    canDelete: canManageItem && typeof onDeleteItem === 'function',
    onDelete: () => onDeleteItem(sourceRow),
  })

  return (
    <InspectionElementCard
      title={row.equipment || 'Equipment'}
      meta={formatHighAngleRowMeta(row)}
      status={
        <HighAngleStatusInline
          workflowState={workflowState}
          hasRetainedEvidence={hasRetainedEvidence}
        />
      }
      badges={
        <>
          {hasRetainedEvidence ? (
            <span className="badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
              Retained evidence
            </span>
          ) : null}
          <InspectionElementValidationBadges needsEvidence={workflowState.needsEvidence} />
        </>
      }
      helperLines={
        hasRetainedEvidence
          ? 'Evidence from an earlier status is retained for audit context.'
          : null
      }
      actions={actionItems}
      actionLabel={`High angle actions for ${row.equipment || 'Equipment'}`}
      interactionMode={interactionMode}
      openLabel={`Open ${row.equipment || 'equipment'} inspection details`}
      expanded={expanded}
      active={active}
      readOnly={readOnly}
      onToggle={canToggle ? () => onToggleExpanded(row) : undefined}
      bodyId={bodyId}
      dataAttributes={{
        'data-inspection-high-angle-row-id': rowId,
      }}
    >
      <HighAngleInspectionRowDetails
        row={row}
        bodyId={bodyId}
        readOnly={readOnly}
        remarksError={remarksError}
        setPhotoViewer={setPhotoViewer}
        onUpdateCheck={onUpdateCheck}
        onRequestPhotoUpload={onRequestPhotoUpload}
        onRequestIssuePhotoUpload={onRequestIssuePhotoUpload}
        onRemovePhoto={onRemovePhoto}
        onChangePhotoDescription={onChangePhotoDescription}
        onApplyPhotoCaption={onApplyPhotoCaption}
      />
    </InspectionElementCard>
  )
}

export default HighAngleInspectionRowCard
