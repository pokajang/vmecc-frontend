import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CBadge, CButton, CFormInput, CFormLabel, CFormTextarea } from '@coreui/react'
import { CheckCircle2, Circle, TriangleAlert } from 'lucide-react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import RowActions from 'src/components/RowActions'
import useMediaQuery from 'src/hooks/useMediaQuery'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import InspectionItemAdditionalInfo from 'src/views/inspection/form/components/InspectionItemAdditionalInfo'
import {
  buildPhotoViewerUploadOptions,
  buildStagedPhotoUploadOptions,
} from 'src/views/inspection/form/inspectionPhotoFlow'
import {
  buildInspectionPhotoListPatch,
  mergeInspectionPhotoLists,
  removePhotoById,
  updatePhotoDescriptionById,
} from 'src/views/inspection/form/inspectionPhotoUtils'
import InspectionResetConfirmDrawer from 'src/views/inspection/form/components/InspectionResetConfirmDrawer'
import {
  buildInspectionElementActions,
  InspectionElementCard,
  InspectionElementDrawerFooter,
} from 'src/views/inspection/form/components/InspectionElementUi'
import {
  FRT_DAILY_STATUS_OPTIONS,
  FRT_ONE_OFF_STATUS_OPTIONS,
} from 'src/views/inspection/types/frt-daily/helpers'
import {
  FormFieldError,
  InspectionPhotoActionRow,
  InspectionPhotoEvidenceSummary,
} from 'src/views/inspection/form/components/InspectionDisplayShared'

const getFrtRowId = (row = {}) => String(row?.id || row?.equipment || row?.rowNumber || '')
const cloneRow = (row) => (row ? JSON.parse(JSON.stringify(row)) : null)
const getRowSignature = (row) => JSON.stringify(row || {})
const NO_AUTO_EXPAND_ROW_ID = '__frt_no_auto_expand__'
const isCustomFrtRow = (row = {}) => String(row?.id || '').startsWith('custom:frt:')

const buildFrtRowActionItems = ({
  row,
  canReset = false,
  onReset,
  onEdit,
  onDelete,
  disableManage = false,
} = {}) =>
  buildInspectionElementActions({
    canReset,
    onReset,
    canEdit: typeof onEdit === 'function',
    onEdit,
    canDelete: isCustomFrtRow(row) && typeof onDelete === 'function',
    onDelete,
    disableManage,
  })
const text = (value) => String(value || '').trim()

const isFrtRowIssue = (row = {}, kind = 'daily') =>
  kind === 'daily' ? row.status === 'Issue' : row.condition === 'Not Good'

const isFrtRowComplete = (row = {}, kind = 'daily') => {
  if (kind === 'daily' && row.rowKind === 'reading') return text(row.readingValue) !== ''
  const status = kind === 'daily' ? text(row.status) : text(row.condition)
  if (!status) return false
  if (!isFrtRowIssue(row, kind)) return true
  return text(row.remarks) !== ''
}

const isFrtRowIncomplete = (row = {}, kind = 'daily') => !isFrtRowComplete(row, kind)

const formatFrtRowMeta = (row = {}, kind = 'daily') => {
  const parts = [`Row ${row.rowNumber || '--'}`]
  if (text(row.location)) parts.push(text(row.location))
  if (kind === 'daily' && row.rowKind !== 'reading') parts.push(`Qty ${row.quantity || '--'}`)
  if (kind === 'oneOff') parts.push('One-off')
  return parts.join(' - ')
}

const getFrtSectionDisplayTitle = (section = {}) => {
  const firstRowLocation = text(section.visibleRows?.[0]?.location)
  if (firstRowLocation && firstRowLocation !== 'FIRE TRUCK') return firstRowLocation
  return text(section.sourceTitle || section.title) || 'Truck Readiness'
}

const FrtInspectionStatusInline = ({ row, kind }) => {
  const hasIssue = isFrtRowIssue(row, kind)
  const isComplete = isFrtRowComplete(row, kind)
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
      {hasIssue ? (
        <span
          className="d-inline-flex align-items-center gap-1 text-danger"
          aria-label="Issue"
          title="Issue"
        >
          <TriangleAlert size={14} aria-hidden="true" />
          <span className="fw-normal">Issue</span>
        </span>
      ) : null}
    </span>
  )
}

