import React, { useState } from 'react'
import { CButton, CCard, CCardBody, CFormCheck, CFormInput, CFormLabel } from '@coreui/react'
import { FormFieldError } from '../../form/components/InspectionFormDisplaySections'
import { formatFireExtinguisherDaysLeft } from './helpers'
import { extractFireExtinguisherLocator } from './locator'

const text = (value) => String(value || '').trim()

const isValidDateInput = (value) => {
  const normalized = text(value)
  if (!normalized) return true
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

const DuplicateLocatorCard = ({
  duplicateRows = [],
  requiresConfirmation = false,
  confirmed = false,
  onConfirmChange,
}) => {
  if (!duplicateRows.length) return null

  return (
    <div className="d-grid gap-2 border border-warning-subtle bg-warning-subtle rounded-3 p-3 small text-body-secondary">
      <div className="fw-semibold text-body">Duplicate locator found</div>
      {requiresConfirmation ? (
        <div>
          Confirm that this is a separate physical extinguisher before adding another catalogue row.
        </div>
      ) : null}
      {duplicateRows.map((row) => {
        const parts = [text(row.zone), text(row.mainLocation), text(row.subLocation)].filter(
          Boolean,
        )
        return (
          <div
            key={String(row.id || row.catalogId || row.barcodeNo || '')}
            className="d-grid gap-1"
          >
            <div className="fw-semibold text-body">
              {text(row.idLocNo) || text(row.barcodeNo) || text(row.feType) || 'Fire extinguisher'}
            </div>
            <div>{parts.join(' > ') || 'Location unavailable'}</div>
            <div>
              {[
                text(row.idLocNo) ? `ID Loc. No.: ${text(row.idLocNo)}` : '',
                text(row.barcodeNo) ? `Barcode / S/N: ${text(row.barcodeNo)}` : '',
                text(row.feType),
                text(row.certificationValidity),
              ]
                .filter(Boolean)
                .join(' | ') || 'Catalog details unavailable'}
            </div>
          </div>
        )
      })}
      {requiresConfirmation ? (
        <CFormCheck
          id="confirm-separate-fire-extinguisher"
          checked={confirmed}
          onChange={(event) => onConfirmChange?.(event.target.checked)}
          label="I confirm this is a separate physical extinguisher."
        />
      ) : null}
    </div>
  )
}

export const AddFireExtinguisherForm = ({
  mainLocation,
  subLocation,
  onSave,
  onCancel,
  initialValue = {},
  onCheckLocatorConflict,
  presentation = 'card',
  editableLocation = false,
  duplicatePolicy = 'block',
  submitLabel = '',
  onDirtyChange,
  onSubmittingChange,
}) => {
  const [initialDraft] = useState(() => ({
    zone: text(initialValue.zone),
    mainLocation: text(initialValue.mainLocation || mainLocation),
    subLocation: text(initialValue.subLocation || subLocation),
    idLocNo: text(initialValue.idLocNo),
    barcodeNo: text(initialValue.barcodeNo),
    feType: text(initialValue.feType),
    certificationValidity: text(initialValue.certificationValidity),
  }))
  const [draft, setDraft] = useState(initialDraft)
  const [error, setError] = useState('')
  const [duplicateRows, setDuplicateRows] = useState([])
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const requiresDuplicateConfirmation = duplicatePolicy === 'confirm'

  const setField = (field, value) =>
    setDraft((current) => {
      const next = { ...current, [field]: value }
      onDirtyChange?.(
        Object.keys(initialDraft).some((key) => text(next[key]) !== text(initialDraft[key])),
      )
      return next
    })

  const save = async () => {
    const duplicateLookupLocators = Array.from(
      new Set(
        [draft.barcodeNo, draft.idLocNo]
          .map((value) => extractFireExtinguisherLocator(value))
          .filter(Boolean),
      ),
    )
    if (!text(draft.mainLocation)) {
      setError('Main location is required.')
      return
    }
    if (!text(draft.idLocNo) && !text(draft.barcodeNo)) {
      setError('Enter ID Loc. No. or barcode/S/N.')
      return
    }
    if (!isValidDateInput(draft.certificationValidity)) {
      setError('Enter a valid certification date.')
      return
    }
    if (requiresDuplicateConfirmation && duplicateRows.length > 0 && !duplicateConfirmed) {
      setError('Confirm that this is a separate physical extinguisher before continuing.')
      return
    }

    if (
      duplicateRows.length === 0 &&
      duplicateLookupLocators.length > 0 &&
      typeof onCheckLocatorConflict === 'function'
    ) {
      setIsCheckingDuplicate(true)
      onSubmittingChange?.(true)
      setError('')
      setDuplicateRows([])
      try {
        for (const locator of duplicateLookupLocators) {
          const conflicts = await onCheckLocatorConflict({
            locator,
            catalogId: text(initialValue.catalogId || initialValue.id),
          })
          if (Array.isArray(conflicts) && conflicts.length > 0) {
            setDuplicateRows(conflicts)
            setDuplicateConfirmed(false)
            if (!requiresDuplicateConfirmation) {
              setError(
                'Duplicate locator found. Edit the existing unit or use a different locator for this extinguisher.',
              )
            }
            return
          }
        }
      } catch (checkError) {
        setError(checkError?.message || 'Unable to verify locator uniqueness.')
        return
      } finally {
        setIsCheckingDuplicate(false)
        onSubmittingChange?.(false)
      }
    }

    const payload = Object.fromEntries(
      Object.entries(draft).map(([field, value]) => [field, text(value)]),
    )
    setIsSubmitting(true)
    onSubmittingChange?.(true)
    setError('')
    try {
      await onSave?.(payload, {
        confirmDuplicate:
          requiresDuplicateConfirmation && duplicateRows.length > 0 && duplicateConfirmed,
      })
    } catch (saveError) {
      const conflict = saveError?.duplicateConflict
      if (requiresDuplicateConfirmation && conflict?.matches?.length > 0) {
        setDuplicateRows(conflict.matches)
        setDuplicateConfirmed(false)
        return
      }
      setError(saveError?.message || 'Unable to save fire extinguisher.')
    } finally {
      setIsSubmitting(false)
      onSubmittingChange?.(false)
    }
  }

  const locationMetadata = [
    ['Zone', draft.zone],
    ['Main Location', draft.mainLocation],
    ['Sub-location', draft.subLocation],
  ].filter(([, value]) => text(value))
  const fields =
    presentation === 'drawer' && !editableLocation
      ? [
          ['idLocNo', 'ID Loc. No.'],
          ['barcodeNo', 'Barcode No.'],
          ['feType', 'FE Type'],
          ['certificationValidity', 'Certification Validity'],
        ]
      : [
          ['zone', 'Zone'],
          ['mainLocation', 'Main Location'],
          ['subLocation', 'Sub-location'],
          ['idLocNo', 'ID Loc. No.'],
          ['barcodeNo', editableLocation ? 'Barcode / S/N' : 'Barcode No.'],
          ['feType', 'FE Type'],
          ['certificationValidity', 'Certification Validity'],
        ]

  const content = (
    <>
      {presentation === 'drawer' ? null : (
        <div className="fw-semibold">
          {initialValue?.catalogId ? 'Edit extinguisher' : 'Add extinguisher'}
        </div>
      )}
      {initialValue?.equipmentSource === 'seed' ? (
        <div className="small rounded border border-warning-subtle bg-warning-subtle text-body px-3 py-2">
          This item is shared across inspections. Changes will affect future inspections.
        </div>
      ) : null}
      {presentation === 'drawer' && !editableLocation && locationMetadata.length > 0 ? (
        <dl className="fire-extinguisher-drawer-location-meta mb-0">
          {locationMetadata.map(([label, value]) => (
            <div key={label} className="fire-extinguisher-drawer-location-meta__item">
              <dt className="fire-extinguisher-drawer-location-meta__label">{label}</dt>
              <dd className="fire-extinguisher-drawer-location-meta__value mb-0">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div
        className={presentation === 'drawer' ? 'fire-extinguisher-drawer-field-grid' : 'row g-2'}
      >
        {fields.map(([field, label]) => (
          <div key={field} className={presentation === 'drawer' ? '' : 'col-12 col-md-4'}>
            <CFormInput
              size="sm"
              type={field === 'certificationValidity' ? 'date' : 'text'}
              label={label}
              aria-label={label}
              value={draft[field]}
              onChange={(event) => {
                setError('')
                if (field === 'idLocNo' || field === 'barcodeNo') {
                  setDuplicateRows([])
                  setDuplicateConfirmed(false)
                }
                setField(field, event.target.value)
              }}
            />
          </div>
        ))}
        {text(draft.certificationValidity) ? (
          <div className={presentation === 'drawer' ? '' : 'col-12 col-md-4'}>
            <CFormLabel className="small text-muted">Days to expire</CFormLabel>
            <div className="form-control form-control-sm bg-light text-body-secondary">
              {formatFireExtinguisherDaysLeft(draft.certificationValidity) || '--'}
            </div>
          </div>
        ) : null}
      </div>
      <DuplicateLocatorCard
        duplicateRows={duplicateRows}
        requiresConfirmation={requiresDuplicateConfirmation}
        confirmed={duplicateConfirmed}
        onConfirmChange={(checked) => {
          setDuplicateConfirmed(checked)
          setError('')
        }}
      />
      <FormFieldError>{error}</FormFieldError>
      <div className="d-flex gap-2 justify-content-end">
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          disabled={isCheckingDuplicate || isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          disabled={isCheckingDuplicate || isSubmitting}
          onClick={save}
        >
          {isCheckingDuplicate
            ? 'Checking locator...'
            : isSubmitting
              ? 'Adding extinguisher...'
              : requiresDuplicateConfirmation && duplicateRows.length > 0
                ? 'Add as separate extinguisher'
                : submitLabel
                  ? submitLabel
                  : initialValue?.equipmentSource === 'seed'
                    ? 'Save global change'
                    : 'Save extinguisher'}
        </CButton>
      </div>
    </>
  )

  if (presentation === 'drawer') {
    return <div className="d-grid gap-3">{content}</div>
  }

  return (
    <CCard className="border-primary">
      <CCardBody className="d-grid gap-3">{content}</CCardBody>
    </CCard>
  )
}
