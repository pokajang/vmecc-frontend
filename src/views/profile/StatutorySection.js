import React, { useState } from 'react'
import { CCard, CCardBody, CCardHeader, CFormInput } from '@coreui/react'
import { useDispatch } from 'react-redux'
import EditControls from 'src/components/EditControls'
import useAutoStatus from 'src/hooks/useAutoStatus'
import { updateProfile } from 'src/services/apiClient'

const sanitizeReference = (value = '') =>
  String(value || '')
    .trim()
    .slice(0, 100)

const StatutorySection = ({ statutory }) => {
  const dispatch = useDispatch()
  const [editMode, setEditMode] = useState(false)
  const safeStatutory = statutory ?? {}
  const [form, setForm] = useState({
    epfNo: safeStatutory.epfNo || '',
    perkesoNo: safeStatutory.perkesoNo || '',
    incomeTaxNo: safeStatutory.incomeTaxNo || '',
  })
  const [status, setStatus] = useAutoStatus()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: sanitizeReference(value) }))
  }

  const handleSave = async () => {
    if (status.loading) return
    setStatus({ loading: true, message: null, type: null })
    try {
      const payload = {
        epfNo: sanitizeReference(form.epfNo),
        perkesoNo: sanitizeReference(form.perkesoNo),
        incomeTaxNo: sanitizeReference(form.incomeTaxNo),
      }
      const response = await updateProfile({ statutory_info: payload })
      dispatch({ type: 'set', authUser: response?.user || null })
      setStatus({ loading: false, message: 'Statutory info updated.', type: 'success' })
      setEditMode(false)
    } catch (err) {
      setStatus({
        loading: false,
        message: err.payload?.message || err.message || 'Unable to update statutory info.',
        type: 'danger',
      })
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setForm({
      epfNo: safeStatutory.epfNo || '',
      perkesoNo: safeStatutory.perkesoNo || '',
      incomeTaxNo: safeStatutory.incomeTaxNo || '',
    })
    setStatus({ loading: false, message: null, type: null })
  }

  const handleStartEdit = () => {
    setForm({
      epfNo: safeStatutory.epfNo || '',
      perkesoNo: safeStatutory.perkesoNo || '',
      incomeTaxNo: safeStatutory.incomeTaxNo || '',
    })
    setEditMode(true)
    setStatus({ loading: false, message: null, type: null })
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
        <span>Statutory Info</span>
        <EditControls
          editMode={editMode}
          loading={status.loading}
          onEdit={handleStartEdit}
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
          'EPF number',
          editMode ? (
            <CFormInput
              size="sm"
              name="epfNo"
              value={form.epfNo}
              onChange={handleChange}
              disabled={status.loading}
              placeholder="EPF member number"
            />
          ) : (
            safeStatutory.epfNo || '--'
          ),
        )}
        {renderRow(
          'PERKESO number',
          editMode ? (
            <CFormInput
              size="sm"
              name="perkesoNo"
              value={form.perkesoNo}
              onChange={handleChange}
              disabled={status.loading}
              placeholder="PERKESO/SOCSO reference"
            />
          ) : (
            safeStatutory.perkesoNo || '--'
          ),
        )}
        {renderRow(
          'Income tax number',
          editMode ? (
            <CFormInput
              size="sm"
              name="incomeTaxNo"
              value={form.incomeTaxNo}
              onChange={handleChange}
              disabled={status.loading}
              placeholder="LHDN tax file number"
            />
          ) : (
            safeStatutory.incomeTaxNo || '--'
          ),
        )}
      </CCardBody>
    </CCard>
  )
}

export default StatutorySection
