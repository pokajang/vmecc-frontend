import React from 'react'
import { CButton, CCol, CContainer, CRow } from '@coreui/react'

const Page404 = () => {
  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6}>
            <div className="clearfix">
              <h1 className="float-start display-3 me-4">404</h1>
              <h2 className="h4 pt-3">Page not found.</h2>
              <p className="text-body-secondary float-start">
                The page you are looking for was not found.
              </p>
            </div>
            <CButton href="/" color="primary">
              Return home
            </CButton>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Page404
