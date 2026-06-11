import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span>&copy; 2026 VMECC.</span>
      </div>
      <div className="ms-auto">
        <span>Operations Management System</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
