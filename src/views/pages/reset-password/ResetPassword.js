import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeClosed, cilLockLocked, cilLowVision, cilShieldAlt } from '@coreui/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'

import logoSvg from 'src/assets/brand/logo.svg'
import ButtonLoader from 'src/components/ButtonLoader'
import { resetPassword } from 'src/services/apiClient'

const logoStyle = {
  '--auth-logo-width': 'clamp(68px, 16vw, 120px)',
  width: 'var(--auth-logo-width)',
  height: 'auto',
}

const ResetPassword = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])
  const emailParam = useMemo(() => searchParams.get('email') || '', [searchParams])
  const redirectTimeoutRef = useRef(null)

  const [formValues, setFormValues] = useState({
    email: emailParam,
    password: '',
    passwordConfirmation: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    setFormValues((prev) => ({ ...prev, email: emailParam }))
  }, [emailParam])

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting || !token) {
      return
    }
    if (formValues.password !== formValues.passwordConfirmation) {
      setErrorMessage('Passwords do not match.')
      return
    }
    setErrorMessage(null)
    setStatusMessage(null)
    setIsSubmitting(true)
    try {
      await resetPassword({
        token,
        email: formValues.email,
        password: formValues.password,
        password_confirmation: formValues.passwordConfirmation,
      })
      setStatusMessage('Your password has been updated. Redirecting to sign in...')
      redirectTimeoutRef.current = setTimeout(() => {
        navigate('/login', { replace: true })
      }, 5000)
    } catch (error) {
      setErrorMessage(error.payload?.message || 'Unable to reset password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isTokenMissing = !token || !formValues.email
  const toggleNewPassword = () => setShowNewPassword((prev) => !prev)
  const toggleConfirmPassword = () => setShowConfirmPassword((prev) => !prev)

  return (
    <div
      data-testid="reset-password-shell"
      className="bg-body-tertiary d-flex align-items-center justify-content-center"
      style={{ minHeight: '100dvh', overflowY: 'auto' }}
    >
      <CContainer fluid className="px-2 px-sm-3 py-4">
        <CRow
          className="justify-content-center align-items-center mx-0"
          style={{ minHeight: 'calc(100dvh - 3rem)' }}
        >
          <CCol xs={12} sm={10} md={8} lg={5} className="px-1 px-sm-2" style={{ maxWidth: 460 }}>
            <button
              type="button"
              className="auth-logo-button d-block mx-auto mb-3 mb-sm-4 p-0 border-0 bg-transparent"
              aria-label="Back to sign in"
              onClick={() => navigate('/login')}
            >
              <img src={logoSvg} alt="VMECC" style={logoStyle} />
            </button>
            <CCard className="border-0 shadow-sm">
              <CCardBody className="p-3 p-sm-4">
                <p className="text-center text-muted mb-3">
                  Choose a new password for your account to regain access.
                </p>
                {statusMessage && (
                  <CAlert color="success" className="text-center">
                    {statusMessage}
                  </CAlert>
                )}
                {errorMessage && (
                  <CAlert color="danger" className="text-center">
                    {errorMessage}
                  </CAlert>
                )}
                {isTokenMissing && (
                  <CAlert color="warning" className="text-center">
                    Your reset link is missing required information. Please request a new password
                    reset email.
                  </CAlert>
                )}
                <CForm onSubmit={handleSubmit}>
                  <CFormLabel htmlFor="reset-password-email" className="visually-hidden">
                    Email address
                  </CFormLabel>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilEnvelopeClosed} />
                    </CInputGroupText>
                    <CFormInput
                      id="reset-password-email"
                      type="email"
                      name="email"
                      placeholder="Email"
                      autoComplete="email"
                      value={formValues.email}
                      onChange={handleChange}
                      disabled
                    />
                  </CInputGroup>
                  <CFormLabel htmlFor="reset-password-new" className="visually-hidden">
                    New password
                  </CFormLabel>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      id="reset-password-new"
                      type={showNewPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="New password"
                      autoComplete="new-password"
                      value={formValues.password}
                      onChange={handleChange}
                      disabled={isSubmitting || isTokenMissing}
                      required
                    />
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      className="border-start-0"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showNewPassword}
                      disabled={isSubmitting || isTokenMissing}
                      onClick={toggleNewPassword}
                    >
                      <CIcon icon={showNewPassword ? cilShieldAlt : cilLowVision} />
                    </CButton>
                  </CInputGroup>
                  <CFormLabel htmlFor="reset-password-confirm" className="visually-hidden">
                    Confirm new password
                  </CFormLabel>
                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      id="reset-password-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="passwordConfirmation"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      value={formValues.passwordConfirmation}
                      onChange={handleChange}
                      disabled={isSubmitting || isTokenMissing}
                      required
                    />
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      className="border-start-0"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showConfirmPassword}
                      disabled={isSubmitting || isTokenMissing}
                      onClick={toggleConfirmPassword}
                    >
                      <CIcon icon={showConfirmPassword ? cilShieldAlt : cilLowVision} />
                    </CButton>
                  </CInputGroup>
                  <div className="d-flex align-items-center justify-content-between gap-3 mb-3 w-100">
                    <CButton
                      type="submit"
                      color="primary"
                      className="px-4"
                      disabled={isSubmitting || isTokenMissing}
                    >
                      {isSubmitting ? <ButtonLoader label="Updating..." /> : 'Update password'}
                    </CButton>
                    <CButton
                      type="button"
                      color="link"
                      className="px-0 text-nowrap ms-auto"
                      onClick={() => navigate('/login')}
                      disabled={isSubmitting}
                    >
                      Back to sign in
                    </CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default ResetPassword
