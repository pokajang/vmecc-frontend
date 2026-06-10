import { useEffect, useState } from 'react'
import {
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

const DeleteTeamModal = ({ visible, team, onClose, onDeleted }) => {
  const [checks, setChecks] = useState({ members: false, naming: false, irreversible: false })
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  // Reset state every time the modal is opened
  useEffect(() => {
    if (visible) {
      setChecks({ members: false, naming: false, irreversible: false })
      setError(null)
    }
  }, [visible])

  const activeCount = (team?.members || []).length
  const allChecked = checks.members && checks.naming && checks.irreversible

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
      await deleteTeam(team.id)
      setChecks({ members: false, naming: false, irreversible: false })
      onDeleted?.(team.id)
    } catch (err) {
      setError(err.payload?.message || 'Unable to delete team. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <CModal visible={visible} onClose={handleClose} alignment="center">
      <CModalHeader>
        <CModalTitle className="text-danger">
          Delete {team?.name || 'Team'}
        </CModalTitle>
      </CModalHeader>

      <CModalBody>
        {activeCount > 0 && (
          <div
            className="rounded-2 px-3 py-2 mb-3"
            style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
          >
            This team has <strong>{activeCount} active {activeCount === 1 ? 'member' : 'members'}</strong> who will be notified.
          </div>
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
                ? `${activeCount} active ${activeCount === 1 ? 'member' : 'members'} will be unassigned from this team and notified by email.`
                : 'All team member records will be permanently removed.'
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
          <div className="mt-3 text-danger">{error}</div>
        )}
      </CModalBody>

      <CModalFooter>
        <CButton color="light" disabled={deleting} onClick={handleClose}>
          Cancel
        </CButton>
        <CButton
          color="danger"
          disabled={!allChecked || deleting}
          onClick={handleDelete}
        >
          {deleting ? <ButtonLoader label="Deleting..." /> : 'Permanently delete'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default DeleteTeamModal
