import React, { useMemo, useState } from 'react'
import { CButton } from '@coreui/react'
import InspectionItemDrawer from './InspectionItemDrawer'
import CreateActionButton from 'src/components/CreateActionButton'
import RowActions from 'src/components/RowActions'
import useMediaQuery from 'src/hooks/useMediaQuery'
import { HYDRAULIC_CHECK_FIELDS } from 'src/views/inspection/types/hydraulic/helpers'
import { getActionCountLabel } from '../inspectionCountLabels'
import { buildStagedPhotoUploadOptions } from '../inspectionPhotoFlow'
import {
  buildInspectionPhotoListPatch,
  mergeInspectionPhotoLists,
  removePhotoById,
  updatePhotoDescriptionById,
} from '../inspectionPhotoUtils'
import {
  FormFieldError,
  InspectionPhotoViewerModal,
  ManagedCheckToolbar,
  rowContainsSearch,
} from './InspectionDisplayShared'
import { InspectionElementDrawerFooter } from './InspectionElementUi'
import { hasHydraulicInspectionData } from '../inspectionResetActions'
import HydraulicEquipmentCheckCard, {
  HydraulicEquipmentCheckDetails,
} from './HydraulicEquipmentCheckCard'
import InspectionResetConfirmDrawer from './InspectionResetConfirmDrawer'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'

const cloneRow = (row) => (row ? JSON.parse(JSON.stringify(row)) : null)
const getRowSignature = (row) => JSON.stringify(row || {})

