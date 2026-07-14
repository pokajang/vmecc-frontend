import React, { useState } from 'react'
import { CButton, CFormInput } from '@coreui/react'

import { FormFieldError } from 'src/views/inspection/form/components/InspectionFormDisplaySections'

const text = (value) => String(value || '').trim()
const emptyDraft = () => ({ idLocNo: '', barcodeNo: '', feType: '', certificationValidity: '' })

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

const FireExtinguisherDraftForm = ({
  mode = 'create',
  initialValue,
  onSave,
  onCancel,
  onChange,
  saveDisabled = false,
}) => {
  const [draft, setDraft] = useState(() => ({ ...emptyDraft(), ...(initialValue || {}) }))
  const [error, setError] = useState('')

  const setField = (field, value) => {
    const next = { ...draft, [field]: value }
    setDraft(next)
    setError('')
    onChange?.(next)
  }

  const save = () => {
    if (!text(draft.idLocNo) && !text(draft.barcodeNo)) {
      setError('Enter ID Loc. No. or barcode/S/N.')
      return
    }
    if (!isValidDateInput(draft.certificationValidity)) {
      setError('Enter a valid certification date.')
      return
    }
    onSave?.(
      Object.fromEntries(Object.entries(draft).map(([field, value]) => [field, text(value)])),
    )
  }

  return (
    <div className="fire-extinguisher-draft-form d-grid gap-3 rounded-3 p-3">
      <div className="fw-semibold">
        {mode === 'edit' ? 'Edit extinguisher' : 'New extinguisher'}
      </div>
      <div className="fire-extinguisher-batch-line__fields">
        {[
          ['idLocNo', 'ID Loc. No.', 'text'],
          ['barcodeNo', 'Barcode / S/N', 'text'],
          ['feType', 'FE Type', 'text'],
          ['certificationValidity', 'Certification Validity', 'date'],
        ].map(([field, label, type]) => (
          <CFormInput
            key={field}
            size="sm"
            type={type}
            label={label}
            aria-label={label}
            value={draft[field]}
            onChange={(event) => setField(field, event.target.value)}
          />
        ))}
      </div>
      <FormFieldError>{error}</FormFieldError>
      <div className="d-flex gap-2 justify-content-end">
        <CButton type="button" color="secondary" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </CButton>
        <CButton type="button" color="primary" size="sm" disabled={saveDisabled} onClick={save}>
          {mode === 'edit' ? 'Update batch entry' : 'Save to batch'}
        </CButton>
      </div>
    </div>
  )
}

export default FireExtinguisherDraftForm
