import React, { useState } from 'react'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CFormCheck,
  CFormInput,
  CFormTextarea,
} from '@coreui/react'
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

const normalizeMedicalInfo = (medical) =>
  medical && typeof medical === 'object' && !Array.isArray(medical) ? medical : {}

const normalizeMedicalForm = (medical = {}) => {
  const safeMedical = normalizeMedicalInfo(medical)
  return {
    noKnownCriticalMedicalInfo: safeMedical.noKnownCriticalMedicalInfo === true,
    bloodType: safeMedical.bloodType || '',
    allergies: toListString(safeMedical.allergies || []),
    conditions: toListString(safeMedical.conditions || []),
    medications: toListString(safeMedical.medications || []),
    notes: safeMedical.notes || '',
  }
}

const MedicalSection = ({ medical = {} }) => {
  const safeMedical = normalizeMedicalInfo(medical)
  const dispatch = useDispatch()
  const [showNotice, setShowNotice] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [status, setStatus] = useAutoStatus()

  const [form, setForm] = useState(() => normalizeMedicalForm(medical))

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

  const handleSave = async () => {
    if (status.loading) return
    setStatus({ loading: true, message: null, type: null })
    try {
      const payload = {
        noKnownCriticalMedicalInfo: form.noKnownCriticalMedicalInfo === true,
        bloodType: form.noKnownCriticalMedicalInfo ? '' : form.bloodType || '',
        allergies: form.noKnownCriticalMedicalInfo ? [] : toListArray(form.allergies || ''),
        conditions: form.noKnownCriticalMedicalInfo ? [] : toListArray(form.conditions || ''),
        medications: form.noKnownCriticalMedicalInfo ? [] : toListArray(form.medications || ''),
        notes: form.noKnownCriticalMedicalInfo ? '' : form.notes || '',
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
    setForm(normalizeMedicalForm(medical))
    setStatus({ loading: false, message: null, type: null })
    setEditMode(false)
  }

  const handleEdit = () => {
    setForm(normalizeMedicalForm(medical))
    setEditMode(true)
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Critical Medical Info</span>
        <EditControls
          editMode={editMode}
          loading={status.loading}
          onEdit={handleEdit}
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
          'Acknowledgement',
          editMode ? (
            <CFormCheck
              id="profile-no-known-medical-info"
              label="No known critical medical info"
              checked={form.noKnownCriticalMedicalInfo}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  noKnownCriticalMedicalInfo: e.target.checked,
                  ...(e.target.checked
                    ? {
                        bloodType: '',
                        allergies: '',
                        conditions: '',
                        medications: '',
                        notes: '',
                      }
                    : {}),
                }))
              }
              disabled={status.loading}
            />
          ) : safeMedical.noKnownCriticalMedicalInfo === true ? (
            'No known critical medical info'
          ) : (
            '--'
          ),
        )}
        {renderRow(
          'Blood type',
          editMode ? (
            <CFormInput
              size="sm"
              name="bloodType"
              value={form.bloodType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  noKnownCriticalMedicalInfo: false,
                  bloodType: e.target.value,
                }))
              }
              disabled={status.loading || form.noKnownCriticalMedicalInfo}
              placeholder="e.g., A+, O-, AB"
            />
          ) : (
            safeMedical.bloodType || '--'
          ),
        )}
        {renderRow(
          'Allergies',
          editMode ? (
            <CFormInput
              size="sm"
              name="allergies"
              value={form.allergies}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  noKnownCriticalMedicalInfo: false,
                  allergies: e.target.value,
                }))
              }
              disabled={status.loading || form.noKnownCriticalMedicalInfo}
              placeholder="e.g., peanuts, penicillin"
            />
          ) : (
            renderList(safeMedical.allergies || [])
          ),
        )}
        {renderRow(
          'Conditions',
          editMode ? (
            <CFormInput
              size="sm"
              name="conditions"
              value={form.conditions}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  noKnownCriticalMedicalInfo: false,
                  conditions: e.target.value,
                }))
              }
              disabled={status.loading || form.noKnownCriticalMedicalInfo}
              placeholder="e.g., asthma, hypertension"
            />
          ) : (
            renderList(safeMedical.conditions || [])
          ),
        )}
        {renderRow(
          'Medications',
          editMode ? (
            <CFormInput
              size="sm"
              name="medications"
              value={form.medications}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  noKnownCriticalMedicalInfo: false,
                  medications: e.target.value,
                }))
              }
              disabled={status.loading || form.noKnownCriticalMedicalInfo}
              placeholder="e.g., ibuprofen, metformin"
            />
          ) : (
            renderList(safeMedical.medications || [])
          ),
        )}
        <div>
          <span className="text-muted d-block mb-1">Notes</span>
          {editMode ? (
            <CFormTextarea
              rows={3}
              name="notes"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  noKnownCriticalMedicalInfo: false,
                  notes: e.target.value,
                }))
              }
              disabled={status.loading || form.noKnownCriticalMedicalInfo}
              placeholder="Additional details that may help in emergencies"
            />
          ) : (
            <div className="border rounded p-2 bg-body-secondary text-body">
              {safeMedical.notes ? safeMedical.notes : '--'}
            </div>
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}

export default MedicalSection
