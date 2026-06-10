import React, { useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import ButtonLoader from 'src/components/ButtonLoader'
import { changePassword } from 'src/services/apiClient'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

const SecuritySection = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [pwStatus, setPwStatus] = useState({ loading: false, message: null, type: null })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handlePasswordChange = async () => {
    if (pwStatus.loading) return
    setPwStatus({ loading: true, message: null, type: null })
    try {
      await changePassword(passwordForm)
      setPwStatus({
        loading: false,
        message: 'Password updated. Please sign in again.',
        type: 'success',
      })
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' })
      dispatch({ type: 'set', authStatus: 'anonymous', authUser: null, authError: null })
      navigate('/login', { replace: true })
    } catch (err) {
      setPwStatus({
        loading: false,
        message: err.payload?.message || err.message || 'Unable to update password.',
        type: 'danger',
      })
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>Security</CCardHeader>
      <CCardBody>
        {pwStatus.message && <CAlert color={pwStatus.type || 'info'}>{pwStatus.message}</CAlert>}
        <div className="d-grid gap-3" style={{ maxWidth: '520px' }}>
          <div>
            <label className="form-label" htmlFor="current_password">
              Current password
            </label>
            <CInputGroup>
              <CInputGroupText>
                <Lock size={16} />
              </CInputGroupText>
              <CFormInput
                id="current_password"
                name="current_password"
                type={showCurrent ? 'text' : 'password'}
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))
                }
                disabled={pwStatus.loading}
                required
                autoComplete="current-password"
              />
              <CInputGroupText
                role="button"
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                style={{ cursor: 'pointer' }}
                onClick={() => setShowCurrent((prev) => !prev)}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </CInputGroupText>
            </CInputGroup>
          </div>
          <div>
            <label className="form-label" htmlFor="password">
              New password
            </label>
            <CInputGroup>
              <CInputGroupText>
                <Lock size={16} />
              </CInputGroupText>
              <CFormInput
                id="password"
                name="password"
                type={showNew ? 'text' : 'password'}
                value={passwordForm.password}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                disabled={pwStatus.loading}
                required
                autoComplete="new-password"
              />
              <CInputGroupText
                role="button"
                aria-label={showNew ? 'Hide password' : 'Show password'}
                style={{ cursor: 'pointer' }}
                onClick={() => setShowNew((prev) => !prev)}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </CInputGroupText>
            </CInputGroup>
          </div>
          <div>
            <label className="form-label" htmlFor="password_confirmation">
              Confirm new password
            </label>
            <CInputGroup>
              <CInputGroupText>
                <Lock size={16} />
              </CInputGroupText>
              <CFormInput
                id="password_confirmation"
                name="password_confirmation"
                type={showConfirm ? 'text' : 'password'}
                value={passwordForm.password_confirmation}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    password_confirmation: e.target.value,
                  }))
                }
                disabled={pwStatus.loading}
                required
                autoComplete="new-password"
              />
              <CInputGroupText
                role="button"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                style={{ cursor: 'pointer' }}
                onClick={() => setShowConfirm((prev) => !prev)}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </CInputGroupText>
            </CInputGroup>
          </div>
          <div className="d-flex flex-column flex-md-row align-items-start gap-2">
            <CButton color="primary" onClick={handlePasswordChange} disabled={pwStatus.loading}>
              {pwStatus.loading ? <ButtonLoader label="Saving..." /> : 'Update password'}
            </CButton>
            <span className="text-muted small">Password must be at least 8 characters.</span>
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default SecuritySection
