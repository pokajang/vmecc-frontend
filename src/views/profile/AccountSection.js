import React, { useRef, useState } from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormTextarea,
} from '@coreui/react'
import { useDispatch } from 'react-redux'
import { deleteProfileImage, updateProfile, uploadProfileImage } from 'src/services/apiClient'
import EditControls from 'src/components/EditControls'
import useAutoStatus from 'src/hooks/useAutoStatus'

const AccountSection = ({ user, roles }) => {
  const dispatch = useDispatch()
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(user.name || '')
  const [icNumber, setIcNumber] = useState(user.ic_number || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [address, setAddress] = useState(user.address || '')
  const [isImageBusy, setIsImageBusy] = useState(false)
  const [status, setStatus] = useAutoStatus()
  const fileInputRef = useRef(null)

  const toInitials = (value) => {
    const parts = String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }

  const formatMobile = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
  }

  const renderRow = (label, content) => (
    <div className="d-flex justify-content-between align-items-center">
      <span className="text-muted">{label}</span>
      <span className="ms-3 text-end">{content}</span>
    </div>
  )

  const handleSave = async () => {
    if (status.loading) return
    setStatus({ loading: true, message: null, type: null })
    try {
      const response = await updateProfile({ name, ic_number: icNumber, phone, address })
      dispatch({
        type: 'set',
        authUser: response?.user || null,
      })
      setStatus({ loading: false, message: 'Profile updated.', type: 'success' })
      setEditMode(false)
    } catch (err) {
      setStatus({
        loading: false,
        message: err.payload?.message || err.message || 'Unable to update profile.',
        type: 'danger',
      })
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setName(user.name || '')
    setIcNumber(user.ic_number || '')
    setPhone(user.phone || '')
    setAddress(user.address || '')
    setStatus({ loading: false, message: null, type: null })
  }

  const handlePickImage = () => {
    if (isImageBusy) return
    fileInputRef.current?.click?.()
  }

  const handleImageSelected = async (event) => {
    const file = event.target?.files?.[0]
    event.target.value = ''
    if (!file || isImageBusy) return
    setIsImageBusy(true)
    setStatus({ loading: false, message: null, type: null })
    try {
      const response = await uploadProfileImage(file)
      dispatch({
        type: 'set',
        authUser: response?.user || null,
      })
      setStatus({ loading: false, message: 'Profile image updated.', type: 'success' })
    } catch (err) {
      setStatus({
        loading: false,
        message: err.payload?.message || err.message || 'Unable to upload profile image.',
        type: 'danger',
      })
    } finally {
      setIsImageBusy(false)
    }
  }

  const handleRemoveImage = async () => {
    if (isImageBusy || !user?.profile_image_url) return
    setIsImageBusy(true)
    setStatus({ loading: false, message: null, type: null })
    try {
      const response = await deleteProfileImage()
      dispatch({
        type: 'set',
        authUser: response?.user || null,
      })
      setStatus({ loading: false, message: 'Profile image removed.', type: 'success' })
    } catch (err) {
      setStatus({
        loading: false,
        message: err.payload?.message || err.message || 'Unable to remove profile image.',
        type: 'danger',
      })
    } finally {
      setIsImageBusy(false)
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Personal</span>
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
          'Profile image',
          <span className="d-inline-flex align-items-center gap-2">
            {user?.profile_image_url ? (
              <img
                src={user.profile_image_url}
                alt={`${user.name || 'User'} profile`}
                width={34}
                height={34}
                className="rounded-circle object-fit-cover border"
              />
            ) : (
              <span
                className="rounded-circle d-inline-flex align-items-center justify-content-center fw-semibold border"
                style={{ width: '34px', height: '34px', fontSize: '11px' }}
              >
                {toInitials(user?.name)}
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="d-none"
              onChange={handleImageSelected}
              disabled={isImageBusy}
            />
            <CButton
              color="secondary"
              size="sm"
              variant="outline"
              onClick={handlePickImage}
              disabled={isImageBusy}
            >
              {isImageBusy ? 'Uploading...' : 'Upload'}
            </CButton>
            {user?.profile_image_url ? (
              <CButton
                color="danger"
                size="sm"
                variant="ghost"
                onClick={handleRemoveImage}
                disabled={isImageBusy}
              >
                Remove
              </CButton>
            ) : null}
          </span>,
        )}
        {renderRow(
          'Name',
          editMode ? (
            <CFormInput
              size="sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={status.loading}
            />
          ) : (
            user.name || '—'
          ),
        )}
        {renderRow('Email', user.email || '—')}
        {renderRow(
          'IC number',
          editMode ? (
            <CFormInput
              size="sm"
              value={icNumber}
              onChange={(e) => setIcNumber(e.target.value)}
              disabled={status.loading}
              placeholder="e.g. 900101-01-1234"
            />
          ) : (
            user.ic_number || '—'
          ),
        )}
        {renderRow(
          'Mobile number',
          editMode ? (
            <CFormInput
              size="sm"
              value={phone}
              onChange={(e) => setPhone(formatMobile(e.target.value))}
              disabled={status.loading}
              inputMode="tel"
              placeholder="012 3456 789"
            />
          ) : (
            user.phone || '—'
          ),
        )}
        {renderRow(
          'Home Address',
          editMode ? (
            <CFormTextarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={status.loading}
            />
          ) : (
            user.address || '—'
          ),
        )}
        {renderRow(
          'Roles',
          roles.length === 0 ? (
            '—'
          ) : (
            <span className="d-flex flex-wrap gap-2 justify-content-end">
              {roles.map((role) => (
                <CBadge color="primary" key={role}>
                  {role}
                </CBadge>
              ))}
            </span>
          ),
        )}
      </CCardBody>
    </CCard>
  )
}

export default AccountSection
