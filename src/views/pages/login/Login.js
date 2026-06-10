import React, { useEffect, useState } from 'react'
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
import { cilLockLocked, cilLowVision, cilShieldAlt, cilUser } from '@coreui/icons'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import logoSvg from 'src/assets/brand/logo.svg'
import ButtonLoader from 'src/components/ButtonLoader'
import { fetchGoogleAuthUrl, loginRequest } from 'src/services/apiClient'
import { isGracePhase } from 'src/utils/systemMaintenance'

const toRemainingMs = (iso) => {
  const ts = Date.parse(String(iso || ''))
  if (!Number.isFinite(ts)) return 0
  return Math.max(0, ts - Date.now())
}

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const Login = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const authStatus = useSelector((state) => state.authStatus)
  const systemMaintenance = useSelector((state) => state.systemMaintenance || {})
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [statusType, setStatusType] = useState(null)
  const [, setTick] = useState(0)
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
  })

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      const response = await loginRequest(formValues)
      dispatch({
        type: 'set',
        authStatus: 'authenticated',
        authUser: response?.user || response,
        authError: null,
      })
      navigate('/', { replace: true })
    } catch (error) {
      setErrorMessage(error.payload?.message || error.message || 'Unable to sign in')
      dispatch({ type: 'set', authStatus: 'anonymous', authUser: null, authError: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePassword = () => setShowPassword((prev) => !prev)

  const handleGoogleSignIn = async () => {
    if (isSubmitting || isGoogleLoading || isAuthLoading) {
      return
    }
    setErrorMessage(null)
    setIsGoogleLoading(true)
    try {
      const response = await fetchGoogleAuthUrl()
      if (response?.url) {
        window.location.href = response.url
      } else {
        throw new Error('Unable to start Google sign-in')
      }
    } catch (error) {
      setErrorMessage(error.payload?.message || error.message || 'Unable to start Google sign-in')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const isAuthLoading = authStatus === 'checking' || authStatus === 'unknown'
  const maintenanceEnabled = Boolean(systemMaintenance?.enabled)
  const maintenanceIsGrace = isGracePhase(systemMaintenance)
  const maintenanceRemainingMs = toRemainingMs(systemMaintenance?.graceEndsAt)

  useEffect(() => {
    if (!maintenanceIsGrace) return undefined
    const timer = window.setInterval(() => setTick((v) => v + 1), 1000)
    return () => window.clearInterval(timer)
  }, [maintenanceIsGrace])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    const message = params.get('message')
    if (status === 'error' && message) {
      setStatusMessage(decodeURIComponent(message))
      setStatusType('danger')
    } else if (status === 'success') {
      setStatusMessage('Signed in with Google.')
      setStatusType('success')
    } else {
      setStatusMessage(null)
      setStatusType(null)
    }
  }, [])

  return (
    <div
      className="bg-body-tertiary d-flex align-items-center justify-content-center"
      style={{ minHeight: '100dvh', height: '100dvh', overflow: 'hidden' }}
    >
      <CContainer fluid className="h-100 px-2 px-sm-3">
        <CRow className="justify-content-center align-items-center h-100 mx-0">
          <CCol xs={12} sm={10} md={8} lg={5} className="px-1 px-sm-2" style={{ maxWidth: 460 }}>
            <div className="text-center mb-3 mb-sm-4">
              <img
                src={logoSvg}
                alt="VMECC"
                style={{ width: 'clamp(68px, 16vw, 120px)', height: 'auto' }}
              />
            </div>
            <CCard className="border-0 shadow-sm">
              <CCardBody className="p-3 p-sm-4">
                <p className="text-center text-muted mb-3">Sign in to continue</p>
                {maintenanceEnabled && (
                  <CAlert
                    color={maintenanceIsGrace ? 'warning' : 'danger'}
                    className="text-center py-2 mb-3"
                  >
                    {maintenanceIsGrace
                      ? `System maintenance starts in ${formatCountdown(maintenanceRemainingMs)}. You can still sign in for now.`
                      : 'System is currently under maintenance. Non-admin access will be limited after sign-in.'}
                  </CAlert>
                )}
                {(errorMessage || statusMessage) && (
                  <CAlert
                    color={statusType === 'success' ? 'success' : 'danger'}
                    className="text-center py-2 mb-3"
                    data-testid="login-error"
                  >
                    {errorMessage || statusMessage}
                  </CAlert>
                )}
                <CForm onSubmit={handleSubmit}>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      type="email"
                      name="email"
                      placeholder="Email"
                      autoComplete="username"
                      value={formValues.email}
                      onChange={handleChange}
                      disabled={isSubmitting || isAuthLoading}
                      required
                    />
                  </CInputGroup>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Password"
                      autoComplete="current-password"
                      value={formValues.password}
                      onChange={handleChange}
                      disabled={isSubmitting || isAuthLoading}
                      required
                    />
                    <CInputGroupText
                      className="border-start-0"
                      role="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{ cursor: 'pointer' }}
                      onClick={togglePassword}
                    >
                      <CIcon icon={showPassword ? cilShieldAlt : cilLowVision} />
                    </CInputGroupText>
                  </CInputGroup>
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-2 w-100">
                    <CButton
                      type="submit"
                      color="primary"
                      className="px-4"
                      disabled={isSubmitting || isAuthLoading}
                    >
                      {isSubmitting ? <ButtonLoader label="Signing in..." /> : 'Sign in'}
                    </CButton>
                    <CButton
                      color="link"
                      className="px-0 text-nowrap ms-auto"
                      disabled={isSubmitting || isAuthLoading}
                      onClick={() => navigate('/forgot-password')}
                    >
                      Forgot password?
                    </CButton>
                  </div>
                </CForm>
                <div className="d-grid">
                  <div className="d-flex align-items-center my-2">
                    <div className="flex-grow-1 border-top" />
                    <span className="px-2 text-muted small text-uppercase">
                      Or login with Google Account
                    </span>
                    <div className="flex-grow-1 border-top" />
                  </div>
                  <CButton
                    color="secondary"
                    variant="outline"
                    disabled={isSubmitting || isAuthLoading || isGoogleLoading}
                    onClick={handleGoogleSignIn}
                    className="d-flex align-items-center justify-content-center gap-2"
                  >
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt=""
                      width="18"
                      height="18"
                      aria-hidden="true"
                    />
                    {isGoogleLoading ? (
                      <ButtonLoader label="Redirecting..." />
                    ) : (
                      'Continue with Google'
                    )}
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
