import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CFormInput, CFormTextarea } from '@coreui/react'
import EditControls from 'src/components/EditControls'
import FormActionGroup from 'src/components/FormActionGroup'
import TableLoader from 'src/components/TableLoader'
import useAutoStatus from 'src/hooks/useAutoStatus'
import { fetchPayrollCompanyProfile, savePayrollCompanyProfile } from 'src/services/apiClient'

const normalizeCompanyProfile = (value = {}) => ({
  legalName: String(value?.legalName || '').trim(),
  registrationNumber: String(value?.registrationNumber || '').trim(),
  myTaxNumber: String(value?.myTaxNumber || '').trim(),
  address: String(value?.address || '').trim(),
  email: String(value?.email || '').trim(),
  phone: String(value?.phone || '').trim(),
  financeContactName: String(value?.financeContactName || '').trim(),
  financeContactEmail: String(value?.financeContactEmail || '').trim(),
  financeContactPhone: String(value?.financeContactPhone || '').trim(),
  updatedAt: String(value?.updatedAt || '').trim(),
  updatedBy: String(value?.updatedBy || '').trim(),
  history: Array.isArray(value?.history)
    ? value.history
        .map((entry) => ({
          legalName: String(entry?.legalName || '').trim(),
          registrationNumber: String(entry?.registrationNumber || '').trim(),
          myTaxNumber: String(entry?.myTaxNumber || '').trim(),
          address: String(entry?.address || '').trim(),
          email: String(entry?.email || '').trim(),
          phone: String(entry?.phone || '').trim(),
          financeContactName: String(entry?.financeContactName || '').trim(),
          financeContactEmail: String(entry?.financeContactEmail || '').trim(),
          financeContactPhone: String(entry?.financeContactPhone || '').trim(),
          updatedAt: String(entry?.updatedAt || '').trim(),
          updatedBy: String(entry?.updatedBy || '').trim(),
        }))
        .filter((entry) => entry.updatedAt || entry.updatedBy)
    : [],
})