const FrtValidationBadges = ({ missingStatusKeys = [], missingRemarkKeys = [] }) => {
  const missingCount = missingStatusKeys.length + missingRemarkKeys.length

  return (
    <>
      {missingCount > 0 ? (
        <CBadge color="warning" className="d-none d-md-inline-flex">
          {missingCount} missing
        </CBadge>
      ) : null}
      {missingRemarkKeys.length > 0 ? (
        <span className="badge rounded-pill text-bg-danger d-none d-md-inline-flex align-items-center">
          Needs evidence
        </span>
      ) : null}
    </>
  )
}

const FrtStatusSegment = ({ options, value, onChange, readOnly = false }) => (
  <div className="inspection-hydraulic-status-group d-flex flex-nowrap justify-content-start gap-2 vmecc-scroll-x pb-1">
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

const FrtIssueEvidence = ({
  row,
  photos,
  missingRemarks = false,
  emptyRemarkMessage,
  setPhotoViewer,
  onUpdateCheck,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
}) => {
  const remarksId = `frt-${getFrtRowId(row).replace(/[^A-Za-z0-9_-]/g, '-')}-issue-remarks`
  const openIssuePhotoViewer = (nextPhotos = photos) =>
    setPhotoViewer({
      title: `${row.equipment} - issue photos`,
      photos: nextPhotos,
      showCaptionChips: false,
      onAddMorePhoto: (currentPhotos) =>
        onRequestIssuePhotoUpload?.(
          row,
          buildPhotoViewerUploadOptions(openIssuePhotoViewer, { currentPhotos }),
        ),
      onSave: (savedPhotos) =>
        onUpdateCheck?.(row, { photos: Array.isArray(savedPhotos) ? savedPhotos : [] }),
      onRemove: (photoId) => onRemovePhoto?.(row, photoId),
      onChangeDescription: (photoId, description) =>
        onChangePhotoDescription?.(row, photoId, description),
      onApplyCaption: (photoId, caption) => onApplyPhotoCaption?.(row, photoId, caption),
    })
  const requestIssuePhoto = () =>
    onRequestIssuePhotoUpload?.(
      row,
      buildPhotoViewerUploadOptions(openIssuePhotoViewer, { currentPhotos: photos }),
    )

  return (
    <div
      className="inspection-hydraulic-defect-evidence rounded-3 border bg-light-subtle p-2 d-grid gap-2"
      data-inspection-frt-detail-key="remarks"
    >
      <CFormLabel htmlFor={remarksId} className="small fw-semibold text-muted mb-1">
        Issue evidence
      </CFormLabel>
      <CFormTextarea
        id={remarksId}
        rows={2}
        value={row.remarks || ''}
        placeholder="Issue remarks"
        onChange={(event) => onUpdateCheck?.(row, { remarks: event.target.value })}
      />
      {missingRemarks ? <FormFieldError>{emptyRemarkMessage}</FormFieldError> : null}
      <div data-inspection-frt-detail-key="photos">
        <InspectionPhotoActionRow
          photos={photos}
          onView={() => openIssuePhotoViewer(photos)}
          onAddPhoto={requestIssuePhoto}
        />
      </div>
    </div>
  )
}

const FrtReadOnlyIssueEvidence = ({ row, photos, setPhotoViewer }) => (
  <>
    <div>
      <div className="small text-body-secondary">Remarks</div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{row.remarks || '--'}</div>
    </div>
    {photos.length > 0 ? (
      <InspectionPhotoEvidenceSummary
        photos={photos}
        readOnly
        onView={() =>
          setPhotoViewer({
            title: `${row.equipment} - issue photos`,
            photos,
            readOnly: true,
          })
        }
      />
    ) : null}
  </>
)

export const FrtDailyRowDetails = ({
  row,
  setPhotoViewer,
  readOnly = false,
  showQuantity = true,
  fieldErrors = {},
  missingStatusKeys = [],
  missingRemarkKeys = [],
  onUpdateCheck,
  onRequestPhotoUpload,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
}) => {
  const isReadingRow = row.rowKind === 'reading'
  const hasIssue = row.status === 'Issue'
  const photos = Array.isArray(row.photos) ? row.photos : []
  const missingReading = missingStatusKeys.includes('readingValue')
  const missingStatus = missingStatusKeys.includes('status')
  const missingRemarks = missingRemarkKeys.includes('remarks')
  const readingId = `frt-${getFrtRowId(row).replace(/[^A-Za-z0-9_-]/g, '-')}-reading`

  if (readOnly) {
    return (
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
          <FrtReadOnlyIssueEvidence row={row} photos={photos} setPhotoViewer={setPhotoViewer} />
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
    )
  }

  if (isReadingRow) {
    return (
      <>
        <div className="d-grid gap-1" data-inspection-frt-detail-key="readingValue">
          <CFormLabel htmlFor={readingId} className="small fw-semibold text-muted mb-1">
            Reading
          </CFormLabel>
          <CFormInput
            id={readingId}
            value={row.readingValue || ''}
            inputMode="numeric"
            placeholder={row.equipment === 'FUEL LEVEL (%)' ? 'Fuel level %' : 'Enter reading'}
            onChange={(event) => onUpdateCheck?.(row, { readingValue: event.target.value })}
          />
          {missingReading ||
          (fieldErrors.frtDailyChecks && !String(row.readingValue || '').trim()) ? (
            <FormFieldError>Reading is required.</FormFieldError>
          ) : null}
        </div>
        <InspectionItemAdditionalInfo
          row={row}
          remarksKey="additionalNotes"
          photosKey="additionalPhotos"
          remarksTitle="General equipment remarks"
          remarksPlaceholder="General equipment remarks"
          photoTitle={`${row.equipment || 'Truck Readiness'} - additional photos`}
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

  return (
    <>
      <div className="row g-3">
        {showQuantity ? (
          <div className="col-12 col-md-4">
            <div className="small text-body-secondary">Quantity</div>
            <div className="fw-semibold">{row.quantity || '--'}</div>
          </div>
        ) : null}
        <div className={showQuantity ? 'col-12 col-md-8' : 'col-12'}>
          <div className="inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2">
            <CFormLabel className="inspection-hydraulic-check-label small fw-semibold text-muted mb-0">
              Status
            </CFormLabel>
            <div data-inspection-frt-detail-key="status">
              <FrtStatusSegment
                options={FRT_DAILY_STATUS_OPTIONS}
                value={row.status}
                onChange={(nextValue) => onUpdateCheck?.(row, { status: nextValue })}
              />
            </div>
          </div>
        </div>
      </div>
      {hasIssue ? (
        <FrtIssueEvidence
          row={row}
          photos={photos}
          missingRemarks={
            missingRemarks || (fieldErrors.frtDailyRemarks && !String(row.remarks || '').trim())
          }
          emptyRemarkMessage="Remarks are required for issue rows."
          setPhotoViewer={setPhotoViewer}
          onUpdateCheck={onUpdateCheck}
          onRequestIssuePhotoUpload={onRequestIssuePhotoUpload}
          onRemovePhoto={onRemovePhoto}
          onChangePhotoDescription={onChangePhotoDescription}
          onApplyPhotoCaption={onApplyPhotoCaption}
        />
      ) : null}
      <InspectionItemAdditionalInfo
        row={row}
        remarksKey="additionalNotes"
        photosKey="additionalPhotos"
        remarksTitle="General equipment remarks"
        remarksPlaceholder="General equipment remarks"
        photoTitle={`${row.equipment || 'Truck Readiness'} - additional photos`}
        setPhotoViewer={setPhotoViewer}
        onUpdateCheck={onUpdateCheck}
        onRequestPhotoUpload={onRequestPhotoUpload}
        onRemovePhoto={onRemovePhoto}
        onChangePhotoDescription={onChangePhotoDescription}
        onApplyPhotoCaption={onApplyPhotoCaption}
      />
      <FormFieldError>{missingStatus ? 'Status is required.' : ''}</FormFieldError>
    </>
  )
}

export const FrtOneOffRowDetails = ({
  row,
  setPhotoViewer,
  readOnly = false,
  fieldErrors = {},
  missingStatusKeys = [],
  missingRemarkKeys = [],
  onUpdateCheck,
  onRequestPhotoUpload,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
}) => {
  const hasIssue = row.condition === 'Not Good'
  const photos = Array.isArray(row.photos) ? row.photos : []
  const missingCondition = missingStatusKeys.includes('condition')
  const missingRemarks = missingRemarkKeys.includes('remarks')

  if (readOnly) {
    return (
      <>
        <div>
          <div className="small text-body-secondary">Condition</div>
          <div className="fw-semibold">{row.condition || '--'}</div>
        </div>
        {hasIssue ? (
          <FrtReadOnlyIssueEvidence row={row} photos={photos} setPhotoViewer={setPhotoViewer} />
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
    )
  }

  return (
    <>
      <div
        className="inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2"
        data-inspection-frt-detail-key="condition"
      >
        <CFormLabel className="inspection-hydraulic-check-label small fw-semibold text-muted mb-0">
          Condition
        </CFormLabel>
        <FrtStatusSegment
          options={FRT_ONE_OFF_STATUS_OPTIONS}
          value={row.condition}
          onChange={(nextValue) => onUpdateCheck?.(row, { condition: nextValue })}
        />
      </div>
      {hasIssue ? (
        <FrtIssueEvidence
          row={row}
          photos={photos}
          missingRemarks={
            missingRemarks || (fieldErrors.frtOneOffRemarks && !String(row.remarks || '').trim())
          }
          emptyRemarkMessage="Remarks are required for Not Good rows."
          setPhotoViewer={setPhotoViewer}
          onUpdateCheck={onUpdateCheck}
          onRequestIssuePhotoUpload={onRequestIssuePhotoUpload}
          onRemovePhoto={onRemovePhoto}
          onChangePhotoDescription={onChangePhotoDescription}
          onApplyPhotoCaption={onApplyPhotoCaption}
        />
      ) : null}
      <InspectionItemAdditionalInfo
        row={row}
        remarksKey="additionalNotes"
        photosKey="additionalPhotos"
        remarksTitle="General equipment remarks"
        remarksPlaceholder="General equipment remarks"
        photoTitle={`${row.equipment || 'Truck Readiness'} - additional photos`}
        setPhotoViewer={setPhotoViewer}
        onUpdateCheck={onUpdateCheck}
        onRequestPhotoUpload={onRequestPhotoUpload}
        onRemovePhoto={onRemovePhoto}
        onChangePhotoDescription={onChangePhotoDescription}
        onApplyPhotoCaption={onApplyPhotoCaption}
      />
      <FormFieldError>{missingCondition ? 'Condition is required.' : ''}</FormFieldError>
    </>
  )
}

const FrtRowCard = ({
  row,
  kind,
  expanded = true,
  active = false,
  setPhotoViewer,
  readOnly = false,
  fieldErrors = {},
  missingStatusKeys = [],
  missingRemarkKeys = [],
  onToggleExpanded,
  onUpdateCheck,
  onResetCheck,
  onDeleteItem,
  onRequestPhotoUpload,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
}) => {
  const isDaily = kind === 'daily'
  const bodyId = `frt-checks-${getFrtRowId(row).replace(/[^A-Za-z0-9_-]/g, '-')}`
  const toggleExpanded = () => onToggleExpanded?.(row)
  const canReset = !readOnly && typeof onResetCheck === 'function'
  const actionItems = buildFrtRowActionItems({
    row,
    canReset,
    onReset: () => onResetCheck(row),
    onEdit: () => onToggleExpanded?.(row, { forceOpen: true }),
    onDelete: onDeleteItem ? () => onDeleteItem(row) : undefined,
  })

  const detailProps = {
    row,
    setPhotoViewer,
    readOnly,
    fieldErrors,
    missingStatusKeys,
    missingRemarkKeys,
    onUpdateCheck,
    onRequestPhotoUpload,
    onRequestIssuePhotoUpload,
    onRemovePhoto,
    onChangePhotoDescription,
    onApplyPhotoCaption,
  }

  return (
    <InspectionElementCard
      title={row.equipment}
      meta={formatFrtRowMeta(row, kind)}
      status={<FrtInspectionStatusInline row={row} kind={kind} />}
      badges={
        <FrtValidationBadges
          missingStatusKeys={missingStatusKeys}
          missingRemarkKeys={missingRemarkKeys}
        />
      }
      actions={actionItems}
      actionLabel={`Truck readiness actions for ${row.equipment}`}
      expanded={expanded}
      active={active}
      readOnly={readOnly}
      onToggle={() => toggleExpanded()}
      bodyId={bodyId}
      dataAttributes={{
        'data-inspection-frt-row-id': row.id,
      }}
      headerClassName="justify-content-between"
    >
      {isDaily ? <FrtDailyRowDetails {...detailProps} /> : <FrtOneOffRowDetails {...detailProps} />}
    </InspectionElementCard>
  )
}

const FrtSectionCards = ({
  filteredDailySections,
  filteredOneOffSections,
  focusDailySections = filteredDailySections,
  focusOneOffSections = filteredOneOffSections,
  showDailySections = true,
  showOneOffSections = true,
  autoExpandFirstIncomplete = true,
  setPhotoViewer,
  readOnly = false,
  fieldErrors = {},
  validationState = null,
  onUpdateCheck,
  onResetCheck,
  onMarkRowOk,
  onDeleteItem,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  onSaveFrtRowDraft,
}) => {
  const [mobileDetailTarget, setMobileDetailTarget] = useState(null)
  const [mobileDraftRow, setMobileDraftRow] = useState(null)
  const [mobileSaveStatus, setMobileSaveStatus] = useState('')
  const [isSavingMobileRow, setIsSavingMobileRow] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState('')
  const [activeRowId, setActiveRowId] = useState('')
  const [resetTarget, setResetTarget] = useState(null)
  const [showDiscardChanges, setShowDiscardChanges] = useState(false)
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const [mobileDraftBaseSignature, setMobileDraftBaseSignature] = useState('')
  const allRows = useMemo(
    () => [
      ...(showDailySections
        ? focusDailySections.flatMap((section) =>
            (section.visibleRows || []).map((row) => ({ kind: 'daily', row })),
          )
        : []),
      ...(showOneOffSections
        ? focusOneOffSections.flatMap((section) =>
            (section.visibleRows || []).map((row) => ({ kind: 'oneOff', row })),
          )
        : []),
    ],
    [focusDailySections, focusOneOffSections, showDailySections, showOneOffSections],
  )
  const mobileDetail = mobileDetailTarget
    ? allRows.find(
        (item) =>
          item.kind === mobileDetailTarget.kind && getFrtRowId(item.row) === mobileDetailTarget.id,
      ) || null
    : null
  const mobileDraftDirty =
    Boolean(mobileDraftRow) && getRowSignature(mobileDraftRow) !== mobileDraftBaseSignature

  const initialExpandedRowId = useMemo(() => {
    if (!autoExpandFirstIncomplete || expandedRowId || activeRowId) return ''
    const firstIncomplete = allRows.find((item) => isFrtRowIncomplete(item.row, item.kind))
    return firstIncomplete ? getFrtRowId(firstIncomplete.row) : ''
  }, [activeRowId, allRows, autoExpandFirstIncomplete, expandedRowId])

  const openMobileDetailDrawer = useCallback(
    (kind, rowOrId) => {
      const target =
        rowOrId && typeof rowOrId === 'object'
          ? { kind, row: rowOrId }
          : allRows.find(
              (item) => item.kind === kind && getFrtRowId(item.row) === String(rowOrId || ''),
            ) || null
      const rowId = getFrtRowId(target?.row || rowOrId)
      if (!target?.row || !rowId) return

      const nextDraft = cloneRow(target.row)
      setMobileDetailTarget({ kind: target.kind, id: rowId })
      setActiveRowId(rowId)
      setMobileDraftRow(nextDraft)
      setMobileDraftBaseSignature(getRowSignature(nextDraft))
      setMobileSaveStatus('')
    },
    [allRows],
  )

  useEffect(() => {
    const handleFocusRequest = (event) => {
      const rowId = String(event?.detail?.rowId || '').trim()
      if (!rowId) return
      const target = allRows.find((item) => getFrtRowId(item.row) === rowId)
      if (!target) return
      setExpandedRowId(rowId)
      setActiveRowId(rowId)
      if (!useMobileDrawer || readOnly) return
      openMobileDetailDrawer(target.kind, target.row)
      window.setTimeout(() => {
        const detailKey = String(event?.detail?.detailKey || '').trim()
        const drawerTarget = detailKey
          ? Array.from(document.querySelectorAll('[data-inspection-frt-detail-key]')).find(
              (element) => element.getAttribute('data-inspection-frt-detail-key') === detailKey,
            )
          : null
        const focusTarget =
          drawerTarget?.querySelector?.('textarea, input, button, [tabindex]') || drawerTarget
        focusTarget?.focus?.()
      }, 350)
    }

    window.addEventListener('inspection:focus-frt-row', handleFocusRequest)
    return () => window.removeEventListener('inspection:focus-frt-row', handleFocusRequest)
  }, [allRows, openMobileDetailDrawer, readOnly, useMobileDrawer])

  const toggleRowExpanded = (kind, row, options = {}) => {
    const rowId = getFrtRowId(row)
    if (useMobileDrawer && !readOnly) {
      openMobileDetailDrawer(kind, row)
      return
    }
    if (options.forceOpen) {
      setExpandedRowId(rowId)
      setActiveRowId(rowId)
      return
    }
    const isOpen = expandedRowId === rowId || activeRowId === rowId
    setExpandedRowId(isOpen ? '' : rowId)
    setActiveRowId(isOpen ? NO_AUTO_EXPAND_ROW_ID : rowId)
  }

  const patchMobileDraftRow = (patch) => {
    setMobileDraftRow((current) => {
      if (!current) return current
      const resolvedPatch = typeof patch === 'function' ? patch(current) : patch
      return { ...current, ...(resolvedPatch || {}) }
    })
    setMobileSaveStatus('Unsaved changes')
  }

  const closeMobileDetailDrawer = () => {
    setMobileDetailTarget(null)
    setMobileDraftRow(null)
    setMobileDraftBaseSignature('')
    setMobileSaveStatus('')
    setIsSavingMobileRow(false)
  }

  const requestCloseMobileDetailDrawer = () => {
    if (mobileDraftDirty) {
      setShowDiscardChanges(true)
      return
    }
    closeMobileDetailDrawer()
  }

  const saveMobileDraftRow = () => {
    if (!mobileDraftRow || isSavingMobileRow || !mobileDraftDirty) return
    const result = onSaveFrtRowDraft?.(mobileDraftRow)
    if (result === false) {
      setMobileSaveStatus('Draft save failed')
      return
    }
    closeMobileDetailDrawer()
  }

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

  const buildMobileDraftHandlers = () => ({
    onUpdateCheck: (_row, patch) => patchMobileDraftRow(patch),
    onRequestIssuePhotoUpload: (row, options = {}) =>
      onRequestIssuePhotoUpload?.(
        row,
        buildStagedPhotoUploadOptions(options, (_targetRow, photosKey, photos) =>
          patchMobileDraftRow((current) =>
            buildInspectionPhotoListPatch(current, photosKey, (currentPhotos) =>
              mergeInspectionPhotoLists(currentPhotos, photos),
            ),
          ),
        ),
      ),
    onRequestPhotoUpload: (row, photosKey = 'additionalPhotos', options = {}) =>
      onRequestIssuePhotoUpload?.(
        row,
        buildStagedPhotoUploadOptions(
          { ...options, photosKey },
          (_targetRow, nextPhotosKey, photos) =>
            patchMobileDraftRow((current) =>
              buildInspectionPhotoListPatch(current, nextPhotosKey, (currentPhotos) =>
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
              ? {
                  ...photo,
                  description: [photo.description, caption].filter(Boolean).join('\n'),
                }
              : photo,
          ),
        ),
      ),
  })

  const sharedRowProps = {
    setPhotoViewer,
    readOnly,
    fieldErrors,
    onUpdateCheck,
    onResetCheck: requestResetCheck,
    onMarkRowOk,
    onDeleteItem,
    onRequestPhotoUpload: (row, photosKey = 'additionalPhotos', options = {}) =>
      onRequestIssuePhotoUpload?.(row, { ...options, photosKey }),
    onRequestIssuePhotoUpload,
    onRemovePhoto,
    onChangePhotoDescription,
    onApplyPhotoCaption,
  }

  const getValidationProps = (row) => {
    const rowId = getFrtRowId(row)
    return {
      missingStatusKeys: validationState?.frt?.missingStatusesByRow?.[rowId] || [],
      missingRemarkKeys: validationState?.frt?.missingRemarksByRow?.[rowId] || [],
    }
  }

  const renderSection = (section, kind) => {
    const sectionTitle = getFrtSectionDisplayTitle(section)
    return (
      <div key={section.key} className="d-grid gap-2" data-inspection-frt-section-id={section.key}>
        {readOnly ? (
          <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="fw-semibold text-muted text-break">{sectionTitle}</div>
          </div>
        ) : null}
        <div className="inspection-hydraulic-card-grid inspection-check-card-grid--managed inspection-fire-extinguisher-card-stack">
          {section.visibleRows.map((row) => {
            const rowId = getFrtRowId(row)
            return (
              <FrtRowCard
                key={row.id}
                row={row}
                kind={kind}
                {...sharedRowProps}
                {...getValidationProps(row)}
                expanded={
                  readOnly ||
                  (!useMobileDrawer &&
                    (expandedRowId === rowId ||
                      activeRowId === rowId ||
                      initialExpandedRowId === rowId))
                }
                active={
                  activeRowId === rowId ||
                  (useMobileDrawer &&
                    mobileDetailTarget?.kind === kind &&
                    mobileDetailTarget?.id === rowId)
                }
                onToggleExpanded={(nextRow, options) => toggleRowExpanded(kind, nextRow, options)}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      {showDailySections
        ? filteredDailySections.map((section) => renderSection(section, 'daily'))
        : null}

      {showOneOffSections
        ? filteredOneOffSections.map((section) => renderSection(section, 'oneOff'))
        : null}

      {useMobileDrawer && mobileDetail ? (
        <MobileBottomDrawer
          visible
          title={mobileDetail.row.equipment || 'Truck Readiness'}
          bodyClassName="inspection-fire-extinguisher-detail-drawer-shell"
          headerAction={
            !readOnly ? (
              <RowActions
                iconSize={16}
                hitArea={32}
                toggleAriaLabel={`Truck readiness actions for ${
                  mobileDetail.row.equipment || 'row'
                }`}
                items={buildFrtRowActionItems({
                  row: mobileDetail.row,
                  canReset: typeof onResetCheck === 'function',
                  onReset: () =>
                    requestResetCheck(mobileDraftRow || mobileDetail.row, {
                      onAfterConfirm: closeMobileDetailDrawer,
                    }),
                  onDelete: onDeleteItem
                    ? () => {
                        onDeleteItem(mobileDetail.row)
                        closeMobileDetailDrawer()
                      }
                    : undefined,
                  disableManage: mobileDraftDirty,
                })}
              />
            ) : null
          }
          onClose={requestCloseMobileDetailDrawer}
        >
          <div className="inspection-mobile-detail-drawer-body inspection-fire-extinguisher-detail-drawer-body d-grid">
            <div className="inspection-fire-extinguisher-detail-drawer-summary small text-body-secondary">
              Row {mobileDetail.row.rowNumber || '--'}
              {mobileDetail.kind === 'daily' && mobileDetail.row.rowKind !== 'reading'
                ? ` - Qty ${mobileDetail.row.quantity || '--'}`
                : ''}
            </div>
            {mobileDetail.kind === 'daily' ? (
              <FrtDailyRowDetails
                row={mobileDraftRow || mobileDetail.row}
                {...sharedRowProps}
                {...buildMobileDraftHandlers()}
                {...getValidationProps(mobileDetail.row)}
                showQuantity={false}
              />
            ) : (
              <FrtOneOffRowDetails
                row={mobileDraftRow || mobileDetail.row}
                {...sharedRowProps}
                {...buildMobileDraftHandlers()}
                {...getValidationProps(mobileDetail.row)}
              />
            )}
          </div>
          {!readOnly ? (
            <InspectionElementDrawerFooter
              statusText={mobileSaveStatus}
              dirty={mobileDraftDirty}
              saving={isSavingMobileRow}
              onCancel={closeMobileDetailDrawer}
              onSave={saveMobileDraftRow}
            />
          ) : null}
        </MobileBottomDrawer>
      ) : null}
      <InspectionResetConfirmDrawer
        visible={Boolean(resetTarget)}
        row={resetTarget?.row}
        fallbackLabel="this truck readiness row"
        onClose={() => setResetTarget(null)}
        onConfirm={confirmResetCheck}
      />
      <ActionConfirmModal
        visible={showDiscardChanges}
        title="Discard changes?"
        message="Your fire truck row changes have not been saved."
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

export default FrtSectionCards
