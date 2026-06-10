import React from 'react'
import ButtonLoader from 'src/components/ButtonLoader'
import {
  CButton,
  CCol,
  CFormInput,
  CFormCheck,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import StaffSelect from 'src/components/staff/StaffSelect'
import { getSelectableStaffOptions } from 'src/utils/staffSelect'
import { defaultEntitlementByType, leaveTypeCatalog } from '../data'

const formatActivityDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const AssignmentCreateModal = ({
  visible,
  onClose,
  staffOptions,
  staffLoading,
  selectedStaff,
  selectedStaffKey,
  onStaffChange,
  includeInactiveStaff,
  onIncludeInactiveChange,
  yearOptions,
  selectedYear,
  onYearChange,
  draftRows,
  onUpdateDraft,
  assignmentHistory = [],
  onSave,
  isSaving = false,
  saveError = null,
}) => {
  const visibleStaffOptions = getSelectableStaffOptions(staffOptions, {
    includeInactive: includeInactiveStaff,
    selectedKey: selectedStaffKey,
  })

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>Assign Entitlement</CModalHeader>
      <CModalBody>
        <CRow className="g-3">
          <CCol md={6}>
            <CFormLabel htmlFor="assignment-staff">Staff</CFormLabel>
            <StaffSelect
              inputId="assignment-staff"
              options={visibleStaffOptions}
              value={selectedStaffKey}
              onChange={(key) => onStaffChange(key)}
              isLoading={staffLoading}
              placeholder={staffLoading ? 'Loading staff...' : 'Search and select staff'}
              includeInactive={includeInactiveStaff}
            />
            <CFormCheck
              id="leave-assignment-include-inactive"
              className="mt-2"
              label="Include inactive staff"
              checked={includeInactiveStaff}
              onChange={(event) => onIncludeInactiveChange(event.target.checked)}
            />
          </CCol>
          <CCol md={3}>
            <CFormLabel htmlFor="assignment-year">Year</CFormLabel>
            <CFormSelect id="assignment-year" value={selectedYear} onChange={onYearChange}>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>

        {selectedStaff ? (
          <div className="rounded-3 shadow-sm overflow-hidden bg-white mt-3">
            <CTable align="middle" className="mb-0" responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Leave Type</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 140 }}>Entitlement</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {leaveTypeCatalog.map((leaveType) => {
                  const row = draftRows[leaveType] || {
                    entitlement: Number(defaultEntitlementByType[leaveType] || 0),
                  }

                  return (
                    <CTableRow key={leaveType}>
                      <CTableDataCell>{leaveType}</CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          type="number"
                          min={0}
                          value={row.entitlement}
                          onChange={(event) =>
                            onUpdateDraft(leaveType, 'entitlement', event.target.value)
                          }
                        />
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          </div>
        ) : (
          <div className="rounded-3 border bg-light p-3 mt-3 text-body-secondary">
            Select a staff member to assign leave entitlement for the selected year.
          </div>
        )}

        <div className="rounded-3 border bg-light p-3 mt-3">
          <div className="fw-semibold mb-2">Assignment Activity</div>
          {!selectedStaff ? (
            <div className="small text-body-secondary">Select a staff member to view activity.</div>
          ) : assignmentHistory.length > 0 ? (
            <div className="d-grid gap-2">
              {assignmentHistory.slice(0, 5).map((item) => (
                <div key={item.id} className="small">
                  <span className="fw-semibold">{formatActivityDateTime(item.at)}</span>
                  {' | '}
                  <span>{item.by}</span>
                  {' | '}
                  <span>{item.eventType}</span>
                  {' | '}
                  <span>{item.summary}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="small text-body-secondary">No activity for this staff yet.</div>
          )}
        </div>
      </CModalBody>
      {saveError && (
        <div className="px-3 pb-2">
          <div className="text-danger small">{saveError}</div>
        </div>
      )}
      <CModalFooter>
        <CButton color="light" onClick={onClose} disabled={isSaving}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={onSave} disabled={!selectedStaff || isSaving}>
          {isSaving ? <ButtonLoader label="Saving..." /> : 'Save assignment'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default AssignmentCreateModal
