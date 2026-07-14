import React from 'react'
import {
  CButton,
  CFormCheck,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { Pencil, Trash2 } from 'lucide-react'

const text = (value) => String(value || '').trim()

const DuplicateWarning = ({ conflict, checked, checkboxId, onChange }) => {
  if (!conflict) return null
  const matches = [...(conflict.matches || []), ...(conflict.batchMatches || [])]

  return (
    <div className="d-grid gap-2 border border-warning-subtle bg-warning-subtle rounded-3 p-3 small text-body-secondary">
      <div className="fw-semibold text-body">Duplicate locator found</div>
      {matches.map((row, index) => {
        const batchIndex = Number.isInteger(row.batchIndex) ? row.batchIndex : null
        return (
          <div key={`${row.catalogId || row.id || batchIndex || 'match'}-${index}`}>
            <div className="fw-semibold text-body">
              {batchIndex !== null
                ? `Another staged extinguisher (${batchIndex + 1})`
                : text(row.idLocNo) || text(row.barcodeNo) || 'Existing catalogue row'}
            </div>
            <div>
              {[
                text(row.idLocNo) ? `ID Loc. No.: ${text(row.idLocNo)}` : '',
                text(row.barcodeNo) ? `Barcode / S/N: ${text(row.barcodeNo)}` : '',
                text(row.feType),
              ]
                .filter(Boolean)
                .join(' | ')}
            </div>
          </div>
        )
      })}
      <CFormCheck
        id={checkboxId}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        label="I confirm this is a separate physical extinguisher."
      />
    </div>
  )
}

const RowActions = ({ rowNumber, disabled = false, onEdit, onDelete }) => (
  <div className="fire-extinguisher-staged-actions">
    <CButton
      type="button"
      color="primary"
      variant="ghost"
      size="sm"
      aria-label={`Edit extinguisher ${rowNumber}`}
      disabled={disabled}
      onClick={onEdit}
    >
      <Pencil size={15} />
    </CButton>
    <CButton
      type="button"
      color="danger"
      variant="ghost"
      size="sm"
      aria-label={`Delete extinguisher ${rowNumber}`}
      disabled={disabled}
      onClick={onDelete}
    >
      <Trash2 size={15} />
    </CButton>
  </div>
)

const FireExtinguisherStagedList = ({
  rows,
  conflicts,
  confirmations,
  actionsDisabled = false,
  onConfirm,
  onEdit,
  onDelete,
}) => (
  <div className="d-grid gap-3">
    <div className="d-none d-md-block fire-extinguisher-staged-table-wrap">
      <CTable responsive="md" align="middle" className="mb-0 fire-extinguisher-staged-table">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell scope="col">#</CTableHeaderCell>
            <CTableHeaderCell scope="col">ID Loc. No.</CTableHeaderCell>
            <CTableHeaderCell scope="col">Barcode / S/N</CTableHeaderCell>
            <CTableHeaderCell scope="col">FE Type</CTableHeaderCell>
            <CTableHeaderCell scope="col">Certification Validity</CTableHeaderCell>
            <CTableHeaderCell scope="col" aria-label="Row actions" />
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {rows.map((row, index) => (
            <React.Fragment key={row.clientId}>
              <CTableRow>
                <CTableDataCell>{index + 1}</CTableDataCell>
                <CTableDataCell>{row.idLocNo || '—'}</CTableDataCell>
                <CTableDataCell>{row.barcodeNo || '—'}</CTableDataCell>
                <CTableDataCell>{row.feType || '—'}</CTableDataCell>
                <CTableDataCell>{row.certificationValidity || '—'}</CTableDataCell>
                <CTableDataCell className="fire-extinguisher-staged-table__actions-cell">
                  <RowActions
                    rowNumber={index + 1}
                    disabled={actionsDisabled}
                    onEdit={() => onEdit(row)}
                    onDelete={() => onDelete(row)}
                  />
                </CTableDataCell>
              </CTableRow>
              {conflicts[row.clientId] ? (
                <CTableRow>
                  <CTableDataCell colSpan={6}>
                    <DuplicateWarning
                      conflict={conflicts[row.clientId]}
                      checked={Boolean(confirmations[row.clientId])}
                      checkboxId={`confirm-staged-extinguisher-${row.clientId}`}
                      onChange={(checked) => onConfirm(row.clientId, checked)}
                    />
                  </CTableDataCell>
                </CTableRow>
              ) : null}
            </React.Fragment>
          ))}
        </CTableBody>
      </CTable>
    </div>

    <div className="d-grid d-md-none gap-2">
      {rows.map((row, index) => (
        <div
          key={row.clientId}
          className="fire-extinguisher-staged-card d-grid gap-2 rounded-3 p-3"
        >
          <div className="d-flex justify-content-between gap-3">
            <div>
              <div className="fw-semibold">Extinguisher {index + 1}</div>
              <div className="small text-body-secondary">
                {row.idLocNo || row.barcodeNo || 'No locator'}
              </div>
            </div>
            <RowActions
              rowNumber={index + 1}
              disabled={actionsDisabled}
              onEdit={() => onEdit(row)}
              onDelete={() => onDelete(row)}
            />
          </div>
          <div className="small">
            {[row.barcodeNo, row.feType, row.certificationValidity].filter(Boolean).join(' | ') ||
              'No additional details'}
          </div>
          <DuplicateWarning
            conflict={conflicts[row.clientId]}
            checked={Boolean(confirmations[row.clientId])}
            checkboxId={`confirm-staged-extinguisher-mobile-${row.clientId}`}
            onChange={(checked) => onConfirm(row.clientId, checked)}
          />
        </div>
      ))}
    </div>
  </div>
)

export default FireExtinguisherStagedList
