import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'
import PropTypes from 'prop-types'
import { cancelDutyCoverage, createDutyCoverage, fetchDutyCoverage } from 'src/services/apiClient'
import { TEAM_ELIGIBLE_ROLES } from './teamRoleUtils'

const localDateTimeValue = (date) => {
  const value = new Date(date)
  const offset = value.getTimezoneOffset() * 60_000
  return new Date(value.getTime() - offset).toISOString().slice(0, 16)
}

const initialWindow = () => {
  const start = new Date()
  start.setSeconds(0, 0)
  const end = new Date(start.getTime() + 8 * 60 * 60 * 1000)

  return {
    user_id: '',
    acting_team_id: '',
    acting_role: '',
    replaces_user_id: '',
    effective_from: localDateTimeValue(start),
    effective_until: localDateTimeValue(end),
    reason: '',
  }
}

const statusColor = {
  active: 'success',
  scheduled: 'info',
  expired: 'secondary',
  cancelled: 'secondary',
}

const DutyCoveragePanel = ({ teams, memberOptions, onChanged }) => {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(initialWindow)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)

  const loadCoverage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchDutyCoverage({ perPage: 100 })
      setRows(response?.data || [])
    } catch (requestError) {
      setError(requestError?.payload?.message || 'Unable to load duty coverage.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCoverage()
  }, [loadCoverage])

  const selectedUser = memberOptions.find((user) => String(user.id) === String(form.user_id))
  const eligibleRoles = useMemo(
    () =>
      (selectedUser?.roles || [])
        .filter((role) => TEAM_ELIGIBLE_ROLES.includes(String(role).toLowerCase()))
        .sort((left, right) => left.localeCompare(right)),
    [selectedUser],
  )
  const actingTeam = teams.find((team) => String(team.id) === String(form.acting_team_id))
  const replacementOptions = (actingTeam?.members || []).filter(
    (member) =>
      member.user_id &&
      String(member.user_id) !== String(form.user_id) &&
      String(member.role || '').toLowerCase() === String(form.acting_role).toLowerCase(),
  )

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'user_id' ? { acting_role: '', replaces_user_id: '' } : {}),
      ...(name === 'acting_team_id' || name === 'acting_role' ? { replaces_user_id: '' } : {}),
    }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createDutyCoverage({
        ...form,
        user_id: Number(form.user_id),
        acting_team_id: Number(form.acting_team_id),
        replaces_user_id: form.replaces_user_id ? Number(form.replaces_user_id) : null,
        effective_from: new Date(form.effective_from).toISOString(),
        effective_until: new Date(form.effective_until).toISOString(),
      })
      setForm(initialWindow())
      await loadCoverage()
      onChanged?.()
    } catch (requestError) {
      const validation = requestError?.payload?.errors
      const firstValidationMessage = validation
        ? Object.values(validation).flat().find(Boolean)
        : null
      setError(
        firstValidationMessage || requestError?.payload?.message || 'Unable to save duty coverage.',
      )
    } finally {
      setSaving(false)
    }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    setSaving(true)
    setError(null)
    try {
      await cancelDutyCoverage(cancelTarget.id, 'Cancelled by team manager.')
      setCancelTarget(null)
      await loadCoverage()
      onChanged?.()
    } catch (requestError) {
      setError(requestError?.payload?.message || 'Unable to cancel duty coverage.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <CCard className="mb-4" data-testid="duty-coverage-panel">
        <CCardHeader>
          <div className="fw-semibold">Temporary duty coverage</div>
          <div className="small text-body-secondary mt-1">
            Assign a qualified staff member to act on another team for a fixed window.
          </div>
        </CCardHeader>
        <CCardBody>
          {error && <CAlert color="danger">{error}</CAlert>}
          <CForm onSubmit={submit}>
            <CRow className="g-3 align-items-end">
              <CCol xs={12} md={6} xl={3}>
                <CFormLabel htmlFor="coverage-user">Substitute</CFormLabel>
                <CFormSelect
                  id="coverage-user"
                  name="user_id"
                  value={form.user_id}
                  onChange={updateField}
                  required
                >
                  <option value="">Select staff</option>
                  {memberOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={6} xl={3}>
                <CFormLabel htmlFor="coverage-team">Acting team</CFormLabel>
                <CFormSelect
                  id="coverage-team"
                  name="acting_team_id"
                  value={form.acting_team_id}
                  onChange={updateField}
                  required
                >
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={6} xl={3}>
                <CFormLabel htmlFor="coverage-role">Acting role</CFormLabel>
                <CFormSelect
                  id="coverage-role"
                  name="acting_role"
                  value={form.acting_role}
                  onChange={updateField}
                  disabled={!selectedUser}
                  required
                >
                  <option value="">Select qualified role</option>
                  {eligibleRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={6} xl={3}>
                <CFormLabel htmlFor="coverage-replacement">Replacing</CFormLabel>
                <CFormSelect
                  id="coverage-replacement"
                  name="replaces_user_id"
                  value={form.replaces_user_id}
                  onChange={updateField}
                  disabled={!form.acting_team_id || !form.acting_role}
                >
                  <option value="">Vacancy / no named replacement</option>
                  {replacementOptions.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={6} xl={3}>
                <CFormLabel htmlFor="coverage-start">Starts</CFormLabel>
                <CFormInput
                  id="coverage-start"
                  name="effective_from"
                  type="datetime-local"
                  value={form.effective_from}
                  onChange={updateField}
                  required
                />
              </CCol>
              <CCol xs={12} md={6} xl={3}>
                <CFormLabel htmlFor="coverage-end">Ends</CFormLabel>
                <CFormInput
                  id="coverage-end"
                  name="effective_until"
                  type="datetime-local"
                  value={form.effective_until}
                  min={form.effective_from}
                  onChange={updateField}
                  required
                />
              </CCol>
              <CCol xs={12} md={8} xl={4}>
                <CFormLabel htmlFor="coverage-reason">Reason</CFormLabel>
                <CFormInput
                  id="coverage-reason"
                  name="reason"
                  value={form.reason}
                  onChange={updateField}
                  placeholder="Shift substitution, leave cover, or deployment"
                />
              </CCol>
              <CCol xs={12} md={4} xl={2}>
                <CButton type="submit" color="primary" className="w-100" disabled={saving}>
                  {saving ? <CSpinner size="sm" aria-label="Saving coverage" /> : 'Add coverage'}
                </CButton>
              </CCol>
            </CRow>
          </CForm>

          <div className="border-top mt-4 pt-3">
            <div className="fw-semibold mb-2">Coverage schedule</div>
            {loading ? (
              <div className="text-body-secondary small">Loading duty coverage...</div>
            ) : rows.length === 0 ? (
              <div className="text-body-secondary small">No duty coverage has been scheduled.</div>
            ) : (
              <div className="d-grid gap-2">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="border rounded-3 p-3 d-flex flex-column flex-lg-row gap-2 justify-content-between"
                  >
                    <div>
                      <div className="fw-semibold">
                        {row.user?.name} · {row.actingRole}
                      </div>
                      <div className="small text-body-secondary">
                        {row.homeTeam?.name || 'No home team'} → {row.actingTeam?.name}
                        {row.replacesUser?.name ? ` · replacing ${row.replacesUser.name}` : ''}
                      </div>
                      <div className="small text-body-secondary mt-1">
                        {new Date(row.effectiveFrom).toLocaleString()} –{' '}
                        {new Date(row.effectiveUntil).toLocaleString()}
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <CBadge color={statusColor[row.status] || 'secondary'}>{row.status}</CBadge>
                      {!['cancelled', 'expired'].includes(row.status) && (
                        <CButton
                          size="sm"
                          color="danger"
                          variant="outline"
                          onClick={() => setCancelTarget(row)}
                        >
                          Cancel
                        </CButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CCardBody>
      </CCard>

      <CModal visible={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)}>
        <CModalHeader>
          <CModalTitle>Cancel duty coverage?</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {cancelTarget
            ? `${cancelTarget.user?.name}'s coverage for ${cancelTarget.actingTeam?.name} will stop immediately.`
            : ''}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setCancelTarget(null)}>
            Keep coverage
          </CButton>
          <CButton color="danger" onClick={confirmCancel} disabled={saving}>
            Cancel coverage
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

DutyCoveragePanel.propTypes = {
  teams: PropTypes.arrayOf(PropTypes.object).isRequired,
  memberOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChanged: PropTypes.func,
}

export default DutyCoveragePanel
