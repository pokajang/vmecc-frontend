import React from 'react'
import { CCol, CContainer, CRow } from '@coreui/react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logoutRequest } from 'src/services/apiClient'

const Maintenance = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const backToLogin = async (event) => {
    event.preventDefault()
    try {
      await logoutRequest()
    } catch {
      // Ignore logout API failure and force local sign-out anyway.
    }
    dispatch({ type: 'set', authStatus: 'anonymous', authUser: null, authError: null })
    navigate('/login', { replace: true })
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={7}>
            <div className="clearfix">
              <h1 className="float-start display-3 me-4">503</h1>
              <h4 className="pt-3">System under maintenance.</h4>
              <p className="text-body-secondary float-start mb-3">
                Some features are temporarily unavailable while maintenance is in progress.
              </p>
            </div>
            <div className="d-flex gap-2">
              <a href="/login" onClick={backToLogin} className="small text-decoration-underline">
                /login
              </a>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Maintenance
