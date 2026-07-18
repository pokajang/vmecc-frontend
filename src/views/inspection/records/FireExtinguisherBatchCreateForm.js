import React, { useRef, useState } from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import { Plus } from 'lucide-react'

import { FormFieldError } from 'src/views/inspection/form/components/InspectionFormDisplaySections'
import FireExtinguisherDraftForm from './FireExtinguisherDraftForm'
import FireExtinguisherSharedLocationFields from './FireExtinguisherSharedLocationFields'
import FireExtinguisherStagedList from './FireExtinguisherStagedList'
import useInspectionSiteLocationHierarchy from '../state/useInspectionSiteLocationHierarchy'

const MAX_BATCH_SIZE = 25
const text = (value) => String(value || '').trim()
const emptyDraft = () => ({ idLocNo: '', barcodeNo: '', feType: '', certificationValidity: '' })
const createEditor = (mode = 'create', row = null) => ({
  mode,
  clientId: row?.clientId || null,
  initialValue: row ? { ...row } : emptyDraft(),
})

const FireExtinguisherBatchCreateForm = ({
  initialLocation = {},
  onSave,
  onCancel,
  onDirtyChange,
  onSubmittingChange,
}) => {
  const nextRowId = useRef(1)
  const siteLocations = useInspectionSiteLocationHierarchy()
  const [location, setLocation] = useState(() => ({
    zone: text(initialLocation.zone),
    zoneId: text(initialLocation.zoneId),
    mainLocation: text(initialLocation.mainLocation),
    mainLocationId: text(initialLocation.mainLocationId),
    subLocation: text(initialLocation.subLocation),
    subLocationId: text(initialLocation.subLocationId),
  }))
  const [stagedRows, setStagedRows] = useState([])
  const [editor, setEditor] = useState(() => createEditor())
  const [locationError, setLocationError] = useState('')
  const [conflicts, setConflicts] = useState({})
  const [confirmations, setConfirmations] = useState({})
  const [error, setError] = useState('')
  const [reviewVisible, setReviewVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const markDirty = () => onDirtyChange?.(true)
  const clearDuplicateState = () => {
    setConflicts({})
    setConfirmations({})
  }

  const updateLocation = (next) => {
    setLocation({
      zone: text(next.zone),
      zoneId: text(next.zoneId),
      mainLocation: text(next.mainLocation),
      mainLocationId: text(next.mainLocationId),
      subLocation: text(next.subLocation),
      subLocationId: text(next.subLocationId),
    })
    setLocationError('')
    setError('')
    clearDuplicateState()
    markDirty()
  }

  const saveDraft = (draft) => {
    if (!text(location.zone) || !text(location.mainLocation) || !text(location.subLocation)) {
      setLocationError('Select the complete Zone, Main Location, and Sub-location first.')
      return
    }

    if (editor.mode === 'edit') {
      setStagedRows((current) =>
        current.map((row) =>
          row.clientId === editor.clientId ? { ...row, ...draft, confirmDuplicate: false } : row,
        ),
      )
      setConflicts((current) => {
        const next = { ...current }
        delete next[editor.clientId]
        return next
      })
      setConfirmations((current) => ({ ...current, [editor.clientId]: false }))
    } else {
      const clientId = `staged-${nextRowId.current++}`
      setStagedRows((current) => [...current, { clientId, ...draft, confirmDuplicate: false }])
    }

    setEditor(null)
    setError('')
    markDirty()
  }

  const cancelEditor = () => {
    if (stagedRows.length === 0) {
      onDirtyChange?.(false)
      onCancel?.({ discard: true })
      return
    }
    setEditor(null)
    setError('')
  }

  const addExtinguisher = () => {
    if (stagedRows.length >= MAX_BATCH_SIZE) return
    setEditor(createEditor())
    setError('')
  }

  const editRow = (row) => {
    setEditor(createEditor('edit', row))
    setError('')
  }

  const deleteRow = (row) => {
    const locator = row.idLocNo || row.barcodeNo || 'this extinguisher'
    if (!window.confirm(`Remove ${locator} from this batch?`)) return
    setStagedRows((current) => current.filter((candidate) => candidate.clientId !== row.clientId))
    setConflicts((current) => {
      const next = { ...current }
      delete next[row.clientId]
      return next
    })
    setConfirmations((current) => {
      const next = { ...current }
      delete next[row.clientId]
      return next
    })
    setError('')
    markDirty()
  }

  const unconfirmedConflictIds = Object.keys(conflicts).filter(
    (clientId) => !confirmations[clientId],
  )

  const openReview = () => {
    if (!text(location.zone) || !text(location.mainLocation) || !text(location.subLocation)) {
      setLocationError('Select the complete Zone, Main Location, and Sub-location first.')
      return
    }
    if (editor) {
      setError('Save or cancel the current extinguisher before submitting the batch.')
      return
    }
    if (unconfirmedConflictIds.length > 0) {
      setError('Confirm every duplicate warning before submitting the batch again.')
      return
    }
    setError('')
    setReviewVisible(true)
  }

  const submitAll = async () => {
    if (isSubmitting || stagedRows.length === 0) return

    const payload = {
      ...location,
      items: stagedRows.map((row) => ({
        idLocNo: text(row.idLocNo),
        barcodeNo: text(row.barcodeNo),
        feType: text(row.feType),
        certificationValidity: text(row.certificationValidity),
        confirmDuplicate: Boolean(conflicts[row.clientId] && confirmations[row.clientId]),
      })),
    }

    setIsSubmitting(true)
    onSubmittingChange?.(true)
    setError('')
    try {
      await onSave?.(payload)
    } catch (saveError) {
      const duplicateConflict = saveError?.duplicateConflict
      if (duplicateConflict?.conflicts?.length) {
        const indexedConflicts = {}
        duplicateConflict.conflicts.forEach((conflict) => {
          const row = stagedRows[conflict.index]
          if (row) indexedConflicts[row.clientId] = conflict
        })
        const confirmedConflicts = Object.fromEntries(
          Object.entries(conflicts).filter(([clientId]) => confirmations[clientId]),
        )
        setConflicts({ ...confirmedConflicts, ...indexedConflicts })
        setConfirmations({
          ...Object.fromEntries(
            Object.keys(confirmedConflicts).map((clientId) => [clientId, true]),
          ),
          ...Object.fromEntries(Object.keys(indexedConflicts).map((clientId) => [clientId, false])),
        })
        setReviewVisible(false)
        setError(duplicateConflict.message)
      } else {
        setError(saveError?.message || 'Unable to submit the fire extinguisher batch.')
      }
    } finally {
      setIsSubmitting(false)
      onSubmittingChange?.(false)
    }
  }

  const locationLabel = [location.zone, location.mainLocation, location.subLocation]
    .filter(Boolean)
    .join(' > ')

  return (
    <div className="d-grid gap-4">
      <FireExtinguisherSharedLocationFields
        value={location}
        onChange={updateLocation}
        hierarchy={siteLocations.hierarchy}
        createZone={siteLocations.createZone}
        createArea={siteLocations.createArea}
        createLocation={siteLocations.createLocation}
        isLoading={siteLocations.isLoading || siteLocations.isRefreshing}
        loadError={siteLocations.error}
        onRetry={siteLocations.refresh}
        stagedCount={stagedRows.length}
        error={locationError}
      />

      <section className="d-grid gap-3" aria-labelledby="fire-extinguisher-batch-lines">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div id="fire-extinguisher-batch-lines" className="fw-semibold">
            Extinguishers ({stagedRows.length})
          </div>
          {!editor ? (
            <CButton
              type="button"
              color="primary"
              variant="outline"
              size="sm"
              disabled={isSubmitting || stagedRows.length >= MAX_BATCH_SIZE}
              onClick={addExtinguisher}
            >
              <Plus size={15} className="me-1" />
              Add Extinguisher
            </CButton>
          ) : null}
        </div>

        {editor ? (
          <FireExtinguisherDraftForm
            key={`${editor.mode}-${editor.clientId || 'new'}`}
            mode={editor.mode}
            initialValue={editor.initialValue}
            onChange={markDirty}
            onSave={saveDraft}
            onCancel={cancelEditor}
            saveDisabled={
              !text(location.zone) || !text(location.mainLocation) || !text(location.subLocation)
            }
          />
        ) : null}

        {stagedRows.length > 0 ? (
          <FireExtinguisherStagedList
            rows={stagedRows}
            conflicts={conflicts}
            confirmations={confirmations}
            actionsDisabled={Boolean(editor) || isSubmitting}
            onConfirm={(clientId, checked) => {
              setConfirmations((current) => ({ ...current, [clientId]: checked }))
              setError('')
            }}
            onEdit={editRow}
            onDelete={deleteRow}
          />
        ) : null}
      </section>

      <FormFieldError role="alert">{error}</FormFieldError>
      {stagedRows.length > 0 ? (
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="small text-body-secondary">
            {stagedRows.length} {stagedRows.length === 1 ? 'extinguisher' : 'extinguishers'} ready
            to submit
          </div>
          <CButton
            type="button"
            color="primary"
            disabled={isSubmitting || Boolean(editor)}
            onClick={openReview}
          >
            Review &amp; Submit All ({stagedRows.length})
          </CButton>
        </div>
      ) : null}

      <CModal
        visible={reviewVisible}
        onClose={() => !isSubmitting && setReviewVisible(false)}
        alignment="center"
        aria-labelledby="fire-extinguisher-batch-review-title"
      >
        <CModalHeader closeButton={!isSubmitting}>
          <CModalTitle id="fire-extinguisher-batch-review-title">
            Submit extinguisher batch?
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="d-grid gap-3">
          <div>
            All {stagedRows.length} staged{' '}
            {stagedRows.length === 1 ? 'extinguisher' : 'extinguishers'}
            will be added to the catalogue in one transaction.
          </div>
          <div className="rounded-3 border p-3">
            <div className="small text-body-secondary">Shared location</div>
            <div className="fw-semibold">{locationLabel || 'Not selected'}</div>
          </div>
          <div className="d-grid gap-1 small">
            {stagedRows.map((row, index) => (
              <div key={row.clientId}>
                {index + 1}. {row.idLocNo || row.barcodeNo}
              </div>
            ))}
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setReviewVisible(false)}
          >
            Back
          </CButton>
          <CButton type="button" color="primary" disabled={isSubmitting} onClick={submitAll}>
            {isSubmitting ? 'Submitting all...' : 'Submit All'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default FireExtinguisherBatchCreateForm
