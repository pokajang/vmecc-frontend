import React, { useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSelect,
  CFormTextarea,
} from '@coreui/react'
import { useDispatch } from 'react-redux'
import EditControls from 'src/components/EditControls'
import { updateProfile } from 'src/services/apiClient'
import useAutoStatus from 'src/hooks/useAutoStatus'

const relationshipOptions = [
  'Spouse',
  'Mother',
  'Father',
  'Sibling',
  'Child',
  'Uncle',
  'Aunt',
  'Guardian',
  'Friend',
  'Other',
]

const formatMobile = (value) => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
}

const normalizeContactForm = (contact = {}) => ({
  name: contact.name || '',
  relationship: contact.relationship || '',
  phone: formatMobile(contact.phone || ''),
  email: contact.email || '',
  address: contact.address || '',
})

const EmergencySection = ({ contact }) => {
  const dispatch = useDispatch()
  const [editMode, setEditMode] = useState(false)
  const safeContact = contact ?? {}
  const [form, setForm] = useState(() => normalizeContactForm(safeContact))
  const [status, setStatus] = useAutoStatus()

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'phone') {
      setForm((prev) => ({ ...prev, phone: formatMobile(value) }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (status.loading) return
    setStatus({ loading: true, message: null, type: null })
    try {
      const response = await updateProfile({ emergency_contact: form })
      dispatch({
        type: 'set',
        authUser: response?.user || null,
      })
      setStatus({ loading: false, message: 'Emergency contact updated.', type: 'success' })
      setEditMode(false)
    } catch (err) {
      setStatus({
        loading: false,
        message: err.payload?.message || err.message || 'Unable to update emergency contact.',
        type: 'danger',
      })
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setForm(normalizeContactForm(safeContact))
    setStatus({ loading: false, message: null, type: null })
  }

  const handleEdit = () => {
    setForm(normalizeContactForm(safeContact))
    setEditMode(true)
  }

  const renderRow = (label, content) => (
    <div className="d-flex justify-content-between align-items-center">
      <span className="text-muted">{label}</span>
      <span className="ms-3 text-end">{content}</span>
    </div>
  )

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Emergency Contact</span>
        <EditControls
          editMode={editMode}
          loading={status.loading}
          onEdit={handleEdit}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </CCardHeader>
      <CCardBody className="d-grid gap-3">
        {status.message && (
          <div className={`text-${status.type === 'danger' ? 'danger' : 'success'} small`}>
            {status.message}
          </div>
        )}
        {renderRow(
          'Name',
          editMode ? (
            <CFormInput
              size="sm"
              name="name"
              value={form.name}
              onChange={handleChange}
              disabled={status.loading}
            />
          ) : (
            safeContact.name || '—'
          ),
        )}
        {renderRow(
          'Relationship',
          editMode ? (
            <CFormSelect
              size="sm"
              name="relationship"
              value={form.relationship}
              onChange={handleChange}
              disabled={status.loading}
            >
              <option value="">Select relationship</option>
              {relationshipOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </CFormSelect>
          ) : (
            safeContact.relationship || '—'
          ),
        )}
        {renderRow(
          'Mobile number',
          editMode ? (
            <CFormInput
              size="sm"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              disabled={status.loading}
              inputMode="tel"
              pattern="[0-9\\s]*"
              placeholder="012 3456 789"
            />
          ) : (
            safeContact.phone || '—'
          ),
        )}
        {renderRow(
          'Email',
          editMode ? (
            <CFormInput
              size="sm"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              disabled={status.loading}
            />
          ) : (
            safeContact.email || '—'
          ),
        )}
        {renderRow(
          'Home Address',
          editMode ? (
            <CFormTextarea
              rows={2}
              name="address"
              value={form.address}
              onChange={handleChange}
              disabled={status.loading}
            />
          ) : (
            safeContact.address || '—'
          ),
        )}
      </CCardBody>
    </CCard>
  )
}

export default EmergencySection
