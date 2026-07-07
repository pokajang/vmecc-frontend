import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CFormInput } from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import RowActions from 'src/components/RowActions'
import useMediaQuery from 'src/hooks/useMediaQuery'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { formatHighAngleGroupLabel } from 'src/views/inspection/types/high-angle/helpers'
import { appendInspectionText } from '../inspectionFormHelpers'
import { hasHighAngleInspectionData } from '../inspectionResetActions'
import {
  applyPhotoCaptionById,
  removePhotoById,
  updatePhotoDescriptionById,
} from '../inspectionPhotoUtils'
import {
  FormFieldError,
  InspectionPhotoViewerModal,
  rowContainsSearch,
} from './InspectionDisplayShared'
import HighAngleInspectionRowCard, {
  HighAngleInspectionRowDetails,
} from './HighAngleInspectionRowCard'
import HighAngleCustomRecordModal from './HighAngleCustomRecordModal'
import InspectionResetConfirmDrawer from './InspectionResetConfirmDrawer'
import { InspectionElementDrawerFooter } from './InspectionElementUi'
import { InspectionMobileCollapsedSelectorRow } from './InspectionSetupSelectorControls'

const text = (value) => String(value || '').trim()

const getHighAngleRowId = (row = {}) =>
  text(row.id) || `${text(row.mainLocation)}:${text(row.rowNumber)}`

const cloneRow = (row) => (row ? JSON.parse(JSON.stringify(row)) : null)

const getRowSignature = (row) => JSON.stringify(row || {})

const stripHighAngleDisplayMeta = (row = {}) => {
  const { groupKey, groupTitle, ...sourceRow } = row
  return sourceRow
}

const buildHighAngleDraftPatch = (row = {}) => ({
  condition: String(row.condition || ''),
  remarks: String(row.remarks || ''),
  conditionRemarks: String(row.conditionRemarks || row.remarks || ''),
  conditionPhotos: Array.isArray(row.conditionPhotos) ? row.conditionPhotos : [],
  additionalNotes: String(row.additionalNotes || ''),
  additionalPhotos: Array.isArray(row.additionalPhotos) ? row.additionalPhotos : [],
})

const DEFAULT_ROW_CLOSED_KEY = '__default_row_closed__'

const isHighAngleRowIncomplete = (row = {}) =>
  !text(row.condition) ||
  (text(row.condition) === 'Not Good' && !text(row.conditionRemarks || row.remarks))

const withGroupMeta = (row, group) => ({
  ...row,
  groupKey: group.key,
  groupTitle: group.title || formatHighAngleGroupLabel(row),
})

