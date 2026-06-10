import React from 'react'
import { AppContent, AppSidebar, AppHeader } from '../components/index'
import MaintenanceGraceBanner from 'src/components/MaintenanceGraceBanner'

const DefaultLayout = () => {
  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <MaintenanceGraceBanner />
        <div className="body flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          <AppContent />
        </div>
      </div>
    </div>
  )
}

export default DefaultLayout