const formatReadableDateTime = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return '-'
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const CompanyLegalInfoTab = () => {
  const [editMode, setEditMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [savedProfile, setSavedProfile] = useState(() => normalizeCompanyProfile({}))
  const [form, setForm] = useState(() => normalizeCompanyProfile({}))
  const [status, setStatus] = useAutoStatus()
  const isMountedRef = useRef(true)

  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    [],
  )

  const hydrateProfile = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await fetchPayrollCompanyProfile()
      const normalized = normalizeCompanyProfile(result?.data || {})
      if (!isMountedRef.current) return
      setSavedProfile(normalized)
      setForm(normalized)
      setStatus({ loading: false, message: null, type: null })
    } catch (error) {
      if (!isMountedRef.current) return
      setStatus({
        loading: false,
        message: error?.payload?.message || error?.message || 'Unable to load company legal info.',
        type: 'danger',
      })
    } finally {
      if (!isMountedRef.current) return
      setIsLoading(false)
    }
  }, [setStatus])

  useEffect(() => {
    void hydrateProfile()
  }, [hydrateProfile])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleEdit = () => {
    setForm(savedProfile)
    setEditMode(true)
    setStatus({ loading: false, message: null, type: null })
  }

  const handleCancel = () => {
    setForm(savedProfile)
    setEditMode(false)
    setStatus({ loading: false, message: null, type: null })
  }

  const handleSave = async () => {
    if (status.loading) return
    setStatus({ loading: true, message: null, type: null })
    try {
      const payload = normalizeCompanyProfile(form)
      const response = await savePayrollCompanyProfile(payload)
      const normalized = normalizeCompanyProfile(response?.data || payload)
      if (!isMountedRef.current) return
      setSavedProfile(normalized)
      setForm(normalized)
      setEditMode(false)
      setStatus({
        loading: false,
        message: 'Company legal information updated.',
        type: 'success',
      })
    } catch (error) {
      if (!isMountedRef.current) return
      setStatus({
        loading: false,
        message:
          error?.payload?.message || error?.message || 'Unable to save company legal information.',
        type: 'danger',
      })
    }
  }

  const renderRow = (label, content) => (
    <div className="d-flex justify-content-between align-items-center">
      <span className="text-muted">{label}</span>
      <span className="ms-3 text-end">{content}</span>
    </div>
  )

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
          <span>Company Legal Information</span>
          {!editMode && (
            <EditControls
              editMode={false}
              loading={status.loading}
              onEdit={handleEdit}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
        </CCardHeader>
        <CCardBody className="d-grid gap-3">
          {isLoading ? (
            <TableLoader />
          ) : (
            <>
              {status.message && (
                <div className={`small text-${status.type === 'danger' ? 'danger' : 'success'}`}>
                  {status.message}
                </div>
              )}
              {renderRow(
                'Legal name',
                editMode ? (
                  <CFormInput
                    size="sm"
                    name="legalName"
                    value={form.legalName}
                    onChange={handleChange}
                    disabled={status.loading}
                  />
                ) : (
                  savedProfile.legalName || '--'
                ),
              )}
              {renderRow(
                'Registration number',
                editMode ? (
                  <CFormInput
                    size="sm"
                    name="registrationNumber"
                    value={form.registrationNumber}
                    onChange={handleChange}
                    disabled={status.loading}
                  />
                ) : (
                  savedProfile.registrationNumber || '--'
                ),
              )}
              {renderRow(
                'MYTax number',
                editMode ? (
                  <CFormInput
                    size="sm"
                    name="myTaxNumber"
                    value={form.myTaxNumber}
                    onChange={handleChange}
                    disabled={status.loading}
                  />
                ) : (
                  savedProfile.myTaxNumber || '--'
                ),
              )}
              {renderRow(
                'Address',
                editMode ? (
                  <CFormTextarea
                    rows={2}
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    disabled={status.loading}
                  />
                ) : (
                  savedProfile.address || '--'
                ),
              )}
              {renderRow(
                'Email',
                editMode ? (
                  <CFormInput
                    size="sm"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={status.loading}
                  />
                ) : (
                  savedProfile.email || '--'
                ),
              )}
              {renderRow(
                'Phone',
                editMode ? (
                  <CFormInput
                    size="sm"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    disabled={status.loading}
                  />
                ) : (
                  savedProfile.phone || '--'
                ),
              )}
              {renderRow(
                'Finance contact name',
                editMode ? (
                  <CFormInput
                    size="sm"
                    name="financeContactName"
                    value={form.financeContactName}
                    onChange={handleChange}
                    disabled={status.loading}
                  />
                ) : (
                  savedProfile.financeContactName || '--'
                ),
              )}
              {renderRow(
                'Finance contact email',
                editMode ? (
                  <CFormInput
                    size="sm"
                    type="email"
                    name="financeContactEmail"
                    value={form.financeContactEmail}
                    onChange={handleChange}
                    disabled={status.loading}
                  />
                ) : (
                  savedProfile.financeContactEmail || '--'
                ),
              )}
              {renderRow(
                'Finance contact phone',
                editMode ? (
                  <CFormInput
                    size="sm"
                    name="financeContactPhone"
                    value={form.financeContactPhone}
                    onChange={handleChange}
                    disabled={status.loading}
                  />
                ) : (
                  savedProfile.financeContactPhone || '--'
                ),
              )}
              {editMode && (
                <FormActionGroup mobileThumb={false} className="mt-2">
                  <CButton color="light" onClick={handleCancel} disabled={status.loading}>
                    Cancel
                  </CButton>
                  <CButton color="primary" onClick={handleSave} disabled={status.loading}>
                    {status.loading ? 'Saving...' : 'Save'}
                  </CButton>
                </FormActionGroup>
              )}
            </>
          )}
        </CCardBody>
      </CCard>

      {!isLoading && (
        <CCard className="mt-3">
          <CCardHeader>Update History</CCardHeader>
          <CCardBody className="d-grid gap-2">
            {savedProfile.history.length === 0 ? (
              <div className="text-body-secondary">No updates yet.</div>
            ) : (
              [...savedProfile.history].reverse().map((entry, index) => (
                <div
                  key={`${entry.updatedAt || 'entry'}-${index}`}
                  className="border rounded-3 p-2"
                >
                  <div className="small text-body-secondary mb-1">
                    {formatReadableDateTime(entry.updatedAt)}
                    {entry.updatedBy ? ` by ${entry.updatedBy}` : ''}
                  </div>
                  <div className="small">
                    {entry.legalName || '--'} | Reg: {entry.registrationNumber || '--'} | MYTax:{' '}
                    {entry.myTaxNumber || '--'}
                  </div>
                  <div className="small">
                    Finance: {entry.financeContactName || '--'} |{' '}
                    {entry.financeContactEmail || '--'} | {entry.financeContactPhone || '--'}
                  </div>
                </div>
              ))
            )}
          </CCardBody>
        </CCard>
      )}
    </>
  )
}

export default CompanyLegalInfoTab
