import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'
import { createTeamRoleTransfer, fetchTeamRoleTransferOptions } from 'src/services/apiClient'

const TeamRoleTransferPanel = ({ teams, onChanged }) => {
  const [assignments, setAssignments] = useState([])
  const [effectiveDate, setEffectiveDate] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [selection, setSelection] = useState('')
  const [targetTeamId, setTargetTeamId] = useState('')
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchTeamRoleTransferOptions()
      .then((response) => {
        if (!cancelled) {
          setAssignments(Array.isArray(response?.data) ? response.data : [])
          setEffectiveDate(String(response?.meta?.effectiveDate || ''))
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setAssignments([])
          setError(requestError?.payload?.message || 'Unable to load transferable assignments.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const selectableAssignments = useMemo(
    () =>
      assignments.map((assignment) => ({
        ...assignment,
        value: `${assignment.userId}:${assignment.assignmentId}`,
      })),
    [assignments],
  )
  const selected = selectableAssignments.find((row) => row.value === selection) || null
  const targetTeams = teams.filter((team) => Number(team.id) !== Number(selected?.teamId))
  const targetTeam = targetTeams.find((team) => Number(team.id) === Number(targetTeamId))

  const requestConfirmation = (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!selected || !targetTeamId || !effectiveDate || !reason.trim()) {
      setError('Select an assignment and destination team, then provide a transfer reason.')
      return
    }
    setConfirming(true)
  }

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      const response = await createTeamRoleTransfer(selected.userId, {
        assignment_id: selected.assignmentId,
        target_team_id: Number(targetTeamId),
        effective_date: effectiveDate,
        reason: reason.trim(),
      })
      const handoverCount = Number(response?.data?.handoverCount || 0)
      setSuccess(
        `Transferred ${selected.userName} to ${targetTeam?.name}. ${handoverCount} pending ${
          handoverCount === 1 ? 'action was' : 'actions were'
        } handed over.`,
      )
      setSelection('')
      setTargetTeamId('')
      setReason('')
      setConfirming(false)
      await onChanged?.()
      const optionsResponse = await fetchTeamRoleTransferOptions()
      setAssignments(Array.isArray(optionsResponse?.data) ? optionsResponse.data : [])
      setEffectiveDate(String(optionsResponse?.meta?.effectiveDate || ''))
    } catch (requestError) {
      const validation = requestError?.payload?.errors || {}
      const firstMessage = Object.values(validation).flat().find(Boolean)
      setError(firstMessage || requestError?.payload?.message || 'Unable to transfer assignment.')
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <CCard className="mb-4" data-testid="team-role-transfer-panel">
        <CCardHeader>
          <div className="fw-semibold">Permanent team transfer</div>
        </CCardHeader>
        <CCardBody>
          {error && <CAlert color="danger">{error}</CAlert>}
          {success && <CAlert color="success">{success}</CAlert>}
          <CForm onSubmit={requestConfirmation}>
            <CRow className="g-3">
              <CCol xs={12} lg={5}>
                <CFormLabel htmlFor="team-transfer-assignment">Person and assignment</CFormLabel>
                <CFormSelect
                  id="team-transfer-assignment"
                  value={selection}
                  onChange={(event) => {
                    setSelection(event.target.value)
                    setTargetTeamId('')
                  }}
                >
                  <option value="">
                    {loadingOptions
                      ? 'Loading transferable assignments...'
                      : 'Select an active AIC or TRT assignment'}
                  </option>
                  {selectableAssignments.map((assignment) => (
                    <option key={assignment.value} value={assignment.value}>
                      {assignment.userName} · {assignment.role} · {assignment.teamName}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} lg={3}>
                <CFormLabel htmlFor="team-transfer-target">Destination team</CFormLabel>
                <CFormSelect
                  id="team-transfer-target"
                  value={targetTeamId}
                  disabled={!selected}
                  onChange={(event) => setTargetTeamId(event.target.value)}
                >
                  <option value="">Select destination</option>
                  {targetTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} lg={4}>
                <CFormLabel htmlFor="team-transfer-reason">Reason</CFormLabel>
                <CFormTextarea
                  id="team-transfer-reason"
                  rows={2}
                  value={reason}
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Operational reason for the permanent move"
                />
              </CCol>
              <CCol xs={12} className="d-flex justify-content-end">
                <CButton
                  type="submit"
                  color="primary"
                  disabled={saving || loadingOptions || selectableAssignments.length === 0}
                >
                  Review transfer
                </CButton>
              </CCol>
            </CRow>
          </CForm>
        </CCardBody>
      </CCard>

      <CModal visible={confirming} onClose={() => !saving && setConfirming(false)}>
        <CModalHeader>
          <CModalTitle>Confirm permanent transfer</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selected && targetTeam && (
            <>
              <p>
                Move <strong>{selected.userName}</strong> from <strong>{selected.teamName}</strong>{' '}
                to <strong>{targetTeam.name}</strong> as {selected.role}?
              </p>
              <p className="mb-0 text-body-secondary">
                Existing reports keep their team. Pending actions move to an eligible replacement;
                otherwise, nothing changes.
              </p>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            disabled={saving}
            onClick={() => setConfirming(false)}
          >
            Keep current assignment
          </CButton>
          <CButton color="primary" disabled={saving} onClick={submit}>
            {saving ? (
              <CSpinner size="sm" aria-label="Transferring assignment" />
            ) : (
              'Transfer assignment'
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

TeamRoleTransferPanel.propTypes = {
  teams: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChanged: PropTypes.func,
}

export default TeamRoleTransferPanel
