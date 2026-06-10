import React, { useEffect, useState } from 'react'
import { CAlert, CCard, CCardBody, CCardHeader, CFormInput, CFormTextarea } from '@coreui/react'
import { useDispatch } from 'react-redux'
import EditControls from 'src/components/EditControls'
import useAutoStatus from 'src/hooks/useAutoStatus'
import { updateProfile } from 'src/services/apiClient'

const toListString = (arr) => (Array.isArray(arr) ? arr.join(', ') : '')
const toListArray = (value) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

const MedicalSection = ({ medical = {} }) => {
  const dispatch = useDispatch()
  const [showNotice, setShowNotice] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [status, setStatus] = useAutoStatus()

  const [form, setForm] = useState({
    bloodType: '-',
    allergies: '',
    conditions: '',
    medications: '',
    notes: '',
  })

  useEffect(() => {
    const m = medical || {}
    setForm({
      bloodType: m.bloodType || '',
      allergies: toListString(m.allergies || []),
      conditions: toListString(m.conditions || []),
      medications: toListString(m.medications || []),
      notes: m.notes || '',
    })
  }, [medical])

  const renderRow = (label, content) => (
    <div className="d-flex justify-content-between align-items-center">
      <span className="text-muted">{label}</span>
      <span className="ms-3 text-end">{content}</span>
    </div>
  )

  const renderList = (items) => {
    if (!items || items.length === 0) return '--'
    return items.join(', ')
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (status.loading) return
    setStatus({ loading: true, message: null, type: null })
    try {
      const payload = {
        bloodType: form.bloodType || '',
        allergies: toListArray(form.allergies || ''),
        conditions: toListArray(form.conditions || ''),
        medications: toListArray(form.medications || ''),
        notes: form.notes || '',
      }
      const response = await updateProfile({ medical_info: payload })
      dispatch({ type: 'set', authUser: response?.user || null })
      setStatus({ loading: false, message: 'Medical info updated.', type: 'success' })
      setEditMode(false)
    } catch (err) {
      setStatus({
        loading: false,
        message: err.payload?.message || err.message || 'Unable to update medical info.',
        type: 'danger',
      })
    }
  }

  const handleCancel = () => {
    const m = medical || {}
    setForm({
      bloodType: m.bloodType || '',
      allergies: toListString(m.allergies || []),
      conditions: toListString(m.conditions || []),
      medications: toListString(m.medications || []),
      notes: m.notes || '',
    })
    setStatus({ loading: false, message: null, type: null })
    setEditMode(false)
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Critical Medical Info</span>
        <EditControls
          editMode={editMode}
          loading={status.loading}
          onEdit={() => setEditMode(true)}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </CCardHeader>
      <CCardBody className="d-grid gap-3">
        <CAlert
          color="warning"
          className="mb-1"
          visible={showNotice}
          dismissible
          onClose={() => setShowNotice(false)}
        >
          <strong>Notice:</strong> Declaring accurate medical info helps us arrange better welfare,
          safety, and health support at work.
        </CAlert>
        {status.message && (
          <div className={`text-${status.type === 'danger' ? 'danger' : 'success'} small`}>
            {status.message}
          </div>
        )}
        {renderRow(
          'Blood type',
          editMode ? (
            <CFormInput
              size="sm"
              name="bloodType"
              value={form.bloodType}
              onChange={handleChange}
              disabled={status.loading}
              placeholder="e.g., A+, O-, AB"
            />
          ) : (
            form.bloodType || '--'
          ),
        )}
        {renderRow(
          'Allergies',
          editMode ? (
            <CFormInput
              size="sm"
              name="allergies"
              value={form.allergies}
              onChange={handleChange}
              disabled={status.loading}
              placeholder="e.g., peanuts, penicillin"
            />
          ) : (
            renderList(toListArray(form.allergies))
          ),
        )}
        {renderRow(
          'Conditions',
          editMode ? (
            <CFormInput
              size="sm"
              name="conditions"
              value={form.conditions}
              onChange={handleChange}
              disabled={status.loading}
              placeholder="e.g., asthma, hypertension"
            />
          ) : (
            renderList(toListArray(form.conditions))
          ),
        )}
        {renderRow(
          'Medications',
          editMode ? (
            <CFormInput
              size="sm"
              name="medications"
              value={form.medications}
              onChange={handleChange}
              disabled={status.loading}
              placeholder="e.g., ibuprofen, metformin"
            />
          ) : (
            renderList(toListArray(form.medications))
          ),
        )}
        <div>
          <span className="text-muted d-block mb-1">Notes</span>
          {editMode ? (
            <CFormTextarea
              rows={3}
              name="notes"
              value={form.notes}
              onChange={handleChange}
              disabled={status.loading}
              placeholder="Additional details that may help in emergencies"
            />
          ) : (
            <div className="border rounded p-2 bg-body-secondary text-body">
              {form.notes ? form.notes : '--'}
            </div>
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}

export default MedicalSection
