import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

// routes config
import routes from '../routes'
import ErrorBoundary from './ErrorBoundary'

const AppContent = () => {
  return (
    <CContainer fluid className="px-3 px-md-4 px-xl-5 py-3 py-md-4 d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  element={
                    <ErrorBoundary>
                      <route.element />
                    </ErrorBoundary>
                  }
                />
              )
            )
          })}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