export const HighAngleInspectionChecks = ({
  mainLocation,
  summary,
  onUpdateCheck,
  onSaveRowDraft,
  onResetCheck,
  onAddCompartment,
  onUpdateCompartment,
  onDeleteCompartment,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  fieldError = false,
  remarksError = false,
  readOnly = false,
}) => {
  const visibleGroups = useMemo(() => summary?.visibleGroups || [], [summary?.visibleGroups])
  const [search, setSearch] = useState('')
  const [expandedRowIds, setExpandedRowIds] = useState(() => new Set())
  const [activeRowId, setActiveRowId] = useState('')
  const [selectedGroupKey, setSelectedGroupKey] = useState('')
  const [modalState, setModalState] = useState({ type: '', record: null })
  const [mobileDetailRowId, setMobileDetailRowId] = useState('')
  const [mobileDraftRow, setMobileDraftRow] = useState(null)
  const [mobileDraftBaseRow, setMobileDraftBaseRow] = useState(null)
  const [mobileSaveStatus, setMobileSaveStatus] = useState('')
  const [photoViewer, setPhotoViewer] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [deleteItemTarget, setDeleteItemTarget] = useState(null)
  const [showDiscardChanges, setShowDiscardChanges] = useState(false)
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')

  const allRows = useMemo(
    () =>
      visibleGroups.flatMap((group) => (group.rows || []).map((row) => withGroupMeta(row, group))),
    [visibleGroups],
  )
  const selectedGroup = useMemo(
    () => visibleGroups.find((group) => group.key === selectedGroupKey) || null,
    [selectedGroupKey, visibleGroups],
  )
  const filteredGroups = useMemo(() => {
    const groupsForRows = readOnly ? visibleGroups : selectedGroup ? [selectedGroup] : []
    return groupsForRows
      .map((group) => ({
        ...group,
        rows: (group.rows || [])
          .filter((row) =>
            rowContainsSearch(
              row,
              ['equipment', 'location', 'subLocation', 'condition', 'remarks', 'rowNumber'],
              search,
            ),
          )
          .map((row) => withGroupMeta(row, group)),
      }))
      .filter((group) => !search || group.rows.length > 0)
  }, [readOnly, search, selectedGroup, visibleGroups])

  const totalFilteredRows = filteredGroups.reduce((count, group) => count + group.rows.length, 0)
  const totalRows = allRows.length
  const defaultExpandedRowId = useMemo(() => {
    if (readOnly || allRows.length === 0) return ''
    return getHighAngleRowId(allRows.find(isHighAngleRowIncomplete) || allRows[0])
  }, [allRows, readOnly])
  const mobileDetailRow = mobileDetailRowId
    ? allRows.find((row) => getHighAngleRowId(row) === mobileDetailRowId) || null
    : null
  const mobileDraftDirty =
    Boolean(mobileDraftRow) &&
    getRowSignature(stripHighAngleDisplayMeta(mobileDraftRow)) !==
      getRowSignature(stripHighAngleDisplayMeta(mobileDraftBaseRow))

  const openCompartmentModal = (record = null) => {
    setModalState({ type: 'compartment', record })
  }

  const openItemModal = (record = null) => {
    setModalState({ type: 'item', record })
  }

  const closeModal = () => setModalState({ type: '', record: null })

  const saveModal = (draft) => {
    if (modalState.type === 'compartment') {
      const payload = {
        ...draft,
        mainLocation,
      }
      if (modalState.record) {
        onUpdateCompartment?.(modalState.record, payload)
      } else {
        onAddCompartment?.(payload)
      }
      closeModal()
      return
    }

    if (modalState.type === 'item' && selectedGroup) {
      const payload = {
        ...draft,
        mainLocation,
        location: selectedGroup.location,
        subLocation: selectedGroup.subLocation,
      }
      if (modalState.record) {
        onUpdateItem?.(modalState.record, payload)
      } else {
        onAddItem?.(payload)
      }
      closeModal()
    }
  }

  const closeMobileDetailDrawer = useCallback(() => {
    setMobileDetailRowId('')
    setActiveRowId('')
    setMobileDraftRow(null)
    setMobileDraftBaseRow(null)
    setMobileSaveStatus('')
  }, [])

  const requestCloseMobileDetailDrawer = useCallback(() => {
    if (mobileDraftDirty) {
      setShowDiscardChanges(true)
      return
    }
    closeMobileDetailDrawer()
  }, [closeMobileDetailDrawer, mobileDraftDirty])

  const openMobileDetailDrawer = useCallback((row) => {
    const nextRowId = getHighAngleRowId(row)
    if (!nextRowId) return
    const nextDraft = cloneRow(row)
    setMobileDraftRow(nextDraft)
    setMobileDraftBaseRow(cloneRow(row))
    setMobileSaveStatus('')
    setMobileDetailRowId(nextRowId)
    setActiveRowId(nextRowId)
  }, [])

  const patchMobileDraftRow = useCallback((patch) => {
    setMobileDraftRow((current) => (current ? { ...current, ...patch } : current))
    setMobileSaveStatus('Unsaved changes')
  }, [])

  const buildMobileDraftHandlers = useCallback(
    () => ({
      onUpdateCheck: (_row, patch) => patchMobileDraftRow(patch),
      onRequestIssuePhotoUpload: (row) =>
        onRequestIssuePhotoUpload?.(row, {
          onAddPhotos: (_targetRow, photosKey, photos) =>
            patchMobileDraftRow({ [photosKey]: photos }),
        }),
      onRequestPhotoUpload: (row, photosKey = 'additionalPhotos') =>
        onRequestIssuePhotoUpload?.(row, {
          photosKey,
          onAddPhotos: (_targetRow, nextPhotosKey, photos) =>
            patchMobileDraftRow({ [nextPhotosKey]: photos }),
        }),
      onRemovePhoto: (row, photoId, photosKey) => {
        const currentPhotos = Array.isArray(row?.[photosKey]) ? row[photosKey] : []
        patchMobileDraftRow({ [photosKey]: removePhotoById(currentPhotos, photoId) })
      },
      onChangePhotoDescription: (row, photoId, description, photosKey) => {
        const currentPhotos = Array.isArray(row?.[photosKey]) ? row[photosKey] : []
        patchMobileDraftRow({
          [photosKey]: updatePhotoDescriptionById(currentPhotos, photoId, description),
        })
      },
      onApplyPhotoCaption: (row, photoId, caption, photosKey) => {
        const currentPhotos = Array.isArray(row?.[photosKey]) ? row[photosKey] : []
        patchMobileDraftRow({
          [photosKey]: applyPhotoCaptionById(currentPhotos, photoId, caption, appendInspectionText),
        })
      },
    }),
    [onRequestIssuePhotoUpload, patchMobileDraftRow],
  )

  const saveMobileDraftRow = useCallback(() => {
    if (!mobileDraftRow || !mobileDraftDirty) return
    const baseRow = stripHighAngleDisplayMeta(mobileDraftBaseRow || mobileDraftRow)
    const patch = buildHighAngleDraftPatch(mobileDraftRow)
    const result =
      typeof onSaveRowDraft === 'function'
        ? onSaveRowDraft(baseRow, patch)
        : onUpdateCheck?.(baseRow, patch)
    if (result === false) {
      setMobileSaveStatus('Sync pending')
      return
    }
    setMobileSaveStatus('Saved')
    closeMobileDetailDrawer()
  }, [
    closeMobileDetailDrawer,
    mobileDraftBaseRow,
    mobileDraftDirty,
    mobileDraftRow,
    onSaveRowDraft,
    onUpdateCheck,
  ])
  const mobileDraftHandlers = useMemo(() => buildMobileDraftHandlers(), [buildMobileDraftHandlers])

  const requestResetCheck = useCallback((row, options = {}) => {
    if (!row) return
    setResetTarget({ row, ...options })
  }, [])

  const confirmResetCheck = useCallback(() => {
    if (!resetTarget?.row) return
    onResetCheck?.(resetTarget.row)
    resetTarget.onAfterConfirm?.()
    setResetTarget(null)
  }, [onResetCheck, resetTarget])

  const requestDeleteItem = useCallback((row) => {
    if (!row) return
    setDeleteItemTarget(row)
  }, [])

  const confirmDeleteItem = useCallback(() => {
    if (!deleteItemTarget) return
    onDeleteItem?.(deleteItemTarget)
    setDeleteItemTarget(null)
  }, [deleteItemTarget, onDeleteItem])

  const showEquipmentRows = readOnly || Boolean(selectedGroup)
  const canAddCompartment = !readOnly && typeof onAddCompartment === 'function'
  const canAddItem = !readOnly && selectedGroup && typeof onAddItem === 'function'
  const selectedCompartmentKey = selectedGroup?.key || ''

  if (!mainLocation && visibleGroups.length === 0) return null

  return (
    <div className="d-grid gap-3">
      {!readOnly ? (
        <div className="d-grid gap-3">
          {selectedGroup && useMobileDrawer ? (
            <InspectionMobileCollapsedSelectorRow
              label="Compartment"
              value={selectedGroup.title}
              resetLabel="Reset compartment"
              editLabel={selectedGroup.custom ? 'Edit compartment' : 'Change compartment'}
              onReset={() => {
                setSelectedGroupKey('')
                setSearch('')
              }}
              onEdit={() => {
                if (selectedGroup.custom) {
                  openCompartmentModal(selectedGroup)
                  return
                }
                setSelectedGroupKey('')
                setSearch('')
              }}
            />
          ) : (
            <>
              <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="fw-semibold text-muted">
                  {selectedGroup && !useMobileDrawer ? 'Compartments' : 'Choose Compartment'}
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  {selectedGroup?.custom && !useMobileDrawer ? (
                    <CreateActionButton
                      label="Edit compartment"
                      className="inspection-compact-action-btn"
                      onClick={() => openCompartmentModal(selectedGroup)}
                    />
                  ) : null}
                  {canAddCompartment ? (
                    <CreateActionButton
                      label="Add compartment"
                      className="inspection-compact-action-btn"
                      onClick={() => openCompartmentModal()}
                    />
                  ) : null}
                </div>
              </div>
              {visibleGroups.length > 0 ? (
                <div className="row g-3">
                  {visibleGroups.map((group) => {
                    const isSelected = selectedCompartmentKey === group.key
                    return (
                      <div key={group.key} className="col-12 col-md-6">
                        <button
                          type="button"
                          className={`inspection-location-option-card w-100 rounded-3 border bg-white p-3 text-start${
                            isSelected ? ' border-primary shadow-sm' : ''
                          }`}
                          aria-pressed={isSelected}
                          onClick={() => {
                            setSelectedGroupKey(group.key)
                            setSearch('')
                          }}
                        >
                          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            <div className="fw-semibold text-break">{group.title}</div>
                            <span className="small text-body-secondary">
                              {(group.rows || []).length} item
                              {(group.rows || []).length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
                  No compartments have been added for this main location.
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      {showEquipmentRows ? (
        <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="fw-semibold text-muted">Equipment</div>
          </div>
          {canAddItem ? (
            <CreateActionButton
              label="Add item"
              className="inspection-compact-action-btn"
              onClick={() => openItemModal()}
            />
          ) : null}
        </div>
      ) : null}

      {showEquipmentRows && !readOnly ? (
        <div className="inspection-check-toolbar">
          <CFormInput
            size="sm"
            className="inspection-search-input"
            value={search}
            placeholder="Search high angle equipment..."
            aria-label="Search high angle equipment rows"
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="inspection-check-toolbar__actions">
            {search ? (
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                className="inspection-compact-action-btn"
                aria-label="Clear high angle equipment row search"
                onClick={() => setSearch('')}
              >
                Clear
              </CButton>
            ) : null}
          </div>
          {search ? (
            <div className="small text-body-secondary">
              Showing {totalFilteredRows} of {totalRows}
            </div>
          ) : null}
        </div>
      ) : null}

      {showEquipmentRows && filteredGroups.length > 0 ? (
        <div className="inspection-hydraulic-card-grid inspection-check-card-grid--managed inspection-fire-extinguisher-card-stack inspection-high-angle-card-stack">
          {filteredGroups.flatMap((group) => [
            ...(readOnly
              ? [
                  <div
                    key={`${group.key}-heading`}
                    className="inspection-high-angle-group-heading d-flex flex-wrap align-items-center justify-content-between gap-2"
                    data-inspection-high-angle-group-id={group.key}
                  >
                    <div className="d-grid gap-1" style={{ minWidth: 0 }}>
                      <div className="fw-semibold text-muted text-break">{group.title}</div>
                      {group.subLocation ? (
                        <div className="small text-body-secondary text-break">
                          {group.subLocation}
                        </div>
                      ) : null}
                    </div>
                  </div>,
                ]
              : []),
            ...group.rows.map((row) => {
              const rowId = getHighAngleRowId(row)
              const defaultExpanded = expandedRowIds.size === 0 && rowId === defaultExpandedRowId
              const expanded =
                readOnly || (!useMobileDrawer && (expandedRowIds.has(rowId) || defaultExpanded))
              return (
                <HighAngleInspectionRowCard
                  key={rowId}
                  row={row}
                  readOnly={readOnly}
                  remarksError={remarksError}
                  setPhotoViewer={setPhotoViewer}
                  onUpdateCheck={onUpdateCheck}
                  onResetCheck={requestResetCheck}
                  onRequestPhotoUpload={(nextRow, photosKey = 'additionalPhotos') =>
                    onRequestIssuePhotoUpload?.(nextRow, { photosKey })
                  }
                  onRequestIssuePhotoUpload={onRequestIssuePhotoUpload}
                  onRemovePhoto={onRemovePhoto}
                  onChangePhotoDescription={onChangePhotoDescription}
                  onApplyPhotoCaption={onApplyPhotoCaption}
                  onEditItem={onUpdateItem ? openItemModal : undefined}
                  onDeleteItem={onDeleteItem ? requestDeleteItem : undefined}
                  expanded={expanded}
                  active={
                    activeRowId === rowId ||
                    mobileDetailRowId === rowId ||
                    (!activeRowId && defaultExpanded)
                  }
                  onToggleExpanded={(nextRow) => {
                    const nextRowId = getHighAngleRowId(nextRow)
                    if (!nextRowId) return
                    if (useMobileDrawer && !readOnly) {
                      openMobileDetailDrawer(nextRow)
                      return
                    }
                    setExpandedRowIds((current) => {
                      const next = new Set(current)
                      const isDefaultOpen = current.size === 0 && nextRowId === defaultExpandedRowId
                      if (isDefaultOpen) next.add(DEFAULT_ROW_CLOSED_KEY)
                      else if (next.has(nextRowId)) next.delete(nextRowId)
                      else next.add(nextRowId)
                      return next
                    })
                    setActiveRowId((current) => (current === nextRowId ? '' : nextRowId))
                  }}
                />
              )
            }),
          ])}
        </div>
      ) : showEquipmentRows ? (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          {search
            ? 'No high angle equipment rows match this search.'
            : 'No items in this compartment.'}
        </div>
      ) : null}

      {useMobileDrawer && mobileDetailRow ? (
        <MobileBottomDrawer
          visible
          title={mobileDetailRow.equipment || 'Equipment'}
          bodyClassName="inspection-equipment-detail-drawer-shell"
          headerAction={
            !readOnly ? (
              <RowActions
                iconSize={16}
                hitArea={32}
                toggleAriaLabel={`High angle actions for ${mobileDetailRow.equipment || 'Equipment'}`}
                items={[
                  typeof onResetCheck === 'function' && hasHighAngleInspectionData(mobileDetailRow)
                    ? {
                        key: 'reset',
                        label: 'Reset check',
                        className: 'text-danger',
                        onClick: () =>
                          requestResetCheck(stripHighAngleDisplayMeta(mobileDetailRow), {
                            onAfterConfirm: closeMobileDetailDrawer,
                          }),
                      }
                    : null,
                  (mobileDetailRow.isExtensionRow === true ||
                    mobileDetailRow.equipmentSource === 'custom') &&
                  typeof onUpdateItem === 'function'
                    ? {
                        key: 'edit',
                        label: 'Edit',
                        disabled: mobileDraftDirty,
                        disabledReason: mobileDraftDirty ? 'Save or cancel changes first.' : '',
                        onClick: () => {
                          openItemModal(stripHighAngleDisplayMeta(mobileDetailRow))
                          closeMobileDetailDrawer()
                        },
                      }
                    : null,
                  (mobileDetailRow.isExtensionRow === true ||
                    mobileDetailRow.equipmentSource === 'custom') &&
                  typeof onDeleteItem === 'function'
                    ? {
                        key: 'delete',
                        label: 'Delete',
                        className: 'text-danger',
                        disabled: mobileDraftDirty,
                        disabledReason: mobileDraftDirty ? 'Save or cancel changes first.' : '',
                        onClick: () => {
                          requestDeleteItem(stripHighAngleDisplayMeta(mobileDetailRow))
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
          <>
            <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
              <div className="inspection-equipment-detail-drawer-summary small text-body-secondary">
                Row {mobileDetailRow.rowNumber || '--'} - Qty {mobileDetailRow.quantity || '--'}
                {formatHighAngleGroupLabel(mobileDetailRow)
                  ? ` | ${formatHighAngleGroupLabel(mobileDetailRow)}`
                  : ''}
              </div>
              <HighAngleInspectionRowDetails
                row={mobileDraftRow || mobileDetailRow}
                readOnly={readOnly}
                remarksError={remarksError}
                setPhotoViewer={setPhotoViewer}
                onUpdateCheck={mobileDraftHandlers.onUpdateCheck}
                onRequestPhotoUpload={mobileDraftHandlers.onRequestPhotoUpload}
                onRequestIssuePhotoUpload={mobileDraftHandlers.onRequestIssuePhotoUpload}
                onRemovePhoto={mobileDraftHandlers.onRemovePhoto}
                onChangePhotoDescription={mobileDraftHandlers.onChangePhotoDescription}
                onApplyPhotoCaption={mobileDraftHandlers.onApplyPhotoCaption}
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
          </>
        </MobileBottomDrawer>
      ) : null}

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
      <HighAngleCustomRecordModal
        key={`${modalState.type}:${modalState.record?.id || ''}:${selectedGroup?.key || ''}`}
        visible={Boolean(modalState.type)}
        mode={modalState.type === 'item' ? 'item' : 'compartment'}
        record={modalState.record}
        mainLocation={mainLocation}
        compartment={selectedGroup}
        useDrawer={useMobileDrawer}
        onClose={closeModal}
        onSave={saveModal}
      />
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
      <ActionConfirmModal
        visible={Boolean(deleteItemTarget)}
        title="Delete Item"
        message={
          deleteItemTarget?.equipment
            ? `Delete "${deleteItemTarget.equipment}"?`
            : 'Delete this item?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        mobileDrawer
        onClose={() => setDeleteItemTarget(null)}
        onConfirm={confirmDeleteItem}
      />
      <ActionConfirmModal
        visible={showDiscardChanges}
        title="Discard changes?"
        message="Your high angle item changes have not been saved."
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
      {resetTarget ? (
        <InspectionResetConfirmDrawer
          visible
          row={resetTarget.row}
          fallbackLabel="this equipment"
          onClose={() => setResetTarget(null)}
          onConfirm={confirmResetCheck}
        />
      ) : null}
    </div>
  )
}
