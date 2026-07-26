import React from 'react'
import { useSelector } from 'react-redux'
import { AppContent, AppSidebar, AppHeader, AppFooter } from '../components/index'
import AiHelperPanel from 'src/components/ai-helper/AiHelperPanel'
import MaintenanceGraceBanner from 'src/components/MaintenanceGraceBanner'
import ProfileCompletionOnboarding from 'src/components/onboarding/TrtProfileCompletionOnboarding'
import { PwaInstallProvider } from 'src/hooks/usePwaInstallPrompt'

const DefaultLayout = () => {
  const aiHelperOpen = useSelector((state) => state.aiHelperOpen)

  return (
    <PwaInstallProvider>
      <div>
        <AppSidebar />
        <div
          className={`wrapper d-flex flex-column min-vh-100${aiHelperOpen ? ' ai-helper-open' : ''}`}
        >
          <AppHeader />
          <ProfileCompletionOnboarding />
          <MaintenanceGraceBanner />
          <div className="body flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
            <AppContent />
          </div>
          <AppFooter />
        </div>
        <AiHelperPanel />
      </div>
    </PwaInstallProvider>
  )
}

export default DefaultLayout
