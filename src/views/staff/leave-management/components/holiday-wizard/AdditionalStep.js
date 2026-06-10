import React from 'react'
import CreateActionButton from 'src/components/CreateActionButton'
import { Pencil, Trash2 } from 'lucide-react'
import {
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { MALAYSIA_STATE_OPTIONS } from '../holidayWizardHelpers'

const AdditionalStep = ({
  wizardState,
  dispatch,
  isSaving,
  wizardAdditionalScope,
  wizardAdditionalDate,
  wizardDerivedYear,
  onSaveAdditional,
}) => (
  <>
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div className="fw-semibold">Additional Holidays</div>
      <CreateActionButton
        label="Add holiday"
        disabled={isSaving}
        onClick={() => dispatch({ type: 'OPEN_ADDITIONAL_FORM' })}
      />
    </div>
    <div className="rounded-3 border mt-3 overflow-hidden">
      <CTable align="middle" className="mb-0" responsive>
        <CTableHead color="light">
          <CTableRow>
            <CTableHeaderCell>Date</CTableHeaderCell>
            <CTableHeaderCell>Holiday</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Scope</CTableHeaderCell>
            <CTableHeaderCell className="text-center">State</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {wizardState.pendingAdditionalRows.length > 0 ? (
            wizardState.pendingAdditionalRows.map((row) => (
              <CTableRow key={row.id}>
                <CTableDataCell>{row.date}</CTableDataCell>
                <CTableDataCell>{row.name}</CTableDataCell>
                <CTableDataCell className="text-center">{row.scope}</CTableDataCell>
                <CTableDataCell className="text-center">
                  {row.scope === 'State' ? row.state : '-'}
                </CTableDataCell>
                <CTableDataCell className="text-center">
                  <div className="d-inline-flex gap-2">
                    <CButton
                      type="button"
                      color="link"
                      className="d-inline-flex align-items-center justify-content-center p-0 text-body-secondary text-decoration-none"
                      style={{ lineHeight: 0 }}
                      title="Edit holiday"
                      aria-label="Edit holiday"
                      onClick={() => dispatch({ type: 'EDIT_ADDITIONAL', id: row.id })}
                    >
                      <Pencil size={15} />
                    </CButton>
                    <CButton
                      type="button"
                      color="link"
                      className="d-inline-flex align-items-center justify-content-center p-0 text-danger text-decoration-none"
                      style={{ lineHeight: 0 }}
                      title="Remove holiday"
                      aria-label="Remove holiday"
                      onClick={() => dispatch({ type: 'REMOVE_ADDITIONAL', id: row.id })}
                    >
                      <Trash2 size={15} />
                    </CButton>
                  </div>
                </CTableDataCell>
              </CTableRow>
            ))
          ) : (
            <CTableRow>
              <CTableDataCell colSpan={5} className="text-body-secondary">
                No additional holidays added yet.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
    {wizardState.isAdditionalFormVisible && (
      <>
        <CRow className="g-3 mt-1">
          <CCol md={8}>
            <CFormLabel htmlFor="holiday-name">Holiday Name</CFormLabel>
            <CFormInput
              id="holiday-name"
              value={wizardState.additionalDraft.name || ''}
              onChange={(event) =>
                dispatch({
                  type: 'UPDATE_ADDITIONAL_FIELD',
                  field: 'name',
                  value: event.target.value,
                })
              }
              placeholder="e.g., Hari Raya Aidilfitri"
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel htmlFor="holiday-date">Date</CFormLabel>
            <CFormInput
              id="holiday-date"
              type="date"
              value={wizardAdditionalDate}
              onChange={(event) =>
                dispatch({
                  type: 'UPDATE_ADDITIONAL_FIELD',
                  field: 'date',
                  value: event.target.value,
                })
              }
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel htmlFor="holiday-scope">Scope</CFormLabel>
            <CFormSelect
              id="holiday-scope"
              value={wizardAdditionalScope}
              onChange={(event) =>
                dispatch({
                  type: 'UPDATE_ADDITIONAL_FIELD',
                  field: 'scope',
                  value: event.target.value,
                })
              }
            >
              <option value="National">National</option>
              <option value="State">State</option>
            </CFormSelect>
          </CCol>
          <CCol md={4}>
            <CFormLabel htmlFor="holiday-state">State</CFormLabel>
            <CFormSelect
              id="holiday-state"
              value={wizardState.additionalDraft.state || 'All States'}
              onChange={(event) =>
                dispatch({
                  type: 'UPDATE_ADDITIONAL_FIELD',
                  field: 'state',
                  value: event.target.value,
                })
              }
              disabled={wizardAdditionalScope !== 'State'}
            >
              {MALAYSIA_STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={4}>
            <CFormLabel htmlFor="holiday-year">Year</CFormLabel>
            <CFormInput id="holiday-year" value={wizardDerivedYear} readOnly />
          </CCol>
        </CRow>

        <div className="mt-3 d-flex justify-content-end gap-2">
          <CButton
            type="button"
            color="light"
            disabled={isSaving}
            onClick={() => dispatch({ type: 'CLOSE_ADDITIONAL_FORM' })}
          >
            Cancel
          </CButton>
          <CButton type="button" color="primary" disabled={isSaving} onClick={onSaveAdditional}>
            {wizardState.editingAdditionalId ? 'Save changes' : 'Save holiday'}
          </CButton>
        </div>
      </>
    )}
  </>
)

export default AdditionalStep
