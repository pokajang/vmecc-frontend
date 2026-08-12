import { useState } from 'react'
import {
  CAlert,
  CButton,
  CFormCheck,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { deleteTeam } from 'src/services/apiClient'
import ButtonLoader from 'src/components/ButtonLoader'

const DeleteTeamModalContent = ({ visible, team, onClose, onDeleted }) => {
  const [checks, setChecks] = useState({ members: false, naming: false, irreversible: false })
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const activeCount = (team?.members || []).length
  const allChecked = activeCount === 0 && checks.members && checks.naming && checks.irreversible

  const toggle = (key) => setChecks((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleClose = () => {
    if (deleting) return
    setChecks({ members: false, naming: false, irreversible: false })
    setError(null)
    onClose?.()
  }

  const handleDelete = async () => {
    if (!team || !allChecked) return
    setDeleting(true)
    setError(null)
    try {
      await deleteTeam(team.id, {
        confirm_name: team.name,
        expected_updated_at: team.updated_at,
      })
      setChecks({ members: false, naming: false, irreversible: false })
      onDeleted?.(team.id)
    } catch (err) {
      const dependencyCounts = Object.entries(err.payload?.dependencies || {})
        .filter(([, count]) => Number(count) > 0)
        .map(([key, count]) => `${key.replaceAll('_', ' ')}: ${count}`)
        .join(', ')
      setError(
        dependencyCounts
          ? `${err.payload?.message || 'This team cannot be deleted.'} ${dependencyCounts}.`
          : err.payload?.message || 'Unable to delete team. Please try again.',
      )
      setDeleting(false)
    }
  }

  return (
    <CModal visible={visible} onClose={handleClose} alignment="center">
      <CModalHeader>
        <CModalTitle className="text-danger">Delete {team?.name || 'Team'}</CModalTitle>
      </CModalHeader>

      <CModalBody data-testid="team-directory-delete-modal">
        {activeCount > 0 && (
          <CAlert color="warning" className="mb-3">
            Deletion is blocked while this team has{' '}
            <strong>
              {activeCount} active {activeCount === 1 ? 'member' : 'members'}
            </strong>
            . Remove or transfer the assignments first.
          </CAlert>
        )}

        <p className="text-body-secondary mb-3">
          Please confirm you understand the following before proceeding:
        </p>

        <div className="d-grid gap-3">
          <CFormCheck
            id="check-members"
            checked={checks.members}
            onChange={() => toggle('members')}
            label={
              activeCount > 0
                ? `Remove or transfer the ${activeCount} active ${activeCount === 1 ? 'member' : 'members'} before deleting this team.`
                : 'The team has no member records or operational dependencies.'
            }
          />
          <CFormCheck
            id="check-naming"
            checked={checks.naming}
            onChange={() => toggle('naming')}
            label={`The name "${team?.name || 'this team'}" can be reused, but it will start as a fresh team with no history.`}
          />
          <CFormCheck
            id="check-irreversible"
            checked={checks.irreversible}
            onChange={() => toggle('irreversible')}
            label="This action cannot be undone."
          />
        </div>

        {error && (
          <CAlert color="danger" className="mt-3 mb-0" role="alert">
            {error}
          </CAlert>
        )}
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" variant="outline" disabled={deleting} onClick={handleClose}>
          Cancel
        </CButton>
        <CButton color="danger" disabled={!allChecked || deleting} onClick={handleDelete}>
          {deleting ? <ButtonLoader label="Deleting..." /> : 'Permanently delete'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

const DeleteTeamModal = (props) => (
  <DeleteTeamModalContent
    key={`${props.visible ? 'open' : 'closed'}-${props.team?.id ?? 'none'}`}
    {...props}
  />
)

export default DeleteTeamModal
