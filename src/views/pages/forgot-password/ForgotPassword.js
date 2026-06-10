import React, { useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeClosed } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'

import logoSvg from 'src/assets/brand/logo.svg'
import ButtonLoader from 'src/components/ButtonLoader'
import { requestPasswordReset } from 'src/services/apiClient'

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }
    setStatusMessage(null)
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await requestPasswordReset({ email })
      setStatusMessage(
        'A reset link has been sent to the registered email. You can close this tab.',
      )
    } catch (error) {
      setErrorMessage(error.payload?.message || 'Unable to process your request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex align-items-center justify-content-center">
      <CContainer className="py-5">
        <CRow className="justify-content-center">
          <CCol xs={12} sm={10} md={8} lg={5}>
            <div className="text-center mb-5" role="button" onClick={() => navigate('/login')}>
              <img
                src={logoSvg}
                alt="VMECC"
                style={{ width: '33%', height: 'auto', maxWidth: 240 }}
              />
            </div>
            <CCard className="border-0 shadow-sm">
              <CCardBody className="p-4">
                <p className="text-center text-muted mb-4">
                  Forgot your password? <br />
                  Enter your email and we&apos;ll send you instructions to reset it.
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
                <CForm onSubmit={handleSubmit}>
                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilEnvelopeClosed} />
                    </CInputGroupText>
                    <CFormInput
                      type="email"
                      name="email"
                      placeholder="Email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </CInputGroup>
                  <div className="d-flex align-items-center justify-content-between gap-3 mb-3 w-100">
                    <CButton type="submit" color="primary" className="px-4" disabled={isSubmitting}>
                      {isSubmitting ? <ButtonLoader label="Sending..." /> : 'Send reset link'}
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

export default ForgotPassword
