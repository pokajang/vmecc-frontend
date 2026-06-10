import React, { useEffect, useState } from 'react'
import Select from 'react-select'
import { CCard, CCardBody, CCardHeader, CFormInput } from '@coreui/react'
import { useDispatch } from 'react-redux'
import EditControls from 'src/components/EditControls'
import { updateProfile } from 'src/services/apiClient'
import useAutoStatus from 'src/hooks/useAutoStatus'

const bankOptions = [
  // Local commercial banks
  'Affin Bank Berhad',
  'Alliance Bank Malaysia Berhad',
  'AmBank (M) Berhad',
  'CIMB Bank Berhad',
  'Hong Leong Bank Berhad',
  'Malayan Banking Berhad (Maybank)',
  'Public Bank Berhad',
  'RHB Bank Berhad',
  // Foreign commercial banks (retail)
  'HSBC Bank Malaysia Berhad',
  'OCBC Bank (Malaysia) Berhad',
  'Standard Chartered Bank Malaysia Berhad',
  'United Overseas Bank (Malaysia) Berhad (UOB)',
  // Islamic banks
  'Bank Islam Malaysia Berhad',
  'Bank Muamalat Malaysia Berhad',
  'MBSB Bank Berhad',
  'Al Rajhi Banking & Investment Corporation (Malaysia) Berhad',
  'Affin Islamic Bank Berhad',
  'AmBank Islamic Berhad',
  'CIMB Islamic Bank Berhad',
  'Hong Leong Islamic Bank Berhad',
  'Maybank Islamic Berhad',
  'Public Islamic Bank Berhad',
  'RHB Islamic Bank Berhad',
  // Digital banks
  'GX Bank Berhad (GXBank)',
  'AEON Bank (M) Berhad',
  'Boost Bank Berhad',
  'KAF Digital Bank Berhad',
  'YTL Digital Bank Berhad (Ryt Bank)',
  // Government-linked retail banks
  'Bank Simpanan Nasional (BSN)',
  'Bank Kerjasama Rakyat Malaysia Berhad (Bank Rakyat)',
  'Bank Pertanian Malaysia Berhad (Agrobank)',
]

const bankOptionsList = bankOptions.map((label) => ({ value: label, label }))

const maskAccount = (value = '') => {
  if (!value || value.length <= 4) return value
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`
}

const BankingSection = ({ banking }) => {
  const dispatch = useDispatch()
  const [editMode, setEditMode] = useState(false)
  const safeBanking = banking ?? {}
  const [form, setForm] = useState({
    bankName: safeBanking.bankName || '',
    accountName: safeBanking.accountName || '',
    accountNumber: safeBanking.accountNumber || '',
  })
  const [status, setStatus] = useAutoStatus()

  useEffect(() => {
    const updated = banking ?? {}
    setForm({
      bankName: updated.bankName || '',
      accountName: updated.accountName || '',
      accountNumber: updated.accountNumber || '',
    })
  }, [banking])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (status.loading) return
    setStatus({ loading: true, message: null, type: null })
    try {
      const response = await updateProfile({ banking_info: form })
      dispatch({ type: 'set', authUser: response?.user || null })
      setStatus({ loading: false, message: 'Banking info updated.', type: 'success' })
      setEditMode(false)
    } catch (err) {
      setStatus({
        loading: false,
        message: err.payload?.message || err.message || 'Unable to update banking info.',
        type: 'danger',
      })
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setForm({
      bankName: safeBanking.bankName || '',
      accountName: safeBanking.accountName || '',
      accountNumber: safeBanking.accountNumber || '',
    })
    setStatus({ loading: false, message: null, type: null })
  }

  const renderRow = (label, content) => (
    <div className="d-flex justify-content-between align-items-center">
      <span className="text-muted">{label}</span>
      <span className="ms-3 text-end">{content}</span>
    </div>
  )

  const maskedAccount = maskAccount(form.accountNumber || safeBanking.accountNumber || '')

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Banking Info</span>
        <EditControls
          editMode={editMode}
          loading={status.loading}
          onEdit={() => setEditMode(true)}
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
          'Bank',
          editMode ? (
            <Select
              inputId="bankName"
              name="bankName"
              classNamePrefix="bank-select"
              placeholder="Search or select bank"
              value={bankOptionsList.find((o) => o.value === form.bankName) || null}
              onChange={(opt) =>
                setForm((prev) => ({
                  ...prev,
                  bankName: opt?.value || '',
                }))
              }
              options={bankOptionsList}
              isClearable
              isSearchable
              isDisabled={status.loading}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                control: (base) => ({ ...base, minHeight: '38px' }),
              }}
            />
          ) : (
            safeBanking.bankName || '--'
          ),
        )}
        {renderRow(
          'Account name',
          editMode ? (
            <CFormInput
              size="sm"
              name="accountName"
              value={form.accountName}
              onChange={handleChange}
              disabled={status.loading}
            />
          ) : (
            safeBanking.accountName || '--'
          ),
        )}
        {renderRow(
          'Account number',
          editMode ? (
            <CFormInput
              size="sm"
              name="accountNumber"
              value={form.accountNumber}
              onChange={handleChange}
              disabled={status.loading}
            />
          ) : (
            maskedAccount || '--'
          ),
        )}
      </CCardBody>
    </CCard>
  )
}

export default BankingSection
