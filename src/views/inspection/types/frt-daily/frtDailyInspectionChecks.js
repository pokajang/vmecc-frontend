import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormLabel,
  CFormSelect,
} from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import {
  FormFieldError,
  InspectionPhotoViewerModal,
  ManagedCheckToolbar,
  rowContainsSearch,
} from 'src/views/inspection/form/components/InspectionDisplayShared'
import FrtSectionCards from './frtDailySectionCards'

export const FrtDailyInspectionChecks = ({
  mainLocation,
  mainLocationLabel,
  summary,
  form = {},
  onUpdateCheck,
  onResetCheck,
  onMarkRowOk,
  onMarkAllOk,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  onSaveFrtRowDraft,
  onAddItem,
  onDeleteItem,
  fieldErrors = {},
  validationState = null,
  draftStatus = '',
  readOnly = false,
}) => {
  const displayTruck = String(mainLocationLabel || mainLocation || '').trim()
  const dailySections = useMemo(
    () => summary?.visibleDailySections || [],
    [summary?.visibleDailySections],
  )
  const oneOffSections = useMemo(
    () => summary?.visibleOneOffSections || [],
    [summary?.visibleOneOffSections],
  )
  const truckReference = summary?.truckReference || form?.frtTruckReference || {}
  const [search, setSearch] = useState('')
  const [photoViewer, setPhotoViewer] = useState(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [deleteItemTarget, setDeleteItemTarget] = useState(null)
  const [newItem, setNewItem] = useState({
    checklistKind: 'daily',
    equipment: '',
    quantity: '',
  })
  const filteredDailySections = dailySections
    .map((section) => ({
      ...section,
      visibleRows: (section.visibleRows || []).filter((row) =>
        rowContainsSearch(
          row,
          ['equipment', 'rowNumber', 'status', 'condition', 'remarks', 'readingValue'],
          search,
        ),
      ),
    }))
    .filter((section) => section.visibleRows.length > 0)
  const filteredOneOffSections = oneOffSections
    .map((section) => ({
      ...section,
      visibleRows: (section.visibleRows || []).filter((row) =>
        rowContainsSearch(row, ['equipment', 'rowNumber', 'condition', 'remarks'], search),
      ),
    }))
    .filter((section) => section.visibleRows.length > 0)
  const filteredDailyRowCount = filteredDailySections.reduce(
    (count, section) => count + section.visibleRows.length,
    0,
  )
  const filteredOneOffRowCount = filteredOneOffSections.reduce(
    (count, section) => count + section.visibleRows.length,
    0,
  )
  const filteredRowCount = filteredDailyRowCount + filteredOneOffRowCount
  const totalRowCount =
    dailySections.reduce((count, section) => count + section.visibleRows.length, 0) +
    oneOffSections.reduce((count, section) => count + section.visibleRows.length, 0)
  const normalizedDraftStatus = String(draftStatus || '').trim()
  const showDesktopDraftStatus = !readOnly && normalizedDraftStatus
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const selectedCompartment = String(summary?.selectedCompartment || form?.subLocation || '').trim()
  const canAddItem = !readOnly && typeof onAddItem === 'function' && selectedCompartment

  const resetNewItem = () => {
    setNewItem({ checklistKind: 'daily', equipment: '', quantity: '' })
  }

  const closeAddItem = () => {
    resetNewItem()
    setShowAddItem(false)
  }

  const submitNewItem = () => {
    const created = onAddItem?.({
      ...newItem,
      compartment: selectedCompartment,
    })
    if (!created) return
    closeAddItem()
  }

  const requestDeleteItem = (row) => {
    if (!row) return
    setDeleteItemTarget(row)
  }

  const confirmDeleteItem = () => {
    if (!deleteItemTarget) return
    onDeleteItem?.(deleteItemTarget)
    setDeleteItemTarget(null)
  }

  useEffect(() => {
    const handleFocusRequest = (event) => {
      const rowId = String(event?.detail?.rowId || '').trim()
      if (!rowId) return
      setSearch('')
    }

    window.addEventListener('inspection:focus-frt-row', handleFocusRequest)
    return () => window.removeEventListener('inspection:focus-frt-row', handleFocusRequest)
  }, [])

  if (!mainLocation && dailySections.length === 0 && oneOffSections.length === 0) return null

  const addItemBody = (
    <div className="row g-3 align-items-end">
      <div className="col-12 col-md-3">
        <CFormLabel htmlFor="frt-new-item-checklist" className="small text-body-secondary">
          Checklist
        </CFormLabel>
        <CFormSelect
          id="frt-new-item-checklist"
          size="sm"
          value={newItem.checklistKind}
          onChange={(event) =>
            setNewItem((current) => ({
              ...current,
              checklistKind: event.target.value,
            }))
          }
        >
          <option value="daily">Daily readiness</option>
          <option value="oneOff">One-off checklist</option>
        </CFormSelect>
      </div>
      <div className="col-12 col-md-5">
        <CFormLabel htmlFor="frt-new-item-name" className="small text-body-secondary">
          Item
        </CFormLabel>
        <CFormInput
          id="frt-new-item-name"
          size="sm"
          value={newItem.equipment}
          placeholder="e.g. SPARE NOZZLE"
          onChange={(event) =>
            setNewItem((current) => ({
              ...current,
              equipment: event.target.value,
            }))
          }
        />
      </div>
      <div className="col-12 col-md-2">
        <CFormLabel htmlFor="frt-new-item-quantity" className="small text-body-secondary">
          Qty
        </CFormLabel>
        <CFormInput
          id="frt-new-item-quantity"
          size="sm"
          value={newItem.quantity}
          disabled={newItem.checklistKind === 'oneOff'}
          placeholder="Optional"
          onChange={(event) =>
            setNewItem((current) => ({
              ...current,
              quantity: event.target.value,
            }))
          }
        />
      </div>
      {!useMobileDrawer ? (
        <div className="col-12 col-md-2 d-flex justify-content-end">
          <CButton
            type="button"
            color="primary"
            size="sm"
            className="inspection-compact-action-btn"
            disabled={!String(newItem.equipment || '').trim()}
            onClick={submitNewItem}
          >
            Add
          </CButton>
        </div>
      ) : null}
    </div>
  )

  const addItemFooter = (
    <div className="mobile-bottom-drawer__footer d-flex align-items-center justify-content-end gap-2">
      <CButton type="button" color="secondary" variant="outline" onClick={closeAddItem}>
        Cancel
      </CButton>
      <CButton
        type="button"
        color="primary"
        disabled={!String(newItem.equipment || '').trim()}
        onClick={submitNewItem}
      >
        Add
      </CButton>
    </div>
  )

  return (
    <div className="d-grid gap-3">
      {readOnly ? (
        <CCard className="inspection-hydraulic-card">
          <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex flex-wrap align-items-center gap-2" style={{ minWidth: 0 }}>
              <div className="fw-semibold text-muted">Truck Details</div>
            </div>
          </CCardHeader>
          <CCardBody className="inspection-hydraulic-card-body d-grid gap-3">
            <div className="row g-3 align-items-end" data-inspection-frt-detail-key="truck">
              {[
                ['Plate No.', truckReference.plateNo || displayTruck],
                ['Truck', truckReference.name],
                ['Road Tax Expiry', truckReference.roadTaxExpiry],
                ['Insurance Expiry', truckReference.insuranceExpiry],
                ['Puspakom Expiry', truckReference.puspakomExpiry],
              ].map(([label, value]) => (
                <div key={label} className="col-6 col-md">
                  <div className="small text-body-secondary">{label}</div>
                  <div className="fw-semibold text-break">{value || '--'}</div>
                </div>
              ))}
            </div>
          </CCardBody>
        </CCard>
      ) : null}

      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">Truck Readiness</div>
          {showDesktopDraftStatus ? (
            <div className="small text-body-secondary d-none d-md-block" aria-live="polite">
              {normalizedDraftStatus === 'Unsaved changes'
                ? 'Unsaved draft changes'
                : normalizedDraftStatus}
            </div>
          ) : null}
        </div>
        {!readOnly ? (
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
            <CreateActionButton
              label="Mark status rows Checked + one-off Good"
              className="inspection-compact-action-btn d-none d-md-inline-flex"
              onClick={onMarkAllOk}
            />
            <CreateActionButton
              label="Add item"
              className="inspection-compact-action-btn"
              disabled={!canAddItem}
              onClick={() => setShowAddItem(true)}
            />
          </div>
        ) : null}
      </div>

      {showAddItem && canAddItem && useMobileDrawer ? (
        <MobileBottomDrawer
          visible
          title={`Add item to ${selectedCompartment}`}
          onClose={closeAddItem}
        >
          <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
            <div className="small text-body-secondary">
              Custom items are saved with this inspection draft.
            </div>
            {addItemBody}
          </div>
          {addItemFooter}
        </MobileBottomDrawer>
      ) : null}

      {showAddItem && canAddItem && !useMobileDrawer ? (
        <CCard className="inspection-hydraulic-card">
          <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <div className="fw-semibold">Add item to {selectedCompartment}</div>
              <div className="small text-body-secondary">
                Custom items are saved with this inspection draft.
              </div>
            </div>
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={closeAddItem}
            >
              Cancel
            </CButton>
          </CCardHeader>
          <CCardBody className="inspection-hydraulic-card-body">{addItemBody}</CCardBody>
        </CCard>
      ) : null}

      {!readOnly ? (
        <ManagedCheckToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search truck readiness rows..."
          searchLabel="Search truck readiness rows"
          onClearSearch={() => setSearch('')}
          clearSearchLabel="Clear truck readiness row search"
          resultCount={filteredRowCount}
          totalCount={totalRowCount}
        />
      ) : null}

      {filteredRowCount === 0 && totalRowCount > 0 ? (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          No truck readiness rows match this search.
        </div>
      ) : null}

      {totalRowCount === 0 ? (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          No truck readiness rows registered for this compartment.
        </div>
      ) : null}

      {filteredDailyRowCount > 0 ? (
        <FrtSectionCards
          filteredDailySections={filteredDailySections}
          filteredOneOffSections={filteredOneOffSections}
          focusDailySections={dailySections}
          focusOneOffSections={oneOffSections}
          showOneOffSections={false}
          autoExpandFirstIncomplete
          setPhotoViewer={setPhotoViewer}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          validationState={validationState}
          onUpdateCheck={onUpdateCheck}
          onResetCheck={onResetCheck}
          onMarkRowOk={onMarkRowOk}
          onRequestIssuePhotoUpload={onRequestIssuePhotoUpload}
          onRemovePhoto={onRemovePhoto}
          onChangePhotoDescription={onChangePhotoDescription}
          onApplyPhotoCaption={onApplyPhotoCaption}
          onSaveFrtRowDraft={onSaveFrtRowDraft}
          onDeleteItem={onDeleteItem ? requestDeleteItem : undefined}
        />
      ) : null}

      {filteredOneOffRowCount > 0 ? (
        <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">One-Off Readiness Checklist</div>
        </div>
      ) : null}

      {filteredOneOffRowCount > 0 ? (
        <FrtSectionCards
          filteredDailySections={filteredDailySections}
          filteredOneOffSections={filteredOneOffSections}
          focusDailySections={dailySections}
          focusOneOffSections={oneOffSections}
          showDailySections={false}
          autoExpandFirstIncomplete={filteredDailyRowCount === 0}
          setPhotoViewer={setPhotoViewer}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          validationState={validationState}
          onUpdateCheck={onUpdateCheck}
          onResetCheck={onResetCheck}
          onMarkRowOk={onMarkRowOk}
          onRequestIssuePhotoUpload={onRequestIssuePhotoUpload}
          onRemovePhoto={onRemovePhoto}
          onChangePhotoDescription={onChangePhotoDescription}
          onApplyPhotoCaption={onApplyPhotoCaption}
          onSaveFrtRowDraft={onSaveFrtRowDraft}
          onDeleteItem={onDeleteItem ? requestDeleteItem : undefined}
        />
      ) : null}

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldErrors.frtDailyChecks ? 'Complete all daily roster rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {fieldErrors.frtDailyRemarks ? 'Add remarks for daily issue rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {fieldErrors.frtOneOffChecks ? 'Complete all one-off rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {fieldErrors.frtOneOffRemarks
              ? 'Add remarks for one-off issue rows before review.'
              : ''}
          </FormFieldError>
        </>
      ) : null}
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
        onClose={() => setDeleteItemTarget(null)}
        onConfirm={confirmDeleteItem}
      />
    </div>
  )
}
