import React, { useState } from 'react'
import { CButton, CCard, CCardBody, CFormInput, CFormLabel } from '@coreui/react'
import { FormFieldError } from '../../form/components/InspectionFormDisplaySections'
import { formatFireExtinguisherDaysLeft } from './helpers'
import { extractFireExtinguisherLocator } from './locator'

const text = (value) => String(value || '').trim()

const DuplicateLocatorCard = ({ duplicateRows = [] }) => {
  if (!duplicateRows.length) return null

  return (
    <div className="d-grid gap-2 border border-danger-subtle bg-danger-subtle rounded-3 p-2 small text-body-secondary">
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
              {[text(row.feType), text(row.certificationValidity)].filter(Boolean).join(' | ') ||
                'Catalog details unavailable'}
            </div>
          </div>
        )
      })}
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
}) => {
  const [draft, setDraft] = useState({
    zone: text(initialValue.zone),
    mainLocation: text(initialValue.mainLocation || mainLocation),
    subLocation: text(initialValue.subLocation || subLocation),
    idLocNo: text(initialValue.idLocNo),
    barcodeNo: text(initialValue.barcodeNo),
    feType: text(initialValue.feType),
    certificationValidity: text(initialValue.certificationValidity),
  })
  const [error, setError] = useState('')
  const [duplicateRows, setDuplicateRows] = useState([])
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

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
      setError('Enter ID Loc. No. or barcode.')
      return
    }

    if (duplicateLookupLocators.length > 0 && typeof onCheckLocatorConflict === 'function') {
      setIsCheckingDuplicate(true)
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
            setError(
              'Duplicate locator found. Edit the existing unit or use a different locator for this extinguisher.',
            )
            return
          }
        }
      } catch (checkError) {
        setError(checkError?.message || 'Unable to verify locator uniqueness.')
        return
      } finally {
        setIsCheckingDuplicate(false)
      }
    }

    onSave?.(draft)
  }

  const locationMetadata = [
    ['Zone', draft.zone],
    ['Main Location', draft.mainLocation],
    ['Sub-location', draft.subLocation],
  ].filter(([, value]) => text(value))
  const fields =
    presentation === 'drawer'
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
          ['barcodeNo', 'Barcode No.'],
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
      {presentation === 'drawer' && locationMetadata.length > 0 ? (
        <div className="fire-extinguisher-drawer-location-meta">
          {locationMetadata.map(([label, value]) => (
            <div key={label} className="fire-extinguisher-drawer-location-meta__item">
              <span className="fire-extinguisher-drawer-location-meta__label">{label}</span>
              <span className="fire-extinguisher-drawer-location-meta__value">{value}</span>
            </div>
          ))}
        </div>
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
                setDuplicateRows([])
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
      <DuplicateLocatorCard duplicateRows={duplicateRows} />
      <FormFieldError>{error}</FormFieldError>
      <div className="d-flex gap-2 justify-content-end">
        <CButton color="secondary" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" disabled={isCheckingDuplicate} onClick={save}>
          {isCheckingDuplicate
            ? 'Checking locator...'
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
