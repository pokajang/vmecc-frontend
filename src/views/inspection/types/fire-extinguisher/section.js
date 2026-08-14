import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import CreateActionButton from 'src/components/CreateActionButton'
import RowActions from 'src/components/RowActions'
import useMediaQuery from 'src/hooks/useMediaQuery'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { appendInspectionText } from '../../form/inspectionFormHelpers'
import {
  FormFieldError,
  InspectionPhotoViewerModal,
  ManagedCheckToolbar,
} from '../../form/components/InspectionFormDisplaySections'
import InspectionResetConfirmDrawer from '../../form/components/InspectionResetConfirmDrawer'
import { InspectionElementDrawerFooter } from '../../form/components/InspectionElementUi'
import InspectionItemDrawer from '../../form/components/InspectionItemDrawer'
import { hasFireExtinguisherInspectionData } from '../../form/inspectionResetActions'
import {
  applyPhotoCaptionById,
  buildInspectionPhotoListPatch,
  mergeInspectionPhotoLists,
  removePhotoById,
  updatePhotoDescriptionById,
} from '../../form/inspectionPhotoUtils'
import { getActionCountLabel } from '../../form/inspectionCountLabels'
import { buildStagedPhotoUploadOptions } from '../../form/inspectionPhotoFlow'
import {
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  filterFireExtinguisherRows,
  formatFireExtinguisherLastInspection,
  getFirstIncompleteFireExtinguisherRow,
  getFireExtinguisherCurrentCheckLabel,
  getFireExtinguisherRowWorkflowState,
  isFireExtinguisherDefectStatus,
  shouldShowFireExtinguisherLastInspection,
} from './helpers'
import {
  AddFireExtinguisherForm,
  FireExtinguisherRowCard,
  FireExtinguisherRowDetails,
  formatFireExtinguisherCertification,
  formatFireExtinguisherMeta,
  getFireExtinguisherRowTitle,
} from './fireExtinguisherCheckCards'

const text = (value) => String(value || '').trim()

const cloneRow = (row) => (row ? JSON.parse(JSON.stringify(row)) : null)

const getRowSignature = (row) => JSON.stringify(row || {})
const NO_AUTO_EXPAND_ROW_ID = '__fire_extinguisher_no_auto_expand__'

const getInitialExpandedFireExtinguisherRow = (rows = []) => {
  const normalizedRows = Array.isArray(rows) ? rows : []
  return (
    normalizedRows.find((row) =>
      FIRE_EXTINGUISHER_CHECK_FIELDS.some((field) =>
        isFireExtinguisherDefectStatus(row[field.key]),
      ),
    ) ||
    getFirstIncompleteFireExtinguisherRow(normalizedRows) ||
    null
  )
}

const getFireExtinguisherDefectCount = (row = {}) =>
  FIRE_EXTINGUISHER_CHECK_FIELDS.filter((field) => isFireExtinguisherDefectStatus(row[field.key]))
    .length

const getFireExtinguisherDetailSummaryLines = (row = {}) => {
  const metadataLabel = [formatFireExtinguisherMeta(row), formatFireExtinguisherCertification(row)]
    .filter(Boolean)
    .join(' | ')
  return [
    getFireExtinguisherCurrentCheckLabel(row),
    metadataLabel,
    shouldShowFireExtinguisherLastInspection(row)
      ? formatFireExtinguisherLastInspection(row.lastInspection)
      : '',
  ].filter(Boolean)
}

const getFireExtinguisherDetailBadges = (row = {}) => {
  const workflowState = getFireExtinguisherRowWorkflowState(row)
  const badges = []
  if (
    workflowState.isComplete ||
    row?.sessionSyncPending === true ||
    row?.sessionResult?.status === 'completed'
  ) {
    badges.push({ key: 'checked', label: 'Checked', color: 'success' })
  }
  if (workflowState.hasDefect) {
    const defectCount = getFireExtinguisherDefectCount(row)
    badges.push({
      key: 'defect',
      label: defectCount > 0 ? `Defect (${defectCount})` : 'Defect',
      color: 'danger',
    })
  }
  if (
    !workflowState.isComplete &&
    row?.sessionSyncPending !== true &&
    row?.sessionResult?.status !== 'completed' &&
    !workflowState.hasDefect
  ) {
    badges.push({ key: 'pending', label: 'Pending', color: 'secondary' })
  }
  return badges
}