export const HydraulicEquipmentChecks = ({
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
  const [search, setSearch] = useState('')
  const [expandedGeneralRemarks, setExpandedGeneralRemarks] = useState({})
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
  const filteredChecks = visibleChecks.filter((row) =>
    rowContainsSearch(
      row,
      [
        'equipment',
        'equipmentDescription',
        'physicalCondition',
        'mechanicalCondition',
        'noLeakage',
        'functionTest',
        'remarks',
      ],
      search,
    ),
  )

  const checksById = useMemo(
    () => new Map((checks || []).map((check) => [String(check.id || ''), check])),
    [checks],
  )
  const mobileDetailRow = mobileDetailRowId
    ? visibleChecks.find((row) => String(row.id || '') === mobileDetailRowId) || null
    : null
  const mobileDetailCurrent = mobileDetailRow
    ? { ...mobileDetailRow, ...(checksById.get(String(mobileDetailRow.id || '')) || {}) }
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

  const openMobileDetailDrawer = (row, current) => {
    const rowId = String(row?.id || '')
    if (!rowId) return
    const nextDraft = cloneRow(current || row)
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
    onRequestDefectPhotoUpload: (row, field, options = {}) =>
      onRequestDefectPhotoUpload?.(
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
          currentPhotos.map((photo) =>
            String(photo?.id || '') === String(photoId || '')
              ? { ...photo, description: [photo.description, caption].filter(Boolean).join('\n') }
              : photo,
          ),
        ),
      ),
  }

  if (!mainLocation && visibleChecks.length === 0 && !isLoadingRows) return null

  if (visibleChecks.length === 0) {
    return (
      <div className="d-grid gap-2">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="fw-semibold text-muted">Equipment</div>
          {!readOnly ? (
            <CreateActionButton
              label={`Add equipment (${countLabel})`}
              className="inspection-compact-action-btn"
              onClick={onAddEquipment}
            />
          ) : null}
        </div>
        {isLoadingRows ? (
          <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
            Loading equipment...
          </div>
        ) : (
          <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
            No hydraulic equipment has been added for this location.
          </div>
        )}
      </div>
    )
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

      {!readOnly ? (
        <ManagedCheckToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search hydraulic equipment..."
          searchLabel="Search hydraulic equipment rows"
          onClearSearch={() => setSearch('')}
          clearSearchLabel="Clear hydraulic equipment row search"
          resultCount={filteredChecks.length}
          totalCount={visibleChecks.length}
        />
      ) : null}

      {filteredChecks.length === 0 ? (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          {search
            ? 'No hydraulic equipment rows match this search.'
            : 'No hydraulic equipment has been added for this location.'}
        </div>
      ) : null}

      {filteredChecks.length > 0 ? (
        <div className="inspection-hydraulic-card-grid inspection-check-card-grid--managed inspection-fire-extinguisher-card-stack">
          {filteredChecks.map((row) => {
            const current = { ...row, ...(checksById.get(String(row.id || '')) || {}) }
            return (
              <HydraulicEquipmentCheckCard
                key={row.id || row.equipment}
                row={row}
                current={current}
                expandedGeneralRemarks={expandedGeneralRemarks}
                setExpandedGeneralRemarks={setExpandedGeneralRemarks}
                setPhotoViewer={setPhotoViewer}
                onUpdateCheck={onUpdateCheck}
                onResetCheck={requestResetCheck}
                onMarkEquipmentOk={onMarkEquipmentOk}
                onRequestPhotoUpload={onRequestPhotoUpload}
                onRequestDefectPhotoUpload={onRequestDefectPhotoUpload}
                onRemovePhoto={onRemovePhoto}
                onChangePhotoDescription={onChangePhotoDescription}
                onApplyPhotoCaption={onApplyPhotoCaption}
                onEditEquipment={onEditEquipment}
                onDeleteEquipment={onDeleteEquipment}
                remarksError={remarksError}
                readOnly={readOnly}
                showBody={!useMobileDrawer || readOnly}
                active={useMobileDrawer && mobileDetailRowId === String(row.id || '')}
                interactionMode={useMobileDrawer && !readOnly ? 'drawer' : 'inline'}
                onOpenDetails={
                  useMobileDrawer && !readOnly
                    ? (nextRow) => openMobileDetailDrawer(nextRow, current)
                    : undefined
                }
              />
            )
          })}
        </div>
      ) : null}

      {useMobileDrawer && mobileDetailRow && mobileDetailCurrent ? (
        <InspectionItemDrawer
          visible
          itemTitle={mobileDetailRow.equipment || 'Equipment'}
          bodyClassName="inspection-equipment-detail-drawer-shell"
          headerAction={
            !readOnly ? (
              <RowActions
                iconSize={16}
                hitArea={44}
                toggleAriaLabel={`Equipment actions for ${mobileDetailRow.equipment || 'Equipment'}`}
                items={[
                  mobileDetailRow.canEdit && mobileDetailRow.equipmentId
                    ? {
                        key: 'edit',
                        label: 'Edit equipment details',
                        disabled: mobileDraftDirty,
                        disabledReason: mobileDraftDirty ? 'Save or cancel changes first.' : '',
                        onClick: () => {
                          onEditEquipment?.(mobileDetailRow)
                          closeMobileDetailDrawer()
                        },
                      }
                    : null,
                  typeof onResetCheck === 'function' &&
                  hasHydraulicInspectionData(
                    mobileDraftRow || mobileDetailRow,
                    HYDRAULIC_CHECK_FIELDS,
                  )
                    ? {
                        key: 'reset',
                        label: 'Clear inspection answers',
                        className: 'text-danger',
                        onClick: () =>
                          requestResetCheck(mobileDetailRow, {
                            onAfterConfirm: closeMobileDetailDrawer,
                          }),
                      }
                    : null,
                  mobileDetailRow.canDelete &&
                  (mobileDetailRow.isCustomEquipment ||
                    mobileDetailRow.equipmentSource === 'custom') &&
                  mobileDetailRow.equipmentId
                    ? {
                        key: 'delete',
                        label: 'Delete custom item',
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
            {!readOnly && typeof onMarkEquipmentOk === 'function' ? (
              <div className="d-flex justify-content-end">
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  size="sm"
                  className="inspection-compact-action-btn"
                  disabled={mobileDraftDirty}
                  onClick={() => onMarkEquipmentOk(mobileDetailRow)}
                >
                  All OK
                </CButton>
              </div>
            ) : null}
            <HydraulicEquipmentCheckDetails
              row={mobileDraftRow || mobileDetailRow}
              current={mobileDraftRow || mobileDetailCurrent}
              expandedGeneralRemarks={expandedGeneralRemarks}
              setExpandedGeneralRemarks={setExpandedGeneralRemarks}
              setPhotoViewer={setPhotoViewer}
              onUpdateCheck={mobileDraftHandlers.onUpdateCheck}
              onRequestPhotoUpload={mobileDraftHandlers.onRequestPhotoUpload}
              onRequestDefectPhotoUpload={mobileDraftHandlers.onRequestDefectPhotoUpload}
              onRemovePhoto={mobileDraftHandlers.onRemovePhoto}
              onChangePhotoDescription={mobileDraftHandlers.onChangePhotoDescription}
              onApplyPhotoCaption={mobileDraftHandlers.onApplyPhotoCaption}
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
        </InspectionItemDrawer>
      ) : null}

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
      <InspectionResetConfirmDrawer
        visible={Boolean(resetTarget)}
        row={resetTarget?.row}
        fallbackLabel="this equipment"
        onClose={() => setResetTarget(null)}
        onConfirm={confirmResetCheck}
      />
      <ActionConfirmModal
        visible={showDiscardChanges}
        title="Discard unsaved changes?"
        message="Your hydraulic equipment changes have not been saved."
        confirmLabel="Discard changes"
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
