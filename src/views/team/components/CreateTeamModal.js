import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormCheck,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { Plus, Trash2 } from 'lucide-react'
import ButtonLoader from 'src/components/ButtonLoader'

const DEFAULT_TEAMS = ['Alpha', 'Bravo', 'Charlie', 'Delta']

const CreateTeamModal = ({ visible, onClose, onSaved, existingTeams = [] }) => {
  const existingNamesLower = existingTeams.map((n) => n.toLowerCase())
  const isExisting = (name) => existingNamesLower.includes(name.toLowerCase())

  const [selected, setSelected] = useState(new Set())
  const [customTeams, setCustomTeams] = useState([])
  const [customInput, setCustomInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Reset state when modal opens
  useEffect(() => {
    if (!visible) return
    const initial = new Set(DEFAULT_TEAMS.filter((n) => !isExisting(n)))
    setSelected(initial)
    setCustomTeams([])
    setCustomInput('')
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const toggleDefault = (name) => {
    if (isExisting(name)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const addCustom = () => {
    const name = customInput.trim()
    if (!name) return
    const allNames = [...DEFAULT_TEAMS, ...customTeams].map((n) => n.toLowerCase())
    if (allNames.includes(name.toLowerCase()) || isExisting(name)) {
      setError(`"${name}" is already in the list.`)
      return
    }
    setError(null)
    setCustomTeams((prev) => [...prev, name])
    setSelected((prev) => new Set([...prev, name]))
    setCustomInput('')
  }

  const removeCustom = (name) => {
    setCustomTeams((prev) => prev.filter((t) => t !== name))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }

  // Only count genuinely new teams (not existing)
  const newSelected = [...selected].filter((n) => !isExisting(n))

  const handleSubmit = async () => {
    if (newSelected.length === 0) {
      setError('Select at least one new team to create.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSaved(newSelected)
    } catch (err) {
      setError(err?.payload?.message || err?.message || 'Failed to create teams.')
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  return (
    <CModal visible={visible} onClose={handleClose} alignment="center">
      <CModalHeader>
        <CModalTitle>Add Teams</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        {error && (
          <CAlert color="danger" className="mb-0">
            {error}
          </CAlert>
        )}

        <div>
          <div className="text-body-secondary small mb-2">Default teams</div>
          <div className="d-grid gap-2">
            {DEFAULT_TEAMS.map((name) => {
              const exists = isExisting(name)
              return (
                <CFormCheck
                  key={name}
                  id={`team-${name}`}
                  label={
                    <span className={exists ? 'text-body-secondary' : ''}>
                      {name}
                      {exists && (
                        <span className="ms-2 small text-body-secondary">(already exists)</span>
                      )}
                    </span>
                  }
                  checked={exists || selected.has(name)}
                  disabled={exists}
                  onChange={() => toggleDefault(name)}
                />
              )
            })}
          </div>
        </div>

        <div>
          <div className="text-body-secondary small mb-2">Custom teams</div>
          <div className="d-flex gap-2 mb-2">
            <CFormInput
              size="sm"
              placeholder="Team name"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            />
            <CButton size="sm" color="secondary" variant="outline" onClick={addCustom}>
              <Plus size={14} />
            </CButton>
          </div>
          {customTeams.length > 0 && (
            <div className="d-grid gap-2">
              {customTeams.map((name) => (
                <div key={name} className="d-flex align-items-center justify-content-between gap-2">
                  <CFormCheck
                    id={`team-custom-${name}`}
                    label={name}
                    checked={selected.has(name)}
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev)
                        if (next.has(name)) next.delete(name)
                        else next.add(name)
                        return next
                      })
                    }}
                  />
                  <CButton
                    size="sm"
                    color="danger"
                    variant="ghost"
                    className="p-0 border-0 text-danger"
                    onClick={() => removeCustom(name)}
                  >
                    <Trash2 size={14} />
                  </CButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={handleClose}
          disabled={submitting}
        >
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || newSelected.length === 0}
        >
          {submitting ? (
            <ButtonLoader label="Creating..." />
          ) : newSelected.length > 0 ? (
            `Create (${newSelected.length})`
          ) : (
            'Create'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default CreateTeamModal
