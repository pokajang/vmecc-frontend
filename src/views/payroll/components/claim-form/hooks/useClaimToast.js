import { useCallback, useRef, useState } from 'react'
import { CToast, CToastBody, CToastHeader } from '@coreui/react'

const useClaimToast = () => {
  const toaster = useRef()
  const [toast, addToast] = useState(0)

  const pushToast = useCallback((message, { title, color = 'light', delay = 6000 } = {}) => {
    addToast(
      <CToast autohide delay={delay} color={color}>
        {title && (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        )}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  return {
    toaster,
    toast,
    addToast,
    pushToast,
  }
}

export default useClaimToast
