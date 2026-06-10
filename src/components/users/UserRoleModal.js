import React from 'react'
import {
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { Plus, Trash2 } from 'lucide-react'
import { roles, roleScopeMap } from 'src/views/users/CreateStaffForm'

const UserRoleModal = ({
  visible = false,
  roleAssignments = [],
  teams = [],
  onAddAssignment = () => {},
  onRemoveAssignment = () => {},
  onChangeAssignment = () => {},
  onClose = () => {},
  onConfirm = () => {},
  confirmDisabled = false,
  loading = false,
}) => {
  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg">
      <CModalHeader>
        <CModalTitle>Manage Role Assignments</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="d-flex justify-content-end mb-2">
          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={onAddAssignment}
          >
            <Plus size={14} className="me-1" />
            Add Assignment
          </CButton>
        </div>

        <div className="d-grid gap-2">
          {roleAssignments.map((assignment, index) => {
            const scopeType = roleScopeMap[assignment.role] || assignment.scope_type || 'office'
            const needsTeam = scopeType === 'site' || scopeType === 'client_site'
            return (
              <CRow
                key={`modal-role-assignment-${index}`}
                className="g-2 align-items-end border rounded p-2 mx-0"
              >
                <CCol md={3}>
                  <CFormLabel className="small">Role</CFormLabel>
                  <CFormSelect
                    value={assignment.role || ''}
                    onChange={(e) => onChangeAssignment(index, 'role', e.target.value)}
                    disabled={loading}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="small">Scope</CFormLabel>
                  <CFormInput value={scopeType} disabled readOnly />
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="small">Team</CFormLabel>
                  <CFormSelect
                    value={assignment.team_id || ''}
                    onChange={(e) => onChangeAssignment(index, 'team_id', e.target.value || null)}
                    disabled={loading || !needsTeam}
                    required={needsTeam}
                  >
                    <option value="">{needsTeam ? 'Select team' : 'Not required'}</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="small">Start</CFormLabel>
                  <CFormInput
                    type="date"
                    value={assignment.start_date || ''}
                    onChange={(e) => onChangeAssignment(index, 'start_date', e.target.value)}
                    disabled={loading}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="small">End</CFormLabel>
                  <CFormInput
                    type="date"
                    value={assignment.end_date || ''}
                    onChange={(e) => onChangeAssignment(index, 'end_date', e.target.value || null)}
                    disabled={loading}
                  />
                </CCol>
                <CCol xs={12} className="d-flex justify-content-between">
                  <CButton
                    type="button"
                    size="sm"
                    color={assignment.is_primary ? 'primary' : 'secondary'}
                    variant={assignment.is_primary ? undefined : 'outline'}
                    onClick={() => onChangeAssignment(index, 'is_primary', true)}
                    disabled={loading}
                  >
                    {assignment.is_primary ? 'Primary' : 'Set Primary'}
                  </CButton>
                  <CButton
                    type="button"
                    size="sm"
                    color="danger"
                    variant="outline"
                    disabled={loading || roleAssignments.length <= 1}
                    onClick={() => onRemoveAssignment(index)}
                  >
                    <Trash2 size={14} />
                  </CButton>
                </CCol>
              </CRow>
            )
          })}
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={onConfirm} disabled={confirmDisabled}>
          Save assignments
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default UserRoleModal
