import React from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import { Plus, Trash2 } from 'lucide-react'
import ButtonLoader from 'src/components/ButtonLoader'
import { ROLE_OPTIONS, ROLE_SCOPE_MAP } from 'src/constants/roles'

export const roles = ROLE_OPTIONS
export const roleScopeMap = ROLE_SCOPE_MAP
const scopeLabelMap = {
  global: 'Global',
  office: 'Office',
  site: 'Site',
  client_site: 'Client Site',
}

export const createDefaultAssignment = (role = 'Contract Manager') => ({
  role,
  scope_type: roleScopeMap[role] || 'office',
  team_id: null,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: null,
  is_primary: true,
})

const CreateStaffForm = ({
  visible,
  form,
  submitStatus,
  onChange,
  onSubmit,
  onCancel,
  roleAssignments = [],
  teams = [],
  onAddAssignment,
  onRemoveAssignment,
  onChangeAssignment,
  className = '',
}) => {
  if (!visible) return null

  return (
    <CForm onSubmit={onSubmit} className={`p-3 mb-4 ${className}`.trim()}>
      <div className="mb-3">
        <CFormLabel htmlFor="name">Name</CFormLabel>
        <CFormInput
          id="name"
          name="name"
          value={form.name}
          onChange={onChange}
          required
          disabled={submitStatus.loading}
        />
      </div>
      <div className="mb-3">
        <CFormLabel htmlFor="email">Email</CFormLabel>
        <CFormInput
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          required
          disabled={submitStatus.loading}
        />
      </div>
      <p className="text-muted small mb-3">
        An invitation email will be sent so the user can set their password.
      </p>

      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <CFormLabel className="mb-0">Role Assignments</CFormLabel>
          <CButton
            type="button"
            size="sm"
            color="secondary"
            variant="outline"
            disabled={submitStatus.loading}
            onClick={onAddAssignment}
          >
            <Plus size={14} className="me-1" />
            Add
          </CButton>
        </div>
        <p className="small text-muted mb-2">
          Add one or more assignments. Site and client-site roles require a team.
        </p>

        <div className="d-grid gap-2">
          {roleAssignments.map((assignment, index) => {
            const scopeType = assignment.scope_type || roleScopeMap[assignment.role] || 'office'
            const needsTeam = scopeType === 'site' || scopeType === 'client_site'
            const scopeLabel = scopeLabelMap[scopeType] || scopeType
            return (
              <CRow
                key={`assignment-${index}`}
                className={`g-3 align-items-end mx-0 px-0 py-1 ${index > 0 ? 'border-top pt-3' : ''}`}
              >
                <CCol xs={12} className="d-flex justify-content-between align-items-center">
                  <span className="small fw-semibold text-body-secondary">
                    Assignment {index + 1}
                  </span>
                  <CButton
                    type="button"
                    size="sm"
                    color="danger"
                    variant="outline"
                    disabled={submitStatus.loading || roleAssignments.length <= 1}
                    onClick={() => onRemoveAssignment(index)}
                    className="d-inline-flex align-items-center"
                  >
                    <Trash2 size={14} className="me-1" />
                    Remove
                  </CButton>
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="small">Role</CFormLabel>
                  <CFormSelect
                    value={assignment.role}
                    onChange={(e) => onChangeAssignment(index, 'role', e.target.value)}
                    disabled={submitStatus.loading}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="small">Scope</CFormLabel>
                  <CFormInput value={scopeLabel} disabled readOnly />
                </CCol>
                {needsTeam && (
                  <CCol md={6}>
                    <CFormLabel className="small">
                      Team <span className="text-muted fw-normal">(optional — assign later)</span>
                    </CFormLabel>
                    <CFormSelect
                      value={assignment.team_id || ''}
                      onChange={(e) => onChangeAssignment(index, 'team_id', e.target.value || null)}
                      disabled={submitStatus.loading}
                    >
                      <option value="">Unassigned</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                )}
                <CCol md={needsTeam ? 6 : 12}>
                  <CFormLabel className="small">Start date</CFormLabel>
                  <CFormInput
                    type="date"
                    value={assignment.start_date || ''}
                    onChange={(e) => onChangeAssignment(index, 'start_date', e.target.value)}
                    disabled={submitStatus.loading}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="small d-block">Primary</CFormLabel>
                  <CFormCheck
                    id={`primary-assignment-${index}`}
                    label="Use as primary role"
                    checked={!!assignment.is_primary}
                    disabled={submitStatus.loading}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChangeAssignment(index, 'is_primary', true)
                      }
                    }}
                  />
                </CCol>
              </CRow>
            )
          })}
        </div>
      </div>

      <div className="d-flex gap-2">
        <CButton type="submit" color="primary" size="sm" disabled={submitStatus.loading}>
          {submitStatus.loading ? <ButtonLoader label="Creating..." /> : 'Create User'}
        </CButton>
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          size="sm"
          disabled={submitStatus.loading}
          onClick={onCancel}
        >
          Cancel
        </CButton>
      </div>
    </CForm>
  )
}

export default CreateStaffForm
