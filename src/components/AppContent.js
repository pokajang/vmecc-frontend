import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CAlert, CContainer } from '@coreui/react'

// routes config
import routes from '../routes'
import ErrorBoundary from './ErrorBoundary'
import { getModuleDisabledReason, isModuleEnabled } from 'src/utils/modules'
import PageState from './PageState'

const ModuleDisabled = ({ moduleKey, moduleActivation }) => {
  const state = getModuleDisabledReason(moduleActivation, moduleKey)
  return (
    <CAlert color="warning" className="my-4">
      This module is currently disabled.
      {state?.blockingModule && (
        <span className="d-block small mt-1">Blocking module: {state.blockingModule}</span>
      )}
    </CAlert>
  )
}

const AppContent = () => {
  const moduleActivation = useSelector((state) => state.moduleActivation)

  return (
    <CContainer
      fluid
      className="px-3 px-md-4 px-xl-5 py-3 py-md-4 d-flex flex-column flex-grow-1"
      style={{ minHeight: 0 }}
    >
      <Suspense fallback={<PageState message="Loading page…" minHeight={240} />}>
        <Routes>
          {routes.map((route, idx) => {
            const routeModule = route.module || null
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  element={
                    <ErrorBoundary>
                      {routeModule && !isModuleEnabled(moduleActivation, routeModule) ? (
                        <ModuleDisabled
                          moduleKey={routeModule}
                          moduleActivation={moduleActivation}
                        />
                      ) : (
                        <route.element />
                      )}
                    </ErrorBoundary>
                  }
                />
              )
            )
          })}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