const FireExtinguisherListView = ({
  readOnly = false,
  zone = '',
  mainLocation,
  subLocation = '',
  isLoadingRows = false,
  summary,
  draftStatus = '',
  fieldError = false,
  remarksError = false,
  validationState = null,
  handlers = {},
  isFocusedScanMode = false,
}) => {
  const [search, setSearch] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState('')
  const [activeRowId, setActiveRowId] = useState('')
  const [mobileDetailRowId, setMobileDetailRowId] = useState('')
  const [mobileDetailMode, setMobileDetailMode] = useState('inspect')
  const [mobileDraftRow, setMobileDraftRow] = useState(null)
  const [mobileDraftBaseSignature, setMobileDraftBaseSignature] = useState('')
  const [mobileSaveStatus, setMobileSaveStatus] = useState('')
  const [isSavingMobileRow, setIsSavingMobileRow] = useState(false)
  const [photoViewer, setPhotoViewer] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [pendingDiscardAction, setPendingDiscardAction] = useState('')
  const [metadataDirty, setMetadataDirty] = useState(false)
  const [metadataSaving, setMetadataSaving] = useState(false)
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const lastValidationTargetRef = useRef('')
  const allRows = useMemo(() => summary?.visibleChecks || [], [summary?.visibleChecks])
  const rows = isFocusedScanMode ? allRows : filterFireExtinguisherRows(allRows, search)
  const trimmedSearch = isFocusedScanMode ? '' : text(search)
  const mobileDetailRow = mobileDetailRowId
    ? allRows.find((row) => text(row.id) === mobileDetailRowId) || null
    : null
  const mobileDetailReadOnly = readOnly
  const mobileDraftDirty =
    mobileDetailMode === 'inspect' &&
    Boolean(mobileDraftRow) &&
    getRowSignature(mobileDraftRow) !== mobileDraftBaseSignature
  const showSkeletonRows = !readOnly && isLoadingRows && rows.length === 0
  const hasReliableRows = allRows.length > 0
  const totalCountLabel = getActionCountLabel(
    summary?.totalCount ?? allRows.length,
    isLoadingRows && !hasReliableRows,
  )
  const validationTarget = validationState?.fireExtinguisher?.firstTarget || null
  const showDesktopDraftStatus = !useMobileDrawer && text(draftStatus)
  const emptyStateMessage =
    trimmedSearch && allRows.length > 0
      ? 'No fire extinguishers match this search.'
      : 'No fire extinguishers registered for this location.'
  const initialExpandedRowId = useMemo(() => {
    if (expandedRowId || activeRowId) return ''
    return text(getInitialExpandedFireExtinguisherRow(allRows)?.id)
  }, [activeRowId, allRows, expandedRowId])

  const openMobileDetailDrawer = useCallback(
    (rowOrId) => {
      const row =
        rowOrId && typeof rowOrId === 'object'
          ? rowOrId
          : allRows.find((nextRow) => text(nextRow.id) === text(rowOrId)) || null
      const rowId = text(row?.id || rowOrId)
      if (!rowId) return

      const nextDraft = cloneRow(row)
      setMobileDetailRowId(rowId)
      setMobileDetailMode('inspect')
      setActiveRowId(rowId)
      setMobileDraftRow(nextDraft)
      setMobileDraftBaseSignature(nextDraft ? getRowSignature(nextDraft) : '')
      setMobileSaveStatus('')
    },
    [allRows],
  )

  const expandAndFocusRow = useCallback(
    (rowId, focusTarget = {}) => {
      const normalizedRowId = text(rowId)
      if (!normalizedRowId) return
      if (useMobileDrawer && !readOnly) {
        openMobileDetailDrawer(normalizedRowId)
        window.setTimeout(() => {
          const drawerTarget = Array.from(
            document.querySelectorAll('[data-fire-extinguisher-detail-drawer-row-id]'),
          ).find(
            (element) =>
              element.getAttribute('data-fire-extinguisher-detail-drawer-row-id') ===
              normalizedRowId,
          )
          drawerTarget?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
          const detailTarget = focusTarget.detailKey
            ? Array.from(
                drawerTarget?.querySelectorAll?.('[data-fire-extinguisher-detail-key]') || [],
              ).find(
                (element) =>
                  element.getAttribute('data-fire-extinguisher-detail-key') ===
                  focusTarget.detailKey,
              )
            : null
          const checkTarget = focusTarget.checkKey
            ? Array.from(
                drawerTarget?.querySelectorAll?.('[data-fire-extinguisher-check-key]') || [],
              ).find(
                (element) =>
                  element.getAttribute('data-fire-extinguisher-check-key') === focusTarget.checkKey,
              )
            : null
          const fallbackTarget = drawerTarget?.querySelector?.(
            'button, textarea, input, [tabindex]',
          )
          const focusElement =
            detailTarget?.matches?.('button, textarea, input, [tabindex]') === true
              ? detailTarget
              : detailTarget?.querySelector?.('button, textarea, input, [tabindex]') ||
                checkTarget?.querySelector?.('button, textarea, input, [tabindex]') ||
                fallbackTarget
          focusElement?.focus?.()
        }, 350)
        return
      }
      setExpandedRowId(normalizedRowId)
      setActiveRowId(normalizedRowId)
      window.setTimeout(() => {
        const target = Array.from(
          document.querySelectorAll('[data-fire-extinguisher-row-id]'),
        ).find(
          (element) => element.getAttribute('data-fire-extinguisher-row-id') === normalizedRowId,
        )
        target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        const detailTarget = focusTarget.detailKey
          ? Array.from(
              target?.querySelectorAll?.('[data-fire-extinguisher-detail-key]') || [],
            ).find(
              (element) =>
                element.getAttribute('data-fire-extinguisher-detail-key') === focusTarget.detailKey,
            )
          : null
        const checkTarget = focusTarget.checkKey
          ? Array.from(target?.querySelectorAll?.('[data-fire-extinguisher-check-key]') || []).find(
              (element) =>
                element.getAttribute('data-fire-extinguisher-check-key') === focusTarget.checkKey,
            )
          : null
        const fallbackTarget = target?.querySelector?.('button, textarea, input, [tabindex]')
        const focusElement =
          detailTarget?.matches?.('button, textarea, input, [tabindex]') === true
            ? detailTarget
            : detailTarget?.querySelector?.('button, textarea, input, [tabindex]') ||
              checkTarget?.querySelector?.('button, textarea, input, [tabindex]') ||
              fallbackTarget
        focusElement?.focus?.()
      }, 50)
    },
    [readOnly, openMobileDetailDrawer, setActiveRowId, setExpandedRowId, useMobileDrawer],
  )

  const closeMobileDetailDrawer = useCallback(() => {
    setMobileDetailRowId('')
    setActiveRowId('')
    setMobileDetailMode('inspect')
    setMobileDraftRow(null)
    setMobileDraftBaseSignature('')
    setMobileSaveStatus('')
    setIsSavingMobileRow(false)
    setMetadataDirty(false)
    setMetadataSaving(false)
  }, [])

  const requestCloseMobileDetailDrawer = useCallback(() => {
    if (mobileDetailMode === 'edit' && metadataDirty) {
      setPendingDiscardAction('metadata-close')
      return
    }
    if (mobileDraftDirty) {
      setPendingDiscardAction('close')
      return
    }
    closeMobileDetailDrawer()
  }, [closeMobileDetailDrawer, metadataDirty, mobileDetailMode, mobileDraftDirty])

  const openMobileMetadataEdit = useCallback(() => {
    if (mobileDraftDirty) {
      setPendingDiscardAction('edit')
      return
    }
    setMobileDraftRow(null)
    setMobileDraftBaseSignature('')
    setMobileSaveStatus('')
    setMetadataDirty(false)
    setMobileDetailMode('edit')
  }, [mobileDraftDirty])

  const requestCancelMetadataEdit = useCallback(() => {
    if (metadataDirty) {
      setPendingDiscardAction('metadata-cancel')
      return
    }
    setMobileDetailMode('inspect')
  }, [metadataDirty])

  const discardMobileDraftChanges = useCallback(() => {
    const action = pendingDiscardAction
    setPendingDiscardAction('')
    if (action === 'edit') {
      setMobileDraftRow(null)
      setMobileDraftBaseSignature('')
      setMobileSaveStatus('')
      setMetadataDirty(false)
      setMobileDetailMode('edit')
      return
    }
    if (action === 'metadata-cancel') {
      setMetadataDirty(false)
      setMetadataSaving(false)
      setMobileDetailMode('inspect')
      return
    }
    closeMobileDetailDrawer()
  }, [closeMobileDetailDrawer, pendingDiscardAction])

  const persistFireExtinguisherEntry = useCallback(
    async (payload, sourceRow) => {
      try {
        if (sourceRow) {
          const result = await handlers.onUpdateExtinguisher?.(sourceRow, payload)
          return result === undefined || result !== false
        }
        const result = await handlers.onAddExtinguisher?.(payload)
        return result === undefined || result !== false
      } catch {
        return false
      }
    },
    [handlers],
  )

  const patchMobileDraftRow = useCallback((patch) => {
    setMobileDraftRow((current) => {
      if (!current) return current
      const resolvedPatch = typeof patch === 'function' ? patch(current) : patch
      return { ...current, ...(resolvedPatch || {}) }
    })
    setMobileSaveStatus('Unsaved changes')
  }, [])

  const buildMobileDraftHandlers = useCallback(
    () => ({
      ...handlers,
      onUpdateCheck: (_row, patch) => patchMobileDraftRow(patch),
      onRequestPhotoUpload: (row, options = {}) =>
        handlers.onRequestPhotoUpload?.(
          row,
          buildStagedPhotoUploadOptions(options, (_targetRow, photosKey, photos) =>
            patchMobileDraftRow((current) =>
              buildInspectionPhotoListPatch(current, photosKey, (currentPhotos) =>
                mergeInspectionPhotoLists(currentPhotos, photos),
              ),
            ),
          ),
        ),
      onRequestDefectPhotoUpload: (row, field, options = {}) =>
        handlers.onRequestDefectPhotoUpload?.(
          row,
          field,
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
            applyPhotoCaptionById(currentPhotos, photoId, caption, appendInspectionText),
          ),
        ),
    }),
    [handlers, patchMobileDraftRow],
  )

  const saveMobileDraftRow = () => {
    if (!mobileDraftRow || isSavingMobileRow || !mobileDraftDirty) return
    const result = handlers.onSaveFireExtinguisherRowDraft?.(mobileDraftRow)
    if (result === false) {
      setMobileSaveStatus('Draft save failed')
      return
    }
    closeMobileDetailDrawer()
  }

  const requestResetRow = useCallback((row, options = {}) => {
    if (!row) return
    setResetTarget({ row, ...options })
  }, [])

  const confirmResetRow = useCallback(() => {
    if (!resetTarget?.row) return
    handlers.onResetCheck?.(resetTarget.row)
    resetTarget.onAfterConfirm?.()
    setResetTarget(null)
  }, [handlers, resetTarget])

  useEffect(() => {
    const targetRowId = text(validationTarget?.rowId)
    const focusTarget = {
      checkKey: validationTarget?.checkKey,
      detailKey: validationTarget?.detailKey,
    }
    const targetKey = [targetRowId, focusTarget.checkKey, focusTarget.detailKey].join('\u001f')
    if (!targetRowId || lastValidationTargetRef.current === targetKey) return
    lastValidationTargetRef.current = targetKey
    const rowVisibleInSearch = rows.some((row) => text(row.id) === targetRowId)
    const timer = window.setTimeout(() => {
      if (!rowVisibleInSearch) setSearch('')
      expandAndFocusRow(targetRowId, focusTarget)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [
    expandAndFocusRow,
    rows,
    validationTarget?.checkKey,
    validationTarget?.detailKey,
    validationTarget?.rowId,
  ])

  return (
    <div className="d-grid gap-3">
      <div className="inspection-hydraulic-section-heading d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">Extinguishers</div>
          {showDesktopDraftStatus ? (
            <div className="small text-body-secondary d-none d-md-block" aria-live="polite">
              {draftStatus === 'Unsaved changes' ? 'Unsaved draft changes' : draftStatus}
            </div>
          ) : null}
        </div>
        {!readOnly && !isFocusedScanMode ? (
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            <CreateActionButton
              label={`Add extinguisher (${totalCountLabel})`}
              className="inspection-compact-action-btn"
              onClick={() => setShowAdd(true)}
            />
          </div>
        ) : null}
      </div>

      {!readOnly && !isFocusedScanMode ? (
        <ManagedCheckToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search extinguisher ID, barcode, type, sub-location..."
          searchLabel="Search fire extinguisher rows"
          searchDisabled={isLoadingRows && allRows.length === 0}
          onClearSearch={() => setSearch('')}
          clearSearchLabel="Clear fire extinguisher row search"
          resultCount={rows.length}
          totalCount={allRows.length}
          idleStatus={isLoadingRows && allRows.length > 0 ? 'Refreshing units...' : ''}
        />
      ) : null}

      {showAdd || editingRow ? (
        useMobileDrawer ? (
          <MobileBottomDrawer
            visible
            title={editingRow ? 'Edit extinguisher' : 'Add extinguisher'}
            onClose={() => {
              setShowAdd(false)
              setEditingRow(null)
            }}
          >
            <AddFireExtinguisherForm
              mainLocation={mainLocation}
              subLocation={subLocation}
              initialValue={editingRow || { zone, mainLocation }}
              presentation="drawer"
              onCheckLocatorConflict={handlers.onCheckLocatorConflict}
              onCancel={() => {
                setShowAdd(false)
                setEditingRow(null)
              }}
              onSave={async (payload) => {
                const saved = await persistFireExtinguisherEntry(payload, editingRow)
                if (saved) {
                  setShowAdd(false)
                  setEditingRow(null)
                }
              }}
            />
          </MobileBottomDrawer>
        ) : (
          <AddFireExtinguisherForm
            mainLocation={mainLocation}
            subLocation={subLocation}
            initialValue={editingRow || { zone, mainLocation }}
            onCheckLocatorConflict={handlers.onCheckLocatorConflict}
            onCancel={() => {
              setShowAdd(false)
              setEditingRow(null)
            }}
            onSave={async (payload) => {
              const saved = await persistFireExtinguisherEntry(payload, editingRow)
              if (saved) {
                setShowAdd(false)
                setEditingRow(null)
              }
            }}
          />
        )
      ) : null}

      {useMobileDrawer && mobileDetailRow ? (
        <InspectionItemDrawer
          visible
          mode={mobileDetailMode === 'edit' ? 'edit-equipment' : 'inspect'}
          itemTitle={getFireExtinguisherRowTitle(mobileDetailRow)}
          editTitle={`Edit ${getFireExtinguisherRowTitle(mobileDetailRow)}`}
          closeDisabled={metadataSaving}
          bodyClassName="inspection-fire-extinguisher-detail-drawer-shell"
          headerAction={
            !mobileDetailReadOnly && mobileDetailMode === 'inspect' ? (
              <RowActions
                iconSize={16}
                hitArea={44}
                toggleAriaLabel={`Extinguisher actions for ${getFireExtinguisherRowTitle(
                  mobileDraftRow || mobileDetailRow,
                )}`}
                items={[
                  mobileDetailRow.canEdit
                    ? {
                        key: 'edit-equipment',
                        label: 'Edit equipment details',
                        onClick: openMobileMetadataEdit,
                      }
                    : null,
                  typeof handlers.onResetCheck === 'function' &&
                  hasFireExtinguisherInspectionData(
                    mobileDraftRow || mobileDetailRow,
                    FIRE_EXTINGUISHER_CHECK_FIELDS,
                  )
                    ? {
                        key: 'clear-answers',
                        label: 'Clear inspection answers',
                        className: 'text-danger',
                        onClick: () =>
                          requestResetRow(mobileDraftRow || mobileDetailRow, {
                            onAfterConfirm: closeMobileDetailDrawer,
                          }),
                      }
                    : null,
                ].filter(Boolean)}
              />
            ) : null
          }
          onClose={requestCloseMobileDetailDrawer}
        >
          {mobileDetailMode === 'edit' ? (
            <AddFireExtinguisherForm
              mainLocation={mainLocation}
              subLocation={subLocation}
              initialValue={mobileDetailRow}
              presentation="drawer"
              submitLabel="Save equipment details"
              onCheckLocatorConflict={handlers.onCheckLocatorConflict}
              onDirtyChange={setMetadataDirty}
              onSubmittingChange={setMetadataSaving}
              onCancel={requestCancelMetadataEdit}
              onSave={async (payload) => {
                const saved = await persistFireExtinguisherEntry(payload, mobileDetailRow)
                if (!saved) throw new Error('Unable to save equipment details. Please try again.')
                setMetadataDirty(false)
                setMetadataSaving(false)
                setMobileDetailMode('inspect')
              }}
            />
          ) : (
            <>
              <div
                className="inspection-mobile-detail-drawer-body inspection-fire-extinguisher-detail-drawer-body d-grid"
                data-fire-extinguisher-detail-drawer-row-id={mobileDetailRow.id}
              >
                <div className="inspection-fire-extinguisher-detail-drawer-summary small text-body-secondary">
                  {[
                    formatFireExtinguisherMeta(mobileDraftRow || mobileDetailRow),
                    formatFireExtinguisherCertification(mobileDraftRow || mobileDetailRow),
                  ]
                    .filter(Boolean)
                    .join(' | ')}
                </div>
                <FireExtinguisherRowDetails
                  row={mobileDraftRow || mobileDetailRow}
                  readOnly={mobileDetailReadOnly}
                  missingStatusKeys={
                    validationState?.fireExtinguisher?.missingStatusesByRow?.[mobileDetailRowId] ||
                    []
                  }
                  missingRemarkKeys={
                    validationState?.fireExtinguisher?.missingRemarksByRow?.[mobileDetailRowId] ||
                    []
                  }
                  missingPhotoKeys={
                    validationState?.fireExtinguisher?.missingPhotosByRow?.[mobileDetailRowId] || []
                  }
                  onViewPhotos={setPhotoViewer}
                  handlers={buildMobileDraftHandlers()}
                />
              </div>
              {!mobileDetailReadOnly ? (
                <InspectionElementDrawerFooter
                  statusText={mobileSaveStatus}
                  dirty={mobileDraftDirty}
                  saving={isSavingMobileRow}
                  onCancel={requestCloseMobileDetailDrawer}
                  onSave={saveMobileDraftRow}
                />
              ) : null}
            </>
          )}
        </InspectionItemDrawer>
      ) : null}

      <FormFieldError>
        {fieldError ? 'Complete all fire extinguisher statuses before review.' : ''}
      </FormFieldError>
      <FormFieldError>
        {remarksError
          ? 'Add remarks and photos for every defect or failed extinguisher status.'
          : ''}
      </FormFieldError>

      {showSkeletonRows ? (
        <div
          className="inspection-hydraulic-card-grid inspection-check-card-grid--managed inspection-fire-extinguisher-card-stack"
          aria-label="Loading extinguisher units"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={`fire-extinguisher-loading-${index}`}
              className="inspection-fire-extinguisher-loading-card rounded-3 border bg-body"
            >
              <div className="inspection-loading-line inspection-loading-line--title" />
              <div className="inspection-loading-line inspection-loading-line--wide" />
            </div>
          ))}
        </div>
      ) : rows.length > 0 ? (
        <div className="inspection-hydraulic-card-grid inspection-check-card-grid--managed inspection-fire-extinguisher-card-stack">
          {rows.map((row) => {
            const rowId = text(row.id)
            const rowReadOnly = readOnly
            const expanded =
              rowReadOnly ||
              (!useMobileDrawer &&
                (expandedRowId === rowId ||
                  activeRowId === rowId ||
                  initialExpandedRowId === rowId))
            return (
              <FireExtinguisherRowCard
                key={row.id}
                row={row}
                readOnly={rowReadOnly}
                expanded={expanded}
                interactionMode={useMobileDrawer && !readOnly ? 'drawer' : 'inline'}
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
                  if (useMobileDrawer && !readOnly) {
                    openMobileDetailDrawer(nextRow)
                    return
                  }
                  const isOpen = expandedRowId === nextRowId || activeRowId === nextRowId
                  setExpandedRowId(isOpen ? '' : nextRowId)
                  setActiveRowId(isOpen ? NO_AUTO_EXPAND_ROW_ID : nextRowId)
                }}
                onViewPhotos={setPhotoViewer}
                handlers={{
                  ...handlers,
                  onResetCheck: requestResetRow,
                  onEditExtinguisher: (nextRow) => setEditingRow(nextRow),
                }}
              />
            )
          })}
        </div>
      ) : (
        <div className="rounded-3 border bg-light-subtle p-3 d-grid gap-2 text-body-secondary">
          <div>{emptyStateMessage}</div>
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
      <InspectionResetConfirmDrawer
        visible={Boolean(resetTarget)}
        row={resetTarget?.row}
        fallbackLabel="this extinguisher"
        onClose={() => setResetTarget(null)}
        onConfirm={confirmResetRow}
      />
      <ActionConfirmModal
        visible={Boolean(pendingDiscardAction)}
        title="Discard unsaved changes?"
        message="Your extinguisher changes have not been saved."
        confirmLabel="Discard changes"
        confirmColor="danger"
        cancelLabel="Keep editing"
        mobileDrawer
        onClose={() => setPendingDiscardAction('')}
        onConfirm={discardMobileDraftChanges}
      />
    </div>
  )
}

const FireExtinguisherInspectionChecks = ({
  readOnly = false,
  mainLocation,
  mainLocationLabel,
  form = {},
  summary,
  fieldErrors = {},
  validationState = null,
  isLoadingRows = false,
  draftStatus = '',
  handlers = {},
}) => {
  const isFocusedScanMode =
    text(form.fireExtinguisherEntryMode) === 'scan' && text(form.fireExtinguisherFocusedAssetKey)

  return (
    <FireExtinguisherListView
      readOnly={readOnly}
      zone={form.zone}
      mainLocation={mainLocation}
      subLocation={form.subLocation}
      mainLocationLabel={mainLocationLabel}
      isLoadingRows={isLoadingRows}
      draftStatus={draftStatus}
      summary={summary}
      handlers={handlers}
      validationState={validationState}
      fieldError={fieldErrors.fireExtinguisherChecks}
      remarksError={fieldErrors.fireExtinguisherRemarks}
      isFocusedScanMode={Boolean(isFocusedScanMode)}
    />
  )
}

export const FireExtinguisherEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  validationState = null,
  isLoadingRows = false,
  draftStatus = '',
  handlers = {},
}) => (
  <FireExtinguisherInspectionChecks
    form={form}
    mainLocation={mainLocation}
    mainLocationLabel={mainLocationLabel}
    summary={summary}
    fieldErrors={fieldErrors}
    isLoadingRows={isLoadingRows}
    draftStatus={draftStatus}
    handlers={handlers}
    validationState={validationState}
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
      form={form}
      mainLocation={mainLocation}
      mainLocationLabel={mainLocationLabel}
      summary={summary}
    />
  </div>
)

export const buildFireExtinguisherDetailFindingItems = (form = {}, summary = null) => {
  const visibleChecks = Array.isArray(summary?.visibleChecks) ? summary.visibleChecks : []
  return visibleChecks.map((row) => ({
    key: text(row.id) || getFireExtinguisherRowTitle(row),
    groupLabel: [text(row.zone), text(row.mainLocation), text(row.subLocation)]
      .filter(Boolean)
      .join(' > '),
    title: getFireExtinguisherRowTitle(row),
    badges: getFireExtinguisherDetailBadges(row),
    summaryLines: getFireExtinguisherDetailSummaryLines(row),
    row,
  }))
}

export const renderFireExtinguisherDetailFindingContent = (item) => {
  const row = item?.row
  if (!row) return null
  return (
    <div className="inspection-form-section d-grid gap-3">
      <FireExtinguisherRowDetails readOnly row={row} />
    </div>
  )
}
